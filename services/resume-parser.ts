import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export interface ParsedResume {
  rawText: string
}

/**
 * Parses a PDF file from a raw Buffer.
 * Uses pdf-parse to extract all text content.
 */
export async function parsePdf(fileBuffer: Buffer): Promise<ParsedResume> {
  const data = await pdfParse(fileBuffer)
  return {
    rawText: data.text || ''
  }
}

/**
 * Parses a DOCX file from a raw Buffer.
 * Uses mammoth to extract all text content.
 */
export async function parseDocx(fileBuffer: Buffer): Promise<ParsedResume> {
  const result = await mammoth.extractRawText({ buffer: fileBuffer })
  return {
    rawText: result.value || ''
  }
}

/**
 * Detects the file type and delegates to the appropriate parser.
 * Accepts a raw in-memory Buffer — no disk reads or HTTP fetches.
 *
 * @param fileBuffer  - Raw bytes of the uploaded file
 * @param fileType    - MIME type string (e.g. 'application/pdf')
 */
export async function processResumeFile(fileBuffer: Buffer, fileType: string): Promise<ParsedResume> {
  if (fileType === 'application/pdf') {
    return parsePdf(fileBuffer)
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    return parseDocx(fileBuffer)
  }

  throw new Error(`Unsupported file type: ${fileType}`)
}
