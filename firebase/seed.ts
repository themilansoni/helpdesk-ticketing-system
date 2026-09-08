// Seeds demo data into Firestore + Firebase Auth. Run locally by a
// developer with their own service account key (never in CI, never
// committed) - see docs/DEPLOYMENT.md for how to get one.
//
//   npm run seed:firebase -- /path/to/serviceAccountKey.json
//
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { faker } from "@faker-js/faker";
import {
  DEPARTMENTS,
  LOCATIONS,
  PRIORITIES,
  CATEGORIES,
  ASSET_TYPES,
  KB_CATEGORIES,
  KB_ARTICLES,
  FIRST_NAMES,
  LAST_NAMES,
} from "./seed-data";

const DEMO_PASSWORD = "Passw0rd!123";

const keyPath = process.argv[2];
if (!keyPath) {
  console.error("Usage: node --import tsx firebase/seed.ts /path/to/serviceAccountKey.json");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const auth = getAuth();
const db = getFirestore();

async function upsertAuthUser(email: string, password: string, displayName: string) {
  try {
    const existing = await auth.getUserByEmail(email);
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email, password, displayName, emailVerified: true });
    return created.uid;
  }
}

interface SeededUser {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  role: string;
  departmentId: string;
  departmentName: string;
  locationId: string;
  locationName: string;
}

