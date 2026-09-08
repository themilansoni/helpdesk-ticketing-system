import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { z } from "zod";
import { createAssetSchema, paginationSchema } from "@helpdesk/shared";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { listAssets, createAsset, updateAsset, assignAsset, deleteAsset } from "../services/assetService.js";

export const assetsRouter = Router();
assetsRouter.use(requireAuth);

assetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const assignedUserId = req.user!.role === "Employee" ? req.user!.sub : (req.query.assignedUserId as string | undefined);
    const result = await listAssets({
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      assetTypeId: req.query.assetTypeId as string | undefined,
      assignedUserId,
      page,
      pageSize,
    });
    res.json(result);
  })
);

assetsRouter.get(
  "/types",
  asyncHandler(async (_req, res) => {
    const types = await prisma.assetType.findMany({ orderBy: { name: "asc" } });
    res.json(types);
  })
);

assetsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: {
        assetType: true,
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        department: true,
        location: true,
        tickets: { select: { id: true, ticketNumber: true, subject: true }, take: 10, orderBy: { createdAt: "desc" } },
      },
    });
    res.json(asset);
  })
);

assetsRouter.post(
  "/",
  requirePermission("ASSET_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createAssetSchema.parse(req.body);
    const asset = await createAsset(input, req.user!.sub, req);
    res.status(201).json(asset);
  })
);

assetsRouter.put(
  "/:id",
  requirePermission("ASSET_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createAssetSchema.partial().parse(req.body);
    const asset = await updateAsset(req.params.id, input, req.user!.sub, req);
    res.json(asset);
  })
);

const assignSchema = z.object({ userId: z.string().nullable() });

assetsRouter.post(
  "/:id/assign",
  requirePermission("ASSET_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = assignSchema.parse(req.body);
    const asset = await assignAsset(req.params.id, input.userId, req.user!.sub, req);
    res.json(asset);
  })
);

assetsRouter.delete(
  "/:id",
  requirePermission("ASSET_MANAGE"),
  asyncHandler(async (req, res) => {
    await deleteAsset(req.params.id, req.user!.sub, req);
    res.status(204).send();
  })
);
