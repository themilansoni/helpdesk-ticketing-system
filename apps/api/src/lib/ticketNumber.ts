import type { Prisma } from "@prisma/client";

// Generates ticket numbers like HD-2026-000001, atomically incrementing a
// per-year counter row inside the caller's transaction so concurrent ticket
// creation never produces a duplicate number.
export async function nextTicketNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const key = `ticket_number_${year}`;
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `HD-${year}-${String(counter.value).padStart(6, "0")}`;
}
