import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardCandidate } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const g = await guardCandidate(id)
    if (g.response) return g.response
    const activities = await prisma.activityLog.findMany({
      where: { candidateId: id },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, activities })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}