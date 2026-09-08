import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, deleteDoc, type QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordAudit } from "./auditLogs";
import { notifyUser } from "./notifications";
import { DbError, toIso, toIsoOrNull } from "./helpers";
import type { CreateAssetInput } from "@helpdesk/shared";
import type { Asset, PaginatedResult } from "@/types";

function toAsset(id: string, data: Record<string, any>): Asset {
  return {
    id,
    assetTag: data.assetTag,
    serialNumber: data.serialNumber ?? null,
    assetType: { id: data.assetTypeId, name: data.assetTypeName },
    manufacturer: data.manufacturer ?? null,
    model: data.model ?? null,
    purchaseDate: toIsoOrNull(data.purchaseDate),
    warrantyExpiry: toIsoOrNull(data.warrantyExpiry),
    status: data.status,
    assignedUser: data.assignedUserId ? { id: data.assignedUserId, firstName: data.assignedUserFirstName, lastName: data.assignedUserLastName, email: data.assignedUserEmail ?? "" } : null,
    department: data.departmentId ? { id: data.departmentId, name: data.departmentName } : null,
    location: data.locationId ? { id: data.locationId, name: data.locationName } : null,
    notes: data.notes ?? null,
    createdAt: toIso(data.createdAt),
  };
}

export interface ListAssetsParams {
  search?: string;
  status?: string;
  assetTypeId?: string;
  assignedUserId?: string;
  page: number;
  pageSize: number;
}

export async function listAssets(params: ListAssetsParams): Promise<PaginatedResult<Asset>> {
  const constraints: QueryConstraint[] = [];
  if (params.status) constraints.push(where("status", "==", params.status));
  if (params.assetTypeId) constraints.push(where("assetTypeId", "==", params.assetTypeId));
  if (params.assignedUserId) constraints.push(where("assignedUserId", "==", params.assignedUserId));
  constraints.push(orderBy("createdAt", "desc"));

  const snap = await getDocs(query(collection(db, "assets"), ...constraints));
  let assets = snap.docs.map((d) => toAsset(d.id, d.data()));

  if (params.search) {
    const term = params.search.toLowerCase();
    assets = assets.filter(
      (a) => a.assetTag.toLowerCase().includes(term) || (a.serialNumber ?? "").toLowerCase().includes(term) || (a.model ?? "").toLowerCase().includes(term)
    );
  }

  const total = assets.length;
  const start = (params.page - 1) * params.pageSize;
  return { data: assets.slice(start, start + params.pageSize), total, page: params.page, pageSize: params.pageSize };
}

export async function getAsset(id: string): Promise<Asset> {
  const snap = await getDoc(doc(db, "assets", id));
  if (!snap.exists()) throw new DbError("Asset not found.", 404);
  return toAsset(snap.id, snap.data());
}

export async function createAsset(input: CreateAssetInput, createdById: string): Promise<Asset> {
  const typeSnap = await getDoc(doc(db, "assetTypes", input.assetTypeId));
  const ref = await addDoc(collection(db, "assets"), {
    assetTag: input.assetTag,
    serialNumber: input.serialNumber ?? null,
    assetTypeId: input.assetTypeId,
    assetTypeName: typeSnap.data()?.name ?? "",
    manufacturer: input.manufacturer ?? null,
    model: input.model ?? null,
    purchaseDate: input.purchaseDate ?? null,
    warrantyExpiry: input.warrantyExpiry ?? null,
    status: input.status,
    assignedUserId: input.assignedUserId ?? null,
    departmentId: input.departmentId ?? null,
    locationId: input.locationId ?? null,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await recordAudit({ userId: createdById, action: "asset_created", entityType: "Asset", entityId: ref.id, newValue: input.assetTag });
  return getAsset(ref.id);
}

export async function updateAsset(id: string, input: Partial<CreateAssetInput>, updatedById: string): Promise<Asset> {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const key of ["serialNumber", "manufacturer", "model", "purchaseDate", "warrantyExpiry", "status", "departmentId", "locationId", "notes"] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  await updateDoc(doc(db, "assets", id), patch);
  await recordAudit({ userId: updatedById, action: "asset_updated", entityType: "Asset", entityId: id, newValue: input });
  return getAsset(id);
}

export async function assignAsset(assetId: string, userId: string | null, assignedById: string): Promise<Asset> {
  let userData: { firstName: string; lastName: string; email: string } | null = null;
  if (userId) {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists()) userData = { firstName: userSnap.data().firstName, lastName: userSnap.data().lastName, email: userSnap.data().email };
  }

  await updateDoc(doc(db, "assets", assetId), {
    assignedUserId: userId,
    assignedUserFirstName: userData?.firstName ?? null,
    assignedUserLastName: userData?.lastName ?? null,
    assignedUserEmail: userData?.email ?? null,
    status: userId ? "assigned" : "available",
    updatedAt: serverTimestamp(),
  });

  await recordAudit({ userId: assignedById, action: userId ? "asset_assigned" : "asset_unassigned", entityType: "Asset", entityId: assetId, newValue: userId });

  if (userId) {
    const assetSnap = await getDoc(doc(db, "assets", assetId));
    await notifyUser({
      userId,
      type: "ticket_assigned",
      title: "Asset assigned to you",
      message: `Asset ${assetSnap.data()?.assetTag} has been assigned to you.`,
      entityType: "asset",
      entityId: assetId,
    });
  }

  return getAsset(assetId);
}

export async function deleteAsset(id: string, deletedById: string) {
  const snap = await getDoc(doc(db, "assets", id));
  if (!snap.exists()) throw new DbError("Asset not found.", 404);
  await deleteDoc(doc(db, "assets", id));
  await recordAudit({ userId: deletedById, action: "asset_deleted", entityType: "Asset", entityId: id, previousValue: snap.data().assetTag });
}
