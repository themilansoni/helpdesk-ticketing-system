import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { computeSla, STATUS_TRANSITIONS, type CreateTicketInput, type TicketStatusName } from "@helpdesk/shared";
import { DbError, toIso, toIsoOrNull } from "./helpers";
import { recordAudit } from "./auditLogs";
import { notifyManyUsers, notifyUser } from "./notifications";
import { uploadTicketAttachment } from "./storage";
import { listBusinessRules } from "./businessRules";
import type { BusinessRule, CurrentUser, PaginatedResult, Ticket, TicketAttachmentMeta, TicketComment, TicketHistoryEntry } from "@/types";

interface RuleOutcome {
  categoryId: string;
  categoryOverridden: boolean;
  priorityId: string;
  departmentIdOverride: string | null | undefined;
  assignTechnicianId: string | null;
  tags: string[];
  appliedRuleNames: string[];
}

// Event-triggered automation: evaluated client-side at ticket creation
// (no backend to run scheduled/time-based rules - see business-rules-page.tsx).
// Rules run in order; a later matching rule overrides an earlier one's
// single-value fields, while tags accumulate across every match.
function applyBusinessRules(input: CreateTicketInput, rules: BusinessRule[]): RuleOutcome {
  const haystack = `${input.subject} ${input.description}`.toLowerCase();
  const matched = rules.filter((r) => r.enabled && r.keyword.trim() && haystack.includes(r.keyword.trim().toLowerCase()));

  const outcome: RuleOutcome = {
    categoryId: input.categoryId,
    categoryOverridden: false,
    priorityId: input.priorityId,
    departmentIdOverride: undefined,
    assignTechnicianId: null,
    tags: [],
    appliedRuleNames: [],
  };
  const tagSet = new Set<string>();

  for (const rule of matched) {
    if (rule.setCategoryId) {
      outcome.categoryId = rule.setCategoryId;
      outcome.categoryOverridden = true;
    }
    if (rule.setPriorityId) outcome.priorityId = rule.setPriorityId;
    if (rule.setDepartmentId) outcome.departmentIdOverride = rule.setDepartmentId;
    if (rule.assignTechnicianId) outcome.assignTechnicianId = rule.assignTechnicianId;
    rule.addTags.forEach((t) => tagSet.add(t));
    outcome.appliedRuleNames.push(rule.name);
  }

  outcome.tags = Array.from(tagSet);
  return outcome;
}

function withSla(data: Record<string, unknown> & { createdAt: unknown; status: string }) {
  const sla = computeSla({
    createdAt: toIso(data.createdAt),
    slaFirstResponseDeadline: toIsoOrNull(data.slaFirstResponseDeadline),
    slaResolutionDeadline: toIsoOrNull(data.slaResolutionDeadline),
    firstRespondedAt: toIsoOrNull(data.firstRespondedAt),
    resolvedAt: toIsoOrNull(data.resolvedAt),
    isClosed: data.status === "Closed",
  });
  return sla;
}

