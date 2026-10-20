import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession, canAccessCandidate, allowedCandidateIds } from '@/lib/auth'

/**
 * Normalise a name for loose comparison:
 * lowercase, collapse whitespace, strip punctuation.
 */
function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Simple character-overlap similarity between two strings (0–1).
 * Fast enough for short names; no external deps needed.
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0

  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a

  // Sliding-window overlap
  let matches = 0
  const usedIndices = new Set<number>()
  for (let i = 0; i < shorter.length; i++) {
    const ch = shorter[i]
    const start = Math.max(0, i - 2)
    const end = Math.min(longer.length, i + 3)
    for (let j = start; j < end; j++) {
      if (!usedIndices.has(j) && longer[j] === ch) {
        matches++
        usedIndices.add(j)
        break
      }
    }
  }

  return matches / longer.length
}

export async function POST(request: NextRequest) {
  try {
    const g = await guardSession()
    if (g.response) return g.response

    const body = await request.json()
    const candidateId: string | undefined = body.candidateId
    let newCandidate: { id: string | null; name: string; email: string | null } | null = null

    if (candidateId) {
      if (!(await canAccessCandidate(g.session, candidateId))) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
      }
      newCandidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { id: true, name: true, email: true }
      })
      if (!newCandidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
      }
    } else if (typeof body.name === 'string' && body.name.trim()) {
      // Pre-save check: nothing is stored yet, so match on the typed name
      newCandidate = { id: null, name: body.name.trim(), email: null }
    } else {
      return NextResponse.json({ error: 'candidateId or name is required' }, { status: 400 })
    }

    // Fetch all *other* candidates (exclude the new one, if it exists)
    const visibleIds = await allowedCandidateIds(g.session) // undefined = admin (everything)
    const allOthers = await prisma.candidate.findMany({
      where: candidateId ? { id: { not: candidateId } } : {},
      select: { id: true, name: true, email: true }
    })
    const others = visibleIds ? allOthers.filter(o => visibleIds.includes(o.id)) : allOthers

    // ── Priority 1: Email match ──────────────────────────────────────────
    if (newCandidate.email) {
      const emailMatch = others.find(
        o => o.email && o.email.toLowerCase().trim() === newCandidate.email!.toLowerCase().trim()
      )
      if (emailMatch) {
        return NextResponse.json({ duplicate: emailMatch, matchedOn: 'email' })
      }
    }

    // ── Priority 2: Name similarity (≥ 85% or one name contains the other) ─
    const newNorm = normaliseName(newCandidate.name)

    for (const other of others) {
      const otherNorm = normaliseName(other.name)

      const containsMatch =
        newNorm.includes(otherNorm) || otherNorm.includes(newNorm)
      const simScore = similarity(newNorm, otherNorm)

      if (containsMatch || simScore >= 0.85) {
        return NextResponse.json({ duplicate: other, matchedOn: 'name' })
      }
    }

    // No duplicate found
    return NextResponse.json({ duplicate: null })
  } catch (error: any) {
    console.error('check-duplicate error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
