import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { paginationSchema } from "@helpdesk/shared";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";

export const auditLogsRouter = Router();
auditLogsRouter.use(requireAuth);
auditLogsRouter.use(requirePermission("AUDIT_LOG_VIEW"));

auditLogsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const where: NonNullable<Parameters<typeof prisma.auditLog.findMany>[0]>["where"] = {};
    if (req.query.entityType) where.entityType = req.query.entityType as string;
    if (req.query.userId) where.userId = req.query.userId as string;
    if (req.query.action) where.action = req.query.action as string;
    if (req.query.search) {
      where.OR = [
        { entityType: { contains: req.query.search as string } },
        { action: { contains: req.query.search as string } },
        { entityId: { contains: req.query.search as string } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ data, total, page, pageSize });
  })
);
