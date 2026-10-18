import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { matchCandidatesToJob } from '@/services/job-matcher'
import { generateRecommendations } from '@/services/recommendation-engine'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const job = await prisma.jobDescription.findUnique({
      where: { id }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (!job.vector) {
      return NextResponse.json({ error: 'Job vector not found' }, { status: 400 })
    }

    const jobVector = JSON.parse(job.vector) as number[]

    // 1. Semantic Match via Qdrant
    const topMatches = await matchCandidatesToJob(jobVector, 10)

    if (topMatches.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    // 2. AI Reasoning & Recommendation via Gemini
    // We reconstruct the ParsedJobDescription for the recommendation engine
    const parsedJob = {
      jobTitle: job.jobTitle,
      company: job.company || undefined,
      department: job.department || undefined,
      employmentType: job.employmentType || undefined,
      location: job.location || undefined,
      requiredSkills: job.requiredSkills ? JSON.parse(job.requiredSkills) : [],
      preferredSkills: job.preferredSkills ? JSON.parse(job.preferredSkills) : [],
      responsibilities: job.responsibilities ? JSON.parse(job.responsibilities) : [],
      keywords: job.keywords ? JSON.parse(job.keywords) : [],
      minimumExperience: job.minimumExperience || undefined,
      education: job.education || undefined
    }

    const recommendations = await generateRecommendations(parsedJob, topMatches)

    return NextResponse.json({ success: true, results: recommendations })

  } catch (error) {
    console.error('Failed to get job matches:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
