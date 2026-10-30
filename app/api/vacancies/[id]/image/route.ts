import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { b2Client, B2_BUCKET_NAME } from '@/lib/b2'
import { GetObjectCommand } from '@aws-sdk/client-s3'

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

    const s3Res = await b2Client.send(new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: imageKey,
    }))

    if (!s3Res.Body) {
      return NextResponse.json({ error: 'Image empty' }, { status: 404 })
    }

    const bytes = await s3Res.Body.transformToByteArray()
    const contentType = s3Res.ContentType || 'image/png'

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error: any) {
    console.error('Failed to stream vacancy image:', error)
    return NextResponse.json({
      error: 'Image not accessible',
      details: String(error?.stack || error?.message || error),
    }, { status: 500 })
  }
}
