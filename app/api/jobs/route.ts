import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession } from '@/lib/auth'
import { analyzeJobDescription } from '@/services/job-analyzer'
import { generateEmbedding } from '@/services/embedding-service'

export async function GET() {
  try {
    const g = await guardSession()
    if (g.response) return g.response

    const jobs = await prisma.jobDescription.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, jobs })
  } catch (error) {
    console.error('Failed to fetch jobs', error)
    return NextResponse.json({ error: 'Failed to fetch job descriptions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const g = await guardSession()
    if (g.response) return g.response

    const body = await request.json().catch(() => ({}))
    const rawText = (body.rawText || '').trim()

    if (!rawText) {
      return NextResponse.json({ error: 'Please enter a job description or role name.' }, { status: 400 })
    }

    // 1. Analyze JD with Gemini (guaranteed fallback if brief or AI fails)
    const parsedJob = await analyzeJobDescription(rawText)

    // 2. Generate vector embedding for semantic matching
    const skills = Array.isArray(parsedJob.requiredSkills) ? parsedJob.requiredSkills : []
    const responsibilities = Array.isArray(parsedJob.responsibilities) ? parsedJob.responsibilities : []
    const textToEmbed = `Title: ${parsedJob.jobTitle}
Skills: ${skills.join(', ')}
Responsibilities: ${responsibilities.join(' ')}`
    
    const vector = await generateEmbedding(textToEmbed)

    // 3. Save to database
    const job = await prisma.jobDescription.create({
      data: {
        rawText,
        jobTitle: parsedJob.jobTitle,
        company: parsedJob.company || null,
        department: parsedJob.department || null,
        employmentType: parsedJob.employmentType || null,
        location: parsedJob.location || null,
        requiredSkills: JSON.stringify(skills),
        preferredSkills: JSON.stringify(Array.isArray(parsedJob.preferredSkills) ? parsedJob.preferredSkills : []),
        responsibilities: JSON.stringify(responsibilities),
        keywords: JSON.stringify(Array.isArray(parsedJob.keywords) ? parsedJob.keywords : []),
        minimumExperience: parsedJob.minimumExperience || null,
        education: parsedJob.education || null,
        vector: JSON.stringify(vector)
      }
    })

    return NextResponse.json({ success: true, job })

  } catch (error: any) {
    console.error('Failed to create job', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to analyze and save job description. Please try again.' 
    }, { status: 500 })
  }
}
