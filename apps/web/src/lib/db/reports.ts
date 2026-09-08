import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { computeSla, STATUS_META, type TicketStatusName } from "@helpdesk/shared";
import { toIso, toIsoOrNull } from "./helpers";

interface RawTicket {
  status: TicketStatusName;
  priorityName: string;
  priorityColor: string;
  categoryName: string;
  departmentName: string | null;
  assignedTechnicianId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  slaFirstResponseDeadline: string | null;
  slaResolutionDeadline: string | null;
  firstRespondedAt: string | null;
}

async function fetchAllTickets(): Promise<RawTicket[]> {
  const snap = await getDocs(collection(db, "tickets"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      status: data.status,
      priorityName: data.priorityName,
      priorityColor: data.priorityColor,
      categoryName: data.categoryName,
      departmentName: data.departmentName ?? null,
      assignedTechnicianId: data.assignedTechnicianId ?? null,
      createdAt: toIso(data.createdAt),
      resolvedAt: toIsoOrNull(data.resolvedAt),
      slaFirstResponseDeadline: toIsoOrNull(data.slaFirstResponseDeadline),
      slaResolutionDeadline: toIsoOrNull(data.slaResolutionDeadline),
      firstRespondedAt: toIsoOrNull(data.firstRespondedAt),
    };
  });
}

function slaHealthFor(t: RawTicket) {
  return computeSla({
    createdAt: t.createdAt,
    slaFirstResponseDeadline: t.slaFirstResponseDeadline,
    slaResolutionDeadline: t.slaResolutionDeadline,
    firstRespondedAt: t.firstRespondedAt,
    resolvedAt: t.resolvedAt,
    isClosed: t.status === "Closed",
  });
}

export async function getDashboardSummary() {
  const tickets = await fetchAllTickets();
  const byStatus: Record<string, number> = {};
  for (const name of Object.keys(STATUS_META)) byStatus[name] = 0;
  let overdue = 0;
  let unassigned = 0;

  for (const t of tickets) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    if (!t.assignedTechnicianId && !STATUS_META[t.status].isClosed) unassigned++;
    if (slaHealthFor(t).overallHealth === "breached" && !STATUS_META[t.status].isClosed) overdue++;
  }

  return {
    total: tickets.length,
    open: byStatus["Open"] ?? 0,
    inProgress: byStatus["In Progress"] ?? 0,
    pending: byStatus["Pending"] ?? 0,
    resolved: byStatus["Resolved"] ?? 0,
    closed: byStatus["Closed"] ?? 0,
    new: byStatus["New"] ?? 0,
    overdue,
    unassigned,
    byStatus,
  };
}

export async function getTicketsByPriority() {
  const tickets = await fetchAllTickets();
  const map = new Map<string, { count: number; color: string }>();
  for (const t of tickets) {
    const entry = map.get(t.priorityName) ?? { count: 0, color: t.priorityColor };
    entry.count++;
    map.set(t.priorityName, entry);
  }
  return [...map.entries()].map(([name, v]) => ({ name, count: v.count, color: v.color }));
}

export async function getTicketsByCategory() {
  const tickets = await fetchAllTickets();
  const map = new Map<string, number>();
  for (const t of tickets) map.set(t.categoryName, (map.get(t.categoryName) ?? 0) + 1);
  return [...map.entries()].map(([name, count]) => ({ name, count }));
}

export async function getTicketsByDepartment() {
  const tickets = await fetchAllTickets();
  const map = new Map<string, number>();
  for (const t of tickets) {
    const name = t.departmentName ?? "Unassigned";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count }));
}

export async function getTicketsOverTime(days = 30) {
  const tickets = await fetchAllTickets();
  const since = new Date(Date.now() - days * 86400000);
  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86400000);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const t of tickets) {
    const created = new Date(t.createdAt);
    if (created < since) continue;
    const key = created.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return [...byDay.entries()].map(([date, count]) => ({ date, count }));
}

export async function getResolutionTimeTrend(days = 30) {
  const tickets = await fetchAllTickets();
  const since = new Date(Date.now() - days * 86400000);
  const byDay = new Map<string, { totalHours: number; count: number }>();
  for (const t of tickets) {
    if (!t.resolvedAt) continue;
    const resolved = new Date(t.resolvedAt);
    if (resolved < since) continue;
    const key = resolved.toISOString().slice(0, 10);
    const hours = (resolved.getTime() - new Date(t.createdAt).getTime()) / 3600000;
    const bucket = byDay.get(key) ?? { totalHours: 0, count: 0 };
    bucket.totalHours += hours;
    bucket.count += 1;
    byDay.set(key, bucket);
  }
  return [...byDay.entries()]
    .map(([date, { totalHours, count }]) => ({ date, avgHours: Math.round((totalHours / count) * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTechnicianWorkload() {
  const [tickets, usersSnap] = await Promise.all([fetchAllTickets(), getDocs(collection(db, "users"))]);
  const technicians = usersSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u: any) => ["Technician", "Manager", "Administrator"].includes(u.role) && u.status === "active");

  return technicians.map((t: any) => {
    const assigned = tickets.filter((tk) => (tk as any).assignedTechnicianId === t.id);
    return {
      name: `${t.firstName} ${t.lastName}`,
      open: assigned.filter((tk) => !STATUS_META[tk.status].isClosed).length,
      total: assigned.length,
    };
  });
}

export async function getSlaCompliance() {
  const tickets = await fetchAllTickets();
  let compliant = 0;
  let breached = 0;
  for (const t of tickets) {
    if (slaHealthFor(t).overallHealth === "breached") breached++;
    else compliant++;
  }
  const total = compliant + breached;
  return { compliant, breached, total, complianceRate: total > 0 ? Math.round((compliant / total) * 1000) / 10 : 100 };
}

export async function getAgingReport() {
  const snap = await getDocs(collection(db, "tickets"));
  const now = Date.now();
  return snap.docs
    .map((d) => d.data())
    .filter((t) => !STATUS_META[t.status as TicketStatusName].isClosed)
    .map((t) => ({
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      requester: `${t.requesterFirstName} ${t.requesterLastName}`,
      status: t.status,
      priority: t.priorityName,
      ageDays: Math.floor((now - new Date(toIso(t.createdAt)).getTime()) / 86400000),
    }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

export async function getMonthlyVolume(months = 6) {
  const tickets = await fetchAllTickets();
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const byMonth = new Map<string, number>();
  for (const t of tickets) {
    const created = new Date(t.createdAt);
    if (created < since) continue;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  return [...byMonth.entries()].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}
