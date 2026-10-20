import { createHmac, timingSafeEqual } from 'crypto'

// Pure token helpers (no database access) so the Proxy can use them too.

export const SESSION_COOKIE = 'session'
export const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 hours

export type Role = 'ADMIN' | 'BRANCH'

export interface SessionPayload {
  sub: string // Account id
  loginId: string
  name: string
  role: Role
  exp: number // unix seconds
}

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET is missing or too short (need 32+ characters). Add it to .env.')
  }
  return s
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url')
}

export function signSession(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }
  const body = Buffer.from(JSON.stringify(full)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = Buffer.from(sign(body))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (!payload.sub || (payload.role !== 'ADMIN' && payload.role !== 'BRANCH')) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
