import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardCandidate } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const g = await guardCandidate(id)
    if (g.response) return g.response
    const notes = await prisma.recruiterNote.findMany({
      where: { candidateId: id },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, notes })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const g = await guardCandidate(id)
    if (g.response) return g.response
    const { content } = await request.json()
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })

    const note = await prisma.recruiterNote.create({
      data: {
        candidateId: id,
        content
      }
    })
    return NextResponse.json({ success: true, note })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const g = await guardCandidate(id)
    if (g.response) return g.response
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('noteId')
    
    if (!noteId) return NextResponse.json({ error: 'Note ID required' }, { status: 400 })

    await prisma.recruiterNote.delete({
      where: { id: noteId, candidateId: id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
