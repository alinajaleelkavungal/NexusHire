import { NextRequest, NextResponse } from 'next/server'
import { guardSession, listCandidatesFor } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const g = await guardSession()
    if (g.response) return g.response
    const candidates = await listCandidatesFor(g.session)
    return NextResponse.json({ success: true, candidates })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
