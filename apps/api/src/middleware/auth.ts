import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/apiError.js";
import { verifyAccessToken } from "../lib/jwt.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized());
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(ApiError.unauthorized("Your session has expired. Please log in again."));
  }
}
