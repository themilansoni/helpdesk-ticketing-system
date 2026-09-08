import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, where, type QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toIso } from "./helpers";
import type { AuditLogEntry, PaginatedResult } from "@/types";

export interface RecordAuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
}

function serialize(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function recordAudit(input: RecordAuditInput) {
  await addDoc(collection(db, "auditLogs"), {
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    previousValue: serialize(input.previousValue),
    newValue: serialize(input.newValue),
    createdAt: serverTimestamp(),
  });
}

export interface ListAuditLogsParams {
  search?: string;
  entityType?: string;
  userId?: string;
  action?: string;
  page: number;
  pageSize: number;
}

export async function listAuditLogs(params: ListAuditLogsParams): Promise<PaginatedResult<AuditLogEntry>> {
  const constraints: QueryConstraint[] = [];
  if (params.entityType) constraints.push(where("entityType", "==", params.entityType));
  if (params.userId) constraints.push(where("userId", "==", params.userId));
  if (params.action) constraints.push(where("action", "==", params.action));
  constraints.push(orderBy("createdAt", "desc"));

  const snap = await getDocs(query(collection(db, "auditLogs"), ...constraints));
  const userCache = new Map<string, { firstName: string; lastName: string; email: string } | null>();

  let entries = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data();
      let user: { firstName: string; lastName: string; email: string } | null = null;
      if (data.userId) {
        if (!userCache.has(data.userId)) {
          const userSnap = await getDoc(doc(db, "users", data.userId));
          userCache.set(
            data.userId,
            userSnap.exists()
              ? { firstName: userSnap.data().firstName, lastName: userSnap.data().lastName, email: userSnap.data().email }
              : null
          );
        }
        user = userCache.get(data.userId) ?? null;
      }
      return {
        id: d.id,
        userId: data.userId ?? null,
        user,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        previousValue: data.previousValue ?? null,
        newValue: data.newValue ?? null,
        createdAt: toIso(data.createdAt),
      };
    })
  );

  if (params.search) {
    const term = params.search.toLowerCase();
    entries = entries.filter(
      (e) => e.action.toLowerCase().includes(term) || e.entityType.toLowerCase().includes(term) || e.entityId.toLowerCase().includes(term)
    );
  }

  const total = entries.length;
  const start = (params.page - 1) * params.pageSize;
  return { data: entries.slice(start, start + params.pageSize), total, page: params.page, pageSize: params.pageSize };
}
