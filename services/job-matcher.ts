import { qdrantClient, COLLECTION_NAME, initQdrantCollection } from '@/lib/qdrant'
import prisma from '@/lib/prisma'

export interface CandidateMatch {
  candidateId: string
  candidateName: string
  jobCategory?: string
  experienceLevel?: string
  topSkills: string[]
  resumeSummary?: string
  vectorScore: number
}

/**
 * Searches Qdrant for the best candidate matches using the Job Description vector.
 */
export async function matchCandidatesToJob(
  jobVector: number[],
  topK: number = 10,
  allowedIds?: string[] // undefined = unrestricted; otherwise only these candidates
): Promise<CandidateMatch[]> {
  if (allowedIds && allowedIds.length === 0) return []
  await initQdrantCollection()

  // We search for top chunks, maybe a larger number since multiple chunks belong to the same candidate
  const searchResults = await qdrantClient.search(COLLECTION_NAME, {
    vector: jobVector,
    limit: topK * 3, // over-fetch to ensure we get enough unique candidates
    with_payload: true,
    filter: allowedIds ? { must: [{ key: 'candidateId', match: { any: allowedIds } }] } : undefined
  })

  // Group by candidateId to find their highest matching chunk
  const candidateScores = new Map<string, number>()

  for (const result of searchResults) {
    const payload = result.payload as any
    if (!payload || !payload.candidateId) continue

    const currentScore = candidateScores.get(payload.candidateId) || 0
    if (result.score > currentScore) {
      candidateScores.set(payload.candidateId, result.score)
    }
  }

  // Sort and take top K candidates
  const sortedCandidateIds = Array.from(candidateScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(entry => entry[0])

  if (sortedCandidateIds.length === 0) {
    return []
  }

  // Fetch full candidate details from PostgreSQL / SQLite
  const candidates = await prisma.candidate.findMany({
    where: {
      id: {
        in: sortedCandidateIds
      }
    }
  })

  // Map the results back to the sorted order with their scores
  const matches: CandidateMatch[] = sortedCandidateIds.map(id => {
    const candidate = candidates.find(c => c.id === id)
    if (!candidate) return null

    let skills: string[] = []
    try {
      skills = candidate.skills ? JSON.parse(candidate.skills) : []
    } catch(e) {}

    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      jobCategory: candidate.category || undefined,
      experienceLevel: candidate.experienceLevel || undefined,
      topSkills: skills.slice(0, 8),
      resumeSummary: candidate.professionalSummary || undefined,
      vectorScore: candidateScores.get(id) || 0
    }
  }).filter(Boolean) as CandidateMatch[]

  return matches
}
