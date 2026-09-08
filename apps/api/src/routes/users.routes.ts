import { Router } from "express";
import { prisma } from "@helpdesk/database";
import { createUserSchema, updateUserSchema, paginationSchema } from "@helpdesk/shared";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { listUsers, createUser, updateUser, setUserStatus, resetPassword } from "../services/userService.js";
import { ApiError } from "../lib/apiError.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get(
  "/",
  requirePermission("USER_MANAGE"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const result = await listUsers({
      search: req.query.search as string | undefined,
      roleName: req.query.role as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      status: req.query.status as string | undefined,
      page,
      pageSize,
    });
    res.json(result);
  })
);

// Lightweight technician directory for assignment dropdowns - any authenticated staff can read it.
usersRouter.get(
  "/technicians",
  asyncHandler(async (_req, res) => {
    const technicians = await prisma.user.findMany({
      where: { role: { name: { in: ["Technician", "Manager", "Administrator"] } }, status: "active" },
      select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } },
      orderBy: { firstName: "asc" },
    });
    res.json(technicians);
  })
);

usersRouter.post(
  "/",
  requirePermission("USER_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const user = await createUser(input, req.user!.sub, req);
    res.status(201).json(user);
  })
);

usersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.user!.role !== "Administrator" && req.user!.sub !== req.params.id) {
      throw ApiError.forbidden();
    }
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        jobTitle: true,
        status: true,
        role: true,
        department: true,
        location: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!user) throw ApiError.notFound("User not found.");
    res.json(user);
  })
);

usersRouter.put(
  "/:id",
  requirePermission("USER_MANAGE"),
  asyncHandler(async (req, res) => {
    const input = updateUserSchema.parse(req.body);
    const user = await updateUser(req.params.id, input, req.user!.sub, req);
    res.json(user);
  })
);

usersRouter.post(
  "/:id/disable",
  requirePermission("USER_MANAGE"),
  asyncHandler(async (req, res) => {
    const user = await setUserStatus(req.params.id, "disabled", req.user!.sub, req);
    res.json(user);
  })
);

usersRouter.post(
  "/:id/enable",
  requirePermission("USER_MANAGE"),
  asyncHandler(async (req, res) => {
    const user = await setUserStatus(req.params.id, "active", req.user!.sub, req);
    res.json(user);
  })
);

usersRouter.post(
  "/:id/reset-password",
  requirePermission("USER_MANAGE"),
  asyncHandler(async (req, res) => {
    const newPassword = req.body?.password;
    if (!newPassword || newPassword.length < 8) throw ApiError.badRequest("Password must be at least 8 characters.");
    await resetPassword(req.params.id, newPassword, req.user!.sub, req);
    res.status(204).send();
  })
);
