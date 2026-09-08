import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../lib/apiError.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  })
);

notificationsRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({ where: { userId: req.user!.sub, isRead: false } });
    res.json({ count });
  })
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.userId !== req.user!.sub) throw ApiError.notFound("Notification not found.");
    const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json(updated);
  })
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.sub, isRead: false }, data: { isRead: true } });
    res.status(204).send();
  })
);
