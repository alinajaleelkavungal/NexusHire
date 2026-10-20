import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession, filterAccessibleIds } from '@/lib/auth'
import { deleteResumeFiles } from '@/services/resumeStorage'

export async function POST(request: NextRequest) {
  try {
    const { action, candidateIds: requestedIds, status } = await request.json()

    if (!Array.isArray(requestedIds) || requestedIds.length === 0) {
      return NextResponse.json({ error: 'candidateIds must be a non-empty array' }, { status: 400 })
    }

    const g = await guardSession()
    if (g.response) return g.response

    // Branches can only act on their own candidates; anything else is silently ignored
    const candidateIds = await filterAccessibleIds(g.session, requestedIds)
    if (candidateIds.length === 0) {
      return NextResponse.json({ error: 'No matching candidates' }, { status: 404 })
    }

    if (action === 'delete') {
      const resumes = await prisma.resume.findMany({
        where: { candidateId: { in: candidateIds } },
        select: { fileUrl: true },
      })

      // Cascade delete: remove all related records first, then delete candidates
      await prisma.$transaction([
        prisma.resume.deleteMany({ where: { candidateId: { in: candidateIds } } }),
        prisma.chatHistory.deleteMany({ where: { candidateId: { in: candidateIds } } }),
        prisma.recruiterNote.deleteMany({ where: { candidateId: { in: candidateIds } } }),
        prisma.interview.deleteMany({ where: { candidateId: { in: candidateIds } } }),
        prisma.activityLog.deleteMany({ where: { candidateId: { in: candidateIds } } }),
        prisma.candidate.deleteMany({ where: { id: { in: candidateIds } } }),
      ])
      await deleteResumeFiles(resumes.map(r => r.fileUrl))
      return NextResponse.json({ success: true, deleted: candidateIds.length })
    }

    if (action === 'status') {
      if (!status) {
        return NextResponse.json({ error: 'status is required for status action' }, { status: 400 })
      }
      await prisma.candidate.updateMany({
        where: { id: { in: candidateIds } },
        data: { recruitmentStage: status }
      })
      return NextResponse.json({ success: true, updated: candidateIds.length })
    }

    return NextResponse.json({ error: 'Invalid action. Use "delete" or "status".' }, { status: 400 })
  } catch (error: any) {
    console.error('bulk-action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
