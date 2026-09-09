import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toIso } from "./helpers";
import type { BusinessRule } from "@/types";

function toBusinessRule(id: string, data: Record<string, any>): BusinessRule {
  return {
    id,
    name: data.name,
    enabled: data.enabled ?? true,
    order: data.order ?? 0,
    keyword: data.keyword,
    setCategoryId: data.setCategoryId ?? null,
    setCategoryName: data.setCategoryName ?? null,
    setPriorityId: data.setPriorityId ?? null,
    setPriorityName: data.setPriorityName ?? null,
    setDepartmentId: data.setDepartmentId ?? null,
    setDepartmentName: data.setDepartmentName ?? null,
    assignTechnicianId: data.assignTechnicianId ?? null,
    assignTechnicianName: data.assignTechnicianName ?? null,
    addTags: data.addTags ?? [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function listBusinessRules(): Promise<BusinessRule[]> {
  const snap = await getDocs(query(collection(db, "businessRules"), orderBy("order", "asc")));
  return snap.docs.map((d) => toBusinessRule(d.id, d.data()));
}

export interface BusinessRuleInput {
  name: string;
  keyword: string;
  setCategoryId?: string | null;
  setPriorityId?: string | null;
  setDepartmentId?: string | null;
  assignTechnicianId?: string | null;
  addTags: string[];
}

async function resolveNames(input: BusinessRuleInput) {
  const [categorySnap, prioritySnap, departmentSnap, technicianSnap] = await Promise.all([
    input.setCategoryId ? getDoc(doc(db, "ticketCategories", input.setCategoryId)) : null,
    input.setPriorityId ? getDoc(doc(db, "priorities", input.setPriorityId)) : null,
    input.setDepartmentId ? getDoc(doc(db, "departments", input.setDepartmentId)) : null,
    input.assignTechnicianId ? getDoc(doc(db, "users", input.assignTechnicianId)) : null,
  ]);
  const tech = technicianSnap?.data();
  return {
    setCategoryName: categorySnap?.data()?.name ?? null,
    setPriorityName: prioritySnap?.data()?.name ?? null,
    setDepartmentName: departmentSnap?.data()?.name ?? null,
    assignTechnicianName: tech ? `${tech.firstName} ${tech.lastName}` : null,
  };
}

export async function createBusinessRule(input: BusinessRuleInput): Promise<string> {
  const existing = await getDocs(collection(db, "businessRules"));
  const nextOrder = existing.size;
  const names = await resolveNames(input);

  const ref = await addDoc(collection(db, "businessRules"), {
    name: input.name,
    keyword: input.keyword,
    enabled: true,
    order: nextOrder,
    setCategoryId: input.setCategoryId ?? null,
    setPriorityId: input.setPriorityId ?? null,
    setDepartmentId: input.setDepartmentId ?? null,
    assignTechnicianId: input.assignTechnicianId ?? null,
    addTags: input.addTags,
    ...names,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBusinessRule(id: string, input: BusinessRuleInput): Promise<void> {
  const names = await resolveNames(input);
  await updateDoc(doc(db, "businessRules", id), {
    name: input.name,
    keyword: input.keyword,
    setCategoryId: input.setCategoryId ?? null,
    setPriorityId: input.setPriorityId ?? null,
    setDepartmentId: input.setDepartmentId ?? null,
    assignTechnicianId: input.assignTechnicianId ?? null,
    addTags: input.addTags,
    ...names,
    updatedAt: serverTimestamp(),
  });
}

export async function setBusinessRuleEnabled(id: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, "businessRules", id), { enabled, updatedAt: serverTimestamp() });
}

export async function deleteBusinessRule(id: string): Promise<void> {
  await deleteDoc(doc(db, "businessRules", id));
}

export async function moveBusinessRule(rules: BusinessRule[], id: string, direction: "up" | "down"): Promise<void> {
  const index = rules.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rules.length) return;

  const batch = writeBatch(db);
  batch.update(doc(db, "businessRules", rules[index].id), { order: rules[swapWith].order });
  batch.update(doc(db, "businessRules", rules[swapWith].id), { order: rules[index].order });
  await batch.commit();
}
