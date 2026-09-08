import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordAudit } from "./auditLogs";
import { DbError, toIso, toIsoOrNull } from "./helpers";
import type { CreateKnowledgeArticleInput } from "@helpdesk/shared";
import type { KnowledgeArticle, PaginatedResult } from "@/types";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toArticle(id: string, data: Record<string, any>): KnowledgeArticle {
  return {
    id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    tagsCsv: data.tagsCsv ?? "",
    status: data.status,
    category: { id: data.categoryId, name: data.categoryName, description: null },
    author: { id: data.authorId, firstName: data.authorFirstName, lastName: data.authorLastName },
    viewCount: data.viewCount ?? 0,
    helpfulCount: data.helpfulCount ?? 0,
    notHelpfulCount: data.notHelpfulCount ?? 0,
    publishedAt: toIsoOrNull(data.publishedAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
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

export async function listArticles(params: ListArticlesParams): Promise<PaginatedResult<KnowledgeArticle>> {
  const constraints: QueryConstraint[] = [];
  if (!params.includeDrafts) constraints.push(where("status", "==", "published"));
  else if (params.status) constraints.push(where("status", "==", params.status));
  if (params.categoryId) constraints.push(where("categoryId", "==", params.categoryId));

  const snap = await getDocs(query(collection(db, "knowledgeArticles"), ...constraints));
  let articles = snap.docs.map((d) => toArticle(d.id, d.data()));

  if (params.tag) articles = articles.filter((a) => a.tagsCsv.split(",").includes(params.tag!));
  if (params.search) {
    const term = params.search.toLowerCase();
    articles = articles.filter((a) => a.title.toLowerCase().includes(term) || a.content.toLowerCase().includes(term));
  }
  articles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const total = articles.length;
  const start = (params.page - 1) * params.pageSize;
  return { data: articles.slice(start, start + params.pageSize), total, page: params.page, pageSize: params.pageSize };
}

export async function getArticleBySlugOrId(idOrSlug: string, incrementView = false): Promise<KnowledgeArticle> {
  const directSnap = await getDoc(doc(db, "knowledgeArticles", idOrSlug));
  let id: string;
  let data: ReturnType<typeof directSnap.data>;

  if (directSnap.exists()) {
    id = directSnap.id;
    data = directSnap.data();
  } else {
    const bySlug = await getDocs(query(collection(db, "knowledgeArticles"), where("slug", "==", idOrSlug)));
    if (bySlug.empty) throw new DbError("Article not found.", 404);
    id = bySlug.docs[0]!.id;
    data = bySlug.docs[0]!.data();
  }

  if (incrementView) {
    await updateDoc(doc(db, "knowledgeArticles", id), { viewCount: increment(1) });
  }
  return toArticle(id, data!);
}

export async function createArticle(input: CreateKnowledgeArticleInput, authorId: string, authorName: { firstName: string; lastName: string }): Promise<KnowledgeArticle> {
  let slug = slugify(input.title);
  const existing = await getDocs(query(collection(db, "knowledgeArticles"), where("slug", "==", slug)));
  if (!existing.empty) slug = `${slug}-${Date.now().toString(36)}`;

  const categorySnap = await getDoc(doc(db, "knowledgeCategories", input.categoryId));

  const ref = await addDoc(collection(db, "knowledgeArticles"), {
    title: input.title,
    slug,
    content: input.content,
    tagsCsv: input.tags.join(","),
    status: input.status,
    categoryId: input.categoryId,
    categoryName: categorySnap.data()?.name ?? "",
    authorId,
    authorFirstName: authorName.firstName,
    authorLastName: authorName.lastName,
    viewCount: 0,
    helpfulCount: 0,
    notHelpfulCount: 0,
    publishedAt: input.status === "published" ? new Date().toISOString() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await recordAudit({ userId: authorId, action: "knowledge_article_created", entityType: "KnowledgeArticle", entityId: ref.id, newValue: input.title });
  return getArticleBySlugOrId(ref.id);
}

export async function updateArticle(id: string, input: Partial<CreateKnowledgeArticleInput>, updatedById: string): Promise<KnowledgeArticle> {
  const existingSnap = await getDoc(doc(db, "knowledgeArticles", id));
  if (!existingSnap.exists()) throw new DbError("Article not found.", 404);
  const becomingPublished = input.status === "published" && existingSnap.data().status !== "published";

  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.content !== undefined) patch.content = input.content;
  if (input.tags !== undefined) patch.tagsCsv = input.tags.join(",");
  if (input.status !== undefined) patch.status = input.status;
  if (input.categoryId !== undefined) {
    patch.categoryId = input.categoryId;
    const categorySnap = await getDoc(doc(db, "knowledgeCategories", input.categoryId));
    patch.categoryName = categorySnap.data()?.name ?? "";
  }
  if (becomingPublished) patch.publishedAt = new Date().toISOString();

  await updateDoc(doc(db, "knowledgeArticles", id), patch);
  await recordAudit({ userId: updatedById, action: becomingPublished ? "knowledge_article_published" : "knowledge_article_updated", entityType: "KnowledgeArticle", entityId: id });
  return getArticleBySlugOrId(id);
}

export async function deleteArticle(id: string, deletedById: string) {
  const snap = await getDoc(doc(db, "knowledgeArticles", id));
  if (!snap.exists()) throw new DbError("Article not found.", 404);
  await deleteDoc(doc(db, "knowledgeArticles", id));
  await recordAudit({ userId: deletedById, action: "knowledge_article_deleted", entityType: "KnowledgeArticle", entityId: id, previousValue: snap.data().title });
}

export async function voteArticle(id: string, helpful: boolean) {
  await updateDoc(doc(db, "knowledgeArticles", id), helpful ? { helpfulCount: increment(1) } : { notHelpfulCount: increment(1) });
}
