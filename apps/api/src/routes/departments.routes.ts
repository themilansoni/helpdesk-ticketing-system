import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { createDepartmentSchema } from "@helpdesk/shared";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { recordAudit } from "../services/auditService.js";
import { ApiError } from "../lib/apiError.js";

export const departmentsRouter = Router();
departmentsRouter.use(requireAuth);

departmentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    res.json(departments);
  })
);

departmentsRouter.post(
  "/",
  requirePermission("DEPARTMENT_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createDepartmentSchema.parse(req.body);
    const department = await prisma.department.create({ data: input });
    await recordAudit({ userId: req.user!.sub, action: "department_created", entityType: "Department", entityId: department.id, newValue: department.name, req });
    res.status(201).json(department);
  })
);

departmentsRouter.put(
  "/:id",
  requirePermission("DEPARTMENT_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createDepartmentSchema.partial().parse(req.body);
    const department = await prisma.department.update({ where: { id: req.params.id }, data: input });
    await recordAudit({ userId: req.user!.sub, action: "department_updated", entityType: "Department", entityId: department.id, req });
    res.json(department);
  })
);

departmentsRouter.delete(
  "/:id",
  requirePermission("DEPARTMENT_MANAGE"),
  asyncHandler(async (req, res) => {
    const inUse = await prisma.user.count({ where: { departmentId: req.params.id } });
    if (inUse > 0) throw ApiError.conflict("Cannot delete a department that still has users assigned.");
    await prisma.department.delete({ where: { id: req.params.id } });
    await recordAudit({ userId: req.user!.sub, action: "department_deleted", entityType: "Department", entityId: req.params.id, req });
    res.status(204).send();
  })
);
