import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession } from '@/lib/auth'
import { uploadResume, deleteResumeFiles } from '@/services/resumeStorage'
import { processResumeFile } from '@/services/resume-parser'

export async function POST(request: NextRequest) {
  try {
    const g = await guardSession()
    if (g.response) return g.response

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

    // Every intake field is mandatory — validate BEFORE anything is stored
    const field = (key: string) => String(formData.get(key) ?? '').trim()
    const details = {
      name: field('name'),
      age: field('age'),
      sector: field('sector'),
      category: field('category'),
      yearsOfExperience: field('yearsOfExperience'),
      agent: field('agent'),
    }
    const labels: Record<string, string> = {
      name: 'Name', age: 'Age', sector: 'Category', category: 'Sub Category',
      yearsOfExperience: 'Experience', agent: 'Agent',
    }
    const missing = Object.entries(details).filter(([, v]) => !v).map(([k]) => labels[k])
    if (missing.length > 0) {
      return NextResponse.json({ error: `Required: ${missing.join(', ')}` }, { status: 400 })
    }
    const age = Number(details.age)
    if (!Number.isInteger(age) || age < 14 || age > 80) {
      return NextResponse.json({ error: 'Age must be a whole number between 14 and 80' }, { status: 400 })
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
    let rawText = ''
    try {
      const parsed = await processResumeFile(fileBuffer, resolvedType)
      rawText = parsed.rawText
    } catch (parseError: any) {
      console.warn('Resume text parsing failed:', parseError?.message || parseError)
    }

    // Upload to Backblaze B2 — returns the storage key (used as fileUrl in DB)
    const { key: fileUrl } = await uploadResume(fileBuffer, uniqueFileName, resolvedType)

    let candidate, resume
    try {
      candidate = await prisma.candidate.create({
        data: {
          name: details.name,
          email: null,
          recruitmentStage: 'Applied'
        }
      })

      // Raw SQL: the generated Prisma Client can drop the newer intake columns
      await prisma.$executeRawUnsafe(
        `UPDATE Candidate SET age = ?, sector = ?, category = ?, yearsOfExperience = ?, agent = ?, ownerId = ? WHERE id = ?`,
        age, details.sector, details.category, details.yearsOfExperience, details.agent, g.session.sub, candidate.id
      )

      // Create the Resume record
      resume = await prisma.resume.create({
        data: {
          candidateId: candidate.id,
          fileName: file.name,
          fileUrl,
          fileType: resolvedType,
          processingStatus: 'PENDING',
          extractedText: rawText,
        }
      })
    } catch (dbError) {
      // Don't leave an orphaned file in the bucket if the DB write fails
      await deleteResumeFiles([fileUrl])
      if (candidate) await prisma.candidate.delete({ where: { id: candidate.id } }).catch(() => {})
      throw dbError
    }

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