function toTicket(id: string, data: Record<string, any>): Ticket {
  return {
    id,
    ticketNumber: data.ticketNumber,
    subject: data.subject,
    description: data.description,
    requester: {
      id: data.requesterId,
      firstName: data.requesterFirstName,
      lastName: data.requesterLastName,
      email: data.requesterEmail,
      employeeId: data.requesterEmployeeId,
    },
    department: data.departmentId ? { id: data.departmentId, name: data.departmentName } : null,
    location: data.locationId ? { id: data.locationId, name: data.locationName } : null,
    category: { id: data.categoryId, name: data.categoryName },
    subcategory: data.subcategoryId ? { id: data.subcategoryId, name: data.subcategoryName } : null,
    priority: { id: data.priorityId, name: data.priorityName, level: data.priorityLevel, colorHex: data.priorityColor },
    status: data.status,
    assignedTechnician: data.assignedTechnicianId
      ? { id: data.assignedTechnicianId, firstName: data.assignedTechnicianFirstName, lastName: data.assignedTechnicianLastName, email: data.assignedTechnicianEmail }
      : null,
    asset: data.assetId ? { id: data.assetId, assetTag: data.assetTag, model: data.assetModel ?? null } : null,
    preferredContactMethod: data.preferredContactMethod,
    pendingReason: data.pendingReason ?? null,
    slaFirstResponseDeadline: toIsoOrNull(data.slaFirstResponseDeadline),
    slaResolutionDeadline: toIsoOrNull(data.slaResolutionDeadline),
    firstRespondedAt: toIsoOrNull(data.firstRespondedAt),
    resolvedAt: toIsoOrNull(data.resolvedAt),
    closedAt: toIsoOrNull(data.closedAt),
    reopenedCount: data.reopenedCount ?? 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    sla: withSla(data as any),
    attachments: data.attachments ?? [],
    tags: data.tags ?? [],
  };
}

async function nextTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = doc(db, "counters", `ticket_number_${year}`);
  const value = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const next = (snap.exists() ? snap.data().value : 0) + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  return `HD-${year}-${String(value).padStart(6, "0")}`;
}

async function addHistory(ticketId: string, userId: string | null, userName: string | null, action: string, extra: Partial<{ field: string; oldValue: string; newValue: string }> = {}) {
  await addDoc(collection(db, "ticketHistory"), {
    ticketId,
    userId,
    userName,
    action,
    field: extra.field ?? null,
    oldValue: extra.oldValue ?? null,
    newValue: extra.newValue ?? null,
    createdAt: serverTimestamp(),
  });
}

export interface ListTicketsParams {
  requestingUserId: string;
  requestingUserRole: string;
  search?: string;
  status?: string;
  priorityId?: string;
  categoryId?: string;
  departmentId?: string;
  assignedTechnicianId?: string;
  unassigned?: boolean;
  mine?: boolean;
  sla?: "healthy" | "at_risk" | "breached";
  sort?: "newest" | "oldest" | "priority" | "sla";
  page: number;
  pageSize: number;
}

export async function listTickets(params: ListTicketsParams): Promise<PaginatedResult<Ticket>> {
  const constraints: QueryConstraint[] = [];
  if (params.requestingUserRole === "Employee" || params.mine) {
    constraints.push(where("requesterId", "==", params.requestingUserId));
  }
  if (params.assignedTechnicianId) constraints.push(where("assignedTechnicianId", "==", params.assignedTechnicianId));
  if (params.status) constraints.push(where("status", "==", params.status));
  if (params.priorityId) constraints.push(where("priorityId", "==", params.priorityId));
  if (params.categoryId) constraints.push(where("categoryId", "==", params.categoryId));
  if (params.departmentId) constraints.push(where("departmentId", "==", params.departmentId));

  const snap = await getDocs(query(collection(db, "tickets"), ...constraints));
  let tickets = snap.docs.map((d) => toTicket(d.id, d.data()));

  if (params.unassigned) tickets = tickets.filter((t) => !t.assignedTechnician);
  if (params.sla) tickets = tickets.filter((t) => t.sla.overallHealth === params.sla);
  if (params.search) {
    const term = params.search.toLowerCase();
    tickets = tickets.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(term) ||
        t.subject.toLowerCase().includes(term) ||
        t.requester.firstName.toLowerCase().includes(term) ||
        t.requester.lastName.toLowerCase().includes(term)
    );
  }

  const sort = params.sort ?? "newest";
  tickets.sort((a, b) => {
    if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
    if (sort === "priority") return b.priority.level - a.priority.level;
    if (sort === "sla") return (a.slaResolutionDeadline ?? "").localeCompare(b.slaResolutionDeadline ?? "");
    return b.createdAt.localeCompare(a.createdAt);
  });

  const total = tickets.length;
  const start = (params.page - 1) * params.pageSize;
  return { data: tickets.slice(start, start + params.pageSize), total, page: params.page, pageSize: params.pageSize };
}

