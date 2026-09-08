import { prisma } from "@helpdesk/database";
import type { Request } from "express";
import type { CreateAssetInput } from "@helpdesk/shared";
import { ApiError } from "../lib/apiError.js";
import { recordAudit } from "./auditService.js";
import { notifyUser } from "./notificationService.js";

const ASSET_INCLUDE = {
  assetType: true,
  assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
  department: true,
  location: true,
} as const;

export interface ListAssetsParams {
  search?: string;
  status?: string;
  assetTypeId?: string;
  assignedUserId?: string;
  page: number;
  pageSize: number;
}

export async function listAssets(params: ListAssetsParams) {
  const where: NonNullable<Parameters<typeof prisma.asset.findMany>[0]>["where"] = {};
  if (params.status) where.status = params.status;
  if (params.assetTypeId) where.assetTypeId = params.assetTypeId;
  if (params.assignedUserId) where.assignedUserId = params.assignedUserId;
  if (params.search) {
    where.OR = [
      { assetTag: { contains: params.search } },
      { serialNumber: { contains: params.search } },
      { model: { contains: params.search } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      include: ASSET_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);

  return { data, total, page: params.page, pageSize: params.pageSize };
}

export async function createAsset(input: CreateAssetInput, createdById: string, req?: Request) {
  const asset = await prisma.asset.create({
    data: {
      assetTag: input.assetTag,
      serialNumber: input.serialNumber,
      assetTypeId: input.assetTypeId,
      manufacturer: input.manufacturer,
      model: input.model,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      warrantyExpiry: input.warrantyExpiry ? new Date(input.warrantyExpiry) : null,
      status: input.status,
      assignedUserId: input.assignedUserId,
      departmentId: input.departmentId,
      locationId: input.locationId,
      notes: input.notes,
    },
    include: ASSET_INCLUDE,
  });
  await recordAudit({ userId: createdById, action: "asset_created", entityType: "Asset", entityId: asset.id, newValue: asset.assetTag, req });
  return asset;
}

export async function updateAsset(assetId: string, input: Partial<CreateAssetInput>, updatedById: string, req?: Request) {
  const existing = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!existing) throw ApiError.notFound("Asset not found.");

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      serialNumber: input.serialNumber,
      manufacturer: input.manufacturer,
      model: input.model,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
      warrantyExpiry: input.warrantyExpiry ? new Date(input.warrantyExpiry) : undefined,
      status: input.status,
      assignedUserId: input.assignedUserId,
      departmentId: input.departmentId,
      locationId: input.locationId,
      notes: input.notes,
    },
    include: ASSET_INCLUDE,
  });

  await recordAudit({
    userId: updatedById,
    action: "asset_updated",
    entityType: "Asset",
    entityId: assetId,
    previousValue: existing,
    newValue: input,
    req,
  });

  return asset;
}

export async function assignAsset(assetId: string, userId: string | null, assignedById: string, req?: Request) {
  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: { assignedUserId: userId, status: userId ? "assigned" : "available" },
    include: ASSET_INCLUDE,
  });

  await recordAudit({
    userId: assignedById,
    action: userId ? "asset_assigned" : "asset_unassigned",
    entityType: "Asset",
    entityId: assetId,
    newValue: userId,
    req,
  });

  if (userId) {
    await notifyUser({
      userId,
      type: "ticket_assigned",
      title: "Asset assigned to you",
      message: `Asset ${asset.assetTag} (${asset.model ?? asset.assetType.name}) has been assigned to you.`,
      entityType: "asset",
      entityId: assetId,
    });
  }

  return asset;
}

export async function deleteAsset(assetId: string, deletedById: string, req?: Request) {
  const existing = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!existing) throw ApiError.notFound("Asset not found.");
  await prisma.asset.delete({ where: { id: assetId } });
  await recordAudit({ userId: deletedById, action: "asset_deleted", entityType: "Asset", entityId: assetId, previousValue: existing, req });
}