async function createUserDoc(
  data: {
    email: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    role: string;
    departmentId: string;
    departmentName: string;
    locationId: string;
    locationName: string;
    managerId?: string | null;
    jobTitle?: string;
    phone?: string;
  }
): Promise<SeededUser> {
  const uid = await upsertAuthUser(data.email, DEMO_PASSWORD, `${data.firstName} ${data.lastName}`);
  await db.collection("users").doc(uid).set(
    {
      employeeId: data.employeeId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      jobTitle: data.jobTitle ?? null,
      role: data.role,
      status: "active",
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      locationId: data.locationId,
      locationName: data.locationName,
      managerId: data.managerId ?? null,
      lastLoginAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { uid, ...data, departmentId: data.departmentId, departmentName: data.departmentName, locationId: data.locationId, locationName: data.locationName };
}

async function addRef(collection: string, data: Record<string, unknown>): Promise<string> {
  const ref = await db.collection(collection).add(data);
  return ref.id;
}

async function main() {
  console.log("Seeding HelpDesk Pro demo data into Firestore...");

  // ---- Reference data ----
  const deptMap = new Map<string, string>();
  for (const d of DEPARTMENTS) deptMap.set(d.name, await addRef("departments", d));

  const locationMap = new Map<string, string>();
  for (const l of LOCATIONS) locationMap.set(l.name, await addRef("locations", l));

  const priorityMap = new Map<string, { id: string; level: number }>();
  for (const p of PRIORITIES) {
    const id = await addRef("priorities", {
      name: p.name,
      level: p.level,
      colorHex: p.colorHex,
      slaPolicy: { firstResponseMinutes: p.firstResponseMinutes, resolutionMinutes: p.resolutionMinutes, businessHoursOnly: false },
    });
    priorityMap.set(p.name, { id, level: p.level });
  }

  const categoryMap = new Map<string, string>();
  const subcategoryMap = new Map<string, string>();
  for (const [categoryName, subs] of Object.entries(CATEGORIES)) {
    const categoryId = await addRef("ticketCategories", { name: categoryName, description: null });
    categoryMap.set(categoryName, categoryId);
    for (const subName of subs) {
      const subId = await addRef("ticketSubcategories", { name: subName, categoryId, categoryName });
      subcategoryMap.set(`${categoryName}::${subName}`, subId);
    }
  }

  const assetTypeMap = new Map<string, string>();
  for (const name of ASSET_TYPES) assetTypeMap.set(name, await addRef("assetTypes", { name }));

  const kbCategoryMap = new Map<string, string>();
  for (const name of KB_CATEGORIES) kbCategoryMap.set(name, await addRef("knowledgeCategories", { name, description: null }));

  console.log("Reference data ready.");

  // ---- Users ----
  const admin = await createUserDoc({
    email: "admin@helpdesk.local",
    firstName: "Ava",
    lastName: "Administrator",
    employeeId: "EMP-0001",
    role: "Administrator",
    departmentId: deptMap.get("IT")!,
    departmentName: "IT",
    locationId: locationMap.get("HQ - New York")!,
    locationName: "HQ - New York",
    jobTitle: "IT Systems Administrator",
  });

  const technician = await createUserDoc({
    email: "technician@helpdesk.local",
    firstName: "Tom",
    lastName: "Technician",
    employeeId: "EMP-0002",
    role: "Technician",
    departmentId: deptMap.get("IT")!,
    departmentName: "IT",
    locationId: locationMap.get("HQ - New York")!,
    locationName: "HQ - New York",
    jobTitle: "IT Support Specialist",
  });

  const manager = await createUserDoc({
    email: "manager@helpdesk.local",
    firstName: "Maria",
    lastName: "Manager",
    employeeId: "EMP-0003",
    role: "Manager",
    departmentId: deptMap.get("Operations")!,
    departmentName: "Operations",
    locationId: locationMap.get("HQ - New York")!,
    locationName: "HQ - New York",
    jobTitle: "Operations Manager",
  });

  const employee = await createUserDoc({
    email: "employee@helpdesk.local",
    firstName: "Emma",
    lastName: "Employee",
    employeeId: "EMP-0004",
    role: "Employee",
    departmentId: deptMap.get("Sales")!,
    departmentName: "Sales",
    locationId: locationMap.get("HQ - New York")!,
    locationName: "HQ - New York",
    managerId: manager.uid,
    jobTitle: "Sales Associate",
  });

  const technicians = [technician];
  const technicianNames: Array<[string, string]> = [["Nina", "Ortiz"], ["Leo", "Fischer"], ["Grace", "Park"]];
  for (let i = 0; i < technicianNames.length; i++) {
    const [firstName, lastName] = technicianNames[i]!;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@helpdesk.local`;
    technicians.push(
      await createUserDoc({
        email,
        firstName,
        lastName,
        employeeId: `EMP-00${10 + i}`,
        role: "Technician",
        departmentId: deptMap.get("IT")!,
        departmentName: "IT",
        locationId: locationMap.get("HQ - New York")!,
        locationName: "HQ - New York",
        jobTitle: "IT Support Specialist",
      })
    );
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
    employees.push(
      await createUserDoc({
        email,
        firstName,
        lastName,
        employeeId: `EMP-${String(empCounter++).padStart(4, "0")}`,
        role: "Employee",
        departmentId: deptMap.get(dept)!,
        departmentName: dept,
        locationId: locationMap.get(loc)!,
        locationName: loc,
        managerId: manager.uid,
        jobTitle: faker.person.jobTitle(),
        phone: faker.phone.number({ style: "national" }),
      })
    );
  }

  console.log(`Users ready: 1 admin, ${technicians.length} technicians, 1 manager, ${employees.length} employees`);

  // ---- Assets ----
  const assetStatuses = ["available", "assigned", "in_repair", "retired", "lost"];
  const assets: Array<{ id: string; assetTag: string; model: string }> = [];
  for (let i = 0; i < 10; i++) {
    const typeName = ASSET_TYPES[i % ASSET_TYPES.length]!;
    const status = i < 6 ? "assigned" : assetStatuses[i % assetStatuses.length]!;
    const assignedUser = status === "assigned" ? employees[i % employees.length] : null;
    const purchaseDate = faker.date.past({ years: 3 }).toISOString();
    const model = faker.commerce.productName();
    const assetTag = `AST-${1000 + i}`;
    const id = await addRef("assets", {
      assetTag,
      serialNumber: faker.string.alphanumeric(12).toUpperCase(),
      assetTypeId: assetTypeMap.get(typeName)!,
      assetTypeName: typeName,
      manufacturer: faker.helpers.arrayElement(["Dell", "HP", "Lenovo", "Apple", "Cisco", "Logitech"]),
      model,
      purchaseDate,
      warrantyExpiry: faker.date.future({ years: 2, refDate: purchaseDate }).toISOString(),
      status,
      assignedUserId: assignedUser?.uid ?? null,
      assignedUserFirstName: assignedUser?.firstName ?? null,
      assignedUserLastName: assignedUser?.lastName ?? null,
      assignedUserEmail: assignedUser?.email ?? null,
      departmentId: assignedUser?.departmentId ?? deptMap.get("IT")!,
      departmentName: assignedUser?.departmentName ?? "IT",
      locationId: locationMap.get("HQ - New York")!,
      locationName: "HQ - New York",
      notes: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    assets.push({ id, assetTag, model });
  }
  console.log(`Assets ready: ${assets.length}`);

  // ---- Knowledge base ----
  for (const article of KB_ARTICLES) {
    const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const author = faker.helpers.arrayElement([admin, technician]);
    await addRef("knowledgeArticles", {
      title: article.title,
      slug,
      content: article.content,
      tagsCsv: article.tags.join(","),
      status: "published",
      categoryId: kbCategoryMap.get(article.category)!,
      categoryName: article.category,
      authorId: author.uid,
      authorFirstName: author.firstName,
      authorLastName: author.lastName,
      viewCount: faker.number.int({ min: 20, max: 800 }),
      helpfulCount: faker.number.int({ min: 5, max: 200 }),
      notHelpfulCount: faker.number.int({ min: 0, max: 20 }),
      publishedAt: faker.date.past({ years: 1 }).toISOString(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  console.log(`Knowledge base articles ready: ${KB_ARTICLES.length}`);

  // ---- Tickets ----
  const categoryEntries = Object.entries(CATEGORIES);
  const year = new Date().getFullYear();
  const contactMethods = ["email", "phone", "chat"];
  const pendingReasons = ["waiting_for_user", "waiting_for_vendor", "waiting_for_approval", "waiting_for_hardware", "other"];
  let ticketSeq = 0;

  for (let i = 0; i < 30; i++) {
    const requester = faker.helpers.arrayElement(employees);
    const [categoryName, subs] = faker.helpers.arrayElement(categoryEntries);
    const subName = faker.helpers.arrayElement(subs);
    const priority = faker.helpers.arrayElement(PRIORITIES);
    const priorityInfo = priorityMap.get(priority.name)!;

    const statusRoll = faker.number.int({ min: 0, max: 99 });
    let status: string;
    if (statusRoll < 10) status = "New";
    else if (statusRoll < 25) status = "Open";
    else if (statusRoll < 45) status = "In Progress";
    else if (statusRoll < 55) status = "Pending";
    else if (statusRoll < 75) status = "Resolved";
    else status = "Closed";

    const createdAt = faker.date.recent({ days: 45 });
    const assignedTechnician = status === "New" && faker.datatype.boolean({ probability: 0.4 }) ? null : faker.helpers.arrayElement(technicians);

    const slaFirstResponseDeadline = new Date(createdAt.getTime() + priority.firstResponseMinutes * 60000);
    const slaResolutionDeadline = new Date(createdAt.getTime() + priority.resolutionMinutes * 60000);
    const isResolvedOrClosed = status === "Resolved" || status === "Closed";
    const resolvedAt = isResolvedOrClosed ? faker.date.soon({ days: 3, refDate: createdAt }) : null;
    const closedAt = status === "Closed" && resolvedAt ? faker.date.soon({ days: 2, refDate: resolvedAt }) : null;
    const firstRespondedAt = assignedTechnician ? faker.date.soon({ days: 1, refDate: createdAt }) : null;

    ticketSeq++;
    const ticketNumber = `HD-${year}-${String(ticketSeq).padStart(6, "0")}`;
    const asset = faker.datatype.boolean({ probability: 0.3 }) ? faker.helpers.arrayElement(assets) : null;

    const ticketRef = await db.collection("tickets").add({
      ticketNumber,
      subject: `${subName} issue - ${faker.hacker.phrase()}`.slice(0, 120),
      description: faker.lorem.paragraphs(2),
      requesterId: requester.uid,
      requesterFirstName: requester.firstName,
      requesterLastName: requester.lastName,
      requesterEmail: requester.email,
      requesterEmployeeId: requester.employeeId,
      departmentId: requester.departmentId,
      departmentName: requester.departmentName,
      locationId: requester.locationId,
      locationName: requester.locationName,
      categoryId: categoryMap.get(categoryName)!,
      categoryName,
      subcategoryId: subcategoryMap.get(`${categoryName}::${subName}`)!,
      subcategoryName: subName,
      priorityId: priorityInfo.id,
      priorityName: priority.name,
      priorityLevel: priority.level,
      priorityColor: priority.colorHex,
      status,
      assignedTechnicianId: assignedTechnician?.uid ?? null,
      assignedTechnicianFirstName: assignedTechnician?.firstName ?? null,
      assignedTechnicianLastName: assignedTechnician?.lastName ?? null,
      assignedTechnicianEmail: assignedTechnician?.email ?? null,
      assetId: asset?.id ?? null,
      assetTag: asset?.assetTag ?? null,
      assetModel: asset?.model ?? null,
      preferredContactMethod: faker.helpers.arrayElement(contactMethods),
      pendingReason: status === "Pending" ? faker.helpers.arrayElement(pendingReasons) : null,
      slaFirstResponseDeadline: slaFirstResponseDeadline.toISOString(),
      slaResolutionDeadline: slaResolutionDeadline.toISOString(),
      firstRespondedAt: firstRespondedAt?.toISOString() ?? null,
      resolvedAt: resolvedAt?.toISOString() ?? null,
      closedAt: closedAt?.toISOString() ?? null,
      reopenedCount: 0,
      attachments: [],
      createdAt,
      updatedAt: closedAt ?? resolvedAt ?? firstRespondedAt ?? createdAt,
    });

    await db.collection("ticketHistory").add({
      ticketId: ticketRef.id,
      userId: requester.uid,
      userName: `${requester.firstName} ${requester.lastName}`,
      action: "created",
      field: null,
      oldValue: null,
      newValue: "New",
      createdAt,
    });

    if (assignedTechnician) {
      await db.collection("ticketHistory").add({
        ticketId: ticketRef.id,
        userId: admin.uid,
        userName: `${admin.firstName} ${admin.lastName}`,
        action: "assigned",
        field: "assignedTechnicianId",
        oldValue: null,
        newValue: `${assignedTechnician.firstName} ${assignedTechnician.lastName}`,
        createdAt: firstRespondedAt ?? createdAt,
      });

      await db.collection("ticketComments").add({
        ticketId: ticketRef.id,
        authorId: assignedTechnician.uid,
        authorFirstName: assignedTechnician.firstName,
        authorLastName: assignedTechnician.lastName,
        authorEmail: assignedTechnician.email,
        body: faker.lorem.sentences(2),
        attachments: [],
        createdAt: firstRespondedAt ?? createdAt,
      });
      await db.collection("ticketHistory").add({
        ticketId: ticketRef.id,
        userId: assignedTechnician.uid,
        userName: `${assignedTechnician.firstName} ${assignedTechnician.lastName}`,
        action: "replied",
        field: null,
        oldValue: null,
        newValue: null,
        createdAt: firstRespondedAt ?? createdAt,
      });

      if (faker.datatype.boolean({ probability: 0.4 })) {
        await db.collection("ticketNotes").add({
          ticketId: ticketRef.id,
          authorId: assignedTechnician.uid,
          authorFirstName: assignedTechnician.firstName,
          authorLastName: assignedTechnician.lastName,
          body: faker.lorem.sentence(),
          createdAt: firstRespondedAt ?? createdAt,
        });
      }
    }

    if (status !== "New") {
      await db.collection("ticketHistory").add({
        ticketId: ticketRef.id,
        userId: assignedTechnician?.uid ?? admin.uid,
        userName: assignedTechnician ? `${assignedTechnician.firstName} ${assignedTechnician.lastName}` : `${admin.firstName} ${admin.lastName}`,
        action: "status_changed",
        field: "status",
        oldValue: "New",
        newValue: status,
        createdAt: new Date(closedAt ?? resolvedAt ?? firstRespondedAt ?? createdAt),
      });
    }

    if (isResolvedOrClosed) {
      const resolver = assignedTechnician ?? technician;
      await db.collection("ticketComments").add({
        ticketId: ticketRef.id,
        authorId: resolver.uid,
        authorFirstName: resolver.firstName,
        authorLastName: resolver.lastName,
        authorEmail: resolver.email,
        body: "Issue has been resolved. Please let us know if you need further assistance.",
        attachments: [],
        createdAt: resolvedAt!,
      });
      await db.collection("ticketHistory").add({
        ticketId: ticketRef.id,
        userId: resolver.uid,
        userName: `${resolver.firstName} ${resolver.lastName}`,
        action: "resolved",
        field: null,
        oldValue: null,
        newValue: null,
        createdAt: resolvedAt!,
      });
      await db.collection("auditLogs").add({
        userId: resolver.uid,
        action: "ticket_resolved",
        entityType: "Ticket",
        entityId: ticketRef.id,
        previousValue: null,
        newValue: "Resolved",
        createdAt: resolvedAt!,
      });
    }

    if (status === "Closed" && closedAt) {
      await db.collection("ticketHistory").add({
        ticketId: ticketRef.id,
        userId: admin.uid,
        userName: `${admin.firstName} ${admin.lastName}`,
        action: "closed",
        field: null,
        oldValue: null,
        newValue: null,
        createdAt: closedAt,
      });
    }

    await db.collection("notifications").add({
      userId: requester.uid,
      type: "ticket_created",
      title: "Ticket created",
      message: `Your ticket ${ticketNumber} has been created.`,
      entityType: "ticket",
      entityId: ticketRef.id,
      isRead: faker.datatype.boolean(),
      createdAt,
    });
    if (assignedTechnician) {
      await db.collection("notifications").add({
        userId: assignedTechnician.uid,
        type: "ticket_assigned",
        title: "Ticket assigned to you",
        message: `Ticket ${ticketNumber} has been assigned to you.`,
        entityType: "ticket",
        entityId: ticketRef.id,
        isRead: faker.datatype.boolean(),
        createdAt: firstRespondedAt ?? createdAt,
      });
      await db.collection("notifications").add({
        userId: requester.uid,
        type: "technician_reply",
        title: "New reply on your ticket",
        message: `${assignedTechnician.firstName} replied to ${ticketNumber}.`,
        entityType: "ticket",
        entityId: ticketRef.id,
        isRead: faker.datatype.boolean(),
        createdAt: firstRespondedAt ?? createdAt,
      });
    }

    await db.collection("auditLogs").add({
      userId: requester.uid,
      action: "ticket_created",
      entityType: "Ticket",
      entityId: ticketRef.id,
      previousValue: null,
      newValue: ticketNumber,
      createdAt,
    });
  }
  console.log(`Tickets ready: ${ticketSeq}`);

  // ---- Counter (so client-created tickets continue the sequence) ----
  await db.collection("counters").doc(`ticket_number_${year}`).set({ value: ticketSeq });

  // ---- System settings ----
  await db.collection("systemSettings").doc("company_name").set({ key: "company_name", value: "Acme Corporation", description: "Displayed in the app header" }, { merge: true });
  await db.collection("systemSettings").doc("ticket_id_prefix").set({ key: "ticket_id_prefix", value: "HD", description: "Prefix used when generating ticket numbers" }, { merge: true });

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
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
