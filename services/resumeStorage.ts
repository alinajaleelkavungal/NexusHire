import {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2Client, B2_BUCKET_NAME } from "@/lib/b2";
import { randomUUID } from "crypto";

/**
 * Uploads a resume file (PDF, DOCX, etc.) to Backblaze B2.
 * Returns the storage key you should save in your Prisma database
 * alongside the candidate's metadata.
 */
export async function uploadResume(
    fileBuffer: Buffer,
    originalFileName: string,
    contentType: string
): Promise<{ key: string }> {
    const key = `resumes/${randomUUID()}-${originalFileName}`;

    await b2Client.send(
        new PutObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
        })
    );

    return { key };
}

/**
 * Generates a temporary, secure download URL for a resume.
 * Use this instead of exposing the bucket publicly.
 * expiresInSeconds defaults to 10 minutes.
 */
export async function getResumeDownloadUrl(
    key: string,
    expiresInSeconds: number = 600
): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(b2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes a resume from B2 (e.g. if a candidate is removed from the system).
 */
export async function deleteResume(key: string): Promise<void> {
    await b2Client.send(
        new DeleteObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: key,
        })
    );
}