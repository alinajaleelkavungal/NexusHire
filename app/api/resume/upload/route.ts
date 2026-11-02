import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { guardSession } from '@/lib/auth'
import { uploadResume, deleteResumeFiles } from '@/services/resumeStorage'
import { processResumeFile } from '@/services/resume-parser'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
      company: field('company') || null,
      recommendedRole: field('recommendedRole') || null,
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

    // 1. Upload to Backblaze B2 — returns the storage key (used as fileUrl in DB)
    let fileUrl: string
    try {
      const uploadResult = await uploadResume(fileBuffer, uniqueFileName, resolvedType)
      fileUrl = uploadResult.key
    } catch (storageError: any) {
      console.error('Backblaze B2 upload failed:', storageError)
      return NextResponse.json({
        error: 'Cloud storage upload failed',
        details: storageError?.message || 'Could not store resume in Backblaze B2. Check B2 credentials and bucket settings.'
      }, { status: 502 })
    }

    // Check if running on Vercel without a remote database configured (SQLite is read-only on Vercel)
    const isVercel = Boolean(process.env.VERCEL)
    const rawDbUrl = (process.env.DATABASE_URL || '').trim()
    const tursoUrl = (process.env.TURSO_DATABASE_URL || '').trim() || (rawDbUrl.startsWith('libsql') ? rawDbUrl : '')
    const tursoAuthToken = (process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_TOKEN || '').trim()
    if (isVercel && (!tursoUrl || !tursoAuthToken)) {
      return NextResponse.json({
        error: 'Database configuration missing in production',
        details: 'TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in Vercel environment variables. In serverless deployment, local SQLite is read-only and cannot save uploaded candidates.'
      }, { status: 503 })
    }

    // 2. Persist Candidate and Resume in the database
    let candidate: any = null
    let resume: any = null
    try {
      // Try direct create with all fields
      try {
        candidate = await prisma.candidate.create({
          data: {
            name: details.name,
            email: null,
            age,
            sector: details.sector,
            category: details.category,
            yearsOfExperience: details.yearsOfExperience,
            agent: details.agent,
            company: details.company,
            recommendedRole: details.recommendedRole,
            ownerId: g.session.sub,
            recruitmentStage: 'Applied',
          }
        })
      } catch (prismaErr: any) {
        console.warn('Initial candidate creation failed, running column migration and retrying:', prismaErr?.message)
        await ensureCandidateColumns()

        try {
          candidate = await prisma.candidate.create({
            data: {
              name: details.name,
              email: null,
              age,
              sector: details.sector,
              category: details.category,
              yearsOfExperience: details.yearsOfExperience,
              agent: details.agent,
              company: details.company,
              recommendedRole: details.recommendedRole,
              ownerId: g.session.sub,
              recruitmentStage: 'Applied',
            }
          })
        } catch {
          // Fallback if Prisma Client does not have new schema fields generated
          candidate = await prisma.candidate.create({
            data: {
              name: details.name,
              email: null,
              recruitmentStage: 'Applied'
            }
          })

          await prisma.$executeRawUnsafe(
            `UPDATE Candidate SET age = ?, sector = ?, category = ?, yearsOfExperience = ?, agent = ?, company = ?, recommendedRole = ?, ownerId = ? WHERE id = ?`,
            age, details.sector, details.category, details.yearsOfExperience, details.agent, details.company, details.recommendedRole, g.session.sub, candidate.id
          ).catch((e: any) => console.warn('Candidate fields raw update warning:', e?.message))

          // Attach updated fields to candidate object
          candidate.age = age
          candidate.sector = details.sector
          candidate.category = details.category
          candidate.yearsOfExperience = details.yearsOfExperience
          candidate.agent = details.agent
          candidate.company = details.company
          candidate.recommendedRole = details.recommendedRole
          candidate.ownerId = g.session.sub
        }
      }

      // Create the Resume record (sanitize null characters from extracted text)
      const sanitizedText = (rawText || '').replace(/\0/g, '')
      resume = await prisma.resume.create({
        data: {
          candidateId: candidate.id,
          fileName: file.name,
          fileUrl,
          fileType: resolvedType,
          processingStatus: 'PENDING',
          extractedText: sanitizedText,
        }
      })
    } catch (dbError: any) {
      // Don't leave an orphaned file in the bucket if the DB write fails
      await deleteResumeFiles([fileUrl]).catch(() => {})
      if (candidate?.id) {
        await prisma.candidate.delete({ where: { id: candidate.id } }).catch(() => {})
      }
      console.error('Database write error during resume upload:', dbError)
      return NextResponse.json({
        error: 'Database save failed',
        details: dbError?.message || 'Failed to save candidate and resume to the database.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      candidate,
      resume
    }, { status: 201 })
  } catch (error: any) {
    console.error('Upload Error:', error)
    const status = error.status || error.statusCode || 500
    return NextResponse.json({
      error: 'Failed to process file upload',
      details: error?.message || String(error)
    }, { status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500 })
  }
}

