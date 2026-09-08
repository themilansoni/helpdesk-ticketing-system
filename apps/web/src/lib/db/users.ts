import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { firebaseApp, db } from "@/lib/firebase";
import { recordAudit } from "./auditLogs";
import { DbError, toIsoOrNull } from "./helpers";
import type { CreateUserInput, RoleName } from "@helpdesk/shared";
import type { CurrentUser, PaginatedResult } from "@/types";

function toCurrentUser(id: string, data: DocumentData): CurrentUser {
  return {
    id,
    employeeId: data.employeeId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone ?? null,
    jobTitle: data.jobTitle ?? null,
    status: data.status,
    lastLoginAt: toIsoOrNull(data.lastLoginAt),
    role: { name: data.role as RoleName },
    department: data.departmentId ? { id: data.departmentId, name: data.departmentName } : null,
    location: data.locationId ? { id: data.locationId, name: data.locationName } : null,
    managerId: data.managerId ?? null,
  };
}

export interface ListUsersParams {
  search?: string;
  role?: string;
  departmentId?: string;
  status?: string;
  page: number;
  pageSize: number;
}

// Firestore has no OR-across-fields text search, so structural filters run
// server-side and free-text search runs client-side over the filtered set
// (fine at this app's scale - dozens to low hundreds of users).
export async function listUsers(params: ListUsersParams): Promise<PaginatedResult<CurrentUser>> {
  const constraints: QueryConstraint[] = [];
  if (params.role) constraints.push(where("role", "==", params.role));
  if (params.departmentId) constraints.push(where("departmentId", "==", params.departmentId));
  if (params.status) constraints.push(where("status", "==", params.status));
  constraints.push(orderBy("createdAt", "desc"));

  const snap = await getDocs(query(collection(db, "users"), ...constraints));
  let all = snap.docs.map((d) => toCurrentUser(d.id, d.data()));

  if (params.search) {
    const term = params.search.toLowerCase();
    all = all.filter(
      (u) =>
        u.firstName.toLowerCase().includes(term) ||
        u.lastName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.employeeId.toLowerCase().includes(term)
    );
  }

  const total = all.length;
  const start = (params.page - 1) * params.pageSize;
  return { data: all.slice(start, start + params.pageSize), total, page: params.page, pageSize: params.pageSize };
}

export async function getUser(id: string): Promise<CurrentUser> {
  const snap = await getDoc(doc(db, "users", id));
  if (!snap.exists()) throw new DbError("User not found.", 404);
  return toCurrentUser(snap.id, snap.data());
}

// Creating a Firebase Auth user via the client SDK signs the caller in as
// that new user - fine normally, but disastrous here since the caller is
// an already-signed-in Administrator. A throwaway secondary Firebase App
// instance creates the Auth account in isolation, leaving the admin's own
// session untouched, entirely client-side (no Cloud Functions needed).
export async function createUser(input: CreateUserInput, createdById: string): Promise<string> {
  const secondaryApp = initializeApp(firebaseApp.options, `user-creation-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, input.email, input.password);
    await signOut(secondaryAuth);

    let departmentName = "";
    if (input.departmentId) {
      const deptSnap = await getDoc(doc(db, "departments", input.departmentId));
      departmentName = deptSnap.data()?.name ?? "";
    }
    let locationName = "";
    if (input.locationId) {
      const locSnap = await getDoc(doc(db, "locations", input.locationId));
      locationName = locSnap.data()?.name ?? "";
    }

    await setDoc(doc(db, "users", credential.user.uid), {
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      jobTitle: input.jobTitle ?? null,
      role: input.roleName,
      status: "active",
      departmentId: input.departmentId ?? null,
      departmentName,
      locationId: input.locationId ?? null,
      locationName,
      managerId: input.managerId ?? null,
      lastLoginAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await recordAudit({ userId: createdById, action: "user_created", entityType: "User", entityId: credential.user.uid, newValue: input.email });
    return credential.user.uid;
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
}

export async function updateUser(id: string, input: Partial<CreateUserInput> & { status?: string }, updatedById: string) {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.firstName !== undefined) patch.firstName = input.firstName;
  if (input.lastName !== undefined) patch.lastName = input.lastName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.jobTitle !== undefined) patch.jobTitle = input.jobTitle;
  if (input.roleName !== undefined) patch.role = input.roleName;
  if (input.status !== undefined) patch.status = input.status;
  if (input.managerId !== undefined) patch.managerId = input.managerId;
  if (input.departmentId !== undefined) {
    patch.departmentId = input.departmentId;
    const deptSnap = input.departmentId ? await getDoc(doc(db, "departments", input.departmentId)) : null;
    patch.departmentName = deptSnap?.data()?.name ?? "";
  }
  if (input.locationId !== undefined) {
    patch.locationId = input.locationId;
    const locSnap = input.locationId ? await getDoc(doc(db, "locations", input.locationId)) : null;
    patch.locationName = locSnap?.data()?.name ?? "";
  }
  await updateDoc(doc(db, "users", id), patch);
  await recordAudit({ userId: updatedById, action: "user_updated", entityType: "User", entityId: id, newValue: input });
}

export async function setUserStatus(id: string, status: "active" | "disabled", updatedById: string) {
  await updateDoc(doc(db, "users", id), { status, updatedAt: serverTimestamp() });
  await recordAudit({ userId: updatedById, action: status === "disabled" ? "user_disabled" : "user_enabled", entityType: "User", entityId: id });
}

// The client SDK cannot set another user's password directly (that needs
// Admin SDK/Cloud Functions); Firebase's own password-reset email flow is
// the supported client-only equivalent and works without any email
// provider configuration on our side - Firebase sends it directly.
export async function sendUserPasswordReset(email: string, updatedById: string, userId: string) {
  const secondaryApp = initializeApp(firebaseApp.options, `pw-reset-${Date.now()}`);
  try {
    await sendPasswordResetEmail(getAuth(secondaryApp), email);
    await recordAudit({ userId: updatedById, action: "user_password_reset_sent", entityType: "User", entityId: userId });
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
}
