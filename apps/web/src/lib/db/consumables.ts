import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, runTransaction, serverTimestamp, deleteDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordAudit } from "./auditLogs";
import { DbError, toIso } from "./helpers";
import type { CreateConsumableInput } from "@helpdesk/shared";
import type { Consumable, ConsumableCheckout } from "@/types";

function toConsumable(id: string, data: Record<string, any>): Consumable {
  return {
    id,
    name: data.name,
    manufacturer: data.manufacturer ?? null,
    modelNumber: data.modelNumber ?? null,
    quantityTotal: data.quantityTotal,
    quantityRemaining: data.quantityRemaining,
    minQuantity: data.minQuantity ?? 0,
    location: data.locationId ? { id: data.locationId, name: data.locationName } : null,
    notes: data.notes ?? null,
    createdAt: toIso(data.createdAt),
  };
}

export async function listConsumables(): Promise<Consumable[]> {
  const snap = await getDocs(query(collection(db, "consumables"), orderBy("name")));
  return snap.docs.map((d) => toConsumable(d.id, d.data()));
}

export async function createConsumable(input: CreateConsumableInput, createdById: string): Promise<string> {
  let locationName: string | null = null;
  if (input.locationId) {
    const locSnap = await getDoc(doc(db, "locations", input.locationId));
    locationName = locSnap.data()?.name ?? null;
  }
  const ref = await addDoc(collection(db, "consumables"), {
    name: input.name,
    manufacturer: input.manufacturer ?? null,
    modelNumber: input.modelNumber ?? null,
    quantityTotal: input.quantityTotal,
    quantityRemaining: input.quantityTotal,
    minQuantity: input.minQuantity ?? 0,
    locationId: input.locationId ?? null,
    locationName,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
  });
  await recordAudit({ userId: createdById, action: "consumable_created", entityType: "Consumable", entityId: ref.id, newValue: input.name });
  return ref.id;
}

export async function deleteConsumable(id: string, deletedById: string) {
  const snap = await getDoc(doc(db, "consumables", id));
  if (!snap.exists()) throw new DbError("Consumable not found.", 404);
  await deleteDoc(doc(db, "consumables", id));
  await recordAudit({ userId: deletedById, action: "consumable_deleted", entityType: "Consumable", entityId: id, previousValue: snap.data().name });
}

export async function checkoutConsumable(consumableId: string, userId: string, quantity: number, checkedOutById: string): Promise<void> {
  if (quantity < 1) throw new DbError("Quantity must be at least 1.", 400);

  await runTransaction(db, async (tx) => {
    const ref = doc(db, "consumables", consumableId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new DbError("Consumable not found.", 404);
    const remaining = snap.data().quantityRemaining ?? 0;
    if (quantity > remaining) throw new DbError("Not enough stock remaining.", 409);
    tx.update(ref, { quantityRemaining: remaining - quantity });
  });

  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) throw new DbError("Selected user does not exist.", 400);
  const u = userSnap.data();

  await addDoc(collection(db, "consumableCheckouts"), {
    consumableId,
    userId,
    userFirstName: u.firstName,
    userLastName: u.lastName,
    quantity,
    createdAt: serverTimestamp(),
  });

  await recordAudit({
    userId: checkedOutById,
    action: "consumable_checked_out",
    entityType: "Consumable",
    entityId: consumableId,
    newValue: `${quantity} to ${u.firstName} ${u.lastName}`,
  });
}

export async function listConsumableCheckouts(consumableId: string): Promise<ConsumableCheckout[]> {
  const snap = await getDocs(query(collection(db, "consumableCheckouts"), where("consumableId", "==", consumableId)));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        consumableId,
        user: { id: data.userId, firstName: data.userFirstName, lastName: data.userLastName },
        quantity: data.quantity,
        createdAt: toIso(data.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
