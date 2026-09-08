import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { recordAudit } from "../services/auditService.js";

const locationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export const locationsRouter = Router();
locationsRouter.use(requireAuth);

locationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
    res.json(locations);
  })
);

locationsRouter.post(
  "/",
  requirePermission("DEPARTMENT_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = locationSchema.parse(req.body);
    const location = await prisma.location.create({ data: input });
    await recordAudit({ userId: req.user!.sub, action: "location_created", entityType: "Location", entityId: location.id, newValue: location.name, req });
    res.status(201).json(location);
  })
);

locationsRouter.put(
  "/:id",
  requirePermission("DEPARTMENT_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = locationSchema.partial().parse(req.body);
    const location = await prisma.location.update({ where: { id: req.params.id }, data: input });
    await recordAudit({ userId: req.user!.sub, action: "location_updated", entityType: "Location", entityId: location.id, req });
    res.json(location);
  })
);

locationsRouter.delete(
  "/:id",
  requirePermission("DEPARTMENT_MANAGE"),
  asyncHandler(async (req, res) => {
    await prisma.location.delete({ where: { id: req.params.id } });
    await recordAudit({ userId: req.user!.sub, action: "location_deleted", entityType: "Location", entityId: req.params.id, req });
    res.status(204).send();
  })
);
