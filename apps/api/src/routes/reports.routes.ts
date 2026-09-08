import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { ApiError } from "../lib/apiError.js";
import * as reportService from "../services/reportService.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.use(requirePermission("REPORTS_VIEW"));

reportsRouter.get("/summary", asyncHandler(async (_req, res) => res.json(await reportService.getDashboardSummary())));
reportsRouter.get("/tickets-by-priority", asyncHandler(async (_req, res) => res.json(await reportService.getTicketsByPriority())));
reportsRouter.get("/tickets-by-category", asyncHandler(async (_req, res) => res.json(await reportService.getTicketsByCategory())));
reportsRouter.get("/tickets-by-department", asyncHandler(async (_req, res) => res.json(await reportService.getTicketsByDepartment())));
reportsRouter.get(
  "/tickets-over-time",
  asyncHandler(async (req, res) => res.json(await reportService.getTicketsOverTime(Number(req.query.days) || 30)))
);
reportsRouter.get(
  "/resolution-time-trend",
  asyncHandler(async (req, res) => res.json(await reportService.getResolutionTimeTrend(Number(req.query.days) || 30)))
);
reportsRouter.get("/technician-workload", asyncHandler(async (_req, res) => res.json(await reportService.getTechnicianWorkload())));
reportsRouter.get("/sla-compliance", asyncHandler(async (_req, res) => res.json(await reportService.getSlaCompliance())));
reportsRouter.get("/aging", asyncHandler(async (_req, res) => res.json(await reportService.getAgingReport())));
reportsRouter.get(
  "/monthly-volume",
  asyncHandler(async (req, res) => res.json(await reportService.getMonthlyVolume(Number(req.query.months) || 6)))
);

const EXPORTERS: Record<string, () => Promise<Record<string, unknown>[]>> = {
  aging: () => reportService.getAgingReport(),
  "tickets-by-priority": () => reportService.getTicketsByPriority(),
  "tickets-by-category": () => reportService.getTicketsByCategory(),
  "tickets-by-department": () => reportService.getTicketsByDepartment(),
  "technician-workload": () => reportService.getTechnicianWorkload(),
};

reportsRouter.get(
  "/export.csv",
  asyncHandler(async (req, res) => {
    const type = req.query.type as string;
    const exporter = EXPORTERS[type];
    if (!exporter) throw ApiError.badRequest(`Unknown export type "${type}". Valid types: ${Object.keys(EXPORTERS).join(", ")}`);
    const rows = await exporter();
    const csv = reportService.toCsv(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-report.csv"`);
    res.send(csv);
  })
);
