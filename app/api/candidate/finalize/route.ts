import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { candidateId, name, age, sector, category, yearsOfExperience } = await request.json()

    if (!candidateId) {
      return NextResponse.json({ error: 'Missing candidateId' }, { status: 400 })
    }

    const parsedAge = age ? parseInt(age, 10) : null
    
    // Use raw SQL to bypass the Turbopack-cached Prisma Client which is throwing "Unknown argument"
    await prisma.$executeRawUnsafe(
      `UPDATE Candidate SET name = ?, age = ?, sector = ?, category = ?, yearsOfExperience = ?, recruitmentStage = ? WHERE id = ?`,
      name || null,
      parsedAge,
      sector || null,
      category || null,
      yearsOfExperience || null,
      'Applied',
      candidateId
    )

    // Fetch the updated candidate to return
    const updatedCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    })

    return NextResponse.json({ success: true, candidate: updatedCandidate })
  } catch (error: any) {
    console.error('Finalize Candidate Error:', error)
    return NextResponse.json({ error: 'Failed to finalize candidate', details: error.message }, { status: 500 })
  }
}
