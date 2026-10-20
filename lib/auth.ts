import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import prisma from '@/lib/prisma'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySessionToken,
  type Role,
  type SessionPayload,
} from '@/lib/session-token'

// NOTE: raw SQL is used for Account / Candidate.ownerId on purpose — the generated
// Prisma Client in this project is often stale and drops newer columns/models.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

export type Session = SessionPayload

// ── Passwords ────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(expected, actual)
}

// Used to keep login timing similar whether or not the account exists
export const DUMMY_HASH = `${'00'.repeat(16)}:${'00'.repeat(64)}`

// ── Accounts ─────────────────────────────────────────────────────────────────

export interface AccountRow {
  id: string
  loginId: string
  name: string
  role: Role
  passwordHash: string
  active: boolean
}

function toAccount(r: any): AccountRow {
  return { ...r, active: Number(r.active) === 1 || r.active === true }
}

export async function findAccountByLoginId(loginId: string): Promise<AccountRow | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Account WHERE loginId = ? COLLATE NOCASE`, loginId)
  return rows[0] ? toAccount(rows[0]) : null
}

export async function findAccountById(id: string): Promise<AccountRow | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Account WHERE id = ?`, id)
  return rows[0] ? toAccount(rows[0]) : null
}

export async function createAccount(input: { loginId: string; name: string; role: Role; password: string }) {
  const id = `acc_${randomBytes(12).toString('hex')}`
  await prisma.$executeRawUnsafe(
    `INSERT INTO Account (id, loginId, name, role, passwordHash, active, createdAt) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
    id, input.loginId.trim(), input.name.trim(), input.role, await hashPassword(input.password)
  )
  return id
}

export async function setAccountPassword(id: string, password: string) {
  await prisma.$executeRawUnsafe(`UPDATE Account SET passwordHash = ? WHERE id = ?`, await hashPassword(password), id)
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(account: Pick<AccountRow, 'id' | 'loginId' | 'name' | 'role'>) {
  const token = signSession({ sub: account.id, loginId: account.loginId, name: account.name, role: account.role })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/**
 * The signed cookie must be valid AND the account must still exist and be active,
 * so disabling a branch takes effect immediately.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!payload) return null
  const account = await findAccountById(payload.sub)
  if (!account || !account.active) return null
  // Role/name always come from the database, never from the cookie alone
  return { ...payload, role: account.role, name: account.name, loginId: account.loginId }
}

// ── Route guards (return a ready-made response instead of throwing) ──────────

type Guard = { session: Session; response?: undefined } | { session?: undefined; response: NextResponse }

const deny = (error: string, status: number): Guard => ({
  response: NextResponse.json({ error }, { status }),
})

export async function guardSession(): Promise<Guard> {
  const session = await getSession()
  return session ? { session } : deny('Not authenticated', 401)
}

export async function guardAdmin(): Promise<Guard> {
  const g = await guardSession()
  if (g.response) return g
  return g.session.role === 'ADMIN' ? g : deny('Admin access required', 403)
}

/** 404 (not 403) for other branches' candidates, so their existence isn't revealed. */
export async function guardCandidate(candidateId: string): Promise<Guard> {
  const g = await guardSession()
  if (g.response) return g
  return (await canAccessCandidate(g.session, candidateId)) ? g : deny('Candidate not found', 404)
}

// ── Candidate ownership ──────────────────────────────────────────────────────

export async function canAccessCandidate(session: Session, candidateId: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT ownerId FROM Candidate WHERE id = ?`, candidateId)
  if (rows.length === 0) return false
  return session.role === 'ADMIN' || rows[0].ownerId === session.sub
}

/** Returns only the ids the session may touch (admin: all existing; branch: own). */
export async function filterAccessibleIds(session: Session, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const marks = ids.map(() => '?').join(',')
  const rows = session.role === 'ADMIN'
    ? await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM Candidate WHERE id IN (${marks})`, ...ids)
    : await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM Candidate WHERE ownerId = ? AND id IN (${marks})`, session.sub, ...ids)
  return rows.map(r => r.id)
}

/** For Qdrant filters: undefined = unrestricted (admin), otherwise the branch's own candidate ids. */
export async function allowedCandidateIds(session: Session): Promise<string[] | undefined> {
  if (session.role === 'ADMIN') return undefined
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM Candidate WHERE ownerId = ?`, session.sub)
  return rows.map(r => r.id)
}

/** Candidates visible to the session, with the uploading branch's name attached. */
export async function listCandidatesFor(session: Session): Promise<any[]> {
  const base = `SELECT c.*, a.name AS branchName, a.loginId AS branchLoginId
                FROM Candidate c LEFT JOIN Account a ON a.id = c.ownerId`
  const rows = session.role === 'ADMIN'
    ? await prisma.$queryRawUnsafe<any[]>(`${base} ORDER BY c.createdAt DESC`)
    : await prisma.$queryRawUnsafe<any[]>(`${base} WHERE c.ownerId = ? ORDER BY c.createdAt DESC`, session.sub)
  return rows.map(c => ({
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  }))
}
