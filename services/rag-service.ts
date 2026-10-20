import ai from '@/lib/gemini'
import { qdrantClient, COLLECTION_NAME, initQdrantCollection } from '@/lib/qdrant'
import { generateEmbedding } from '@/services/embedding-service'

export interface RagResponse {
  answer: string
  sources: any[]
  confidence: number
}

export async function generateRagAnswer(
  question: string,
  candidateId?: string,
  allowedIds?: string[] // undefined = unrestricted; otherwise only these candidates' CVs may be used
): Promise<RagResponse> {
  if (allowedIds && allowedIds.length === 0) {
    return {
      answer: "I couldn't find any relevant information in the uploaded resumes to answer your question.",
      sources: [],
      confidence: 0
    }
  }

  await initQdrantCollection()
  
  // 1. Generate query embedding
  const queryVector = await generateEmbedding(question)

  // 2. Build filter (optional candidate filter + branch restriction)
  const must: any[] = []
  if (candidateId) must.push({ key: 'candidateId', match: { value: candidateId } })
  if (allowedIds) must.push({ key: 'candidateId', match: { any: allowedIds } })
  const filter = must.length > 0 ? { must } : undefined

  // 3. Search Qdrant for context
  const searchResults = await qdrantClient.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: 5,
    with_payload: true,
    filter
  })

  if (searchResults.length === 0 || searchResults[0].score < 0.3) {
    return {
      answer: "I couldn't find any relevant information in the uploaded resumes to answer your question.",
      sources: [],
      confidence: 0
    }
  }

  // 4. Assemble context
  const sources = searchResults.map(res => res.payload)
  let contextText = ''
  
  sources.forEach((source: any, idx) => {
    contextText += `\n--- Source ${idx + 1} (Candidate: ${source.name}) ---\n${source.content}\n`
  })

  // 5. Query Gemini with context
  const prompt = `You are an AI recruitment assistant. Answer the recruiter's question based strictly on the provided resume context.
  
Instructions:
- Answer ONLY using the provided resume information.
- If the answer is not in the context, explicitly say you cannot find the information in the resumes.
- Provide a concise, professional, recruiter-friendly answer.
- Reference the specific candidates mentioned in the context.

Context:
${contextText}

Question:
${question}

Answer:`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt
    })

    const answer = response.text || "Failed to generate an answer."
    
    // Confidence heuristic based on Qdrant top score
    const confidence = searchResults[0].score

    return {
      answer,
      sources,
      confidence
    }
  } catch (error) {
    console.error('Gemini generation failed:', error)
    throw new Error('AI generation failed')
  }
}
