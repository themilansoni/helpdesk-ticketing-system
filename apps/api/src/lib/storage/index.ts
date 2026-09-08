import { env } from "../../config/env.js";
import { LocalFileStorageDriver } from "./localDriver.js";
import { S3FileStorageDriver } from "./s3Driver.js";
import type { FileStorageDriver } from "./types.js";

export const fileStorage: FileStorageDriver =
  env.STORAGE_DRIVER === "s3" ? new S3FileStorageDriver() : new LocalFileStorageDriver();

export * from "./types.js";
