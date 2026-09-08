import { prisma } from "@helpdesk/database";
import type { Request } from "express";
import {
  computeSla,
  STATUS_TRANSITIONS,
  type TicketStatusName,
  type CreateTicketInput,
} from "@helpdesk/shared";
import { ApiError } from "../lib/apiError.js";
import { nextTicketNumber } from "../lib/ticketNumber.js";
import { recordAudit } from "./auditService.js";
import { notifyUser, notifyManyUsers } from "./notificationService.js";

const TICKET_INCLUDE = {
  requester: { select: { id: true, firstName: true, lastName: true, email: true, employeeId: true } },
  assignedTechnician: { select: { id: true, firstName: true, lastName: true, email: true } },
  department: true,
  location: true,
  category: true,
  subcategory: true,
  priority: true,
  status: true,
  asset: { select: { id: true, assetTag: true, model: true } },
} as const;

function withSla<T extends {
  createdAt: Date;
  slaFirstResponseDeadline: Date | null;
  slaResolutionDeadline: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  status: { isClosed: boolean };
}>(ticket: T) {
  const sla = computeSla({
    createdAt: ticket.createdAt,
    slaFirstResponseDeadline: ticket.slaFirstResponseDeadline,
    slaResolutionDeadline: ticket.slaResolutionDeadline,
    firstRespondedAt: ticket.firstRespondedAt,
    resolvedAt: ticket.resolvedAt,
    isClosed: ticket.status.isClosed,
  });
  return { ...ticket, sla };
}

async function getRoleName(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } });
  return user.role.name;
}

export interface ListTicketsParams {
  requestingUserId: string;
  requestingUserRole: string;
  search?: string;
  statusId?: string;
  priorityId?: string;
  categoryId?: string;
  departmentId?: string;
  assignedTechnicianId?: string;
  unassigned?: boolean;
  mine?: boolean; // scope to requester = me (used by Employee "My Tickets")
  slaHealth?: "healthy" | "at_risk" | "breached";
  sort?: "newest" | "oldest" | "priority" | "sla";
  page: number;
  pageSize: number;
}

export async function listTickets(params: ListTicketsParams) {
  const where: NonNullable<Parameters<typeof prisma.ticket.findMany>[0]>["where"] = {};

  // Employees can only ever see their own tickets, regardless of query params.
  if (params.requestingUserRole === "Employee") {
    where.requesterId = params.requestingUserId;
  } else if (params.mine) {
    where.requesterId = params.requestingUserId;
  }

  if (params.assignedTechnicianId) where.assignedTechnicianId = params.assignedTechnicianId;
  if (params.unassigned) where.assignedTechnicianId = null;
  if (params.statusId) where.statusId = params.statusId;
  if (params.priorityId) where.priorityId = params.priorityId;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.search) {
    where.OR = [
      { ticketNumber: { contains: params.search } },
      { subject: { contains: params.search } },
      { requester: { firstName: { contains: params.search } } },
      { requester: { lastName: { contains: params.search } } },
      { requester: { employeeId: { contains: params.search } } },
    ];
  }

  const orderBy =
    params.sort === "oldest"
      ? [{ createdAt: "asc" as const }]
      : params.sort === "priority"
        ? [{ priority: { level: "desc" as const } }]
        : params.sort === "sla"
          ? [{ slaResolutionDeadline: "asc" as const }]
          : [{ createdAt: "desc" as const }];

  const all = await prisma.ticket.findMany({ where, include: TICKET_INCLUDE, orderBy });
  let enriched = all.map(withSla);

  if (params.slaHealth) {
    enriched = enriched.filter((t) => t.sla.overallHealth === params.slaHealth);
  }

  const total = enriched.length;
  const start = (params.page - 1) * params.pageSize;
  const page = enriched.slice(start, start + params.pageSize);

  return { data: page, total, page: params.page, pageSize: params.pageSize };
}

export async function getTicketById(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: TICKET_INCLUDE });
  if (!ticket) throw ApiError.notFound("Ticket not found.");
  return withSla(ticket);
}

