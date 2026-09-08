import { prisma } from "@helpdesk/database";
import type { Request } from "express";
import { ApiError } from "../lib/apiError.js";
import { comparePassword } from "../lib/password.js";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { env } from "../config/env.js";
import { recordAudit } from "./auditService.js";

const USER_SELECT = {
  id: true,
  employeeId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  jobTitle: true,
  status: true,
  lastLoginAt: true,
  role: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
  managerId: true,
} as const;

function refreshExpiryDate(): Date {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES_IN);
  const amount = match ? Number(match[1]) : 7;
  const unit = match?.[2] ?? "d";
  const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] ?? 86400000;
  return new Date(Date.now() + amount * multiplier);
}

export async function login(email: string, password: string, req?: Request) {
  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!user || user.status !== "active") {
    throw ApiError.unauthorized("Invalid email or password.");
  }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role.name });
  const refreshToken = signRefreshToken({ sub: user.id });

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiryDate() },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit({ userId: user.id, action: "login", entityType: "User", entityId: user.id, req });

  const profile = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: USER_SELECT });
  return { accessToken, refreshToken, user: profile };
}

export async function refreshSession(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Your session has expired. Please log in again.");
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Your session has expired. Please log in again.");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
  if (!user || user.status !== "active") {
    throw ApiError.unauthorized();
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role.name });
  return { accessToken };
}

export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) throw ApiError.notFound("User not found.");
  return user;
}

export { USER_SELECT };
