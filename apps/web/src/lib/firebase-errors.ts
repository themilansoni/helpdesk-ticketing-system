import { FirebaseError } from "firebase/app";
import { DbError } from "./db/helpers";

const FRIENDLY_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/invalid-email": "Invalid email or password.",
  "auth/user-not-found": "Invalid email or password.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/email-already-in-use": "A user with this email already exists.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "permission-denied": "You do not have permission to do that.",
};

export function getErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof DbError) return err.message;
  if (err instanceof FirebaseError) {
    return FRIENDLY_MESSAGES[err.code] ?? fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
