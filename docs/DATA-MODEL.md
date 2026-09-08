# Firestore Data Model

HelpDesk Pro has no REST API - the frontend reads/writes Firestore
directly through the functions in `apps/web/src/lib/db/` (one module per
domain). This document is the closest equivalent to an API reference:
every collection, its shape, and which `db/` function reads/writes it.

Documents are **denormalized** (e.g. a ticket stores the requester's name
and category name directly) since Firestore has no joins - this trades a
little write-time bookkeeping for cheap, index-free reads.

Fixed-choice fields that would be lookup tables in a relational schema -
`role`, ticket `status` - are plain strings validated against TypeScript
union types in `packages/shared/src/constants.ts`, not their own
collection (see `STATUS_TRANSITIONS` and `STATUS_META` there for the
ticket workflow).

## Collections

| Collection | Shape | Read/write via |
|---|---|---|
| `departments` | `{ name, description }` | `lib/db/referenceData.ts` |
| `locations` | `{ name, address, city, country }` | `lib/db/referenceData.ts` |
| `ticketCategories` | `{ name, description }` | `lib/db/referenceData.ts` |
| `ticketSubcategories` | `{ name, categoryId, categoryName }` | `lib/db/referenceData.ts` |
| `assetTypes` | `{ name }` | `lib/db/referenceData.ts` |
| `knowledgeCategories` | `{ name, description }` | `lib/db/referenceData.ts` |
| `priorities` | `{ name, level, colorHex, slaPolicy: { firstResponseMinutes, resolutionMinutes, businessHoursOnly } }` | `lib/db/referenceData.ts` |
| `systemSettings/{key}` | `{ key, value, description }` | `lib/db/referenceData.ts` |
| `counters/{key}` | `{ value }` - atomic ticket-number sequence, incremented via `runTransaction` | `lib/db/tickets.ts` (`nextTicketNumber`) |
| `users/{uid}` | Firestore doc ID **is** the Firebase Auth UID. `{ employeeId, firstName, lastName, email, phone, jobTitle, role, status, departmentId, departmentName, locationId, locationName, managerId, lastLoginAt, createdAt, updatedAt }` | `lib/db/users.ts`, `lib/auth.tsx` |
| `tickets/{id}` | Denormalized ticket incl. requester/category/priority/technician names, SLA deadlines (ISO strings), `status`, `attachments: TicketAttachmentMeta[]` | `lib/db/tickets.ts` |
| `ticketComments/{id}` | Employee-visible replies: `{ ticketId, authorId, authorFirstName, authorLastName, authorEmail, body, attachments, createdAt }` | `lib/db/tickets.ts` |
| `ticketNotes/{id}` | Staff-only internal notes (separate collection so employees structurally cannot read them - see `firestore.rules`): `{ ticketId, authorId, authorFirstName, authorLastName, body, createdAt }` | `lib/db/tickets.ts` |
| `ticketHistory/{id}` | Audit-style timeline entry: `{ ticketId, userId, userName, action, field, oldValue, newValue, createdAt }` | `lib/db/tickets.ts` |
| `assets/{id}` | `{ assetTag, serialNumber, assetTypeId, assetTypeName, manufacturer, model, purchaseDate, warrantyExpiry, status, assignedUserId, assignedUser*, departmentId, departmentName, locationId, locationName, notes }` | `lib/db/assets.ts` |
| `knowledgeArticles/{id}` | `{ title, slug, content, tagsCsv, status, categoryId, categoryName, authorId, author*, viewCount, helpfulCount, notHelpfulCount, publishedAt }` | `lib/db/knowledgeBase.ts` |
| `notifications/{id}` | `{ userId, type, title, message, entityType, entityId, isRead, createdAt }` | `lib/db/notifications.ts` |
| `auditLogs/{id}` | `{ userId, action, entityType, entityId, previousValue, newValue, createdAt }` | `lib/db/auditLogs.ts` |

## Storage

Ticket attachments live at `tickets/{ticketId}/{timestamp}-{random}-{filename}`
in the default Storage bucket, uploaded via `lib/db/storage.ts`
(`uploadTicketAttachment`). Metadata (`fileName`, `storagePath`,
`mimeType`, `sizeBytes`) is embedded directly on the owning ticket or
comment document rather than a separate collection.

## Reports

`lib/db/reports.ts` computes every dashboard/report number **client-side**
by fetching the `tickets` collection (and `users` where needed) and
aggregating in memory - there's no separate reporting collection or
Cloud Function. This is fine at this app's demo scale; a high-volume
deployment would want to move this to scheduled Cloud Functions writing
pre-aggregated summary documents instead.

## Security

See [`firebase/firestore.rules`](../firebase/firestore.rules) and
[`firebase/storage.rules`](../firebase/storage.rules) - every row in the
table above is access-controlled there, not in application code, since
there is no server. The rules are commented inline with which
`packages/shared/src/permissions.ts` permission each one corresponds to.
