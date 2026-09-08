import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import {
  ROLES,
  DEPARTMENTS,
  LOCATIONS,
  PRIORITIES,
  STATUSES,
  CATEGORIES,
  ASSET_TYPES,
  KB_CATEGORIES,
  KB_ARTICLES,
  FIRST_NAMES,
  LAST_NAMES,
} from "./seed-data";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const DEMO_PASSWORD = "Passw0rd!123";

async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function nextTicketNumber(year: number): Promise<string> {
  const key = `ticket_number_${year}`;
  const counter = await prisma.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `HD-${year}-${String(counter.value).padStart(6, "0")}`;
}

async function main() {
  console.log("Seeding HelpDesk Pro demo data...");

  // -------------------------------------------------------------------
  // Reference data
  // -------------------------------------------------------------------
  const roleMap = new Map<string, string>();
  for (const name of ROLES) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    roleMap.set(name, role.id);
  }

  const deptMap = new Map<string, string>();
  for (const dept of DEPARTMENTS) {
    const d = await prisma.department.upsert({
      where: { name: dept.name },
      create: dept,
      update: {},
    });
    deptMap.set(dept.name, d.id);
  }

  const locationMap = new Map<string, string>();
  for (const loc of LOCATIONS) {
    const l = await prisma.location.upsert({
      where: { name: loc.name },
      create: loc,
      update: {},
    });
    locationMap.set(loc.name, l.id);
  }

  const priorityMap = new Map<string, { id: string; level: number }>();
  for (const p of PRIORITIES) {
    const priority = await prisma.priority.upsert({
      where: { name: p.name },
      create: { name: p.name, level: p.level, colorHex: p.colorHex },
      update: { level: p.level, colorHex: p.colorHex },
    });
    priorityMap.set(p.name, { id: priority.id, level: p.level });
    await prisma.slaPolicy.upsert({
      where: { priorityId: priority.id },
      create: {
        priorityId: priority.id,
        firstResponseMinutes: p.firstResponseMinutes,
        resolutionMinutes: p.resolutionMinutes,
      },
      update: {
        firstResponseMinutes: p.firstResponseMinutes,
        resolutionMinutes: p.resolutionMinutes,
      },
    });
  }

  const statusMap = new Map<string, string>();
  for (const s of STATUSES) {
    const status = await prisma.ticketStatus.upsert({
      where: { name: s.name },
      create: s,
      update: s,
    });
    statusMap.set(s.name, status.id);
  }

  const categoryMap = new Map<string, string>();
  const subcategoryMap = new Map<string, string>(); // key: "Category::Subcategory"
  for (const [categoryName, subs] of Object.entries(CATEGORIES)) {
    const category = await prisma.ticketCategory.upsert({
      where: { name: categoryName },
      create: { name: categoryName },
      update: {},
    });
    categoryMap.set(categoryName, category.id);
    for (const subName of subs) {
      const sub = await prisma.ticketSubcategory.upsert({
        where: { categoryId_name: { categoryId: category.id, name: subName } },
        create: { name: subName, categoryId: category.id },
        update: {},
      });
      subcategoryMap.set(`${categoryName}::${subName}`, sub.id);
    }
  }

  const assetTypeMap = new Map<string, string>();
  for (const name of ASSET_TYPES) {
    const t = await prisma.assetType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    assetTypeMap.set(name, t.id);
  }

  const kbCategoryMap = new Map<string, string>();
  for (const name of KB_CATEGORIES) {
    const c = await prisma.knowledgeCategory.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    kbCategoryMap.set(name, c.id);
  }

  // -------------------------------------------------------------------
  // Users - 4 documented demo accounts + additional realistic users
  // -------------------------------------------------------------------
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: "admin@helpdesk.local" },
    create: {
      employeeId: "EMP-0001",
      firstName: "Ava",
      lastName: "Administrator",
      email: "admin@helpdesk.local",
      passwordHash: demoPasswordHash,
      roleId: roleMap.get("Administrator")!,
      departmentId: deptMap.get("IT")!,
      locationId: locationMap.get("HQ - New York")!,
      jobTitle: "IT Systems Administrator",
    },
    update: {},
  });

  const technician = await prisma.user.upsert({
    where: { email: "technician@helpdesk.local" },
    create: {
      employeeId: "EMP-0002",
      firstName: "Tom",
      lastName: "Technician",
      email: "technician@helpdesk.local",
      passwordHash: demoPasswordHash,
      roleId: roleMap.get("Technician")!,
      departmentId: deptMap.get("IT")!,
      locationId: locationMap.get("HQ - New York")!,
      jobTitle: "IT Support Specialist",
    },
    update: {},
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@helpdesk.local" },
    create: {
      employeeId: "EMP-0003",
      firstName: "Maria",
      lastName: "Manager",
      email: "manager@helpdesk.local",
      passwordHash: demoPasswordHash,
      roleId: roleMap.get("Manager")!,
      departmentId: deptMap.get("Operations")!,
      locationId: locationMap.get("HQ - New York")!,
      jobTitle: "Operations Manager",
    },
    update: {},
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@helpdesk.local" },
    create: {
      employeeId: "EMP-0004",
      firstName: "Emma",
      lastName: "Employee",
      email: "employee@helpdesk.local",
      passwordHash: demoPasswordHash,
      roleId: roleMap.get("Employee")!,
      departmentId: deptMap.get("Sales")!,
      locationId: locationMap.get("HQ - New York")!,
      managerId: manager.id,
      jobTitle: "Sales Associate",
    },
    update: {},
  });

  const technicians = [technician];
  const technicianNames = [
    ["Nina", "Ortiz"],
    ["Leo", "Fischer"],
    ["Grace", "Park"],
  ];
  for (let i = 0; i < technicianNames.length; i++) {
    const [firstName, lastName] = technicianNames[i]!;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@helpdesk.local`;
    const tech = await prisma.user.upsert({
      where: { email },
      create: {
        employeeId: `EMP-00${10 + i}`,
        firstName,
        lastName,
        email,
        passwordHash: demoPasswordHash,
        roleId: roleMap.get("Technician")!,
        departmentId: deptMap.get("IT")!,
        locationId: locationMap.get("HQ - New York")!,
        jobTitle: "IT Support Specialist",
      },
      update: {},
    });
    technicians.push(tech);
  }

  const employees = [employee];
  const departmentNames = DEPARTMENTS.map((d) => d.name);
  const locationNames = LOCATIONS.map((l) => l.name);
  let empCounter = 20;
  for (let i = 0; i < 15; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length]!;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@helpdesk.local`;
    const dept = departmentNames[i % departmentNames.length]!;
    const loc = locationNames[i % locationNames.length]!;
    const emp = await prisma.user.upsert({
      where: { email },
      create: {
        employeeId: `EMP-${String(empCounter++).padStart(4, "0")}`,
        firstName,
        lastName,
        email,
        phone: faker.phone.number({ style: "national" }),
        passwordHash: demoPasswordHash,
        roleId: roleMap.get("Employee")!,
        departmentId: deptMap.get(dept)!,
        locationId: locationMap.get(loc)!,
        managerId: manager.id,
        jobTitle: faker.person.jobTitle(),
      },
      update: {},
    });
    employees.push(emp);
  }

  console.log(`Users ready: 1 admin, ${technicians.length} technicians, 1 manager, ${employees.length} employees`);

  // -------------------------------------------------------------------
  // Assets
  // -------------------------------------------------------------------
  const assetStatuses = ["available", "assigned", "in_repair", "retired", "lost"];
  const assets = [];
  for (let i = 0; i < 10; i++) {
    const typeName = ASSET_TYPES[i % ASSET_TYPES.length]!;
    const status = i < 6 ? "assigned" : assetStatuses[i % assetStatuses.length]!;
    const assignedUser = status === "assigned" ? employees[i % employees.length] : null;
    const purchaseDate = faker.date.past({ years: 3 });
    const asset = await prisma.asset.upsert({
      where: { assetTag: `AST-${String(1000 + i)}` },
      create: {
        assetTag: `AST-${String(1000 + i)}`,
        serialNumber: faker.string.alphanumeric(12).toUpperCase(),
        assetTypeId: assetTypeMap.get(typeName)!,
        manufacturer: faker.helpers.arrayElement(["Dell", "HP", "Lenovo", "Apple", "Cisco", "Logitech"]),
        model: faker.commerce.productName(),
        purchaseDate,
        warrantyExpiry: faker.date.future({ years: 2, refDate: purchaseDate }),
        status,
        assignedUserId: assignedUser?.id,
        departmentId: assignedUser?.departmentId ?? deptMap.get("IT")!,
        locationId: locationMap.get("HQ - New York")!,
      },
      update: {},
    });
    assets.push(asset);
  }
  console.log(`Assets ready: ${assets.length}`);

  // -------------------------------------------------------------------
  // Knowledge base
  // -------------------------------------------------------------------
  let kbCount = 0;
  for (const article of KB_ARTICLES) {
    const slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const publishedAt = faker.date.past({ years: 1 });
    await prisma.knowledgeArticle.upsert({
      where: { slug },
      create: {
        title: article.title,
        slug,
        content: article.content,
        tagsCsv: article.tags.join(","),
        status: "published",
        categoryId: kbCategoryMap.get(article.category)!,
        authorId: faker.helpers.arrayElement([admin, technician]).id,
        viewCount: faker.number.int({ min: 20, max: 800 }),
        helpfulCount: faker.number.int({ min: 5, max: 200 }),
        notHelpfulCount: faker.number.int({ min: 0, max: 20 }),
        publishedAt,
      },
      update: {},
    });
    kbCount++;
  }
  console.log(`Knowledge base articles ready: ${kbCount}`);

  // -------------------------------------------------------------------
  // Tickets
  // -------------------------------------------------------------------
  const priorityList = PRIORITIES;
  const categoryEntries = Object.entries(CATEGORIES);
  const year = new Date().getFullYear();
  const contactMethods = ["email", "phone", "chat"];
  const pendingReasons = ["waiting_for_user", "waiting_for_vendor", "waiting_for_approval", "waiting_for_hardware", "other"];

  let ticketsCreated = 0;
  for (let i = 0; i < 30; i++) {
    const requester = faker.helpers.arrayElement(employees);
    const [categoryName, subs] = faker.helpers.arrayElement(categoryEntries);
    const subName = faker.helpers.arrayElement(subs);
    const priority = faker.helpers.arrayElement(priorityList);
    const priorityInfo = priorityMap.get(priority.name)!;

    // Distribute statuses realistically: fewer New/Critical-open, more resolved/closed history
    const statusRoll = faker.number.int({ min: 0, max: 99 });
    let statusName: string;
    if (statusRoll < 10) statusName = "New";
    else if (statusRoll < 25) statusName = "Open";
    else if (statusRoll < 45) statusName = "In Progress";
    else if (statusRoll < 55) statusName = "Pending";
    else if (statusRoll < 75) statusName = "Resolved";
    else statusName = "Closed";

    const createdAt = faker.date.recent({ days: 45 });
    const assignedTechnician =
      statusName === "New" && faker.datatype.boolean({ probability: 0.4 })
        ? null
        : faker.helpers.arrayElement(technicians);

    const firstResponseMinutes = priority.firstResponseMinutes;
    const resolutionMinutes = priority.resolutionMinutes;
    const slaFirstResponseDeadline = new Date(createdAt.getTime() + firstResponseMinutes * 60000);
    const slaResolutionDeadline = new Date(createdAt.getTime() + resolutionMinutes * 60000);

    const isResolvedOrClosed = statusName === "Resolved" || statusName === "Closed";
    const resolvedAt = isResolvedOrClosed
      ? faker.date.soon({ days: 3, refDate: createdAt })
      : null;
    const closedAt = statusName === "Closed" && resolvedAt
      ? faker.date.soon({ days: 2, refDate: resolvedAt })
      : null;
    const firstRespondedAt = assignedTechnician
      ? faker.date.soon({ days: 1, refDate: createdAt })
      : null;

    const slaFirstResponseBreached = firstRespondedAt ? firstRespondedAt > slaFirstResponseDeadline : (!isResolvedOrClosed && new Date() > slaFirstResponseDeadline);
    const slaResolutionBreached = resolvedAt
      ? resolvedAt > slaResolutionDeadline
      : (!isResolvedOrClosed && new Date() > slaResolutionDeadline);

    const ticketNumber = await nextTicketNumber(year);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        subject: `${subName} issue - ${faker.hacker.phrase()}`.slice(0, 120),
        description: faker.lorem.paragraphs(2),
        requesterId: requester.id,
        departmentId: requester.departmentId,
        locationId: requester.locationId,
        categoryId: categoryMap.get(categoryName)!,
        subcategoryId: subcategoryMap.get(`${categoryName}::${subName}`)!,
        priorityId: priorityInfo.id,
        statusId: statusMap.get(statusName)!,
        assignedTechnicianId: assignedTechnician?.id,
        assetId: faker.datatype.boolean({ probability: 0.3 }) ? faker.helpers.arrayElement(assets).id : null,
        preferredContactMethod: faker.helpers.arrayElement(contactMethods),
        pendingReason: statusName === "Pending" ? faker.helpers.arrayElement(pendingReasons) : null,
        slaFirstResponseDeadline,
        slaResolutionDeadline,
        firstRespondedAt,
        slaFirstResponseBreached,
        slaResolutionBreached,
        resolvedAt,
        closedAt,
        createdAt,
        updatedAt: closedAt ?? resolvedAt ?? firstRespondedAt ?? createdAt,
      },
    });

    // Ticket history: creation event
    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        userId: requester.id,
        action: "created",
        newValue: "New",
        createdAt,
      },
    });

    if (assignedTechnician) {
      await prisma.ticketAssignment.create({
        data: {
          ticketId: ticket.id,
          technicianId: assignedTechnician.id,
          assignedById: admin.id,
          assignedAt: firstRespondedAt ?? createdAt,
        },
      });
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          userId: admin.id,
          action: "assigned",
          field: "assignedTechnicianId",
          newValue: `${assignedTechnician.firstName} ${assignedTechnician.lastName}`,
          createdAt: firstRespondedAt ?? createdAt,
        },
      });

      // A technician reply
      const reply = await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: assignedTechnician.id,
          body: faker.lorem.sentences(2),
          isInternal: false,
          createdAt: firstRespondedAt ?? createdAt,
        },
      });
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          userId: assignedTechnician.id,
          action: "replied",
          createdAt: reply.createdAt,
        },
      });

      // Occasional internal note
      if (faker.datatype.boolean({ probability: 0.4 })) {
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            authorId: assignedTechnician.id,
            body: faker.lorem.sentence(),
            isInternal: true,
            createdAt: reply.createdAt,
          },
        });
      }
    }

    if (statusName !== "New") {
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          userId: assignedTechnician?.id ?? admin.id,
          action: "status_changed",
          field: "status",
          oldValue: "New",
          newValue: statusName,
          createdAt: ticket.updatedAt,
        },
      });
    }

    if (isResolvedOrClosed) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: assignedTechnician?.id ?? technician.id,
          body: "Issue has been resolved. Please let us know if you need further assistance.",
          isInternal: false,
          createdAt: resolvedAt!,
        },
      });
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          userId: assignedTechnician?.id ?? technician.id,
          action: "resolved",
          createdAt: resolvedAt!,
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: assignedTechnician?.id ?? technician.id,
          action: "ticket_resolved",
          entityType: "Ticket",
          entityId: ticket.id,
          newValue: "Resolved",
          createdAt: resolvedAt!,
        },
      });
    }

    if (statusName === "Closed" && closedAt) {
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          userId: admin.id,
          action: "closed",
          createdAt: closedAt,
        },
      });
    }

    // Notifications for the requester and technician
    await prisma.notification.create({
      data: {
        userId: requester.id,
        type: "ticket_created",
        title: "Ticket created",
        message: `Your ticket ${ticket.ticketNumber} has been created.`,
        entityType: "ticket",
        entityId: ticket.id,
        isRead: faker.datatype.boolean(),
        createdAt,
      },
    });
    if (assignedTechnician) {
      await prisma.notification.create({
        data: {
          userId: assignedTechnician.id,
          type: "ticket_assigned",
          title: "Ticket assigned to you",
          message: `Ticket ${ticket.ticketNumber} has been assigned to you.`,
          entityType: "ticket",
          entityId: ticket.id,
          isRead: faker.datatype.boolean(),
          createdAt: firstRespondedAt ?? createdAt,
        },
      });
      await prisma.notification.create({
        data: {
          userId: requester.id,
          type: "technician_reply",
          title: "New reply on your ticket",
          message: `${assignedTechnician.firstName} replied to ${ticket.ticketNumber}.`,
          entityType: "ticket",
          entityId: ticket.id,
          isRead: faker.datatype.boolean(),
          createdAt: firstRespondedAt ?? createdAt,
        },
      });
    }
    if (slaResolutionBreached) {
      await prisma.notification.create({
        data: {
          userId: assignedTechnician?.id ?? admin.id,
          type: "sla_breached",
          title: "SLA breached",
          message: `Ticket ${ticket.ticketNumber} has breached its resolution SLA.`,
          entityType: "ticket",
          entityId: ticket.id,
          isRead: false,
          createdAt: slaResolutionDeadline,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: requester.id,
        action: "ticket_created",
        entityType: "Ticket",
        entityId: ticket.id,
        newValue: ticket.ticketNumber,
        createdAt,
      },
    });

    ticketsCreated++;
  }
  console.log(`Tickets ready: ${ticketsCreated}`);

  // -------------------------------------------------------------------
  // System settings
  // -------------------------------------------------------------------
  await prisma.systemSetting.upsert({
    where: { key: "company_name" },
    create: { key: "company_name", value: "Acme Corporation", description: "Displayed in the app header and emails" },
    update: {},
  });
  await prisma.systemSetting.upsert({
    where: { key: "ticket_id_prefix" },
    create: { key: "ticket_id_prefix", value: "HD", description: "Prefix used when generating ticket numbers" },
    update: {},
  });

  console.log("Seed complete.");
  console.log("--------------------------------------------------");
  console.log("Demo accounts (password for all): " + DEMO_PASSWORD);
  console.log("  Administrator: admin@helpdesk.local");
  console.log("  Technician:    technician@helpdesk.local");
  console.log("  Manager:       manager@helpdesk.local");
  console.log("  Employee:      employee@helpdesk.local");
  console.log("--------------------------------------------------");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
