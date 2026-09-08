import { prisma } from "@helpdesk/database";
import type { Request } from "express";
import type { CreateKnowledgeArticleInput } from "@helpdesk/shared";
import { ApiError } from "../lib/apiError.js";
import { recordAudit } from "./auditService.js";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface ListArticlesParams {
  search?: string;
  categoryId?: string;
  status?: string;
  tag?: string;
  includeDrafts: boolean;
  page: number;
  pageSize: number;
}

export async function listArticles(params: ListArticlesParams) {
  const where: NonNullable<Parameters<typeof prisma.knowledgeArticle.findMany>[0]>["where"] = {};
  if (!params.includeDrafts) where.status = "published";
  else if (params.status) where.status = params.status;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.tag) where.tagsCsv = { contains: params.tag };
  if (params.search) {
    where.OR = [{ title: { contains: params.search } }, { content: { contains: params.search } }];
  }

  const [total, data] = await Promise.all([
    prisma.knowledgeArticle.count({ where }),
    prisma.knowledgeArticle.findMany({
      where,
      include: { category: true, author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);

  return { data, total, page: params.page, pageSize: params.pageSize };
}

export async function getArticleBySlugOrId(idOrSlug: string, incrementView = false) {
  const article = await prisma.knowledgeArticle.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { category: true, author: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!article) throw ApiError.notFound("Article not found.");

  if (incrementView) {
    await prisma.knowledgeArticle.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } });
  }
  return article;
}

export async function createArticle(input: CreateKnowledgeArticleInput, authorId: string, req?: Request) {
  let slug = slugify(input.title);
  const existing = await prisma.knowledgeArticle.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const article = await prisma.knowledgeArticle.create({
    data: {
      title: input.title,
      slug,
      content: input.content,
      tagsCsv: input.tags.join(","),
      status: input.status,
      categoryId: input.categoryId,
      authorId,
      publishedAt: input.status === "published" ? new Date() : null,
    },
    include: { category: true, author: { select: { id: true, firstName: true, lastName: true } } },
  });

  await recordAudit({ userId: authorId, action: "knowledge_article_created", entityType: "KnowledgeArticle", entityId: article.id, newValue: article.title, req });
  return article;
}

export async function updateArticle(
  articleId: string,
  input: Partial<CreateKnowledgeArticleInput>,
  updatedById: string,
  req?: Request
) {
  const existing = await prisma.knowledgeArticle.findUnique({ where: { id: articleId } });
  if (!existing) throw ApiError.notFound("Article not found.");

  const becomingPublished = input.status === "published" && existing.status !== "published";

  const article = await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: {
      title: input.title,
      content: input.content,
      tagsCsv: input.tags ? input.tags.join(",") : undefined,
      status: input.status,
      categoryId: input.categoryId,
      publishedAt: becomingPublished ? new Date() : undefined,
    },
    include: { category: true, author: { select: { id: true, firstName: true, lastName: true } } },
  });

  await recordAudit({
    userId: updatedById,
    action: becomingPublished ? "knowledge_article_published" : "knowledge_article_updated",
    entityType: "KnowledgeArticle",
    entityId: articleId,
    req,
  });

  return article;
}

export async function deleteArticle(articleId: string, deletedById: string, req?: Request) {
  const existing = await prisma.knowledgeArticle.findUnique({ where: { id: articleId } });
  if (!existing) throw ApiError.notFound("Article not found.");
  await prisma.knowledgeArticle.delete({ where: { id: articleId } });
  await recordAudit({ userId: deletedById, action: "knowledge_article_deleted", entityType: "KnowledgeArticle", entityId: articleId, previousValue: existing.title, req });
}

export async function voteArticle(articleId: string, helpful: boolean) {
  const article = await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: helpful ? { helpfulCount: { increment: 1 } } : { notHelpfulCount: { increment: 1 } },
  });
  return article;
}
