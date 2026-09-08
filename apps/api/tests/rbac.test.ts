import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { prisma } from "@helpdesk/database";
import { createApp } from "../src/app.js";
import { resetDatabase, seedMinimal, TEST_PASSWORD, type MinimalFixture } from "./testUtils.js";

const app = createApp();
let fixture: MinimalFixture;
let employeeToken: string;
let technicianToken: string;
let adminToken: string;

async function loginAs(email: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password: TEST_PASSWORD });
  return res.body.accessToken as string;
}

describe("Role-based access control", () => {
  beforeAll(async () => {
    await resetDatabase();
    fixture = await seedMinimal();
    employeeToken = await loginAs(fixture.employee.email);
    technicianToken = await loginAs(fixture.technician.email);
    adminToken = await loginAs(fixture.admin.email);
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("blocks employees and technicians from listing users (admin-only)", async () => {
    const asEmployee = await request(app).get("/api/users").set("Authorization", `Bearer ${employeeToken}`);
    expect(asEmployee.status).toBe(403);

    const asTechnician = await request(app).get("/api/users").set("Authorization", `Bearer ${technicianToken}`);
    expect(asTechnician.status).toBe(403);
  });

  it("allows an administrator to list users", async () => {
    const res = await request(app).get("/api/users").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("blocks employees from viewing audit logs", async () => {
    const res = await request(app).get("/api/audit-logs").set("Authorization", `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it("blocks technicians from creating departments (admin-only)", async () => {
    const res = await request(app)
      .post("/api/departments")
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({ name: "Legal" });
    expect(res.status).toBe(403);
  });

  it("allows an administrator to create a department", async () => {
    const res = await request(app).post("/api/departments").set("Authorization", `Bearer ${adminToken}`).send({ name: "Legal" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Legal");
  });

  it("rejects a request with a malformed token", async () => {
    const res = await request(app).get("/api/tickets").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});
