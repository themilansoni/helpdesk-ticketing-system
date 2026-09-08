import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { DbError } from "./helpers";
import type { TicketAttachmentMeta } from "@/types";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export async function uploadTicketAttachment(ticketId: string, file: File): Promise<TicketAttachmentMeta> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new DbError(`File type "${file.type}" is not allowed.`, 400);
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new DbError("File exceeds the 10MB upload limit.", 400);
  }
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${file.name}`;
  const storagePath = `tickets/${ticketId}/${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return { fileName: file.name, storagePath, mimeType: file.type, sizeBytes: file.size };
}

export async function getAttachmentDownloadUrl(storagePath: string): Promise<string> {
  return getDownloadURL(ref(storage, storagePath));
}
