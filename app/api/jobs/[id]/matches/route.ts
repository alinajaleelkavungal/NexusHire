import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession, allowedCandidateIds } from '@/lib/auth'
import { matchCandidatesToJob } from '@/services/job-matcher'
import { generateRecommendations } from '@/services/recommendation-engine'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await guardSession()
    if (g.response) return g.response

    const { id } = await params
    const job = await prisma.jobDescription.findUnique({
      where: { id }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    let jobVector: number[] = []
    try {
      jobVector = job.vector ? JSON.parse(job.vector) : []
    } catch {
      jobVector = []
    }

    // Reconstruct parsed job specification
    let requiredSkills: string[] = []
    let preferredSkills: string[] = []
    let responsibilities: string[] = []
    let keywords: string[] = []

    try { requiredSkills = job.requiredSkills ? JSON.parse(job.requiredSkills) : [] } catch {}
    try { preferredSkills = job.preferredSkills ? JSON.parse(job.preferredSkills) : [] } catch {}
    try { responsibilities = job.responsibilities ? JSON.parse(job.responsibilities) : [] } catch {}
    try { keywords = job.keywords ? JSON.parse(job.keywords) : [] } catch {}

    const parsedJob = {
      jobTitle: job.jobTitle,
      company: job.company || undefined,
      department: job.department || undefined,
      employmentType: job.employmentType || undefined,
      location: job.location || undefined,
      requiredSkills,
      preferredSkills,
      responsibilities,
      keywords,
      minimumExperience: job.minimumExperience || undefined,
      education: job.education || undefined
    }

    // 1. Semantic Match via Qdrant + Hybrid Database Matcher
    const topMatches = await matchCandidatesToJob(
      jobVector,
      10,
      await allowedCandidateIds(g.session),
      {
        jobTitle: parsedJob.jobTitle,
        minimumExperience: parsedJob.minimumExperience,
        requiredSkills: parsedJob.requiredSkills,
        location: parsedJob.location,
        rawText: job.rawText
      }
    )

    if (topMatches.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    // 2. AI Reasoning & Recommendation via Gemini (with guaranteed fallback)
    const recommendations = await generateRecommendations(parsedJob, topMatches)

    return NextResponse.json({ success: true, results: recommendations })

  } catch (error) {
    console.error('Failed to get job matches:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
