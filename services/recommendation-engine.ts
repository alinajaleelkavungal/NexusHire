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

  // To avoid overwhelming context window or timeouts, process in batches or just process top 5 for the UI MVP
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
Required Skills: ${jobDesc.requiredSkills.join(', ')}
Preferred Skills: ${jobDesc.preferredSkills.join(', ')}
Responsibilities: ${jobDesc.responsibilities.join(', ')}

--- CANDIDATE PROFILE ---
Name: ${profile.name}
Summary: ${profile.professionalSummary || 'None'}
Skills: ${profile.skills || 'None'}
Experience: ${profile.experience || 'None'}
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
        const parsed = JSON.parse(text)
        recommendations.push({
          candidateId: match.candidateId,
          candidateName: match.candidateName,
          matchScore: parsed.matchScore || Math.round(match.vectorScore * 100),
          reasons: parsed.reasons || [],
          missingSkills: parsed.missingSkills || [],
          matchedSkills: parsed.matchedSkills || [],
          recommendedSkillsToLearn: parsed.recommendedSkillsToLearn || [],
          recommendationLabel: parsed.recommendationLabel || 'Potential Candidate',
          jobCategory: match.jobCategory,
          experienceLevel: match.experienceLevel,
          resumeSummary: match.resumeSummary
        })
      }
    } catch (e) {
      console.error('Failed to generate recommendation for candidate', match.candidateId, e)
    }
  }

  // Sort by final AI match score descending
  return recommendations.sort((a, b) => b.matchScore - a.matchScore)
}
