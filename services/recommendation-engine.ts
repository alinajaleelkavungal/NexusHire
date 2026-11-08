import ai from '@/lib/gemini'
import prisma from '@/lib/prisma'
import { CandidateMatch } from './job-matcher'
import { ParsedJobDescription } from './job-analyzer'

export interface CandidateRecommendation {
  candidateId: string
  candidateName: string
  matchScore: number
  reasons: string[]
  missingSkills: string[]
  matchedSkills: string[]
  recommendedSkillsToLearn: string[]
  recommendationLabel: 'Highly Recommended' | 'Recommended' | 'Potential Candidate' | 'Not Suitable'
  jobCategory?: string
  experienceLevel?: string
  resumeSummary?: string
}

export async function generateRecommendations(
  jobDesc: ParsedJobDescription,
  candidates: CandidateMatch[]
): Promise<CandidateRecommendation[]> {
  
  if (candidates.length === 0) return []

  // Fetch full profiles to send to Gemini for accurate reasoning
  const fullProfiles = await prisma.candidate.findMany({
    where: { id: { in: candidates.map(c => c.candidateId) } }
  })

  // Process top 5 candidates
  const profilesToProcess = candidates.slice(0, 5)
  const recommendations: CandidateRecommendation[] = []

  for (const match of profilesToProcess) {
    const profile = fullProfiles.find(p => p.id === match.candidateId)
    if (!profile) continue

    const prompt = `You are an expert technical recruiter AI.
Analyze the Candidate against the Job Description.

--- JOB DESCRIPTION ---
Title: ${jobDesc.jobTitle}
Experience: ${jobDesc.minimumExperience || 'Not specified'}
Required Skills: ${(jobDesc.requiredSkills || []).join(', ')}
Preferred Skills: ${(jobDesc.preferredSkills || []).join(', ')}
Responsibilities: ${(jobDesc.responsibilities || []).join(', ')}

--- CANDIDATE PROFILE ---
Name: ${profile.name}
Summary: ${profile.professionalSummary || 'None'}
Skills: ${profile.skills || 'None'}
Experience: ${profile.experience || profile.yearsOfExperience || 'None'}
Education: ${profile.education || 'None'}
Projects: ${profile.projects || 'None'}

Instructions:
1. Provide an overall matchScore from 0 to 100 based strictly on overlap of skills, experience, and job requirements.
2. Provide 'reasons' array explaining why they scored well (e.g. "✓ Python", "✓ 3 years experience").
3. Provide 'missingSkills' array (skills required by job but not found in profile).
4. Provide 'matchedSkills' array (skills in both).
5. Provide 'recommendedSkillsToLearn' array to bridge the gap.
6. Provide a recommendationLabel exactly matching one of these: "Highly Recommended", "Recommended", "Potential Candidate", "Not Suitable".
  - >85: Highly Recommended
  - 70-85: Recommended
  - 50-70: Potential Candidate
  - <50: Not Suitable

Return ONLY valid JSON matching this schema:
{
  "matchScore": number,
  "reasons": string[],
  "missingSkills": string[],
  "matchedSkills": string[],
  "recommendedSkillsToLearn": string[],
  "recommendationLabel": string
}
`
    let added = false
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      })
      
      const text = response.text
      if (text) {
        const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
        const parsed = JSON.parse(clean)
        recommendations.push({
          candidateId: match.candidateId,
          candidateName: match.candidateName,
          matchScore: parsed.matchScore || Math.round(match.vectorScore * 100),
          reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
          missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
          matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
          recommendedSkillsToLearn: Array.isArray(parsed.recommendedSkillsToLearn) ? parsed.recommendedSkillsToLearn : [],
          recommendationLabel: parsed.recommendationLabel || 'Recommended',
          jobCategory: match.jobCategory,
          experienceLevel: match.experienceLevel,
          resumeSummary: match.resumeSummary
        })
        added = true
      }
    } catch (e) {
      console.warn('Gemini recommendation call skipped/failed, using structured reasoning generator:', e)
    }

    // Safety fallback generator if AI call failed
    if (!added) {
      const score = Math.round((match.vectorScore || 0.75) * 100)
      const label: 'Highly Recommended' | 'Recommended' | 'Potential Candidate' = 
        score >= 85 ? 'Highly Recommended' : score >= 65 ? 'Recommended' : 'Potential Candidate'
      
      const matched = match.topSkills.length > 0 
        ? match.topSkills 
        : [match.jobCategory].filter(Boolean) as string[]

      const reasons = [
        `Role alignment: Candidate category (${match.jobCategory || 'Specialized'}) matches ${jobDesc.jobTitle}`,
        match.experienceLevel ? `Verified experience: ${match.experienceLevel}` : 'Active resume in talent pool'
      ]

      if (profile.sector) {
        reasons.push(`Domain sector: ${profile.sector}`)
      }

      recommendations.push({
        candidateId: match.candidateId,
        candidateName: match.candidateName,
        matchScore: score,
        reasons,
        missingSkills: [],
        matchedSkills: matched,
        recommendedSkillsToLearn: [],
        recommendationLabel: label,
        jobCategory: match.jobCategory,
        experienceLevel: match.experienceLevel,
        resumeSummary: match.resumeSummary
      })
    }
  }

  // Sort by match score descending
  return recommendations.sort((a, b) => b.matchScore - a.matchScore)
}
