import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { z } from "zod";
import { updateSlaPolicySchema } from "@helpdesk/shared";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { recordAudit } from "../services/auditService.js";

export const prioritiesRouter = Router();
prioritiesRouter.use(requireAuth);

prioritiesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const priorities = await prisma.priority.findMany({ include: { slaPolicy: true }, orderBy: { level: "asc" } });
    res.json(priorities);
  })
);

const updatePrioritySchema = z.object({ colorHex: z.string().optional() });

prioritiesRouter.put(
  "/:id",
  requirePermission("PRIORITY_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = updatePrioritySchema.parse(req.body);
    const priority = await prisma.priority.update({ where: { id: req.params.id }, data: input });
    await recordAudit({ userId: req.user!.sub, action: "priority_updated", entityType: "Priority", entityId: priority.id, req });
    res.json(priority);
  })
);

prioritiesRouter.put(
  "/:id/sla-policy",
  requirePermission("SLA_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = updateSlaPolicySchema.parse(req.body);
    const policy = await prisma.slaPolicy.upsert({
      where: { priorityId: req.params.id },
      create: { priorityId: req.params.id, ...input },
      update: input,
    });
    await recordAudit({
      userId: req.user!.sub,
      action: "sla_policy_updated",
      entityType: "SlaPolicy",
      entityId: policy.id,
      newValue: input,
      req,
    });
    res.json(policy);
  })
);
