import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, runTransaction, serverTimestamp, deleteDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordAudit } from "./auditLogs";
import { DbError, toIso, toIsoOrNull } from "./helpers";
import type { CreateAccessoryInput } from "@helpdesk/shared";
import type { Accessory, AccessoryCheckout } from "@/types";

function toAccessory(id: string, data: Record<string, any>): Accessory {
  return {
    id,
    name: data.name,
    manufacturer: data.manufacturer ?? null,
    modelNumber: data.modelNumber ?? null,
    quantityTotal: data.quantityTotal,
    quantityRemaining: data.quantityRemaining,
    location: data.locationId ? { id: data.locationId, name: data.locationName } : null,
    notes: data.notes ?? null,
    createdAt: toIso(data.createdAt),
  };
}

export async function listAccessories(): Promise<Accessory[]> {
  const snap = await getDocs(query(collection(db, "accessories"), orderBy("name")));
  return snap.docs.map((d) => toAccessory(d.id, d.data()));
}

export async function createAccessory(input: CreateAccessoryInput, createdById: string): Promise<string> {
  let locationName: string | null = null;
  if (input.locationId) {
    const locSnap = await getDoc(doc(db, "locations", input.locationId));
    locationName = locSnap.data()?.name ?? null;
  }
  const ref = await addDoc(collection(db, "accessories"), {
    name: input.name,
    manufacturer: input.manufacturer ?? null,
    modelNumber: input.modelNumber ?? null,
    quantityTotal: input.quantityTotal,
    quantityRemaining: input.quantityTotal,
    locationId: input.locationId ?? null,
    locationName,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
  });
  await recordAudit({ userId: createdById, action: "accessory_created", entityType: "Accessory", entityId: ref.id, newValue: input.name });
  return ref.id;
}

export async function deleteAccessory(id: string, deletedById: string) {
  const snap = await getDoc(doc(db, "accessories", id));
  if (!snap.exists()) throw new DbError("Accessory not found.", 404);
  await deleteDoc(doc(db, "accessories", id));
  await recordAudit({ userId: deletedById, action: "accessory_deleted", entityType: "Accessory", entityId: id, previousValue: snap.data().name });
}

export async function checkoutAccessory(accessoryId: string, userId: string, quantity: number, checkedOutById: string): Promise<void> {
  if (quantity < 1) throw new DbError("Quantity must be at least 1.", 400);

  await runTransaction(db, async (tx) => {
    const ref = doc(db, "accessories", accessoryId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new DbError("Accessory not found.", 404);
    const remaining = snap.data().quantityRemaining ?? 0;
    if (quantity > remaining) throw new DbError("Not enough units available.", 409);
    tx.update(ref, { quantityRemaining: remaining - quantity });
  });

  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) throw new DbError("Selected user does not exist.", 400);
  const u = userSnap.data();

  await addDoc(collection(db, "accessoryCheckouts"), {
    accessoryId,
    userId,
    userFirstName: u.firstName,
    userLastName: u.lastName,
    quantity,
    checkedOutAt: serverTimestamp(),
    checkedInAt: null,
  });

  await recordAudit({
    userId: checkedOutById,
    action: "accessory_checked_out",
    entityType: "Accessory",
    entityId: accessoryId,
    newValue: `${quantity} to ${u.firstName} ${u.lastName}`,
  });
}

export async function checkinAccessory(checkoutId: string, checkedInById: string): Promise<void> {
  const checkoutRef = doc(db, "accessoryCheckouts", checkoutId);
  const checkoutSnap = await getDoc(checkoutRef);
  if (!checkoutSnap.exists()) throw new DbError("Checkout record not found.", 404);
  const checkout = checkoutSnap.data();
  if (checkout.checkedInAt) throw new DbError("This checkout has already been returned.", 409);

  await runTransaction(db, async (tx) => {
    const accessoryRef = doc(db, "accessories", checkout.accessoryId);
    const accessorySnap = await tx.get(accessoryRef);
    if (!accessorySnap.exists()) throw new DbError("Accessory not found.", 404);
    const remaining = accessorySnap.data().quantityRemaining ?? 0;
    tx.update(accessoryRef, { quantityRemaining: remaining + checkout.quantity });
    tx.update(checkoutRef, { checkedInAt: serverTimestamp() });
  });

  await recordAudit({
    userId: checkedInById,
    action: "accessory_checked_in",
    entityType: "Accessory",
    entityId: checkout.accessoryId,
    previousValue: `${checkout.quantity} from ${checkout.userFirstName} ${checkout.userLastName}`,
  });
}

export async function listAccessoryCheckouts(accessoryId: string): Promise<AccessoryCheckout[]> {
  const snap = await getDocs(query(collection(db, "accessoryCheckouts"), where("accessoryId", "==", accessoryId)));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        accessoryId,
        user: { id: data.userId, firstName: data.userFirstName, lastName: data.userLastName },
        quantity: data.quantity,
        checkedOutAt: toIso(data.checkedOutAt),
        checkedInAt: toIsoOrNull(data.checkedInAt),
      };
    })
    .sort((a, b) => b.checkedOutAt.localeCompare(a.checkedOutAt));
}
