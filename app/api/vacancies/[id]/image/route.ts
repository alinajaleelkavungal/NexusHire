import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession } from '@/lib/auth'
import { getResumeDownloadUrl } from '@/services/resumeStorage'

// Redirects to a short-lived signed Backblaze link so the bucket stays private.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardSession()
  if (g.response) return g.response

  const { id } = await params
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT imageKey FROM Vacancy WHERE id = ?`, id)
  if (rows.length === 0 || !rows[0].imageKey) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  // Long enough for a page view; images are re-signed on every load
  return NextResponse.redirect(await getResumeDownloadUrl(rows[0].imageKey, 3600))
}
