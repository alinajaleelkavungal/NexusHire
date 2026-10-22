import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardCandidate } from '@/lib/auth'

// Fields the edit form owns. `name` is included so it stays editable, but it is only
// written when the caller actually sends it — otherwise the existing name is kept.
const TEXT_FIELDS = ['name', 'sector', 'category', 'yearsOfExperience'] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidateId } = body

    if (!candidateId) {
      return NextResponse.json({ error: 'Missing candidateId' }, { status: 400 })
    }

    const g = await guardCandidate(candidateId)
    if (g.response) return g.response

    const text = (value: unknown) => (typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim())

    // Agent is always mandatory, on create and on edit
    const agent = text(body.agent)
    if (!agent) {
      return NextResponse.json({ error: 'Agent is required' }, { status: 400 })
    }

    const sets: string[] = []
    const values: unknown[] = []
    const assign = (column: string, value: unknown) => {
      sets.push(`${column} = ?`)
      values.push(value)
    }

    for (const field of TEXT_FIELDS) {
      if (body[field] === undefined) continue // not part of this edit: leave it untouched
      const value = text(body[field])
      if (field === 'name' && !value) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      assign(field, value || null)
    }

    if (body.age !== undefined) {
      const raw = text(body.age)
      if (!raw) {
        assign('age', null)
      } else {
        const parsedAge = Number(raw)
        if (!Number.isInteger(parsedAge) || parsedAge < 14 || parsedAge > 80) {
          return NextResponse.json({ error: 'Age must be a whole number between 14 and 80' }, { status: 400 })
        }
        assign('age', parsedAge)
      }
    }

    assign('agent', agent)
    sets.push('updatedAt = CURRENT_TIMESTAMP')

    // Raw SQL: the generated Prisma Client can drop the newer intake columns
    await prisma.$executeRawUnsafe(
      `UPDATE Candidate SET ${sets.join(', ')} WHERE id = ?`,
      ...values,
      candidateId
    )

    const updatedCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    })

    return NextResponse.json({ success: true, candidate: updatedCandidate })
  } catch (error: any) {
    console.error('Finalize Candidate Error:', error)
    return NextResponse.json({ error: 'Failed to finalize candidate', details: error.message }, { status: 500 })
  }
}
