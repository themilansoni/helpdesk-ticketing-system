import { Timestamp } from "firebase/firestore";

export function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

export function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIso(value);
}

export class DbError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "DbError";
  }
}
