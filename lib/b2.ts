import { S3Client } from "@aws-sdk/client-s3";

// Reads credentials from your .env file.
// Make sure these exact variable names exist in .env:
// B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT, B2_REGION

const requiredEnvVars = [
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_BUCKET_NAME",
    "B2_ENDPOINT",
    "B2_REGION",
] as const;

const clean = (val?: string) => (val ? val.trim().replace(/^["']|["']$/g, '').replace(/[\r\n\t]/g, '') : '');

for (const key of requiredEnvVars) {
    if (!process.env[key] || !clean(process.env[key])) {
        throw new Error(`Missing required env var: ${key}. Check your .env file.`);
    }
}

export const b2Client = new S3Client({
    endpoint: clean(process.env.B2_ENDPOINT),
    region: clean(process.env.B2_REGION),
    credentials: {
        accessKeyId: clean(process.env.B2_KEY_ID),
        secretAccessKey: clean(process.env.B2_APPLICATION_KEY),
    },
    // B2's S3-compatible API needs this for correct URL formatting
    forcePathStyle: true,
});

export const B2_BUCKET_NAME = clean(process.env.B2_BUCKET_NAME);