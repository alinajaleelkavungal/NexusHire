// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth = require('mammoth') as {
  extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>
}

export interface ParsedResume {
  rawText: string
}

/**
 * Parses a PDF file from a raw Buffer.
 * Uses pdf-parse (v2) PDFParse class to extract all text content.
 */
export async function parsePdf(fileBuffer: Buffer): Promise<ParsedResume> {
  let parser: any
  try {
    parser = new PDFParse({ data: fileBuffer })
    const data = await parser.getText()
    return {
      rawText: data?.text || ''
    }
  } catch (error: any) {
    console.warn('PDF text extraction error:', error?.message || error)
    return {
      rawText: ''
    }
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy()
      } catch {
        // Ignore cleanup error
      }
    }
  }
}

/**
 * Parses a DOCX file from a raw Buffer.
 * Uses mammoth to extract all text content.
 */
export async function parseDocx(fileBuffer: Buffer): Promise<ParsedResume> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer })
    return {
      rawText: result.value || ''
    }
  } catch (error: any) {
    console.warn('DOCX text extraction error:', error?.message || error)
    return {
      rawText: ''
    }
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
