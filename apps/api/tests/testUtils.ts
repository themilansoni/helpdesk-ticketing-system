import { prisma } from "@helpdesk/database";
import { hashPassword } from "../src/lib/password.js";

// Deletes rows in FK-safe order so repeated test runs start from a clean
// slate regardless of which provider (sqlite locally, postgresql in CI)
// backs the test database.
export async function resetDatabase() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.ticketAttachment.deleteMany(),
    prisma.ticketHistory.deleteMany(),
    prisma.ticketAssignment.deleteMany(),
    prisma.ticketComment.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.knowledgeArticle.deleteMany(),
    prisma.knowledgeCategory.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.assetType.deleteMany(),
    prisma.slaPolicy.deleteMany(),
    prisma.ticketSubcategory.deleteMany(),
    prisma.ticketCategory.deleteMany(),
    prisma.priority.deleteMany(),
    prisma.ticketStatus.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.department.deleteMany(),
    prisma.location.deleteMany(),
    prisma.role.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.counter.deleteMany(),
  ]);
}

export interface MinimalFixture {
  roles: Record<string, string>;
  statuses: Record<string, string>;
  priorities: Record<string, { id: string; level: number }>;
  categoryId: string;
  admin: { id: string; email: string };
  technician: { id: string; email: string };
  employee: { id: string; email: string };
}

export const TEST_PASSWORD = "Passw0rd!123";

export async function seedMinimal(): Promise<MinimalFixture> {
  const roleNames = ["Employee", "Technician", "Manager", "Administrator"];
  const roles: Record<string, string> = {};
  for (const name of roleNames) {
    const role = await prisma.role.create({ data: { name } });
    roles[name] = role.id;
  }

  const statusDefs = [
    { name: "New", order: 0, isDefault: true, isClosed: false },
    { name: "Open", order: 1, isDefault: false, isClosed: false },
    { name: "In Progress", order: 2, isDefault: false, isClosed: false },
    { name: "Pending", order: 3, isDefault: false, isClosed: false },
    { name: "Resolved", order: 4, isDefault: false, isClosed: false },
    { name: "Closed", order: 5, isDefault: false, isClosed: true },
    { name: "Reopened", order: 6, isDefault: false, isClosed: false },
  ];
  const statuses: Record<string, string> = {};
  for (const s of statusDefs) {
    const status = await prisma.ticketStatus.create({ data: s });
    statuses[s.name] = status.id;
  }

  const priorityDefs = [
    { name: "Low", level: 1, firstResponseMinutes: 480, resolutionMinutes: 7200 },
    { name: "Medium", level: 2, firstResponseMinutes: 240, resolutionMinutes: 2880 },
    { name: "High", level: 3, firstResponseMinutes: 30, resolutionMinutes: 480 },
    { name: "Critical", level: 4, firstResponseMinutes: 15, resolutionMinutes: 240 },
  ];
  const priorities: Record<string, { id: string; level: number }> = {};
  for (const p of priorityDefs) {
    const priority = await prisma.priority.create({ data: { name: p.name, level: p.level } });
    await prisma.slaPolicy.create({
      data: { priorityId: priority.id, firstResponseMinutes: p.firstResponseMinutes, resolutionMinutes: p.resolutionMinutes },
    });
    priorities[p.name] = { id: priority.id, level: p.level };
  }

  const category = await prisma.ticketCategory.create({ data: { name: "Hardware" } });

  const passwordHash = await hashPassword(TEST_PASSWORD);
  const admin = await prisma.user.create({
    data: {
      employeeId: "T-ADMIN",
      firstName: "Ava",
      lastName: "Admin",
      email: "test.admin@helpdesk.local",
      passwordHash,
      roleId: roles["Administrator"]!,
      status: "active",
    },
  });
  const technician = await prisma.user.create({
    data: {
      employeeId: "T-TECH",
      firstName: "Tom",
      lastName: "Tech",
      email: "test.technician@helpdesk.local",
      passwordHash,
      roleId: roles["Technician"]!,
      status: "active",
    },
  });
  const employee = await prisma.user.create({
    data: {
      employeeId: "T-EMP",
      firstName: "Emma",
      lastName: "Employee",
      email: "test.employee@helpdesk.local",
      passwordHash,
      roleId: roles["Employee"]!,
      status: "active",
    },
  });

  return {
    roles,
    statuses,
    priorities,
    categoryId: category.id,
    admin: { id: admin.id, email: admin.email },
    technician: { id: technician.id, email: technician.email },
    employee: { id: employee.id, email: employee.email },
  };
}
