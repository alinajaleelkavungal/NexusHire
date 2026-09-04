import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { uploadResume } from '@/services/resumeStorage'
import { processResumeFile } from '@/services/resume-parser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file extension instead of strict MIME type
    const fileNameLower = file.name.toLowerCase()
    if (!fileNameLower.endsWith('.pdf') && !fileNameLower.endsWith('.docx') && !fileNameLower.endsWith('.doc')) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and DOCX are allowed.', details: 'Invalid file extension' }, { status: 400 })
    }

    // Generate a unique filename
    const uniqueFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    // Read file into memory as Buffer — single read, reused for both parsing and upload
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Determine MIME type from extension (browser MIME types can be unreliable)
    const resolvedType = fileNameLower.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    // Parse resume text from the in-memory buffer
    const { rawText } = await processResumeFile(fileBuffer, resolvedType)

    // Upload to Backblaze B2 — returns the storage key (used as fileUrl in DB)
    const { key: fileUrl } = await uploadResume(fileBuffer, uniqueFileName, resolvedType)

    // Create a Candidate record (placeholder values since AI analysis is not done yet)
    const candidateName = file.name.split('.')[0] || 'Unknown Candidate'
    
    const candidate = await prisma.candidate.create({
      data: {
        name: candidateName,
        email: null,
        recruitmentStage: 'DRAFT'
      }
    })

    // Create the Resume record
    const resume = await prisma.resume.create({
      data: {
        candidateId: candidate.id,
        fileName: file.name,
        fileUrl,
        fileType: resolvedType,
        processingStatus: 'PENDING',
        extractedText: rawText,
      }
    })

    return NextResponse.json({
      success: true,
      candidate,
      resume
    }, { status: 201 })
  } catch (error: any) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: 'Failed to process file upload', details: error.message }, { status: 500 })
  }
}
