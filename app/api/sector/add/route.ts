import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const g = await guardSession()
    if (g.response) return g.response

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Missing sector name' }, { status: 400 })
    }

    const newSector = await prisma.sector.create({
      data: { name }
    })

    return NextResponse.json({ success: true, sector: newSector })
  } catch (error: any) {
    // Ignore unique constraint violation if they add a sector that already exists
    if (error.code === 'P2002') {
      return NextResponse.json({ success: true, message: 'Sector already exists' })
    }
    console.error('Failed to add sector:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
