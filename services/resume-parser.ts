// Polyfill DOMMatrix for pdfjs-dist in serverless environments
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    transformPoint(p: any) { return p; }
  };
}

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
    const parsePromise = (async () => {
      // Lazy-load to prevent top-level module evaluation errors
      const { PDFParse } = require('pdf-parse')
      parser = new PDFParse({ data: fileBuffer })
      const data = await parser.getText()
      return data?.text || ''
    })()

    // 3.5s timeout prevents serverless execution timeout/freeze on Vercel
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('PDF parsing timed out (3.5s limit)')), 3500)
    )

    const rawText = await Promise.race([parsePromise, timeoutPromise])
    return { rawText }
  } catch (error: any) {
    console.warn('PDF text extraction skipped/failed:', error?.message || error)
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
