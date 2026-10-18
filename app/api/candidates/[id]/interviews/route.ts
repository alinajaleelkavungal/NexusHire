import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const interviews = await prisma.interview.findMany({
      where: { candidateId: id },
      orderBy: { date: 'asc' }
    })
    return NextResponse.json({ success: true, interviews })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await request.json()
    const { interviewer, date, time, type, location, meetingLink } = data

    const interview = await prisma.interview.create({
      data: {
        candidateId: id,
        interviewer,
        date: date ? new Date(date) : null,
        time,
        type,
        location,
        meetingLink,
        status: 'Scheduled'
      }
    })

    // Log the activity
    await prisma.activityLog.create({
      data: {
        candidateId: id,
        action: 'Interview Scheduled',
        description: `${type || 'Interview'} with ${interviewer || 'interviewer'}`
      }
    })

    return NextResponse.json({ success: true, interview })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
