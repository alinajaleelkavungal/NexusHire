import { NextRequest, NextResponse } from 'next/server'
import { findAccountById, guardSession, setAccountPassword, verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const g = await guardSession()
  if (g.response) return g.response

  const { currentPassword, newPassword } = await request.json()
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const account = await findAccountById(g.session.sub)
  if (!account || typeof currentPassword !== 'string' || !(await verifyPassword(currentPassword, account.passwordHash))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  await setAccountPassword(account.id, newPassword)
  return NextResponse.json({ success: true })
}
