import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { createCategorySchema, createSubcategorySchema } from "@helpdesk/shared";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { recordAudit } from "../services/auditService.js";
import { ApiError } from "../lib/apiError.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.ticketCategory.findMany({
      include: { subcategories: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
    res.json(categories);
  })
);

categoriesRouter.post(
  "/",
  requirePermission("CATEGORY_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.parse(req.body);
    const category = await prisma.ticketCategory.create({ data: input });
    await recordAudit({ userId: req.user!.sub, action: "category_created", entityType: "TicketCategory", entityId: category.id, newValue: category.name, req });
    res.status(201).json(category);
  })
);

categoriesRouter.put(
  "/:id",
  requirePermission("CATEGORY_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.partial().parse(req.body);
    const category = await prisma.ticketCategory.update({ where: { id: req.params.id }, data: input });
    await recordAudit({ userId: req.user!.sub, action: "category_updated", entityType: "TicketCategory", entityId: category.id, req });
    res.json(category);
  })
);

categoriesRouter.delete(
  "/:id",
  requirePermission("CATEGORY_MANAGE"),
  asyncHandler(async (req, res) => {
    const inUse = await prisma.ticket.count({ where: { categoryId: req.params.id } });
    if (inUse > 0) throw ApiError.conflict("Cannot delete a category that is used by existing tickets.");
    await prisma.ticketCategory.delete({ where: { id: req.params.id } });
    await recordAudit({ userId: req.user!.sub, action: "category_deleted", entityType: "TicketCategory", entityId: req.params.id, req });
    res.status(204).send();
  })
);

categoriesRouter.post(
  "/subcategories",
  requirePermission("CATEGORY_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createSubcategorySchema.parse(req.body);
    const subcategory = await prisma.ticketSubcategory.create({ data: input });
    await recordAudit({ userId: req.user!.sub, action: "subcategory_created", entityType: "TicketSubcategory", entityId: subcategory.id, newValue: subcategory.name, req });
    res.status(201).json(subcategory);
  })
);

categoriesRouter.delete(
  "/subcategories/:id",
  requirePermission("CATEGORY_MANAGE"),
  asyncHandler(async (req, res) => {
    await prisma.ticketSubcategory.delete({ where: { id: req.params.id } });
    await recordAudit({ userId: req.user!.sub, action: "subcategory_deleted", entityType: "TicketSubcategory", entityId: req.params.id, req });
    res.status(204).send();
  })
);
