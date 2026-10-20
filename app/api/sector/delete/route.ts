import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const g = await guardAdmin()
    if (g.response) return g.response

    const { sectorName } = await request.json()

    if (!sectorName) {
      return NextResponse.json({ error: 'Missing sectorName' }, { status: 400 })
    }

    const updated = await prisma.candidate.updateMany({
      where: { category: sectorName },
      data: { category: null } // Or 'Uncategorized' if string
    })

    try {
      await prisma.sector.delete({
        where: { name: sectorName }
      })
    } catch (e) {
      console.error("Sector model delete issue:", e)
    }

    return NextResponse.json({ success: true, count: updated.count })
  } catch (error: any) {
    console.error('Failed to delete sector:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
