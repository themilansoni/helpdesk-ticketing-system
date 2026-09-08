import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../../config/env.js";
import type { FileStorageDriver, StoredFile } from "./types.js";

const uploadRoot = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);

export class LocalFileStorageDriver implements FileStorageDriver {
  async save(input: { buffer: Buffer; fileName: string; mimeType: string }): Promise<StoredFile> {
    await mkdir(uploadRoot, { recursive: true });
    const ext = path.extname(input.fileName);
    const safeName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const fullPath = path.join(uploadRoot, safeName);
    await writeFile(fullPath, input.buffer);
    return { storagePath: safeName, storageDriver: "local" };
  }

  async read(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(uploadRoot, path.basename(storagePath));
    return readFile(fullPath);
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(uploadRoot, path.basename(storagePath));
    await rm(fullPath, { force: true });
  }
}
