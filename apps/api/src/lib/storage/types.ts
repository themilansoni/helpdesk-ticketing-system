export interface StoredFile {
  storagePath: string; // key/path used to retrieve the file later
  storageDriver: "local" | "s3";
}

export interface FileStorageDriver {
  save(input: { buffer: Buffer; fileName: string; mimeType: string }): Promise<StoredFile>;
  read(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
}
