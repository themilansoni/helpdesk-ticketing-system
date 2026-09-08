import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { prisma } from "@helpdesk/database";
import { createApp } from "../src/app.js";
import { resetDatabase, seedMinimal, TEST_PASSWORD, type MinimalFixture } from "./testUtils.js";

const app = createApp();
let fixture: MinimalFixture;
let employeeToken: string;
let technicianToken: string;

async function loginAs(email: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password: TEST_PASSWORD });
  return res.body.accessToken as string;
}

describe("Ticket lifecycle", () => {
  beforeAll(async () => {
    await resetDatabase();
    fixture = await seedMinimal();
    employeeToken = await loginAs(fixture.employee.email);
    technicianToken = await loginAs(fixture.technician.email);
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  let ticketId: string;
  let ticketNumber: string;

  it("lets an employee create a ticket with an auto-generated ticket number", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${employeeToken}`)
      .field("subject", "My laptop will not turn on")
      .field("description", "Pressed the power button several times with no response.")
      .field("categoryId", fixture.categoryId)
      .field("priorityId", fixture.priorities["Medium"]!.id)
      .field("preferredContactMethod", "email");

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^HD-\d{4}-\d{6}$/);
    expect(res.body.status.name).toBe("New");
    expect(res.body.slaResolutionDeadline).toBeTruthy();
    ticketId = res.body.id;
    ticketNumber = res.body.ticketNumber;
  });

  it("increments the ticket number on the next ticket", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${employeeToken}`)
      .field("subject", "Need access to the shared drive")
      .field("description", "I was moved to a new team and lost drive access.")
      .field("categoryId", fixture.categoryId)
      .field("priorityId", fixture.priorities["Low"]!.id);

    expect(res.status).toBe(201);
    const [, , seqA] = ticketNumber.split("-");
    const [, , seqB] = res.body.ticketNumber.split("-");
    expect(Number(seqB)).toBe(Number(seqA) + 1);
  });

  it("prevents an employee from assigning a ticket (RBAC)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/assign`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ technicianId: fixture.technician.id });
    expect(res.status).toBe(403);
  });

  it("lets a technician assign the ticket to themselves", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/assign`)
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({ technicianId: fixture.technician.id });
    expect(res.status).toBe(200);
    expect(res.body.assignedTechnician.id).toBe(fixture.technician.id);
    expect(res.body.status.name).toBe("Open");
  });

  it("prevents an employee from viewing another employee's ticket", async () => {
    const otherEmployee = await prisma.user.create({
      data: {
        employeeId: "T-EMP2",
        firstName: "Other",
        lastName: "Employee",
        email: "other.employee@helpdesk.local",
        passwordHash: (await prisma.user.findUniqueOrThrow({ where: { id: fixture.employee.id } })).passwordHash,
        roleId: fixture.roles["Employee"]!,
      },
    });
    const otherToken = await loginAs(otherEmployee.email);
    const res = await request(app).get(`/api/tickets/${ticketId}`).set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it("rejects an invalid status transition (New/Open cannot jump straight to Reopened)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({ statusId: fixture.statuses["Reopened"] });
    expect(res.status).toBe(409);
  });

  it("moves the ticket through the workflow to Resolved and Closed", async () => {
    const inProgress = await request(app)
      .post(`/api/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({ statusId: fixture.statuses["In Progress"] });
    expect(inProgress.status).toBe(200);
    expect(inProgress.body.status.name).toBe("In Progress");

    const resolved = await request(app)
      .post(`/api/tickets/${ticketId}/resolve`)
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({ comment: "Replaced the power adapter." });
    expect(resolved.status).toBe(200);
    expect(resolved.body.status.name).toBe("Resolved");
    expect(resolved.body.resolvedAt).toBeTruthy();

    const closed = await request(app)
      .post(`/api/tickets/${ticketId}/close`)
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({});
    expect(closed.status).toBe(200);
    expect(closed.body.status.name).toBe("Closed");
    expect(closed.body.closedAt).toBeTruthy();
  });

  it("allows reopening a closed ticket and records it in ticket history", async () => {
    const reopened = await request(app)
      .post(`/api/tickets/${ticketId}/reopen`)
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({});
    expect(reopened.status).toBe(200);
    expect(reopened.body.status.name).toBe("Reopened");

    const history = await request(app)
      .get(`/api/tickets/${ticketId}/history`)
      .set("Authorization", `Bearer ${technicianToken}`);
    const actions = history.body.map((h: { action: string }) => h.action);
    expect(actions).toContain("created");
    expect(actions).toContain("assigned");
    expect(actions).toContain("resolved");
    expect(actions).toContain("closed");
    expect(actions).toContain("reopened");
  });

  it("lets the requester and technician exchange replies, and hides internal notes from the employee", async () => {
    const reply = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({ body: "Following up - is the laptop working now?", isInternal: false });
    expect(reply.status).toBe(201);

    const internalNote = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${technicianToken}`)
      .send({ body: "Ordered a replacement charger as backup.", isInternal: true });
    expect(internalNote.status).toBe(201);

    const employeeCannotAddInternalNote = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ body: "trying to sneak a note", isInternal: true });
    expect(employeeCannotAddInternalNote.status).toBe(403);

    const employeeView = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${employeeToken}`);
    const bodies = employeeView.body.map((c: { body: string }) => c.body);
    expect(bodies).toContain("Following up - is the laptop working now?");
    expect(bodies).not.toContain("Ordered a replacement charger as backup.");
  });
});
