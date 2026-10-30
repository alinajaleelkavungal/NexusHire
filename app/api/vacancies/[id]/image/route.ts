import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getResumeDownloadUrl } from '@/services/resumeStorage'

// Serves the vacancy poster image directly with caching so the browser
// receives an HTTP 200 directly from the same origin, avoiding CORS,
// cross-origin redirect, and referrer-policy issues.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT imageKey FROM Vacancy WHERE id = ?`, id)
    if (rows.length === 0 || !rows[0].imageKey) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const imageKey = rows[0].imageKey

    // Generate signed download URL and fetch content server-side to stream directly to client
    let signedUrl = await getResumeDownloadUrl(imageKey, 300)
    let b2Res = await fetch(signedUrl)

    if (!b2Res.ok && (b2Res.status === 403 || b2Res.status === 404)) {
      const fallbackUrl = await getResumeDownloadUrl(imageKey, 300, { bucket: 'resume.iq.storage.jaleel' })
      const fallbackRes = await fetch(fallbackUrl)
      if (fallbackRes.ok) {
        b2Res = fallbackRes
      }
    }

    if (!b2Res.ok) {
      return NextResponse.json({ error: 'Failed to retrieve image from storage' }, { status: b2Res.status })
    }

    const arrayBuffer = await b2Res.arrayBuffer()
    const contentType = b2Res.headers.get('content-type') || 'image/png'

    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(arrayBuffer.byteLength),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error: any) {
    console.error('Failed to stream vacancy image:', error)
    return NextResponse.json({
      error: 'Image not accessible',
      details: String(error?.message || error),
    }, { status: 500 })
  }
}
