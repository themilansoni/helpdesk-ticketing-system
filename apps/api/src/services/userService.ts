import { prisma } from "@helpdesk/database";
import type { Request } from "express";
import type { CreateUserInput } from "@helpdesk/shared";
import { ApiError } from "../lib/apiError.js";
import { hashPassword } from "../lib/password.js";
import { recordAudit } from "./auditService.js";
import { USER_SELECT } from "./authService.js";

export interface ListUsersParams {
  search?: string;
  roleName?: string;
  departmentId?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export async function listUsers(params: ListUsersParams) {
  const where: NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"] = {};
  if (params.roleName) where.role = { name: params.roleName };
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search } },
      { lastName: { contains: params.search } },
      { email: { contains: params.search } },
      { employeeId: { contains: params.search } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);

  return { data, total, page: params.page, pageSize: params.pageSize };
}

export async function createUser(input: CreateUserInput, createdById: string, req?: Request) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("A user with this email already exists.");

  const role = await prisma.role.findUnique({ where: { name: input.roleName } });
  if (!role) throw ApiError.badRequest("Invalid role.");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      roleId: role.id,
      departmentId: input.departmentId,
      locationId: input.locationId,
      managerId: input.managerId,
      jobTitle: input.jobTitle,
    },
    select: USER_SELECT,
  });

  await recordAudit({ userId: createdById, action: "user_created", entityType: "User", entityId: user.id, newValue: user.email, req });
  return user;
}

export async function updateUser(
  userId: string,
  input: Partial<CreateUserInput> & { status?: string },
  updatedById: string,
  req?: Request
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw ApiError.notFound("User not found.");

  let roleId: string | undefined;
  if (input.roleName) {
    const role = await prisma.role.findUnique({ where: { name: input.roleName } });
    if (!role) throw ApiError.badRequest("Invalid role.");
    roleId = role.id;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      jobTitle: input.jobTitle,
      departmentId: input.departmentId,
      locationId: input.locationId,
      managerId: input.managerId,
      status: input.status,
      roleId,
    },
    select: USER_SELECT,
  });

  await recordAudit({
    userId: updatedById,
    action: "user_updated",
    entityType: "User",
    entityId: userId,
    previousValue: existing,
    newValue: input,
    req,
  });

  return user;
}

export async function setUserStatus(userId: string, status: "active" | "disabled", updatedById: string, req?: Request) {
  const user = await prisma.user.update({ where: { id: userId }, data: { status }, select: USER_SELECT });
  await recordAudit({
    userId: updatedById,
    action: status === "disabled" ? "user_disabled" : "user_enabled",
    entityType: "User",
    entityId: userId,
    req,
  });
  return user;
}

export async function resetPassword(userId: string, newPassword: string, updatedById: string, req?: Request) {
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await recordAudit({ userId: updatedById, action: "user_password_reset", entityType: "User", entityId: userId, req });
}