export async function getTicketById(id: string): Promise<Ticket> {
  const snap = await getDoc(doc(db, "tickets", id));
  if (!snap.exists()) throw new DbError("Ticket not found.", 404);
  return toTicket(snap.id, snap.data());
}

export async function createTicket(input: CreateTicketInput, requester: CurrentUser, files: File[]): Promise<Ticket> {
  const rules = await listBusinessRules();
  const ruleOutcome = applyBusinessRules(input, rules);

  const prioritySnap = await getDoc(doc(db, "priorities", ruleOutcome.priorityId));
  if (!prioritySnap.exists()) throw new DbError("Selected priority does not exist.", 400);
  const priority = prioritySnap.data();

  const categorySnap = await getDoc(doc(db, "ticketCategories", ruleOutcome.categoryId));
  if (!categorySnap.exists()) throw new DbError("Selected category does not exist.", 400);

  // A rule that overrides the category invalidates whatever subcategory the
  // requester picked under the original category.
  const subcategoryId = ruleOutcome.categoryOverridden ? null : (input.subcategoryId ?? null);
  let subcategoryName: string | undefined;
  if (subcategoryId) {
    const subSnap = await getDoc(doc(db, "ticketSubcategories", subcategoryId));
    subcategoryName = subSnap.data()?.name;
  }

  let asset: { assetTag: string; model: string | null } | undefined;
  if (input.assetId) {
    const assetSnap = await getDoc(doc(db, "assets", input.assetId));
    if (assetSnap.exists()) asset = { assetTag: assetSnap.data().assetTag, model: assetSnap.data().model ?? null };
  }

  const departmentIdInput = ruleOutcome.departmentIdOverride !== undefined ? ruleOutcome.departmentIdOverride : input.departmentId;
  const departmentId = departmentIdInput ?? requester.department?.id ?? null;
  const departmentName = departmentIdInput ? undefined : requester.department?.name;
  const locationId = input.locationId ?? requester.location?.id ?? null;
  const locationName = input.locationId ? undefined : requester.location?.name;

  let resolvedDepartmentName = departmentName;
  if (departmentIdInput) {
    const deptSnap = await getDoc(doc(db, "departments", departmentIdInput));
    resolvedDepartmentName = deptSnap.data()?.name;
  }
  let resolvedLocationName = locationName;
  if (input.locationId) {
    const locSnap = await getDoc(doc(db, "locations", input.locationId));
    resolvedLocationName = locSnap.data()?.name;
  }

  // A rule can auto-assign a technician, but the ticket-creation security
  // rule only allows status: 'New' on create - the ticket stays "New" and
  // pre-assigned rather than jumping to "Open" the way manual assignment does.
  let assignedTechnician: { id: string; firstName: string; lastName: string; email: string } | null = null;
  if (ruleOutcome.assignTechnicianId) {
    const techSnap = await getDoc(doc(db, "users", ruleOutcome.assignTechnicianId));
    const tech = techSnap.data();
    if (tech && tech.status === "active" && ["Technician", "Manager", "Administrator"].includes(tech.role)) {
      assignedTechnician = { id: ruleOutcome.assignTechnicianId, firstName: tech.firstName, lastName: tech.lastName, email: tech.email };
    }
  }

  const now = new Date();
  const firstResponseMinutes = priority.slaPolicy?.firstResponseMinutes ?? 480;
  const resolutionMinutes = priority.slaPolicy?.resolutionMinutes ?? 7200;
  const ticketNumber = await nextTicketNumber();

  const uploaded: TicketAttachmentMeta[] = [];

  const ticketRef = await addDoc(collection(db, "tickets"), {
    ticketNumber,
    subject: input.subject,
    description: input.description,
    requesterId: requester.id,
    requesterFirstName: requester.firstName,
    requesterLastName: requester.lastName,
    requesterEmail: requester.email,
    requesterEmployeeId: requester.employeeId,
    departmentId,
    departmentName: resolvedDepartmentName ?? null,
    locationId,
    locationName: resolvedLocationName ?? null,
    categoryId: ruleOutcome.categoryId,
    categoryName: categorySnap.data().name,
    subcategoryId,
    subcategoryName: subcategoryName ?? null,
    priorityId: ruleOutcome.priorityId,
    priorityName: priority.name,
    priorityLevel: priority.level,
    priorityColor: priority.colorHex,
    status: "New",
    assignedTechnicianId: assignedTechnician?.id ?? null,
    assignedTechnicianFirstName: assignedTechnician?.firstName ?? null,
    assignedTechnicianLastName: assignedTechnician?.lastName ?? null,
    assignedTechnicianEmail: assignedTechnician?.email ?? null,
    assetId: input.assetId ?? null,
    assetTag: asset?.assetTag ?? null,
    assetModel: asset?.model ?? null,
    preferredContactMethod: input.preferredContactMethod,
    pendingReason: null,
    slaFirstResponseDeadline: new Date(now.getTime() + firstResponseMinutes * 60000).toISOString(),
    slaResolutionDeadline: new Date(now.getTime() + resolutionMinutes * 60000).toISOString(),
    firstRespondedAt: null,
    resolvedAt: null,
    closedAt: null,
    reopenedCount: 0,
    attachments: uploaded,
    tags: ruleOutcome.tags,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (files.length > 0) {
    const metas = await Promise.all(files.map((f) => uploadTicketAttachment(ticketRef.id, f)));
    await updateDoc(ticketRef, { attachments: metas });
  }

  await addHistory(ticketRef.id, requester.id, `${requester.firstName} ${requester.lastName}`, "created", { newValue: "New" });
  if (ruleOutcome.appliedRuleNames.length > 0) {
    await addHistory(ticketRef.id, null, "Automation", "rule_applied", { newValue: ruleOutcome.appliedRuleNames.join(", ") });
  }
  await recordAudit({ userId: requester.id, action: "ticket_created", entityType: "Ticket", entityId: ticketRef.id, newValue: ticketNumber });

  if (assignedTechnician) {
    await notifyUser({
      userId: assignedTechnician.id,
      type: "ticket_assigned",
      title: "Ticket assigned to you",
      message: `${ticketNumber} was automatically assigned to you.`,
      entityType: "ticket",
      entityId: ticketRef.id,
    });
  }

  const staffSnap = await getDocs(query(collection(db, "users"), where("role", "in", ["Technician", "Administrator"]), where("status", "==", "active")));
  await notifyManyUsers(
    staffSnap.docs.map((d) => d.id),
    {
      type: "ticket_created",
      title: "New ticket submitted",
      message: `${requester.firstName} ${requester.lastName} submitted ${ticketNumber}: ${input.subject}`,
      entityType: "ticket",
      entityId: ticketRef.id,
    }
  );

  return getTicketById(ticketRef.id);
}

function assertValidTransition(currentStatus: string, targetStatus: string) {
  if (currentStatus === targetStatus) return;
  const allowed = STATUS_TRANSITIONS[currentStatus as TicketStatusName];
  if (!allowed?.includes(targetStatus as TicketStatusName)) {
    throw new DbError(`Cannot move a ticket from "${currentStatus}" to "${targetStatus}".`, 409);
  }
}

export async function changeTicketStatus(
  ticketId: string,
  targetStatus: TicketStatusName,
  actor: CurrentUser,
  opts: { pendingReason?: string | null; comment?: string } = {}
): Promise<Ticket> {
  const snap = await getDoc(doc(db, "tickets", ticketId));
  if (!snap.exists()) throw new DbError("Ticket not found.", 404);
  const data = snap.data();
  assertValidTransition(data.status, targetStatus);

  const now = new Date();
  const isResolving = targetStatus === "Resolved";
  const isClosing = targetStatus === "Closed";
  const isReopening = targetStatus === "Reopened";

  const patch: Record<string, unknown> = {
    status: targetStatus,
    pendingReason: targetStatus === "Pending" ? (opts.pendingReason ?? "other") : null,
    updatedAt: serverTimestamp(),
  };
  if (isResolving) patch.resolvedAt = now.toISOString();
  if (isClosing) patch.closedAt = now.toISOString();
  if (isReopening) {
    patch.resolvedAt = null;
    patch.closedAt = null;
    patch.reopenedCount = increment(1);
  }

  await updateDoc(doc(db, "tickets", ticketId), patch);

  if (opts.comment) {
    await addDoc(collection(db, "ticketComments"), {
      ticketId,
      authorId: actor.id,
      authorFirstName: actor.firstName,
      authorLastName: actor.lastName,
      authorEmail: actor.email,
      body: opts.comment,
      attachments: [],
      createdAt: serverTimestamp(),
    });
  }

  await addHistory(ticketId, actor.id, `${actor.firstName} ${actor.lastName}`, isResolving ? "resolved" : isClosing ? "closed" : isReopening ? "reopened" : "status_changed", {
    field: "status",
    oldValue: data.status,
    newValue: targetStatus,
  });
  await recordAudit({ userId: actor.id, action: "ticket_status_changed", entityType: "Ticket", entityId: ticketId, previousValue: data.status, newValue: targetStatus });

  await notifyUser({
    userId: data.requesterId,
    type: isResolving ? "ticket_resolved" : isReopening ? "ticket_reopened" : "status_changed",
    title: isResolving ? "Your ticket was resolved" : isReopening ? "Your ticket was reopened" : "Ticket status updated",
    message: `${data.ticketNumber} is now "${targetStatus}".`,
    entityType: "ticket",
    entityId: ticketId,
  });

  return getTicketById(ticketId);
}

export async function assignTicket(ticketId: string, technicianId: string, actor: CurrentUser): Promise<Ticket> {
  const [ticketSnap, techSnap] = await Promise.all([getDoc(doc(db, "tickets", ticketId)), getDoc(doc(db, "users", technicianId))]);
  if (!ticketSnap.exists()) throw new DbError("Ticket not found.", 404);
  if (!techSnap.exists()) throw new DbError("Selected technician does not exist.", 400);
  const tech = techSnap.data();
  if (!["Technician", "Manager", "Administrator"].includes(tech.role)) {
    throw new DbError("Tickets can only be assigned to technicians, managers, or administrators.", 400);
  }

  const ticket = ticketSnap.data();
  const patch: Record<string, unknown> = {
    assignedTechnicianId: technicianId,
    assignedTechnicianFirstName: tech.firstName,
    assignedTechnicianLastName: tech.lastName,
    assignedTechnicianEmail: tech.email,
    updatedAt: serverTimestamp(),
  };
  if (ticket.status === "New") patch.status = "Open";

  await updateDoc(doc(db, "tickets", ticketId), patch);
  await addHistory(ticketId, actor.id, `${actor.firstName} ${actor.lastName}`, "assigned", { field: "assignedTechnicianId", newValue: `${tech.firstName} ${tech.lastName}` });
  await recordAudit({ userId: actor.id, action: "ticket_assigned", entityType: "Ticket", entityId: ticketId, newValue: `${tech.firstName} ${tech.lastName}` });

  await notifyUser({
    userId: technicianId,
    type: "ticket_assigned",
    title: "Ticket assigned to you",
    message: `${ticket.ticketNumber} has been assigned to you.`,
    entityType: "ticket",
    entityId: ticketId,
  });

  return getTicketById(ticketId);
}

export async function changeTicketPriority(ticketId: string, priorityId: string, actor: CurrentUser): Promise<Ticket> {
  const [ticketSnap, prioritySnap] = await Promise.all([getDoc(doc(db, "tickets", ticketId)), getDoc(doc(db, "priorities", priorityId))]);
  if (!ticketSnap.exists()) throw new DbError("Ticket not found.", 404);
  if (!prioritySnap.exists()) throw new DbError("Selected priority does not exist.", 400);
  const ticket = ticketSnap.data();
  const priority = prioritySnap.data();

  const createdAt = toIso(ticket.createdAt);
  const firstResponseMinutes = priority.slaPolicy?.firstResponseMinutes ?? 480;
  const resolutionMinutes = priority.slaPolicy?.resolutionMinutes ?? 7200;

  await updateDoc(doc(db, "tickets", ticketId), {
    priorityId,
    priorityName: priority.name,
    priorityLevel: priority.level,
    priorityColor: priority.colorHex,
    slaFirstResponseDeadline: new Date(new Date(createdAt).getTime() + firstResponseMinutes * 60000).toISOString(),
    slaResolutionDeadline: new Date(new Date(createdAt).getTime() + resolutionMinutes * 60000).toISOString(),
    updatedAt: serverTimestamp(),
  });

  await addHistory(ticketId, actor.id, `${actor.firstName} ${actor.lastName}`, "priority_changed", { field: "priority", oldValue: ticket.priorityName, newValue: priority.name });
  await recordAudit({ userId: actor.id, action: "ticket_priority_changed", entityType: "Ticket", entityId: ticketId, previousValue: ticket.priorityName, newValue: priority.name });
  await notifyUser({
    userId: ticket.requesterId,
    type: "priority_changed",
    title: "Ticket priority updated",
    message: `${ticket.ticketNumber} priority changed to ${priority.name}.`,
    entityType: "ticket",
    entityId: ticketId,
  });

  return getTicketById(ticketId);
}

export async function escalateTicket(ticketId: string, actor: CurrentUser, note?: string): Promise<Ticket> {
  const ticketSnap = await getDoc(doc(db, "tickets", ticketId));
  if (!ticketSnap.exists()) throw new DbError("Ticket not found.", 404);
  const ticket = ticketSnap.data();

  const higherSnap = await getDocs(query(collection(db, "priorities"), where("level", ">", ticket.priorityLevel), orderBy("level", "asc")));
  const nextPriority = higherSnap.docs[0]?.data();

  if (nextPriority) {
    await updateDoc(doc(db, "tickets", ticketId), {
      priorityId: higherSnap.docs[0].id,
      priorityName: nextPriority.name,
      priorityLevel: nextPriority.level,
      priorityColor: nextPriority.colorHex,
      updatedAt: serverTimestamp(),
    });
  }

  await addHistory(ticketId, actor.id, `${actor.firstName} ${actor.lastName}`, "escalated", { oldValue: ticket.priorityName, newValue: nextPriority?.name ?? ticket.priorityName });
  if (note) {
    await addDoc(collection(db, "ticketNotes"), {
      ticketId,
      authorId: actor.id,
      authorFirstName: actor.firstName,
      authorLastName: actor.lastName,
      body: `Escalated: ${note}`,
      createdAt: serverTimestamp(),
    });
  }
  await recordAudit({ userId: actor.id, action: "ticket_escalated", entityType: "Ticket", entityId: ticketId, previousValue: ticket.priorityName, newValue: nextPriority?.name ?? ticket.priorityName });

  const adminSnap = await getDocs(query(collection(db, "users"), where("role", "==", "Administrator")));
  await notifyManyUsers(adminSnap.docs.map((d) => d.id), {
    type: "priority_changed",
    title: "Ticket escalated",
    message: `${ticket.ticketNumber} was escalated and needs attention.`,
    entityType: "ticket",
    entityId: ticketId,
  });

  return getTicketById(ticketId);
}

export async function listTicketComments(ticketId: string): Promise<TicketComment[]> {
  const [replySnap, noteSnap] = await Promise.all([
    getDocs(query(collection(db, "ticketComments"), where("ticketId", "==", ticketId))),
    getDocs(query(collection(db, "ticketNotes"), where("ticketId", "==", ticketId))),
  ]);

  const replies: TicketComment[] = replySnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ticketId,
      authorId: data.authorId,
      author: { id: data.authorId, firstName: data.authorFirstName, lastName: data.authorLastName, email: data.authorEmail },
      body: data.body,
      isInternal: false,
      createdAt: toIso(data.createdAt),
      attachments: data.attachments ?? [],
    };
  });

  const notes: TicketComment[] = noteSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ticketId,
      authorId: data.authorId,
      author: { id: data.authorId, firstName: data.authorFirstName, lastName: data.authorLastName, email: "" },
      body: data.body,
      isInternal: true,
      createdAt: toIso(data.createdAt),
      attachments: [],
    };
  });

  return [...replies, ...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addTicketComment(ticketId: string, actor: CurrentUser, body: string, isInternal: boolean, files: File[]): Promise<TicketComment> {
  const ticketSnap = await getDoc(doc(db, "tickets", ticketId));
  if (!ticketSnap.exists()) throw new DbError("Ticket not found.", 404);
  const ticket = ticketSnap.data();

  const isStaffReply = actor.role.name !== "Employee" && !isInternal;
  const attachments = files.length > 0 ? await Promise.all(files.map((f) => uploadTicketAttachment(ticketId, f))) : [];

  const targetCollection = isInternal ? "ticketNotes" : "ticketComments";
  const commentRef = await addDoc(collection(db, targetCollection), {
    ticketId,
    authorId: actor.id,
    authorFirstName: actor.firstName,
    authorLastName: actor.lastName,
    authorEmail: actor.email,
    body,
    attachments,
    createdAt: serverTimestamp(),
  });

  if (isStaffReply && !ticket.firstRespondedAt) {
    await updateDoc(doc(db, "tickets", ticketId), { firstRespondedAt: new Date().toISOString() });
  }

  await addHistory(ticketId, actor.id, `${actor.firstName} ${actor.lastName}`, isInternal ? "note_added" : "replied");
  await recordAudit({ userId: actor.id, action: isInternal ? "ticket_note_added" : "ticket_reply_added", entityType: "Ticket", entityId: ticketId });

  if (!isInternal) {
    if (isStaffReply) {
      await notifyUser({
        userId: ticket.requesterId,
        type: "technician_reply",
        title: "New reply on your ticket",
        message: `${actor.firstName} replied to your ticket.`,
        entityType: "ticket",
        entityId: ticketId,
      });
    } else if (ticket.assignedTechnicianId) {
      await notifyUser({
        userId: ticket.assignedTechnicianId,
        type: "employee_reply",
        title: "Employee replied to a ticket",
        message: `${actor.firstName} replied to a ticket assigned to you.`,
        entityType: "ticket",
        entityId: ticketId,
      });
    }
  }

  return {
    id: commentRef.id,
    ticketId,
    authorId: actor.id,
    author: { id: actor.id, firstName: actor.firstName, lastName: actor.lastName, email: actor.email },
    body,
    isInternal,
    createdAt: new Date().toISOString(),
    attachments,
  };
}

export async function listTicketHistory(ticketId: string): Promise<TicketHistoryEntry[]> {
  const snap = await getDocs(query(collection(db, "ticketHistory"), where("ticketId", "==", ticketId)));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ticketId,
        userId: data.userId,
        user: data.userName ? { firstName: data.userName.split(" ")[0] ?? "", lastName: data.userName.split(" ").slice(1).join(" ") } : null,
        action: data.action,
        field: data.field ?? null,
        oldValue: data.oldValue ?? null,
        newValue: data.newValue ?? null,
        createdAt: toIso(data.createdAt),
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
