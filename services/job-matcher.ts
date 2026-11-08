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

export interface JobMatchingContext {
  jobTitle?: string
  minimumExperience?: string
  requiredSkills?: string[]
  location?: string
  rawText?: string
}

/**
 * Searches Qdrant for semantic candidate matches with automatic fallback to database hybrid matching
 * when vector database is empty or offline.
 */
export async function matchCandidatesToJob(
  jobVector: number[],
  topK: number = 10,
  allowedIds?: string[],
  jobContext?: JobMatchingContext
): Promise<CandidateMatch[]> {
  if (allowedIds && allowedIds.length === 0) return []

  let sortedCandidateIds: string[] = []
  const candidateScores = new Map<string, number>()

  // 1. Try Qdrant semantic vector search
  try {
    await initQdrantCollection()
    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: jobVector,
      limit: topK * 3,
      with_payload: true,
      filter: allowedIds ? { must: [{ key: 'candidateId', match: { any: allowedIds } }] } : undefined
    })

    for (const result of searchResults) {
      const payload = result.payload as any
      if (!payload || !payload.candidateId) continue

      const currentScore = candidateScores.get(payload.candidateId) || 0
      if (result.score > currentScore) {
        candidateScores.set(payload.candidateId, result.score)
      }
    }

    sortedCandidateIds = Array.from(candidateScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(entry => entry[0])
  } catch (qdrantErr) {
    console.warn('Qdrant vector search not available, falling back to database matching:', qdrantErr)
  }

  // If Qdrant found matches, return them
  if (sortedCandidateIds.length > 0) {
    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: sortedCandidateIds }
      }
    })

    return sortedCandidateIds.map(id => {
      const candidate = candidates.find(c => c.id === id)
      if (!candidate) return null

      let skills: string[] = []
      try {
        skills = candidate.skills ? JSON.parse(candidate.skills) : []
      } catch {}

      if (skills.length === 0 && (candidate.category || candidate.sector)) {
        skills = [candidate.category, candidate.sector].filter(Boolean) as string[]
      }

      return {
        candidateId: candidate.id,
        candidateName: candidate.name,
        jobCategory: candidate.category || candidate.sector || undefined,
        experienceLevel: candidate.yearsOfExperience || candidate.experienceLevel || undefined,
        topSkills: skills.slice(0, 8),
        resumeSummary: candidate.professionalSummary || `${candidate.category || 'Candidate'} with ${candidate.yearsOfExperience || 'relevant experience'}.`,
        vectorScore: candidateScores.get(id) || 0.75
      }
    }).filter(Boolean) as CandidateMatch[]
  }

  // 2. Database Hybrid Matcher Fallback
  // Matches candidates directly in Prisma using category, role, experience, sector, and resume text
  const candidates = await prisma.candidate.findMany({
    where: allowedIds ? { id: { in: allowedIds } } : undefined,
    include: {
      resumes: {
        select: { extractedText: true }
      }
    }
  })

  if (candidates.length === 0) return []

  const titleWords = (jobContext?.jobTitle || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['and', 'for', 'the', 'with', 'from', 'this', 'that'].includes(w))

  const skillsWords = (jobContext?.requiredSkills || [])
    .map(s => s.toLowerCase().trim())
    .filter(Boolean)

  const expTargetYears = parseInt(jobContext?.minimumExperience || '0', 10) || 0

  const scored = candidates.map(c => {
    let score = 0
    const catLower = (c.category || '').toLowerCase()
    const sectorLower = (c.sector || '').toLowerCase()
    const roleLower = (c.recommendedRole || '').toLowerCase()
    const nameLower = (c.name || '').toLowerCase()
    const summaryLower = (c.professionalSummary || '').toLowerCase()
    const resumeTextLower = (c.resumes?.[0]?.extractedText || '').toLowerCase().slice(0, 4000)

    // Role & Category Matching
    for (const word of titleWords) {
      if (catLower.includes(word)) score += 35
      else if (roleLower.includes(word)) score += 30
      else if (sectorLower.includes(word)) score += 20
      else if (nameLower.includes(word)) score += 15
      else if (summaryLower.includes(word) || resumeTextLower.includes(word)) score += 10
    }

    // Skills Matching
    for (const skill of skillsWords) {
      const sw = skill.toLowerCase()
      if (catLower.includes(sw) || roleLower.includes(sw)) score += 20
      else if (summaryLower.includes(sw) || resumeTextLower.includes(sw)) score += 12
    }

    // Experience Matching
    const candExpYears = parseInt(c.yearsOfExperience || '0', 10) || 0
    if (expTargetYears > 0 && candExpYears > 0) {
      if (candExpYears >= expTargetYears) {
        score += 25
      } else if (candExpYears >= expTargetYears - 1) {
        score += 15
      }
    } else if (c.yearsOfExperience && !c.yearsOfExperience.toLowerCase().includes('fresher')) {
      score += 10
    }

    // Normalized match score between 0.35 and 0.96
    const normalizedScore = score >= 25 ? Math.min(0.96, Math.max(0.40, score / 100)) : 0

    return {
      candidate: c,
      score: normalizedScore
    }
  })

  const matchedOnly = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return matchedOnly.map(m => {
    const c = m.candidate
    let skills: string[] = []
    try {
      skills = c.skills ? JSON.parse(c.skills) : []
    } catch {}

    if (skills.length === 0 && (c.category || c.sector)) {
      skills = [c.category, c.sector].filter(Boolean) as string[]
    }

    return {
      candidateId: c.id,
      candidateName: c.name,
      jobCategory: c.category || c.sector || undefined,
      experienceLevel: c.yearsOfExperience || c.experienceLevel || undefined,
      topSkills: skills.slice(0, 8),
      resumeSummary: c.professionalSummary || `${c.category || 'Candidate'} with ${c.yearsOfExperience || 'experience'}.`,
      vectorScore: m.score
    }
  })
}
