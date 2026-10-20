import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { findAccountById, guardAdmin, setAccountPassword } from '@/lib/auth'

// Reset a branch's password and/or enable/disable the branch
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin()
  if (g.response) return g.response

  const { id } = await params
  const account = await findAccountById(id)
  if (!account || account.role !== 'BRANCH') {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  const { password, active } = await request.json()

  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    await setAccountPassword(id, password)
  }
  if (typeof active === 'boolean') {
    await prisma.$executeRawUnsafe(`UPDATE Account SET active = ? WHERE id = ?`, active ? 1 : 0, id)
  }
  return NextResponse.json({ success: true })
}
