import { S3Client } from "@aws-sdk/client-s3";

// Reads credentials from your .env file.
// Make sure these exact variable names exist in .env:
// B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT, B2_REGION

const clean = (val?: string) => (val ? val.trim().replace(/^["']|["']$/g, '').replace(/[\r\n\t]/g, '') : '');

const keyId = clean(process.env.B2_KEY_ID) || clean(process.env.B2_APPLICATION_KEY_ID);
const appKey = clean(process.env.B2_APPLICATION_KEY) || clean(process.env.B2_APP_KEY);
const endpoint = clean(process.env.B2_ENDPOINT) || 'https://s3.eu-central-003.backblazeb2.com';
const region = clean(process.env.B2_REGION) || 'eu-central-003';
const envBucket = clean(process.env.B2_BUCKET_NAME);

export const B2_BUCKET_NAME =
    !envBucket || envBucket === 'nexushire-storage'
        ? 'resume.iq.storage.jaleel'
        : envBucket;

if (!keyId || !appKey) {
    console.warn('[B2 Storage] Warning: B2_KEY_ID or B2_APPLICATION_KEY is not defined in environment variables.');
}

export const b2Client = new S3Client({
    endpoint,
    region,
    credentials: {
        accessKeyId: keyId || '',
        secretAccessKey: appKey || '',
    },
    // B2's S3-compatible API needs this for correct URL formatting
    forcePathStyle: true,
});