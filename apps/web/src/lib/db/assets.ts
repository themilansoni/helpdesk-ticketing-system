import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, deleteDoc, type QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordAudit } from "./auditLogs";
import { notifyUser } from "./notifications";
import { DbError, toIso, toIsoOrNull } from "./helpers";
import type { CreateAssetInput } from "@helpdesk/shared";
import type { Asset, AssetHistoryEntry, PaginatedResult } from "@/types";

export interface Actor {
  id: string;
  firstName: string;
  lastName: string;
}

function toAsset(id: string, data: Record<string, any>): Asset {
  return {
    id,
    assetTag: data.assetTag,
    serialNumber: data.serialNumber ?? null,
    assetType: { id: data.assetTypeId, name: data.assetTypeName },
    manufacturerId: data.manufacturerId ?? null,
    manufacturer: data.manufacturer ?? null,
    assetModelId: data.assetModelId ?? null,
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

async function addAssetHistory(
  assetId: string,
  actor: Actor | null,
  action: string,
  extra: Partial<{ assignedTo: { id: string; firstName: string; lastName: string }; note: string }> = {}
) {
  await addDoc(collection(db, "assetHistory"), {
    assetId,
    userId: actor?.id ?? null,
    userName: actor ? `${actor.firstName} ${actor.lastName}` : null,
    action,
    assignedToId: extra.assignedTo?.id ?? null,
    assignedToFirstName: extra.assignedTo?.firstName ?? null,
    assignedToLastName: extra.assignedTo?.lastName ?? null,
    note: extra.note ?? null,
    createdAt: serverTimestamp(),
  });
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

export async function createAsset(input: CreateAssetInput, actor: Actor): Promise<Asset> {
  const typeSnap = await getDoc(doc(db, "assetTypes", input.assetTypeId));

  let manufacturerName: string | null = null;
  if (input.manufacturerId) {
    const mSnap = await getDoc(doc(db, "manufacturers", input.manufacturerId));
    manufacturerName = mSnap.data()?.name ?? null;
  }
  let modelName: string | null = null;
  if (input.assetModelId) {
    const modSnap = await getDoc(doc(db, "assetModels", input.assetModelId));
    modelName = modSnap.data()?.name ?? null;
  }

  const ref = await addDoc(collection(db, "assets"), {
    assetTag: input.assetTag,
    serialNumber: input.serialNumber ?? null,
    assetTypeId: input.assetTypeId,
    assetTypeName: typeSnap.data()?.name ?? "",
    manufacturerId: input.manufacturerId ?? null,
    manufacturer: manufacturerName,
    assetModelId: input.assetModelId ?? null,
    model: modelName,
    purchaseDate: input.purchaseDate ?? null,
    warrantyExpiry: input.warrantyExpiry ?? null,
    status: input.status,
    assignedUserId: null,
    assignedUserFirstName: null,
    assignedUserLastName: null,
    assignedUserEmail: null,
    departmentId: input.departmentId ?? null,
    locationId: input.locationId ?? null,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await recordAudit({ userId: actor.id, action: "asset_created", entityType: "Asset", entityId: ref.id, newValue: input.assetTag });
  await addAssetHistory(ref.id, actor, "created");
  return getAsset(ref.id);
}

export async function updateAsset(id: string, input: Partial<CreateAssetInput>, updatedById: string): Promise<Asset> {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const key of ["serialNumber", "purchaseDate", "warrantyExpiry", "status", "departmentId", "locationId", "notes"] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  if (input.manufacturerId !== undefined) {
    patch.manufacturerId = input.manufacturerId;
    if (input.manufacturerId) {
      const mSnap = await getDoc(doc(db, "manufacturers", input.manufacturerId));
      patch.manufacturer = mSnap.data()?.name ?? null;
    } else {
      patch.manufacturer = null;
    }
  }
  if (input.assetModelId !== undefined) {
    patch.assetModelId = input.assetModelId;
    if (input.assetModelId) {
      const modSnap = await getDoc(doc(db, "assetModels", input.assetModelId));
      patch.model = modSnap.data()?.name ?? null;
    } else {
      patch.model = null;
    }
  }
  await updateDoc(doc(db, "assets", id), patch);
  await recordAudit({ userId: updatedById, action: "asset_updated", entityType: "Asset", entityId: id, newValue: input });
  return getAsset(id);
}

export async function checkoutAsset(assetId: string, userId: string, actor: Actor, note?: string): Promise<Asset> {
  const assetSnap = await getDoc(doc(db, "assets", assetId));
  if (!assetSnap.exists()) throw new DbError("Asset not found.", 404);
  if (assetSnap.data().assignedUserId) throw new DbError("This asset is already checked out. Check it in first.", 409);

  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) throw new DbError("Selected user does not exist.", 400);
  const u = userSnap.data();

  await updateDoc(doc(db, "assets", assetId), {
    assignedUserId: userId,
    assignedUserFirstName: u.firstName,
    assignedUserLastName: u.lastName,
    assignedUserEmail: u.email,
    status: "assigned",
    updatedAt: serverTimestamp(),
  });

  const assignedTo = { id: userId, firstName: u.firstName, lastName: u.lastName };
  await addAssetHistory(assetId, actor, "checked_out", { assignedTo, note });
  await recordAudit({ userId: actor.id, action: "asset_checked_out", entityType: "Asset", entityId: assetId, newValue: `${u.firstName} ${u.lastName}` });
  await notifyUser({
    userId,
    type: "asset_checked_out",
    title: "Asset checked out to you",
    message: `Asset ${assetSnap.data().assetTag} has been checked out to you.`,
    entityType: "asset",
    entityId: assetId,
  });

  return getAsset(assetId);
}

export async function checkinAsset(assetId: string, actor: Actor, note?: string): Promise<Asset> {
  const assetSnap = await getDoc(doc(db, "assets", assetId));
  if (!assetSnap.exists()) throw new DbError("Asset not found.", 404);
  const data = assetSnap.data();
  const previousUser = data.assignedUserId
    ? { id: data.assignedUserId, firstName: data.assignedUserFirstName, lastName: data.assignedUserLastName }
    : null;
  if (!previousUser) throw new DbError("This asset is not currently checked out.", 409);

  await updateDoc(doc(db, "assets", assetId), {
    assignedUserId: null,
    assignedUserFirstName: null,
    assignedUserLastName: null,
    assignedUserEmail: null,
    status: "available",
    updatedAt: serverTimestamp(),
  });

  await addAssetHistory(assetId, actor, "checked_in", { assignedTo: previousUser, note });
  await recordAudit({ userId: actor.id, action: "asset_checked_in", entityType: "Asset", entityId: assetId, previousValue: `${previousUser.firstName} ${previousUser.lastName}` });
  await notifyUser({
    userId: previousUser.id,
    type: "asset_checked_in",
    title: "Asset checked in",
    message: `Asset ${data.assetTag} has been checked back in.`,
    entityType: "asset",
    entityId: assetId,
  });

  return getAsset(assetId);
}

export async function listAssetHistory(assetId: string): Promise<AssetHistoryEntry[]> {
  const snap = await getDocs(query(collection(db, "assetHistory"), where("assetId", "==", assetId)));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        assetId,
        userId: data.userId ?? null,
        user: data.userName ? { firstName: data.userName.split(" ")[0] ?? "", lastName: data.userName.split(" ").slice(1).join(" ") } : null,
        action: data.action,
        assignedTo: data.assignedToId ? { id: data.assignedToId, firstName: data.assignedToFirstName, lastName: data.assignedToLastName } : null,
        note: data.note ?? null,
        createdAt: toIso(data.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteAsset(id: string, deletedById: string) {
  const snap = await getDoc(doc(db, "assets", id));
  if (!snap.exists()) throw new DbError("Asset not found.", 404);
  await deleteDoc(doc(db, "assets", id));
  await recordAudit({ userId: deletedById, action: "asset_deleted", entityType: "Asset", entityId: id, previousValue: snap.data().assetTag });
}
