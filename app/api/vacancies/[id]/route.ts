import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth'
import { deleteResume } from '@/services/resumeStorage'

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
