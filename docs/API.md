# HelpDesk Pro API Reference

Base URL: `http://localhost:4000/api` (local) or your deployed API's `/api` path.

All endpoints except `POST /auth/login` and `POST /auth/refresh` require an
`Authorization: Bearer <accessToken>` header. Tokens are obtained from
`POST /auth/login` and expire after 15 minutes; use `POST /auth/refresh`
with the refresh token to get a new access token.

Responses are JSON. Errors return `{ "error": "message", "details"?: ... }`
with an appropriate HTTP status code (400/401/403/404/409/500).

List endpoints accept `page` and `pageSize` query params and return
`{ data: [...], total, page, pageSize }`.

## Auth

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` -> `{ accessToken, refreshToken, user }` | none |
| POST | `/auth/refresh` | `{ refreshToken }` -> `{ accessToken }` | none |
| POST | `/auth/logout` | `{ refreshToken }` -> revokes it | none |
| GET | `/auth/me` | Current user profile | any |

## Tickets

| Method | Path | Description | Role |
|---|---|---|---|
| GET | `/tickets` | List/search/filter. Query: `search, statusId, priorityId, categoryId, departmentId, assignedTechnicianId, assignee=me, unassigned=1, mine=1, sla=healthy|at_risk|breached, sort=newest|oldest|priority|sla` | any (Employees see only their own) |
| POST | `/tickets` | Create (multipart form, field `attachments` for files) | any |
| GET | `/tickets/:id` | Detail incl. computed SLA | any (own ticket for Employees) |
| GET | `/tickets/:id/history` | Audit-style timeline | any |
| GET | `/tickets/:id/comments` | Replies (+ internal notes for staff) | any |
| POST | `/tickets/:id/comments` | `{ body, isInternal }` (multipart) | any (internal notes: staff only) |
| GET | `/tickets/:id/attachments/:attachmentId` | Download a file | any |
| POST | `/tickets/:id/assign` | `{ technicianId }` | Technician/Manager/Administrator |
| POST | `/tickets/:id/status` | `{ statusId, pendingReason?, comment? }` | Technician/Manager/Administrator |
| POST | `/tickets/:id/priority` | `{ priorityId }` | Technician/Manager/Administrator |
| POST | `/tickets/:id/escalate` | `{ note? }` - bumps priority, notifies admins | Technician/Manager/Administrator |
| POST | `/tickets/:id/resolve` | `{ comment? }` | Technician/Manager/Administrator |
| POST | `/tickets/:id/close` | | Technician/Manager/Administrator |
| POST | `/tickets/:id/reopen` | `{ comment? }` | Technician/Manager/Administrator |

## Users

| Method | Path | Description | Role |
|---|---|---|---|
| GET | `/users` | List/search/filter (`search, role, departmentId, status`) | Administrator |
| GET | `/users/technicians` | Lightweight directory for assign dropdowns | any |
| POST | `/users` | Create user | Administrator |
| GET | `/users/:id` | Profile | self or Administrator |
| PUT | `/users/:id` | Update role/department/status/etc | Administrator |
| POST | `/users/:id/disable` / `/enable` | | Administrator |
| POST | `/users/:id/reset-password` | `{ password }` | Administrator |

## Departments / Locations / Categories

`GET/POST /departments`, `PUT/DELETE /departments/:id` (Administrator writes).
`GET/POST /locations`, `PUT/DELETE /locations/:id` (Administrator writes).
`GET/POST /categories`, `PUT/DELETE /categories/:id`,
`POST /categories/subcategories`, `DELETE /categories/subcategories/:id`
(Administrator writes).

## Priorities, Statuses & SLA

- `GET /priorities` - includes each priority's `slaPolicy`.
- `PUT /priorities/:id` - update display color (Administrator).
- `PUT /priorities/:id/sla-policy` - `{ firstResponseMinutes, resolutionMinutes, businessHoursOnly }` (Administrator).
- `GET /statuses` - read-only fixed workflow (New -> Open -> In Progress -> Pending -> Resolved -> Closed -> Reopened).

## Assets

| Method | Path | Description | Role |
|---|---|---|---|
| GET | `/assets` | List/search/filter (`search, status, assetTypeId, assignedUserId`) | any (Employees see only their own) |
| GET | `/assets/types` | Asset type list | any |
| GET | `/assets/:id` | Detail incl. linked tickets | any |
| POST | `/assets` | Create | Technician/Administrator |
| PUT | `/assets/:id` | Update | Technician/Administrator |
| POST | `/assets/:id/assign` | `{ userId: string \| null }` | Technician/Administrator |
| DELETE | `/assets/:id` | | Technician/Administrator |

## Knowledge Base

| Method | Path | Description | Role |
|---|---|---|---|
| GET | `/knowledge-base` | List/search (`search, categoryId, status, tag`); Employees see published only | any |
| GET | `/knowledge-base/categories` | | any |
| GET | `/knowledge-base/:idOrSlug` | Detail (increments view count) | any |
| POST | `/knowledge-base` | `{ title, content, categoryId, tags[], status }` | Technician/Administrator |
| PUT | `/knowledge-base/:id` | | Technician/Administrator |
| DELETE | `/knowledge-base/:id` | | Technician/Administrator |
| POST | `/knowledge-base/:id/vote` | `{ helpful: boolean }` | any |

## Notifications

`GET /notifications` (last 50), `GET /notifications/unread-count`,
`POST /notifications/:id/read`, `POST /notifications/read-all`.

## Reports

All require Technician/Manager/Administrator.

`GET /reports/summary`, `/tickets-by-priority`, `/tickets-by-category`,
`/tickets-by-department`, `/tickets-over-time?days=30`,
`/resolution-time-trend?days=30`, `/technician-workload`,
`/sla-compliance`, `/aging`, `/monthly-volume?months=6`.

CSV export: `GET /reports/export.csv?type=aging|tickets-by-priority|tickets-by-category|tickets-by-department|technician-workload`.

## Audit Logs

`GET /audit-logs` (`search, entityType, userId, action`) - Administrator only.

## System Settings

`GET /settings` (any authenticated user), `PUT /settings/:key` - `{ value }` (Administrator).

## Health check

`GET /health` (outside `/api`, no auth) - `{ status: "ok", timestamp }`.
