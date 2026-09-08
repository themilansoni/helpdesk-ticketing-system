import { prisma } from "@helpdesk/database";
import { computeSla } from "@helpdesk/shared";

export async function getDashboardSummary() {
  const [statuses, tickets] = await Promise.all([
    prisma.ticketStatus.findMany({ orderBy: { order: "asc" } }),
    prisma.ticket.findMany({
      include: { status: true, priority: true },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const s of statuses) byStatus[s.name] = 0;
  let overdue = 0;
  let unassigned = 0;

  for (const t of tickets) {
    byStatus[t.status.name] = (byStatus[t.status.name] ?? 0) + 1;
    if (!t.assignedTechnicianId && !t.status.isClosed) unassigned++;
    const sla = computeSla({
      createdAt: t.createdAt,
      slaFirstResponseDeadline: t.slaFirstResponseDeadline,
      slaResolutionDeadline: t.slaResolutionDeadline,
      firstRespondedAt: t.firstRespondedAt,
      resolvedAt: t.resolvedAt,
      isClosed: t.status.isClosed,
    });
    if (sla.overallHealth === "breached" && !t.status.isClosed) overdue++;
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
  const rows = await prisma.ticket.groupBy({ by: ["priorityId"], _count: { _all: true } });
  const priorities = await prisma.priority.findMany();
  return priorities.map((p) => ({
    name: p.name,
    color: p.colorHex,
    count: rows.find((r) => r.priorityId === p.id)?._count._all ?? 0,
  }));
}

export async function getTicketsByCategory() {
  const rows = await prisma.ticket.groupBy({ by: ["categoryId"], _count: { _all: true } });
  const categories = await prisma.ticketCategory.findMany();
  return categories.map((c) => ({
    name: c.name,
    count: rows.find((r) => r.categoryId === c.id)?._count._all ?? 0,
  }));
}

export async function getTicketsByDepartment() {
  const rows = await prisma.ticket.groupBy({ by: ["departmentId"], _count: { _all: true } });
  const departments = await prisma.department.findMany();
  return departments.map((d) => ({
    name: d.name,
    count: rows.find((r) => r.departmentId === d.id)?._count._all ?? 0,
  }));
}

export async function getTicketsOverTime(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86400000);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const t of tickets) {
    const key = t.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return [...byDay.entries()].map(([date, count]) => ({ date, count }));
}

export async function getResolutionTimeTrend(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const tickets = await prisma.ticket.findMany({
    where: { resolvedAt: { gte: since, not: null } },
    select: { createdAt: true, resolvedAt: true },
  });
  const byDay = new Map<string, { totalHours: number; count: number }>();
  for (const t of tickets) {
    if (!t.resolvedAt) continue;
    const key = t.resolvedAt.toISOString().slice(0, 10);
    const hours = (t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000;
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
  const technicians = await prisma.user.findMany({
    where: { role: { name: { in: ["Technician", "Manager", "Administrator"] } }, status: "active" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      assignedTickets: {
        select: { status: { select: { name: true, isClosed: true } } },
      },
    },
  });
  return technicians.map((t) => ({
    name: `${t.firstName} ${t.lastName}`,
    open: t.assignedTickets.filter((tk) => !tk.status.isClosed).length,
    total: t.assignedTickets.length,
  }));
}

export async function getSlaCompliance() {
  const tickets = await prisma.ticket.findMany({
    include: { status: true },
  });
  let compliant = 0;
  let breached = 0;
  for (const t of tickets) {
    const sla = computeSla({
      createdAt: t.createdAt,
      slaFirstResponseDeadline: t.slaFirstResponseDeadline,
      slaResolutionDeadline: t.slaResolutionDeadline,
      firstRespondedAt: t.firstRespondedAt,
      resolvedAt: t.resolvedAt,
      isClosed: t.status.isClosed,
    });
    if (sla.overallHealth === "breached") breached++;
    else compliant++;
  }
  const total = compliant + breached;
  return {
    compliant,
    breached,
    total,
    complianceRate: total > 0 ? Math.round((compliant / total) * 1000) / 10 : 100,
  };
}

export async function getAgingReport() {
  const openTickets = await prisma.ticket.findMany({
    where: { status: { isClosed: false } },
    include: { status: true, priority: true, requester: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });
  const now = Date.now();
  return openTickets.map((t) => ({
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    requester: `${t.requester.firstName} ${t.requester.lastName}`,
    status: t.status.name,
    priority: t.priority.name,
    ageDays: Math.floor((now - t.createdAt.getTime()) / 86400000),
  }));
}

export async function getMonthlyVolume(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const tickets = await prisma.ticket.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
  const byMonth = new Map<string, number>();
  for (const t of tickets) {
    const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
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
