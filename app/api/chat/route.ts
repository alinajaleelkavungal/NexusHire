import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession, canAccessCandidate, allowedCandidateIds } from '@/lib/auth'
import { generateRagAnswer } from '@/services/rag-service'

export async function POST(request: NextRequest) {
  try {
    const g = await guardSession()
    if (g.response) return g.response

    const { question, candidateId } = await request.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required and must be a string' }, { status: 400 })
    }

    if (candidateId && !(await canAccessCandidate(g.session, candidateId))) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Call the RAG pipeline (branches only search their own CVs)
    const ragResponse = await generateRagAnswer(question, candidateId, await allowedCandidateIds(g.session))

    // Store conversation history asynchronously (don't await it to keep response fast)
    prisma.chatHistory.create({
      data: {
        question,
        answer: ragResponse.answer,
        candidateId: candidateId || null
      }
    }).catch(err => console.error('Failed to save chat history', err))

    return NextResponse.json(ragResponse)

  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
