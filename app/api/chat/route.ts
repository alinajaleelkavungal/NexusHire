import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession, canAccessCandidate, allowedCandidateIds } from '@/lib/auth'
import { generateRagAnswer } from '@/services/rag-service'
import { answerAppQuestion, answerWithAppContext, isComplexQuestion, ASSISTANT_HELP, NEEDS_CV_TEXT } from '@/services/app-assistant'

const save = (question: string, answer: string, candidateId?: string | null) =>
  prisma.chatHistory
    .create({ data: { question, answer, candidateId: candidateId || null } })
    .catch(err => console.error('Failed to save chat history', err))

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

    // Questions about the application itself:
    //  - simple ones ("how many ...", "how do I ...") are answered by exact rules straight from the database
    //  - long / multi-part ones, and anything the rules don't recognise, go to the AI, which may only use the
    //    app guide and this user's own live data
    if (!candidateId) {
      const aiFirst = isComplexQuestion(question)
      const viaAi = async () => {
        const text = await answerWithAppContext(g.session, question)
        return text && !text.includes(NEEDS_CV_TEXT) ? text : null
      }
      const answer = aiFirst
        ? (await viaAi()) ?? (await answerAppQuestion(g.session, question))
        : (await answerAppQuestion(g.session, question)) ?? (await viaAi())
      if (answer) {
        save(question, answer)
        return NextResponse.json({ answer, sources: [], confidence: 1 })
      }
    }

    // 3. Questions about what is written inside the CVs: use the CV-text AI.
    try {
      const ragResponse = await generateRagAnswer(question, candidateId, await allowedCandidateIds(g.session))
      save(question, ragResponse.answer, candidateId)
      return NextResponse.json(ragResponse)
    } catch (err) {
      console.error('RAG unavailable:', err)
      const answer = candidateId
        ? "I couldn't search this CV's text right now. Please try again in a moment."
        : `I couldn't match that to the app's data, and the CV-text search is unavailable right now.\n\n${ASSISTANT_HELP}`
      return NextResponse.json({ answer, sources: [], confidence: 0 })
    }
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
