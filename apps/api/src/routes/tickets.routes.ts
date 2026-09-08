import { Router } from "express";
import { prisma } from "@helpdesk/database";
import {
  createTicketSchema,
  updateTicketStatusSchema,
  updateTicketPrioritySchema,
  assignTicketSchema,
  addCommentSchema,
  paginationSchema,
} from "@helpdesk/shared";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import { fileStorage } from "../lib/storage/index.js";
import { ApiError } from "../lib/apiError.js";
import {
  listTickets,
  getTicketById,
  createTicket,
  changeTicketStatus,
  assignTicket,
  changeTicketPriority,
  escalateTicket,
  addTicketComment,
} from "../services/ticketService.js";
import type { TicketStatusName } from "@helpdesk/shared";

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

async function assertCanViewTicket(userId: string, role: string, ticketId: string) {
  if (role !== "Employee") return;
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { requesterId: true } });
  if (!ticket) throw ApiError.notFound("Ticket not found.");
  if (ticket.requesterId !== userId) throw ApiError.forbidden("You can only view your own tickets.");
}

ticketsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const result = await listTickets({
      requestingUserId: req.user!.sub,
      requestingUserRole: req.user!.role,
      search: req.query.search as string | undefined,
      statusId: req.query.statusId as string | undefined,
      priorityId: req.query.priorityId as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      assignedTechnicianId:
        req.query.assignee === "me" ? req.user!.sub : (req.query.assignedTechnicianId as string | undefined),
      unassigned: req.query.unassigned === "1" || req.query.unassigned === "true",
      mine: req.query.mine === "1" || req.query.mine === "true",
      slaHealth: req.query.sla as "healthy" | "at_risk" | "breached" | undefined,
      sort: req.query.sort as "newest" | "oldest" | "priority" | "sla" | undefined,
      page,
      pageSize,
    });
    res.json(result);
  })
);

ticketsRouter.post(
  "/",
  requirePermission("TICKET_CREATE"),
  upload.array("attachments", 5),
  asyncHandler(async (req, res) => {
    const input = createTicketSchema.parse({
      ...req.body,
      subcategoryId: req.body.subcategoryId || null,
      departmentId: req.body.departmentId || null,
      locationId: req.body.locationId || null,
      assetId: req.body.assetId || null,
    });
    const ticket = await createTicket(input, req.user!.sub, req);

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    for (const file of files) {
      const stored = await fileStorage.save({ buffer: file.buffer, fileName: file.originalname, mimeType: file.mimetype });
      await prisma.ticketAttachment.create({
        data: {
          ticketId: ticket.id,
          uploadedById: req.user!.sub,
          fileName: file.originalname,
          storedFileName: stored.storagePath,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storageDriver: stored.storageDriver,
          storagePath: stored.storagePath,
        },
      });
    }

    res.status(201).json(ticket);
  })
);

ticketsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    await assertCanViewTicket(req.user!.sub, req.user!.role, req.params.id);
    const ticket = await getTicketById(req.params.id);
    res.json(ticket);
  })
);

ticketsRouter.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    await assertCanViewTicket(req.user!.sub, req.user!.role, req.params.id);
    const history = await prisma.ticketHistory.findMany({
      where: { ticketId: req.params.id },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(history);
  })
);

ticketsRouter.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    await assertCanViewTicket(req.user!.sub, req.user!.role, req.params.id);
    const isStaff = req.user!.role !== "Employee";
    const comments = await prisma.ticketComment.findMany({
      where: { ticketId: req.params.id, isInternal: isStaff ? undefined : false },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments);
  })
);

