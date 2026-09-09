import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DbError } from "./helpers";
import type { CreateAssetModelInput, CreateManufacturerInput } from "@helpdesk/shared";
import type { AssetModel, AssetType, Department, KnowledgeCategory, Location, Manufacturer, Priority, TicketCategory, TicketSubcategory } from "@/types";

export async function listDepartments(): Promise<Department[]> {
  const snap = await getDocs(query(collection(db, "departments"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name, description: d.data().description ?? null }));
}

export async function createDepartment(input: { name: string; description?: string }) {
  const ref = await addDoc(collection(db, "departments"), { name: input.name, description: input.description ?? null });
  return ref.id;
}

export async function deleteDepartment(id: string) {
  const usersUsingIt = await getDocs(query(collection(db, "users"), where("departmentId", "==", id)));
  if (!usersUsingIt.empty) throw new DbError("Cannot delete a department that still has users assigned.", 409);
  await deleteDoc(doc(db, "departments", id));
}

export async function listLocations(): Promise<Location[]> {
  const snap = await getDocs(query(collection(db, "locations"), orderBy("name")));
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    address: d.data().address ?? null,
    city: d.data().city ?? null,
    country: d.data().country ?? null,
  }));
}

export async function createLocation(input: { name: string; address?: string; city?: string; country?: string }) {
  const ref = await addDoc(collection(db, "locations"), input);
  return ref.id;
}

export async function deleteLocation(id: string) {
  await deleteDoc(doc(db, "locations", id));
}

export async function listCategories(): Promise<TicketCategory[]> {
  const [catSnap, subSnap] = await Promise.all([
    getDocs(query(collection(db, "ticketCategories"), orderBy("name"))),
    getDocs(query(collection(db, "ticketSubcategories"), orderBy("name"))),
  ]);
  const subsByCategory = new Map<string, TicketSubcategory[]>();
  for (const s of subSnap.docs) {
    const data = s.data();
    const list = subsByCategory.get(data.categoryId) ?? [];
    list.push({ id: s.id, name: data.name, categoryId: data.categoryId });
    subsByCategory.set(data.categoryId, list);
  }
  return catSnap.docs.map((c) => ({
    id: c.id,
    name: c.data().name,
    description: c.data().description ?? null,
    subcategories: subsByCategory.get(c.id) ?? [],
  }));
}

export async function createCategory(name: string) {
  const ref = await addDoc(collection(db, "ticketCategories"), { name, description: null });
  return ref.id;
}

export async function deleteCategory(id: string) {
  const inUse = await getDocs(query(collection(db, "tickets"), where("categoryId", "==", id)));
  if (!inUse.empty) throw new DbError("Cannot delete a category that is used by existing tickets.", 409);
  await deleteDoc(doc(db, "ticketCategories", id));
}

export async function createSubcategory(name: string, categoryId: string) {
  const category = await getDoc(doc(db, "ticketCategories", categoryId));
  const ref = await addDoc(collection(db, "ticketSubcategories"), {
    name,
    categoryId,
    categoryName: category.data()?.name ?? "",
  });
  return ref.id;
}

export async function deleteSubcategory(id: string) {
  await deleteDoc(doc(db, "ticketSubcategories", id));
}

export async function listPriorities(): Promise<Priority[]> {
  const snap = await getDocs(query(collection(db, "priorities"), orderBy("level")));
  return snap.docs.map((p) => {
    const data = p.data();
    return {
      id: p.id,
      name: data.name,
      level: data.level,
      colorHex: data.colorHex,
      slaPolicy: data.slaPolicy,
    };
  });
}

export async function updateSlaPolicy(priorityId: string, policy: { firstResponseMinutes: number; resolutionMinutes: number; businessHoursOnly: boolean }) {
  await updateDoc(doc(db, "priorities", priorityId), { slaPolicy: policy });
}

export async function listAssetTypes(): Promise<AssetType[]> {
  const snap = await getDocs(query(collection(db, "assetTypes"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name }));
}

export async function listManufacturers(): Promise<Manufacturer[]> {
  const snap = await getDocs(query(collection(db, "manufacturers"), orderBy("name")));
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    supportUrl: d.data().supportUrl ?? null,
    supportPhone: d.data().supportPhone ?? null,
  }));
}

export async function createManufacturer(input: CreateManufacturerInput) {
  const ref = await addDoc(collection(db, "manufacturers"), {
    name: input.name,
    supportUrl: input.supportUrl ?? null,
    supportPhone: input.supportPhone ?? null,
  });
  return ref.id;
}

export async function deleteManufacturer(id: string) {
  const [assetsUsingIt, modelsUsingIt] = await Promise.all([
    getDocs(query(collection(db, "assets"), where("manufacturerId", "==", id))),
    getDocs(query(collection(db, "assetModels"), where("manufacturerId", "==", id))),
  ]);
  if (!assetsUsingIt.empty || !modelsUsingIt.empty) {
    throw new DbError("Cannot delete a manufacturer that is still used by assets or models.", 409);
  }
  await deleteDoc(doc(db, "manufacturers", id));
}

export async function listAssetModels(): Promise<AssetModel[]> {
  const snap = await getDocs(query(collection(db, "assetModels"), orderBy("name")));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      manufacturer: data.manufacturerId ? { id: data.manufacturerId, name: data.manufacturerName } : null,
      assetType: data.assetTypeId ? { id: data.assetTypeId, name: data.assetTypeName } : null,
    };
  });
}

export async function createAssetModel(input: CreateAssetModelInput) {
  let manufacturerName: string | undefined;
  if (input.manufacturerId) {
    const mSnap = await getDoc(doc(db, "manufacturers", input.manufacturerId));
    manufacturerName = mSnap.data()?.name;
  }
  let assetTypeName: string | undefined;
  if (input.assetTypeId) {
    const tSnap = await getDoc(doc(db, "assetTypes", input.assetTypeId));
    assetTypeName = tSnap.data()?.name;
  }
  const ref = await addDoc(collection(db, "assetModels"), {
    name: input.name,
    manufacturerId: input.manufacturerId ?? null,
    manufacturerName: manufacturerName ?? null,
    assetTypeId: input.assetTypeId ?? null,
    assetTypeName: assetTypeName ?? null,
  });
  return ref.id;
}

export async function deleteAssetModel(id: string) {
  const assetsUsingIt = await getDocs(query(collection(db, "assets"), where("assetModelId", "==", id)));
  if (!assetsUsingIt.empty) throw new DbError("Cannot delete a model that is still used by assets.", 409);
  await deleteDoc(doc(db, "assetModels", id));
}

export async function listKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  const snap = await getDocs(query(collection(db, "knowledgeCategories"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name, description: d.data().description ?? null }));
}

export interface TechnicianOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: { name: string };
}

export async function listTechnicians(): Promise<TechnicianOption[]> {
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "in", ["Technician", "Manager", "Administrator"]), where("status", "==", "active"))
  );
  return snap.docs
    .map((u) => {
      const data = u.data();
      return { id: u.id, firstName: data.firstName, lastName: data.lastName, email: data.email, role: { name: data.role } };
    })
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export async function getSystemSettings(): Promise<Array<{ id: string; key: string; value: string; description: string | null }>> {
  const snap = await getDocs(collection(db, "systemSettings"));
  return snap.docs.map((d) => ({ id: d.id, key: d.data().key, value: d.data().value, description: d.data().description ?? null }));
}

export async function updateSystemSetting(key: string, value: string) {
  await setDoc(doc(db, "systemSettings", key), { key, value }, { merge: true });
}
