import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardCandidate } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { candidateId, company } = await request.json()

    if (!candidateId || company === undefined) {
      return NextResponse.json({ error: 'Missing candidateId or company' }, { status: 400 })
    }

    const g = await guardCandidate(candidateId)
    if (g.response) return g.response

    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { company }
    })

    return NextResponse.json({ success: true, candidate: updatedCandidate })
  } catch (error: any) {
    console.error('Failed to update candidate company:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
