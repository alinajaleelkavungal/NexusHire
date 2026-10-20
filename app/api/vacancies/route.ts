import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import prisma from '@/lib/prisma'
import { guardAdmin, guardSession } from '@/lib/auth'
import { listVacancies } from '@/lib/vacancies'
import { deleteResume, uploadPoster } from '@/services/resumeStorage'

const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export async function GET() {
  const g = await guardSession()
  if (g.response) return g.response
  return NextResponse.json({ vacancies: await listVacancies(g.session.role === 'ADMIN') })
}

// Admin only: post a new vacancy (multipart so an optional poster image can come along)
export async function POST(request: NextRequest) {
  const g = await guardAdmin()
  if (g.response) return g.response

  try {
    const form = await request.formData()
    const text = (key: string) => String(form.get(key) ?? '').trim()

    const title = text('title')
    if (!title) return NextResponse.json({ error: 'Job title is required' }, { status: 400 })
    if (title.length > 120) return NextResponse.json({ error: 'Job title is too long (max 120 characters)' }, { status: 400 })

    const details = text('details')
    if (details.length > 1500) return NextResponse.json({ error: 'Details are too long (max 1500 characters)' }, { status: 400 })

    const openingsRaw = text('openings')
    const openings = openingsRaw ? Number(openingsRaw) : null
    if (openings !== null && (!Number.isInteger(openings) || openings < 1 || openings > 10000)) {
      return NextResponse.json({ error: 'Openings must be a whole number of 1 or more' }, { status: 400 })
    }

    const closingDate = text('closingDate')
    if (closingDate && !/^\d{4}-\d{2}-\d{2}$/.test(closingDate)) {
      return NextResponse.json({ error: 'Closing date is not valid' }, { status: 400 })
    }

    // Optional poster image
    let imageKey: string | null = null
    const image = form.get('image')
    if (image instanceof File && image.size > 0) {
      const ext = image.name.split('.').pop()?.toLowerCase() ?? ''
      if (!IMAGE_TYPES[ext]) return NextResponse.json({ error: 'Poster must be a PNG, JPG or WEBP image' }, { status: 400 })
      if (image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Poster image must be under 5 MB' }, { status: 400 })
      const safeName = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      imageKey = (await uploadPoster(Buffer.from(await image.arrayBuffer()), safeName, IMAGE_TYPES[ext])).key
    }

    const id = `vac_${randomBytes(10).toString('hex')}`
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO Vacancy (id, title, company, location, openings, details, imageKey, closingDate, postedBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, title, text('company') || null, text('location') || null, openings, details || null,
        imageKey, closingDate || null, g.session.sub, Date.now()
      )
    } catch (dbError) {
      // Don't leave an orphaned image in the bucket
      if (imageKey) await deleteResume(imageKey).catch(() => {})
      throw dbError
    }

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to post vacancy:', error)
    return NextResponse.json({ error: 'Failed to post vacancy' }, { status: 500 })
  }
}
