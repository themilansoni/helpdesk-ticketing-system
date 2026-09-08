import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toIso } from "./helpers";
import type { NotificationType } from "@helpdesk/shared";
import type { AppNotification } from "@/types";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export async function notifyUser(input: CreateNotificationInput) {
  await addDoc(collection(db, "notifications"), {
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

export async function notifyManyUsers(userIds: string[], input: Omit<CreateNotificationInput, "userId">) {
  const uniqueIds = [...new Set(userIds)];
  await Promise.all(uniqueIds.map((userId) => notifyUser({ ...input, userId })));
}

export async function listMyNotifications(userId: string): Promise<AppNotification[]> {
  const snap = await getDocs(query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(50)));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      isRead: data.isRead,
      createdAt: toIso(data.createdAt),
    };
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const snap = await getDocs(query(collection(db, "notifications"), where("userId", "==", userId), where("isRead", "==", false)));
  return snap.size;
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, "notifications", id), { isRead: true });
}

export async function markAllNotificationsRead(userId: string) {
  const snap = await getDocs(query(collection(db, "notifications"), where("userId", "==", userId), where("isRead", "==", false)));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
  await batch.commit();
}
