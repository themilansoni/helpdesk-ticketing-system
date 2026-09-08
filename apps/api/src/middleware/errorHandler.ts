import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../lib/apiError.js";

// Centralized error handler: never leak raw database/internal errors to
// clients, but log the full detail server-side for debugging.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed.",
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      console.error(`[${req.method} ${req.path}]`, err);
    }
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  console.error(`[${req.method} ${req.path}] Unhandled error:`, err);
  return res.status(500).json({ error: "An unexpected error occurred. Please try again." });
}