export async function createTicket(input: CreateTicketInput, requesterId: string, req?: Request) {
  const priority = await prisma.priority.findUnique({ where: { id: input.priorityId }, include: { slaPolicy: true } });
  if (!priority) throw ApiError.badRequest("Selected priority does not exist.");

  const defaultStatus = await prisma.ticketStatus.findFirst({ where: { isDefault: true } });
  if (!defaultStatus) throw ApiError.internal("No default ticket status is configured.");

  const requester = await prisma.user.findUnique({ where: { id: requesterId } });
  if (!requester) throw ApiError.unauthorized();

  const now = new Date();
  const firstResponseMinutes = priority.slaPolicy?.firstResponseMinutes ?? 480;
  const resolutionMinutes = priority.slaPolicy?.resolutionMinutes ?? 7200;

  const ticket = await prisma.$transaction(async (tx) => {
    const ticketNumber = await nextTicketNumber(tx);
    const created = await tx.ticket.create({
      data: {
        ticketNumber,
        subject: input.subject,
        description: input.description,
        requesterId,
        departmentId: input.departmentId ?? requester.departmentId,
        locationId: input.locationId ?? requester.locationId,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId ?? null,
        priorityId: input.priorityId,
        statusId: defaultStatus.id,
        assetId: input.assetId ?? null,
        preferredContactMethod: input.preferredContactMethod,
        slaFirstResponseDeadline: new Date(now.getTime() + firstResponseMinutes * 60000),
        slaResolutionDeadline: new Date(now.getTime() + resolutionMinutes * 60000),
      },
      include: TICKET_INCLUDE,
    });

    await tx.ticketHistory.create({
      data: { ticketId: created.id, userId: requesterId, action: "created", newValue: defaultStatus.name },
    });

    return created;
  });

  await recordAudit({
    userId: requesterId,
    action: "ticket_created",
    entityType: "Ticket",
    entityId: ticket.id,
    newValue: ticket.ticketNumber,
    req,
  });

  // Notify the support team (all technicians + administrators).
  const supportStaff = await prisma.user.findMany({
    where: { role: { name: { in: ["Technician", "Administrator"] } }, status: "active" },
    select: { id: true },
  });
  await notifyManyUsers(
    supportStaff.map((u) => u.id),
    {
      type: "ticket_created",
      title: "New ticket submitted",
      message: `${requester.firstName} ${requester.lastName} submitted ${ticket.ticketNumber}: ${ticket.subject}`,
      entityType: "ticket",
      entityId: ticket.id,
    }
  );

  return withSla(ticket);
}

async function assertValidTransition(currentStatusName: string, targetStatusName: string) {
  if (currentStatusName === targetStatusName) return;
  const allowed = STATUS_TRANSITIONS[currentStatusName as TicketStatusName];
  if (!allowed?.includes(targetStatusName as TicketStatusName)) {
    throw ApiError.conflict(`Cannot move a ticket from "${currentStatusName}" to "${targetStatusName}".`);
  }
}

