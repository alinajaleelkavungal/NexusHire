import { NextRequest, NextResponse } from 'next/server'
import { createSession, findAccountByLoginId, verifyPassword, DUMMY_HASH } from '@/lib/auth'

// Simple in-memory brute-force protection: 5 failures per login id + IP per 15 minutes
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5
const failures = new Map<string, { count: number; first: number }>()

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json()
    if (typeof loginId !== 'string' || typeof password !== 'string' || !loginId.trim() || !password) {
      return NextResponse.json({ error: 'Enter your ID and password' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const key = `${loginId.trim().toLowerCase()}|${ip}`
    const entry = failures.get(key)
    if (entry && Date.now() - entry.first < WINDOW_MS && entry.count >= MAX_FAILURES) {
      return NextResponse.json({ error: 'Too many failed attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const account = await findAccountByLoginId(loginId.trim())
    // Always run a hash comparison so response time doesn't reveal whether the ID exists
    const ok = await verifyPassword(password, account?.passwordHash ?? DUMMY_HASH)

    if (!account || !account.active || !ok) {
      const fresh = !entry || Date.now() - entry.first >= WINDOW_MS
      failures.set(key, { count: fresh ? 1 : entry!.count + 1, first: fresh ? Date.now() : entry!.first })
      return NextResponse.json({ error: 'Incorrect ID or password' }, { status: 401 })
    }

    failures.delete(key)
    await createSession(account)
    return NextResponse.json({ success: true, role: account.role })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