async function ensureCandidateColumns() {
  try {
    const columns = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info(Candidate)`)
    const existing = new Set(columns.map(c => String(c.name).toLowerCase()))

    if (!existing.has('ownerid')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN ownerId TEXT`).catch(() => {})
    }
    if (!existing.has('age')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN age INTEGER`).catch(() => {})
    }
    if (!existing.has('sector')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN sector TEXT`).catch(() => {})
    }
    if (!existing.has('category')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN category TEXT`).catch(() => {})
    }
    if (!existing.has('yearsofexperience')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN yearsOfExperience TEXT`).catch(() => {})
    }
    if (!existing.has('agent')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN agent TEXT`).catch(() => {})
    }
    if (!existing.has('company')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN company TEXT`).catch(() => {})
    }
    if (!existing.has('recommendedrole')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN recommendedRole TEXT`).catch(() => {})
    }
  } catch (e) {
    // If PRAGMA is not supported or errors, attempt direct ALTERs safely
    await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN ownerId TEXT`).catch(() => {})
    await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN age INTEGER`).catch(() => {})
    await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN sector TEXT`).catch(() => {})
    await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN category TEXT`).catch(() => {})
    await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN yearsOfExperience TEXT`).catch(() => {})
    await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN agent TEXT`).catch(() => {})
    await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN company TEXT`).catch(() => {})
    await prisma.$executeRawUnsafe(`ALTER TABLE Candidate ADD COLUMN recommendedRole TEXT`).catch(() => {})
  }
}

export async function GET() {
  const diagnostics: Record<string, any> = {
    status: 'online',
    timestamp: new Date().toISOString(),
    isVercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV,
  }

  // 1. Check Backblaze B2 Config
  const hasKeyId = Boolean(process.env.B2_KEY_ID || process.env.B2_APPLICATION_KEY_ID)
  const hasAppKey = Boolean(process.env.B2_APPLICATION_KEY || process.env.B2_APP_KEY)
  const bucketName = process.env.B2_BUCKET_NAME || 'resume.iq.storage.jaleel'
  diagnostics.storage = {
    b2KeyIdConfigured: hasKeyId,
    b2AppKeyConfigured: hasAppKey,
    bucket: bucketName,
    status: hasKeyId && hasAppKey ? 'READY' : 'MISSING_CREDENTIALS',
  }

  // 2. Check Database / Turso
  try {
    const rawDbUrl = process.env.DATABASE_URL || ''
    const tursoUrl = process.env.TURSO_DATABASE_URL || (rawDbUrl.startsWith('libsql') ? rawDbUrl : '')
    const hasToken = Boolean(process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_TOKEN)
    diagnostics.database = {
      tursoUrlConfigured: Boolean(tursoUrl),
      tursoTokenConfigured: hasToken,
    }
    await prisma.$queryRawUnsafe('SELECT 1')
    diagnostics.database.status = 'CONNECTED'
  } catch (dbErr: any) {
    diagnostics.database.status = 'CONNECTION_FAILED'
    diagnostics.database.error = dbErr?.message || String(dbErr)
  }

  // 3. Check Session Secret
  diagnostics.auth = {
    sessionSecretConfigured: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32),
  }

  return NextResponse.json(diagnostics, { status: 200 })
}