export async function changeTicketStatus(
  ticketId: string,
  targetStatusName: TicketStatusName,
  userId: string,
  opts: { pendingReason?: string | null; comment?: string; req?: Request } = {}
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { status: true, priority: true } });
  if (!ticket) throw ApiError.notFound("Ticket not found.");

  await assertValidTransition(ticket.status.name, targetStatusName);

  const targetStatus = await prisma.ticketStatus.findUnique({ where: { name: targetStatusName } });
  if (!targetStatus) throw ApiError.internal(`Status "${targetStatusName}" is not configured.`);

  const now = new Date();
  const isResolving = targetStatusName === "Resolved";
  const isClosing = targetStatusName === "Closed";
  const isReopening = targetStatusName === "Reopened";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        statusId: targetStatus.id,
        pendingReason: targetStatusName === "Pending" ? (opts.pendingReason ?? "other") : null,
        resolvedAt: isResolving ? now : isReopening ? null : ticket.resolvedAt,
        closedAt: isClosing ? now : isReopening ? null : ticket.closedAt,
        reopenedCount: isReopening ? { increment: 1 } : undefined,
        slaResolutionBreached:
          isResolving && ticket.slaResolutionDeadline ? now > ticket.slaResolutionDeadline : ticket.slaResolutionBreached,
      },
      include: TICKET_INCLUDE,
    });

    await tx.ticketHistory.create({
      data: {
        ticketId,
        userId,
        action: isResolving ? "resolved" : isClosing ? "closed" : isReopening ? "reopened" : "status_changed",
        field: "status",
        oldValue: ticket.status.name,
        newValue: targetStatusName,
      },
    });

    if (opts.comment) {
      await tx.ticketComment.create({
        data: { ticketId, authorId: userId, body: opts.comment, isInternal: false },
      });
    }

    return result;
  });

  await recordAudit({
    userId,
    action: "ticket_status_changed",
    entityType: "Ticket",
    entityId: ticketId,
    previousValue: ticket.status.name,
    newValue: targetStatusName,
    req: opts.req,
  });

  const notifyType = isResolving ? "ticket_resolved" : isReopening ? "ticket_reopened" : "status_changed";
  await notifyUser({
    userId: updated.requesterId,
    type: notifyType,
    title: isResolving ? "Your ticket was resolved" : isReopening ? "Your ticket was reopened" : "Ticket status updated",
    message: `${updated.ticketNumber} is now "${targetStatusName}".`,
    entityType: "ticket",
    entityId: ticketId,
    sendEmail: true,
  });

  return withSla(updated);
}

export async function assignTicket(ticketId: string, technicianId: string, assignedById: string, req?: Request) {
  const [ticket, technician] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId }, include: { status: true } }),
    prisma.user.findUnique({ where: { id: technicianId }, include: { role: true } }),
  ]);
  if (!ticket) throw ApiError.notFound("Ticket not found.");
  if (!technician) throw ApiError.badRequest("Selected technician does not exist.");
  if (!["Technician", "Administrator", "Manager"].includes(technician.role.name)) {
    throw ApiError.badRequest("Tickets can only be assigned to technicians, managers, or administrators.");
  }

  const openStatus = await prisma.ticketStatus.findFirst({ where: { name: "Open" } });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.ticketAssignment.updateMany({
      where: { ticketId, unassignedAt: null },
      data: { unassignedAt: new Date() },
    });
    await tx.ticketAssignment.create({
      data: { ticketId, technicianId, assignedById },
    });
    const result = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        assignedTechnicianId: technicianId,
        statusId: ticket.status.name === "New" && openStatus ? openStatus.id : undefined,
      },
      include: TICKET_INCLUDE,
    });
    await tx.ticketHistory.create({
      data: {
        ticketId,
        userId: assignedById,
        action: "assigned",
        field: "assignedTechnicianId",
        newValue: `${technician.firstName} ${technician.lastName}`,
      },
    });
    return result;
  });

  await recordAudit({
    userId: assignedById,
    action: "ticket_assigned",
    entityType: "Ticket",
    entityId: ticketId,
    newValue: `${technician.firstName} ${technician.lastName}`,
    req,
  });

  await notifyUser({
    userId: technicianId,
    type: "ticket_assigned",
    title: "Ticket assigned to you",
    message: `${updated.ticketNumber} has been assigned to you.`,
    entityType: "ticket",
    entityId: ticketId,
    sendEmail: true,
  });

  return withSla(updated);
}

export async function changeTicketPriority(ticketId: string, priorityId: string, userId: string, req?: Request) {
  const [ticket, priority] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId }, include: { priority: true } }),
    prisma.priority.findUnique({ where: { id: priorityId }, include: { slaPolicy: true } }),
  ]);
  if (!ticket) throw ApiError.notFound("Ticket not found.");
  if (!priority) throw ApiError.badRequest("Selected priority does not exist.");

  const firstResponseMinutes = priority.slaPolicy?.firstResponseMinutes ?? 480;
  const resolutionMinutes = priority.slaPolicy?.resolutionMinutes ?? 7200;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        priorityId,
        slaFirstResponseDeadline: new Date(ticket.createdAt.getTime() + firstResponseMinutes * 60000),
        slaResolutionDeadline: new Date(ticket.createdAt.getTime() + resolutionMinutes * 60000),
      },
      include: TICKET_INCLUDE,
    });
    await tx.ticketHistory.create({
      data: {
        ticketId,
        userId,
        action: "priority_changed",
        field: "priority",
        oldValue: ticket.priority.name,
        newValue: priority.name,
      },
    });
    return result;
  });

  await recordAudit({
    userId,
    action: "ticket_priority_changed",
    entityType: "Ticket",
    entityId: ticketId,
    previousValue: ticket.priority.name,
    newValue: priority.name,
    req,
  });

  await notifyUser({
    userId: updated.requesterId,
    type: "priority_changed",
    title: "Ticket priority updated",
    message: `${updated.ticketNumber} priority changed to ${priority.name}.`,
    entityType: "ticket",
    entityId: ticketId,
  });

  return withSla(updated);
}

