import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { stage } = await request.json()

    if (!stage) {
      return NextResponse.json({ error: 'Stage is required' }, { status: 400 })
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id }
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const oldStage = candidate.recruitmentStage

    // Update candidate stage
    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: { recruitmentStage: stage }
    })

    // Log the activity
    await prisma.activityLog.create({
      data: {
        candidateId: id,
        action: 'Stage Changed',
        description: `Moved from ${oldStage} to ${stage}`
      }
    })

    return NextResponse.json({ success: true, candidate: updatedCandidate })
  } catch (error) {
    console.error('Failed to update candidate stage:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