ticketsRouter.post(
  "/:id/comments",
  upload.array("attachments", 5),
  asyncHandler(async (req, res) => {
    await assertCanViewTicket(req.user!.sub, req.user!.role, req.params.id);
    const input = addCommentSchema.parse({ ...req.body, isInternal: req.body.isInternal === "true" || req.body.isInternal === true });
    if (input.isInternal && req.user!.role === "Employee") {
      throw ApiError.forbidden("Only support staff can add internal notes.");
    }
    const comment = await addTicketComment(req.params.id, req.user!.sub, input.body, input.isInternal, req);

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    for (const file of files) {
      const stored = await fileStorage.save({ buffer: file.buffer, fileName: file.originalname, mimeType: file.mimetype });
      await prisma.ticketAttachment.create({
        data: {
          ticketId: req.params.id,
          commentId: comment.id,
          uploadedById: req.user!.sub,
          fileName: file.originalname,
          storedFileName: stored.storagePath,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storageDriver: stored.storageDriver,
          storagePath: stored.storagePath,
        },
      });
    }

    res.status(201).json(comment);
  })
);

ticketsRouter.get(
  "/:id/attachments/:attachmentId",
  asyncHandler(async (req, res) => {
    await assertCanViewTicket(req.user!.sub, req.user!.role, req.params.id);
    const attachment = await prisma.ticketAttachment.findUnique({ where: { id: req.params.attachmentId } });
    if (!attachment || attachment.ticketId !== req.params.id) throw ApiError.notFound("Attachment not found.");
    const buffer = await fileStorage.read(attachment.storagePath);
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.fileName}"`);
    res.send(buffer);
  })
);

ticketsRouter.post(
  "/:id/assign",
  requirePermission("TICKET_ASSIGN"),
  asyncHandler(async (req, res) => {
    const input = assignTicketSchema.parse(req.body);
    const ticket = await assignTicket(req.params.id, input.technicianId, req.user!.sub, req);
    res.json(ticket);
  })
);

ticketsRouter.post(
  "/:id/status",
  requirePermission("TICKET_CHANGE_STATUS"),
  asyncHandler(async (req, res) => {
    const input = updateTicketStatusSchema.parse(req.body);
    const status = await prisma.ticketStatus.findUnique({ where: { id: input.statusId } });
    if (!status) throw ApiError.badRequest("Invalid status.");
    const ticket = await changeTicketStatus(req.params.id, status.name as TicketStatusName, req.user!.sub, {
      pendingReason: input.pendingReason,
      comment: input.comment,
      req,
    });
    res.json(ticket);
  })
);

ticketsRouter.post(
  "/:id/priority",
  requirePermission("TICKET_CHANGE_PRIORITY"),
  asyncHandler(async (req, res) => {
    const input = updateTicketPrioritySchema.parse(req.body);
    const ticket = await changeTicketPriority(req.params.id, input.priorityId, req.user!.sub, req);
    res.json(ticket);
  })
);

ticketsRouter.post(
  "/:id/escalate",
  requirePermission("TICKET_ESCALATE"),
  asyncHandler(async (req, res) => {
    const ticket = await escalateTicket(req.params.id, req.user!.sub, req.body?.note, req);
    res.json(ticket);
  })
);

ticketsRouter.post(
  "/:id/resolve",
  requirePermission("TICKET_CHANGE_STATUS"),
  asyncHandler(async (req, res) => {
    const ticket = await changeTicketStatus(req.params.id, "Resolved", req.user!.sub, { comment: req.body?.comment, req });
    res.json(ticket);
  })
);

ticketsRouter.post(
  "/:id/close",
  requirePermission("TICKET_CHANGE_STATUS"),
  asyncHandler(async (req, res) => {
    const ticket = await changeTicketStatus(req.params.id, "Closed", req.user!.sub, { req });
    res.json(ticket);
  })
);

ticketsRouter.post(
  "/:id/reopen",
  requirePermission("TICKET_CHANGE_STATUS"),
  asyncHandler(async (req, res) => {
    const ticket = await changeTicketStatus(req.params.id, "Reopened", req.user!.sub, { comment: req.body?.comment, req });
    res.json(ticket);
  })
);
