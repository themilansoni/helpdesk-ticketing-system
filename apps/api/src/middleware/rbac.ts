import type { NextFunction, Request, Response } from "express";
import { hasPermission, type Permission } from "@helpdesk/shared";
import { ApiError } from "../lib/apiError.js";

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!hasPermission(req.user.role as never, permission)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}
