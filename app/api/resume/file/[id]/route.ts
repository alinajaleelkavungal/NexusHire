import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getResumeDownloadUrl, isB2Key } from '@/services/resumeStorage'

// Redirects to a short-lived signed Backblaze URL (or the legacy local path)
// so the bucket can stay private.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const resume = await prisma.resume.findUnique({ where: { id } })

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    if (!isB2Key(resume.fileUrl)) {
      return NextResponse.redirect(new URL(resume.fileUrl, _request.url))
    }

    const signedUrl = await getResumeDownloadUrl(resume.fileUrl, 600, {
      fileName: resume.fileName,
      contentType: resume.fileType,
    })
    return NextResponse.redirect(signedUrl)
  } catch (error: any) {
    console.error('Failed to generate resume URL:', error)
    return NextResponse.json({ error: 'Failed to load resume' }, { status: 500 })
  }
}
