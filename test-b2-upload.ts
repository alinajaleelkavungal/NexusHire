/**
 * test-b2-upload.ts
 * Run with: npx tsx test-b2-upload.ts
 *
 * Tests the full Backblaze B2 pipeline:
 *   1. Loads .env credentials
 *   2. Reads dummy.pdf from project root
 *   3. Uploads it via uploadResume()
 *   4. Generates a signed download URL via getResumeDownloadUrl()
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Step 0: Load .env before importing anything that reads env vars
dotenv.config({ path: path.resolve(__dirname, '.env') })

console.log('\n========================================')
console.log('  Backblaze B2 Upload Test')
console.log('========================================\n')

// ── Validate env vars early so we get a clear error ──────────────────────────
const required = ['B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET_NAME', 'B2_ENDPOINT', 'B2_REGION']
const missing = required.filter(k => !process.env[k])
if (missing.length > 0) {
  console.error('❌  Missing required environment variables in .env:')
  missing.forEach(k => console.error(`     - ${k}`))
  console.error('\nPlease add these to your .env file and try again.')
  process.exit(1)
}
console.log('✅  Step 1: All required env vars are present.')
console.log(`     Bucket  : ${process.env.B2_BUCKET_NAME}`)
console.log(`     Endpoint: ${process.env.B2_ENDPOINT}`)
console.log(`     Region  : ${process.env.B2_REGION}\n`)

// ── Import storage helpers AFTER env is loaded ────────────────────────────────
// Use require() here so the import happens after dotenv.config()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { uploadResume, getResumeDownloadUrl } = require('./services/resumeStorage')

async function main() {
  // Step 1: Read dummy.pdf
  const dummyPath = path.resolve(__dirname, 'dummy.pdf')
  if (!fs.existsSync(dummyPath)) {
    console.error(`❌  dummy.pdf not found at: ${dummyPath}`)
    process.exit(1)
  }
  const fileBuffer = fs.readFileSync(dummyPath)
  const fileSizeKB = (fileBuffer.byteLength / 1024).toFixed(2)
  console.log(`✅  Step 2: Read dummy.pdf  (${fileSizeKB} KB)`)

  // Step 2: Upload to B2
  console.log('\n⏳  Step 3: Uploading to Backblaze B2...')
  let key: string
  try {
    const result = await uploadResume(fileBuffer, 'dummy.pdf', 'application/pdf')
    key = result.key
    console.log(`✅  Step 3: Upload succeeded!`)
    console.log(`     Storage key: ${key}`)
  } catch (err: any) {
    console.error('❌  Step 3: Upload FAILED.')
    console.error(`     Error: ${err.message}`)
    if (err.$metadata) {
      console.error(`     HTTP status : ${err.$metadata.httpStatusCode}`)
      console.error(`     Request ID  : ${err.$metadata.requestId}`)
    }
    process.exit(1)
  }

  // Step 3: Generate signed download URL
  console.log('\n⏳  Step 4: Generating signed download URL (10 min TTL)...')
  try {
    const url = await getResumeDownloadUrl(key, 600)
    console.log(`✅  Step 4: Signed URL generated!`)
    console.log(`\n     URL:\n     ${url}\n`)
  } catch (err: any) {
    console.error('❌  Step 4: Failed to generate signed URL.')
    console.error(`     Error: ${err.message}`)
    process.exit(1)
  }

  console.log('========================================')
  console.log('  ✅  All steps passed — B2 is working!')
  console.log('========================================\n')
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err)
  process.exit(1)
})