export async function escalateTicket(ticketId: string, userId: string, note: string | undefined, req?: Request) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { priority: true } });
  if (!ticket) throw ApiError.notFound("Ticket not found.");

  const nextPriority = await prisma.priority.findFirst({
    where: { level: { gt: ticket.priority.level } },
    orderBy: { level: "asc" },
  });

  const admins = await prisma.user.findMany({ where: { role: { name: "Administrator" } }, select: { id: true } });

  const updated = await prisma.$transaction(async (tx) => {
    const result = nextPriority
      ? await tx.ticket.update({
          where: { id: ticketId },
          data: { priorityId: nextPriority.id },
          include: TICKET_INCLUDE,
        })
      : await tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: TICKET_INCLUDE });

    await tx.ticketHistory.create({
      data: {
        ticketId,
        userId,
        action: "escalated",
        oldValue: ticket.priority.name,
        newValue: nextPriority?.name ?? ticket.priority.name,
      },
    });

    if (note) {
      await tx.ticketComment.create({
        data: { ticketId, authorId: userId, body: `Escalated: ${note}`, isInternal: true },
      });
    }

    return result;
  });

  await recordAudit({
    userId,
    action: "ticket_escalated",
    entityType: "Ticket",
    entityId: ticketId,
    previousValue: ticket.priority.name,
    newValue: nextPriority?.name ?? ticket.priority.name,
    req,
  });

  await notifyManyUsers(admins.map((a) => a.id), {
    type: "priority_changed",
    title: "Ticket escalated",
    message: `${updated.ticketNumber} was escalated and needs attention.`,
    entityType: "ticket",
    entityId: ticketId,
  });

  return withSla(updated);
}

export async function addTicketComment(
  ticketId: string,
  authorId: string,
  body: string,
  isInternal: boolean,
  req?: Request
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw ApiError.notFound("Ticket not found.");

  const authorRole = await getRoleName(authorId);
  const isStaffReply = authorRole !== "Employee" && !isInternal;

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.ticketComment.create({
      data: { ticketId, authorId, body, isInternal },
      include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    if (isStaffReply && !ticket.firstRespondedAt) {
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          firstRespondedAt: created.createdAt,
          slaFirstResponseBreached: ticket.slaFirstResponseDeadline
            ? created.createdAt > ticket.slaFirstResponseDeadline
            : false,
        },
      });
    }

    await tx.ticketHistory.create({
      data: { ticketId, userId: authorId, action: isInternal ? "note_added" : "replied" },
    });

    return created;
  });

  await recordAudit({
    userId: authorId,
    action: isInternal ? "ticket_note_added" : "ticket_reply_added",
    entityType: "Ticket",
    entityId: ticketId,
    req,
  });

  if (!isInternal) {
    if (isStaffReply) {
      await notifyUser({
        userId: ticket.requesterId,
        type: "technician_reply",
        title: "New reply on your ticket",
        message: `${comment.author.firstName} replied to your ticket.`,
        entityType: "ticket",
        entityId: ticketId,
        sendEmail: true,
      });
    } else if (ticket.assignedTechnicianId) {
      await notifyUser({
        userId: ticket.assignedTechnicianId,
        type: "employee_reply",
        title: "Employee replied to a ticket",
        message: `${comment.author.firstName} replied to a ticket assigned to you.`,
        entityType: "ticket",
        entityId: ticketId,
      });
    }
  }

  return comment;
}
