import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { prisma } from "@helpdesk/database";
import { createApp } from "../src/app.js";
import { resetDatabase, seedMinimal, TEST_PASSWORD } from "./testUtils.js";

const app = createApp();

describe("Authentication", () => {
  beforeAll(async () => {
    await resetDatabase();
    await seedMinimal();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("logs in with valid credentials and returns an access token", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "test.employee@helpdesk.local",
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe("test.employee@helpdesk.local");
  });

  it("rejects an invalid password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "test.employee@helpdesk.local",
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
  });

  it("rejects a login for an unknown email without leaking which part was wrong", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@helpdesk.local",
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
  });

  it("rejects requests to protected routes without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user profile for a valid token", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "test.employee@helpdesk.local",
      password: TEST_PASSWORD,
    });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("test.employee@helpdesk.local");
  });
});
