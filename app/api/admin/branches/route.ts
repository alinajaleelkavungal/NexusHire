import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createAccount, findAccountByLoginId, guardAdmin } from '@/lib/auth'

export async function GET() {
  const g = await guardAdmin()
  if (g.response) return g.response

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT a.id, a.loginId, a.name, a.active, a.createdAt,
            (SELECT COUNT(*) FROM Candidate c WHERE c.ownerId = a.id) AS candidateCount
     FROM Account a WHERE a.role = 'BRANCH' ORDER BY a.createdAt DESC`
  )
  return NextResponse.json({
    branches: rows.map(r => ({ ...r, active: Number(r.active) === 1, candidateCount: Number(r.candidateCount) })),
  })
}

export async function POST(request: NextRequest) {
  const g = await guardAdmin()
  if (g.response) return g.response

  const { loginId, name, password } = await request.json()

  if (typeof loginId !== 'string' || !/^[A-Za-z0-9._-]{3,32}$/.test(loginId.trim())) {
    return NextResponse.json({ error: 'Branch ID must be 3–32 characters: letters, numbers, . _ -' }, { status: 400 })
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  if (await findAccountByLoginId(loginId.trim())) {
    return NextResponse.json({ error: 'That Branch ID is already taken' }, { status: 409 })
  }

  const id = await createAccount({ loginId, name, role: 'BRANCH', password })
  return NextResponse.json({ success: true, id }, { status: 201 })
}
