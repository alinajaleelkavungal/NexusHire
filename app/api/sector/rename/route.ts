import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const g = await guardAdmin()
    if (g.response) return g.response

    const { oldName, newName } = await request.json()

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Missing oldName or newName' }, { status: 400 })
    }

    // Update candidates
    const updated = await prisma.candidate.updateMany({
      where: { category: oldName },
      data: { category: newName }
    })

    // Update Sector model
    try {
      await prisma.sector.update({
        where: { name: oldName },
        data: { name: newName }
      })
    } catch (e) {
      // It might not exist in the Sector table yet if it's an old one, or unique constraint might fail if new one exists
      // If new one already exists, we could just delete the old one, but for safety let's just ignore or upsert.
      console.error("Sector model update issue:", e)
    }

    return NextResponse.json({ success: true, count: updated.count })
  } catch (error: any) {
    console.error('Failed to rename sector:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
