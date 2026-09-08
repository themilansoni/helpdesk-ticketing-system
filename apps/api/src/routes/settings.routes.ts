import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { recordAudit } from "../services/auditService.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
    res.json(settings);
  })
);

const updateSchema = z.object({ value: z.string() });

settingsRouter.put(
  "/:key",
  requirePermission("SYSTEM_SETTINGS_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const setting = await prisma.systemSetting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value: input.value },
      update: { value: input.value },
    });
    await recordAudit({
      userId: req.user!.sub,
      action: "system_setting_updated",
      entityType: "SystemSetting",
      entityId: setting.id,
      newValue: input.value,
      req,
    });
    res.json(setting);
  })
);
