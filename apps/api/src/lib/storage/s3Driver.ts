import crypto from "node:crypto";
import path from "node:path";
import { env } from "../../config/env.js";
import type { FileStorageDriver, StoredFile } from "./types.js";

// S3-compatible storage driver (works with AWS S3, MinIO, R2, etc).
// The AWS SDK is imported dynamically so it is only loaded into memory
// when STORAGE_DRIVER=s3 is actually selected at runtime.
export class S3FileStorageDriver implements FileStorageDriver {
  private async getClient() {
    const { S3Client } = await import("@aws-sdk/client-s3");
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error(
        "S3 storage is selected (STORAGE_DRIVER=s3) but S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not configured."
      );
    }
    return new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async save(input: { buffer: Buffer; fileName: string; mimeType: string }): Promise<StoredFile> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();
    const ext = path.extname(input.fileName);
    const key = `attachments/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      })
    );
    return { storagePath: key, storageDriver: "s3" };
  }

  async read(storagePath: string): Promise<Buffer> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();
    const result = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: storagePath }));
    const chunks: Buffer[] = [];
    for await (const chunk of result.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(storagePath: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();
    await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: storagePath }));
  }
}
