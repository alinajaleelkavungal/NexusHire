import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { qdrantClient, COLLECTION_NAME, initQdrantCollection } from '@/lib/qdrant'
import { generateEmbedding } from '@/services/embedding-service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  try {
    const { candidateId } = await params

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 })
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Ensure collection is ready
    await initQdrantCollection()

    // Generate candidate vector from their summary and skills
    const textToEmbed = `${candidate.professionalSummary || ''} ${candidate.skills ? JSON.parse(candidate.skills).join(', ') : ''}`
    
    if (!textToEmbed.trim()) {
      return NextResponse.json({ error: 'Candidate has no text to embed' }, { status: 400 })
    }

    const candidateVector = await generateEmbedding(textToEmbed)

    // Search Qdrant
    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: candidateVector,
      limit: 10,
      with_payload: true,
      filter: {
        // Exclude the current candidate from results
        must_not: [
          {
            key: 'candidateId',
            match: { value: candidateId }
          }
        ]
      }
    })

    const candidatesMap = new Map()

    for (const result of searchResults) {
      const payload = result.payload as any
      if (!payload || !payload.candidateId) continue

      if (!candidatesMap.has(payload.candidateId)) {
        candidatesMap.set(payload.candidateId, {
          candidateId: payload.candidateId,
          name: payload.name,
          matchScore: result.score
        })
      } else {
        const existing = candidatesMap.get(payload.candidateId)
        if (result.score > existing.matchScore) {
          existing.matchScore = result.score
        }
      }
    }

    const similarCandidates = Array.from(candidatesMap.values()).sort((a, b) => b.matchScore - a.matchScore)

    return NextResponse.json({ success: true, results: similarCandidates })

  } catch (error: any) {
    console.error('Similar API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
