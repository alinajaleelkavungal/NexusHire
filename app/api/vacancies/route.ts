import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import prisma from '@/lib/prisma'
import { guardAdmin, guardSession } from '@/lib/auth'
import { listVacancies, parseVacancyForm } from '@/lib/vacancies'
import { deleteResume, uploadPoster } from '@/services/resumeStorage'

export async function GET() {
  const g = await guardSession()
  if (g.response) return g.response
  return NextResponse.json({ vacancies: await listVacancies(g.session.role === 'ADMIN') })
}

// Post a new vacancy (multipart so an optional poster image can come along)
export async function POST(request: NextRequest) {
  const g = await guardSession()
  if (g.response) return g.response

  try {
    const parsed = parseVacancyForm(await request.formData())
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const v = parsed.values

    let imageKey: string | null = null
    if (v.image) {
      const safeName = `${Date.now()}-${v.image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      imageKey = (await uploadPoster(Buffer.from(await v.image.arrayBuffer()), safeName, v.imageContentType!)).key
    }

    const id = `vac_${randomBytes(10).toString('hex')}`
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO Vacancy (id, title, company, location, openings, details, imageKey, closingDate, postedBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, v.title, v.company, v.location, v.openings, v.details, imageKey, v.closingDate, g.session.sub, Date.now()
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
