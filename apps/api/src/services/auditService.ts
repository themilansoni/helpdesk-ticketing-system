import { prisma } from "@helpdesk/database";
import type { Request } from "express";

export interface RecordAuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
  req?: Request;
}

function getClientIp(req?: Request): string | undefined {
  if (!req) return undefined;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim();
  }
  return req.socket?.remoteAddress ?? undefined;
}

function serialize(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function recordAudit(input: RecordAuditInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      previousValue: serialize(input.previousValue) ?? null,
      newValue: serialize(input.newValue) ?? null,
      ipAddress: getClientIp(input.req) ?? null,
    },
  });
}
