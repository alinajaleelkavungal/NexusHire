import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardCandidate } from '@/lib/auth'
import { deleteResumeFiles } from '@/services/resumeStorage'

export async function POST(request: NextRequest) {
  try {
    const { candidateId } = await request.json()

    if (!candidateId) {
      return NextResponse.json({ error: 'Missing candidateId' }, { status: 400 })
    }

    const g = await guardCandidate(candidateId)
    if (g.response) return g.response

    // Since Resumes, ChatHistory, RecruiterNotes, Interviews, and ActivityLogs are related,
    // we need to delete them first or ensure cascade delete is enabled.
    // In our schema, we don't have onDelete: Cascade set on most relations.
    // So we'll manually delete child records first.

    const resumes = await prisma.resume.findMany({ where: { candidateId }, select: { fileUrl: true } })

    await prisma.$transaction([
      prisma.resume.deleteMany({ where: { candidateId } }),
      prisma.chatHistory.deleteMany({ where: { candidateId } }),
      prisma.recruiterNote.deleteMany({ where: { candidateId } }),
      prisma.interview.deleteMany({ where: { candidateId } }),
      prisma.activityLog.deleteMany({ where: { candidateId } }),
      prisma.candidate.delete({ where: { id: candidateId } })
    ])

    await deleteResumeFiles(resumes.map(r => r.fileUrl))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete candidate:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
