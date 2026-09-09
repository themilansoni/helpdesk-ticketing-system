import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, runTransaction, serverTimestamp, deleteDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordAudit } from "./auditLogs";
import { DbError, toIso, toIsoOrNull } from "./helpers";
import type { CreateLicenseInput } from "@helpdesk/shared";
import type { License, LicenseCheckout } from "@/types";

function toLicense(id: string, data: Record<string, any>): License {
  return {
    id,
    name: data.name,
    manufacturer: data.manufacturer ?? null,
    licenseKey: data.licenseKey ?? null,
    seatsTotal: data.seatsTotal,
    seatsUsed: data.seatsUsed ?? 0,
    purchaseDate: toIsoOrNull(data.purchaseDate),
    expirationDate: toIsoOrNull(data.expirationDate),
    notes: data.notes ?? null,
    createdAt: toIso(data.createdAt),
  };
}

export async function listLicenses(): Promise<License[]> {
  const snap = await getDocs(query(collection(db, "licenses"), orderBy("name")));
  return snap.docs.map((d) => toLicense(d.id, d.data()));
}

export async function createLicense(input: CreateLicenseInput, createdById: string): Promise<string> {
  const ref = await addDoc(collection(db, "licenses"), {
    name: input.name,
    manufacturer: input.manufacturer ?? null,
    licenseKey: input.licenseKey ?? null,
    seatsTotal: input.seatsTotal,
    seatsUsed: 0,
    purchaseDate: input.purchaseDate ?? null,
    expirationDate: input.expirationDate ?? null,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
  });
  await recordAudit({ userId: createdById, action: "license_created", entityType: "License", entityId: ref.id, newValue: input.name });
  return ref.id;
}

export async function deleteLicense(id: string, deletedById: string) {
  const snap = await getDoc(doc(db, "licenses", id));
  if (!snap.exists()) throw new DbError("License not found.", 404);
  await deleteDoc(doc(db, "licenses", id));
  await recordAudit({ userId: deletedById, action: "license_deleted", entityType: "License", entityId: id, previousValue: snap.data().name });
}

export async function checkoutLicense(licenseId: string, userId: string, checkedOutById: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "licenses", licenseId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new DbError("License not found.", 404);
    const data = snap.data();
    if ((data.seatsUsed ?? 0) >= data.seatsTotal) throw new DbError("No seats available for this license.", 409);
    tx.update(ref, { seatsUsed: (data.seatsUsed ?? 0) + 1 });
  });

  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) throw new DbError("Selected user does not exist.", 400);
  const u = userSnap.data();

  await addDoc(collection(db, "licenseCheckouts"), {
    licenseId,
    userId,
    userFirstName: u.firstName,
    userLastName: u.lastName,
    checkedOutAt: serverTimestamp(),
    checkedInAt: null,
  });

  await recordAudit({ userId: checkedOutById, action: "license_checked_out", entityType: "License", entityId: licenseId, newValue: `${u.firstName} ${u.lastName}` });
}

export async function checkinLicense(checkoutId: string, checkedInById: string): Promise<void> {
  const checkoutRef = doc(db, "licenseCheckouts", checkoutId);
  const checkoutSnap = await getDoc(checkoutRef);
  if (!checkoutSnap.exists()) throw new DbError("Checkout record not found.", 404);
  const checkout = checkoutSnap.data();
  if (checkout.checkedInAt) throw new DbError("This seat has already been released.", 409);

  await runTransaction(db, async (tx) => {
    const licenseRef = doc(db, "licenses", checkout.licenseId);
    const licenseSnap = await tx.get(licenseRef);
    if (!licenseSnap.exists()) throw new DbError("License not found.", 404);
    const seatsUsed = licenseSnap.data().seatsUsed ?? 0;
    tx.update(licenseRef, { seatsUsed: Math.max(0, seatsUsed - 1) });
    tx.update(checkoutRef, { checkedInAt: serverTimestamp() });
  });

  await recordAudit({
    userId: checkedInById,
    action: "license_checked_in",
    entityType: "License",
    entityId: checkout.licenseId,
    previousValue: `${checkout.userFirstName} ${checkout.userLastName}`,
  });
}

export async function listLicenseCheckouts(licenseId: string): Promise<LicenseCheckout[]> {
  const snap = await getDocs(query(collection(db, "licenseCheckouts"), where("licenseId", "==", licenseId)));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        licenseId,
        user: { id: data.userId, firstName: data.userFirstName, lastName: data.userLastName },
        checkedOutAt: toIso(data.checkedOutAt),
        checkedInAt: toIsoOrNull(data.checkedInAt),
      };
    })
    .sort((a, b) => b.checkedOutAt.localeCompare(a.checkedOutAt));
}
