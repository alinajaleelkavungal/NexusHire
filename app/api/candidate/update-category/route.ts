import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardCandidate } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { candidateId, category } = await request.json()

    if (!candidateId || !category) {
      return NextResponse.json({ error: 'Missing candidateId or category' }, { status: 400 })
    }

    const g = await guardCandidate(candidateId)
    if (g.response) return g.response

    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { category }
    })

    return NextResponse.json({ success: true, candidate: updatedCandidate })
  } catch (error: any) {
    console.error('Failed to update candidate category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
