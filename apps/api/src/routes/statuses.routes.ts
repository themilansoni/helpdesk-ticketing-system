import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const statusesRouter = Router();
statusesRouter.use(requireAuth);

// Statuses power a fixed workflow (New -> Open -> ... -> Closed -> Reopened),
// so this list is read-only via the API; the set is seeded once.
statusesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const statuses = await prisma.ticketStatus.findMany({ orderBy: { order: "asc" } });
    res.json(statuses);
  })
);
