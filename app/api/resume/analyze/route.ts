import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardCandidate } from '@/lib/auth'
import { analyzeResumeText } from '@/services/resume-analyzer'

export async function POST(request: NextRequest) {
  try {
    const { resumeId } = await request.json()

    if (!resumeId) {
      return NextResponse.json({ error: 'resumeId is required' }, { status: 400 })
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: { candidate: true }
    })

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    const g = await guardCandidate(resume.candidateId)
    if (g.response) return g.response

    if (!resume.extractedText) {
      return NextResponse.json({ error: 'No extracted text found for this resume' }, { status: 400 })
    }

    // Update status to PROCESSING
    await prisma.resume.update({
      where: { id: resume.id },
      data: { processingStatus: 'PROCESSING' }
    })

    let candidateInfo = null
    try {
      candidateInfo = await analyzeResumeText(resume.extractedText)
    } catch (error) {
      // Handle AI failure
      await prisma.resume.update({
        where: { id: resume.id },
        data: { processingStatus: 'FAILED' }
      })
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
    }

    if (!candidateInfo) {
      await prisma.resume.update({
        where: { id: resume.id },
        data: { processingStatus: 'FAILED' }
      })
      return NextResponse.json({ error: 'AI returned empty response' }, { status: 500 })
    }

    // Update the Candidate with AI structured data
    const updatedCandidate = await prisma.candidate.update({
      where: { id: resume.candidateId },
      data: {
        name: candidateInfo.name || resume.candidate.name,
        email: candidateInfo.email || resume.candidate.email,
        phone: candidateInfo.phone || resume.candidate.phone,
        location: candidateInfo.location || resume.candidate.location,
        professionalSummary: candidateInfo.professionalSummary || resume.candidate.professionalSummary,
        skills: JSON.stringify(candidateInfo.skills),
        education: JSON.stringify(candidateInfo.education),
        experience: JSON.stringify(candidateInfo.experience),
        projects: JSON.stringify(candidateInfo.projects),
        certifications: JSON.stringify(candidateInfo.certifications),
        languages: JSON.stringify(candidateInfo.languages),
        recommendedRole: candidateInfo.recommendedRole || resume.candidate.recommendedRole,
        experienceLevel: candidateInfo.experienceLevel || resume.candidate.experienceLevel,
        sector: candidateInfo.sector || resume.candidate.sector,
      }
    })

    // Mark as completed
    await prisma.resume.update({
      where: { id: resume.id },
      data: { processingStatus: 'COMPLETED' }
    })

    return NextResponse.json({ success: true, message: 'Analysis completed successfully', candidate: updatedCandidate })

  } catch (error: any) {
    console.error('Analyze API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
