import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardCandidate } from '@/lib/auth'
import { qdrantClient, COLLECTION_NAME, initQdrantCollection } from '@/lib/qdrant'
import { generateEmbedding } from '@/services/embedding-service'
import { chunkResumeText } from '@/services/text-chunker'
import { v4 as uuidv4 } from 'uuid' // Need to install uuid

export async function POST(request: NextRequest) {
  try {
    const { resumeId } = await request.json()

    if (!resumeId) {
      return NextResponse.json({ error: 'resumeId is required' }, { status: 400 })
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: { candidate: true }
    })

    if (!resume || !resume.extractedText) {
      return NextResponse.json({ error: 'Resume or extracted text not found' }, { status: 404 })
    }

    const g = await guardCandidate(resume.candidateId)
    if (g.response) return g.response

    // Initialize collection if it doesn't exist
    await initQdrantCollection()

    // Build the AI Data object from DB strings
    const aiData = {
      professionalSummary: resume.candidate.professionalSummary,
      skills: resume.candidate.skills ? JSON.parse(resume.candidate.skills) : [],
      experience: resume.candidate.experience ? JSON.parse(resume.candidate.experience) : [],
      projects: resume.candidate.projects ? JSON.parse(resume.candidate.projects) : [],
      education: resume.candidate.education ? JSON.parse(resume.candidate.education) : [],
    }

    // Chunk the text
    const chunks = chunkResumeText(resume.candidateId, resume.extractedText, aiData)
    
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No chunks generated' }, { status: 400 })
    }

    const points = []

    for (const chunk of chunks) {
      const vector = await generateEmbedding(chunk.content)
      
      points.push({
        id: uuidv4(), // generate unique ID for qdrant
        vector: vector,
        payload: {
          candidateId: resume.candidateId,
          name: resume.candidate.name,
          skills: aiData.skills,
          category: resume.candidate.category || '',
          experienceLevel: resume.candidate.experienceLevel || '',
          chunkType: chunk.chunkType,
          content: chunk.content
        }
      })
    }

    // Store in Qdrant
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: points
    })

    // We can also update a status in DB if needed (e.g. isEmbedded)
    // For now we leave processingStatus as COMPLETED, or add another status.

    return NextResponse.json({ success: true, message: 'Embeddings generated and stored successfully', chunksStored: points.length })

  } catch (error: any) {
    console.error('Embed API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
