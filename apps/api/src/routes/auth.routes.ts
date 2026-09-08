import { Router } from "express";
import { loginSchema } from "@helpdesk/shared";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { login, refreshSession, logout, getProfile } from "../services/authService.js";
import { ApiError } from "../lib/apiError.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await login(input.email, input.password, req);
    res.json(result);
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) throw ApiError.badRequest("refreshToken is required.");
    const result = await refreshSession(refreshToken);
    res.json(result);
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) await logout(refreshToken);
    res.status(204).send();
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await getProfile(req.user!.sub);
    res.json(profile);
  })
);
