import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth'
import { parseVacancyForm } from '@/lib/vacancies'
import { deleteResume, uploadPoster } from '@/services/resumeStorage'

// Admin only: edit a vacancy. The original posted date is kept.
// Multipart fields as when posting, plus optional `image` (replaces the poster) or `removeImage=1`.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin()
  if (g.response) return g.response

  try {
    const { id } = await params
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT imageKey FROM Vacancy WHERE id = ?`, id)
    if (rows.length === 0) return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
    const oldKey: string | null = rows[0].imageKey ?? null

    const parsed = parseVacancyForm(await request.formData())
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const v = parsed.values

    // Decide the poster: new upload > remove > keep
    let newKey: string | null = oldKey
    let uploadedKey: string | null = null
    if (v.image) {
      const safeName = `${Date.now()}-${v.image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      uploadedKey = (await uploadPoster(Buffer.from(await v.image.arrayBuffer()), safeName, v.imageContentType!)).key
      newKey = uploadedKey
    } else if (v.removeImage) {
      newKey = null
    }

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE Vacancy SET title = ?, company = ?, location = ?, openings = ?, details = ?, imageKey = ?, closingDate = ? WHERE id = ?`,
        v.title, v.company, v.location, v.openings, v.details, newKey, v.closingDate, id
      )
    } catch (dbError) {
      if (uploadedKey) await deleteResume(uploadedKey).catch(() => {})
      throw dbError
    }

    // The old poster is only removed once the database points at the new state
    if (oldKey && oldKey !== newKey) {
      await deleteResume(oldKey).catch(err => console.error('Failed to delete old poster:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to edit vacancy:', error)
    return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 })
  }
}

// Admin only: take a vacancy down (and remove its poster image)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin()
  if (g.response) return g.response

  const { id } = await params
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT imageKey FROM Vacancy WHERE id = ?`, id)
  if (rows.length === 0) return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })

  await prisma.$executeRawUnsafe(`DELETE FROM Vacancy WHERE id = ?`, id)
  if (rows[0].imageKey) {
    await deleteResume(rows[0].imageKey).catch(err => console.error('Failed to delete poster image:', err))
  }
  return NextResponse.json({ success: true })
}
