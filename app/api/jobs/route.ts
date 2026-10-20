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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const g = await guardSession()
    if (g.response) return g.response

    const { rawText } = await request.json()

    if (!rawText) {
      return NextResponse.json({ error: 'rawText is required' }, { status: 400 })
    }

    // 1. Analyze JD with Gemini
    const parsedJob = await analyzeJobDescription(rawText)

    // 2. Generate vector embedding for semantic matching later
    // We'll embed Title + Skills + Responsibilities for the highest density vector
    const textToEmbed = `Title: ${parsedJob.jobTitle}
Skills: ${parsedJob.requiredSkills.join(', ')}
Responsibilities: ${parsedJob.responsibilities.join(' ')}`
    
    const vector = await generateEmbedding(textToEmbed)

    // 3. Save to database
    const job = await prisma.jobDescription.create({
      data: {
        rawText,
        jobTitle: parsedJob.jobTitle,
        company: parsedJob.company,
        department: parsedJob.department,
        employmentType: parsedJob.employmentType,
        location: parsedJob.location,
        requiredSkills: JSON.stringify(parsedJob.requiredSkills),
        preferredSkills: JSON.stringify(parsedJob.preferredSkills),
        responsibilities: JSON.stringify(parsedJob.responsibilities),
        keywords: JSON.stringify(parsedJob.keywords),
        minimumExperience: parsedJob.minimumExperience,
        education: parsedJob.education,
        vector: JSON.stringify(vector) // Store vector as JSON string array to avoid re-embedding
      }
    })

    return NextResponse.json({ success: true, job })

  } catch (error) {
    console.error('Failed to create job', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
