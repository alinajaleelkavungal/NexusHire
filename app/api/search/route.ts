import { NextRequest, NextResponse } from 'next/server'
import { guardSession, allowedCandidateIds } from '@/lib/auth'
import { qdrantClient, COLLECTION_NAME, initQdrantCollection } from '@/lib/qdrant'
import { generateEmbedding } from '@/services/embedding-service'

export async function GET(request: NextRequest) {
  try {
    const g = await guardSession()
    if (g.response) return g.response
    const allowed = await allowedCandidateIds(g.session) // undefined = admin
    if (allowed && allowed.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ error: 'Search query (q) is required' }, { status: 400 })
    }

    // Ensure collection is ready
    await initQdrantCollection()

    // Generate embedding for the search query
    const queryVector = await generateEmbedding(query)

    // Search Qdrant
    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryVector,
      limit: 10,
      with_payload: true,
      filter: allowed ? { must: [{ key: 'candidateId', match: { any: allowed } }] } : undefined
    })

    // Group chunks by candidateId to avoid returning the same candidate multiple times
    const candidatesMap = new Map()

    for (const result of searchResults) {
      const payload = result.payload as any
      if (!payload || !payload.candidateId) continue

      if (!candidatesMap.has(payload.candidateId)) {
        candidatesMap.set(payload.candidateId, {
          candidateId: payload.candidateId,
          name: payload.name,
          skills: payload.skills || [],
          category: payload.category,
          experienceLevel: payload.experienceLevel,
          matchScore: result.score // score from Qdrant, cosine similarity
        })
      } else {
        // If a candidate matches on multiple chunks, keep the highest score
        const existing = candidatesMap.get(payload.candidateId)
        if (result.score > existing.matchScore) {
          existing.matchScore = result.score
        }
      }
    }

    const matchedCandidates = Array.from(candidatesMap.values()).sort((a, b) => b.matchScore - a.matchScore)

    return NextResponse.json({ success: true, results: matchedCandidates })

  } catch (error: any) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
