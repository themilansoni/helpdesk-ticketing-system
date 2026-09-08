import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { z } from "zod";
import { createKnowledgeArticleSchema, paginationSchema } from "@helpdesk/shared";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  listArticles,
  getArticleBySlugOrId,
  createArticle,
  updateArticle,
  deleteArticle,
  voteArticle,
} from "../services/knowledgeService.js";

export const knowledgeBaseRouter = Router();
knowledgeBaseRouter.use(requireAuth);

knowledgeBaseRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.knowledgeCategory.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  })
);

knowledgeBaseRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const includeDrafts = req.user!.role !== "Employee";
    const result = await listArticles({
      search: req.query.search as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      status: req.query.status as string | undefined,
      tag: req.query.tag as string | undefined,
      includeDrafts,
      page,
      pageSize,
    });
    res.json(result);
  })
);

knowledgeBaseRouter.get(
  "/:idOrSlug",
  asyncHandler(async (req, res) => {
    const article = await getArticleBySlugOrId(req.params.idOrSlug, true);
    res.json(article);
  })
);

knowledgeBaseRouter.post(
  "/",
  requirePermission("KNOWLEDGE_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createKnowledgeArticleSchema.parse(req.body);
    const article = await createArticle(input, req.user!.sub, req);
    res.status(201).json(article);
  })
);

knowledgeBaseRouter.put(
  "/:id",
  requirePermission("KNOWLEDGE_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createKnowledgeArticleSchema.partial().parse(req.body);
    const article = await updateArticle(req.params.id, input, req.user!.sub, req);
    res.json(article);
  })
);

knowledgeBaseRouter.delete(
  "/:id",
  requirePermission("KNOWLEDGE_MANAGE"),
  asyncHandler(async (req, res) => {
    await deleteArticle(req.params.id, req.user!.sub, req);
    res.status(204).send();
  })
);

const voteSchema = z.object({ helpful: z.boolean() });

knowledgeBaseRouter.post(
  "/:id/vote",
  asyncHandler(async (req, res) => {
    const input = voteSchema.parse(req.body);
    const article = await voteArticle(req.params.id, input.helpful);
    res.json(article);
  })
);
