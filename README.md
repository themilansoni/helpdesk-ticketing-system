# HelpDesk Pro

**Internal IT Service Management Platform**

A full-stack internal helpdesk and ticketing system: employees submit and
track support tickets, technicians triage/assign/resolve them against
configurable SLAs, and administrators manage users, departments, assets,
the knowledge base, and audit history.

**Live Demo:** https://themilansoni.github.io/helpdesk-ticketing-system/
(frontend only - see [Deployment Status](#deployment-status), the API
isn't deployed yet so login won't complete until it is)
**GitHub Repository:** https://github.com/themilansoni/helpdesk-ticketing-system

---

## 1. Project Overview

HelpDesk Pro covers the full lifecycle of an IT support request:

- **Employees** create tickets, track status, chat with support, browse the
  knowledge base, and see their assigned assets.
- **Technicians** see all tickets, claim/assign work, reply, escalate,
  track SLA breaches, and manage assets and the knowledge base.
- **Managers** get visibility into team tickets and reports.
- **Administrators** configure everything: users, departments, categories,
  priorities, SLA policies, assets, and review the full audit trail.

## 2. Features

- Ticket creation, assignment, status workflow (New -> Open -> In Progress
  -> Pending -> Resolved -> Closed -> Reopened), priority, escalation
- Threaded replies + staff-only internal notes, with file attachments
- Configurable SLA policies per priority with live countdown / healthy /
  at-risk / breached indicators
- Role-based dashboards with charts (status, priority, category,
  department, volume over time, resolution trend, technician workload)
- Asset management, linked to tickets and assigned users
- Knowledge base with categories, tags, publish workflow, and helpful votes
- In-app notifications with unread badge
- Full-text search and multi-field filtering on tickets, users, assets, KB
- CSV report exports
- System-wide audit log of every state-changing action
- Admin configuration for users, departments, categories, priorities/SLA,
  and system settings

## 3. Architecture

```
helpdesk-ticketing-system/
├── apps/
│   ├── web/          React + TypeScript + Vite SPA
│   └── api/           Node + TypeScript + Express REST API
├── packages/
│   ├── database/       Prisma schema, migrations, seed script
│   ├── shared/         Shared types, zod validation, RBAC matrix, SLA math
│   └── config/         Shared lint config
├── docs/                API reference and deployment guide
├── .github/workflows/    CI (typecheck/lint/test/build) and CD (GitHub Pages)
└── docker-compose.yml    Postgres + API + web, for local full-stack runs
```

The frontend never talks to the database directly - it only calls the REST
API, which is the single source of truth for business logic (ticket
workflow, SLA calculation, RBAC, audit logging).

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives, TanStack Query, React Router, Recharts |
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT access + refresh tokens, bcrypt password hashing, RBAC |
| File storage | Pluggable driver: local disk (dev) or S3-compatible (production) |
| Email | Pluggable provider: mock (dev/CI), SMTP, SendGrid, Amazon SES, Microsoft Graph |
| Testing | Vitest + Supertest (API), Vitest + Testing Library (web) |
| CI/CD | GitHub Actions (typecheck/lint/test/build on PR, GitHub Pages deploy on merge) |

## 5. Database

PostgreSQL, modeled with Prisma (`packages/database/prisma/schema.prisma`):
23 tables covering users/roles/departments/locations, the ticket taxonomy
(categories, subcategories, priorities, statuses, SLA policies), tickets
and their comments/attachments/history/assignments, assets, the knowledge
base, notifications, audit logs, and system settings. Fixed-choice fields
(role, status, etc.) are validated as TypeScript union types in
`packages/shared` rather than native DB enums, since several of them
(priorities, statuses, categories) are also admin-editable data.

A committed initial migration lives at
`packages/database/prisma/migrations/20260101000000_init/` and applies
cleanly to a fresh PostgreSQL database via `prisma migrate deploy`.

### Local development without Docker/PostgreSQL

The schema avoids Postgres-only features (native enums, scalar arrays,
`@db.*` native type attributes), so the exact same schema also works
against SQLite - useful for a quick local run with no database server to
install. Toggle the datasource with:

```bash
npm run db:use:sqlite       # for local dev without Docker/Postgres
npm run db:use:postgresql   # switch back before committing / for production
```

This only changes `packages/database/prisma/schema.prisma`'s `provider`
line - do not commit it set to `sqlite`.

## 6. Environment Variables

Copy `.env.example` to `.env` (and to `apps/api/.env` / `packages/database/.env`
as needed - see below) and fill in real values. Full list and comments are
in [`.env.example`](.env.example): database connection, JWT secrets, file
storage driver, and email provider settings.

**Never commit a real `.env` file.**

## 7. Local Development

Prerequisites: Node.js 20+, npm 10+. PostgreSQL only if you're not using
the SQLite fallback below.

```bash
git clone <this-repo-url>
cd helpdesk-ticketing-system
npm install
```

**Option A - fastest, no database server required (SQLite):**

```bash
npm run db:use:sqlite
cp packages/database/.env.example packages/database/.env    # DATABASE_URL="file:./dev.db"
cp apps/api/.env.example apps/api/.env                       # DATABASE_URL="file:./dev.db"
npm run db:generate --workspace=packages/database
npx prisma db push --schema=packages/database/prisma/schema.prisma
npm run db:seed --workspace=packages/database
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:5173 (separate terminal)
```

**Option B - PostgreSQL (matches production):**

```bash
# provider stays "postgresql" (the default in the repo)
# set DATABASE_URL in packages/database/.env and apps/api/.env to your Postgres instance
npm run db:generate --workspace=packages/database
npm run db:migrate --workspace=packages/database   # applies migrations, prompts for a name if schema changed
npm run db:seed --workspace=packages/database
npm run dev:api
npm run dev:web
```

Then open http://localhost:5173 and sign in with one of the
[demo accounts](#demo-accounts).

### Common commands

```bash
npm run build          # build all workspaces
npm run test            # run backend + frontend test suites
npm run typecheck       # typecheck all workspaces
npm run lint             # lint all workspaces
npm run db:studio        # Prisma Studio (visual DB browser)
```

## 8. Docker Setup

```bash
docker compose up --build
```

Starts PostgreSQL, the API (`:4000`), and the web app behind nginx
(`:5173`). After containers are healthy, run migrations and seed once:

```bash
docker compose exec api npm run db:migrate:deploy --workspace=packages/database
docker compose exec api npm run db:seed --workspace=packages/database
```

## 9. Demo Credentials

Seeded by `npm run db:seed --workspace=packages/database`. **Change these
before using this in anything resembling production.**

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@helpdesk.local` | `Passw0rd!123` |
| Technician | `technician@helpdesk.local` | `Passw0rd!123` |
| Manager | `manager@helpdesk.local` | `Passw0rd!123` |
| Employee | `employee@helpdesk.local` | `Passw0rd!123` |

Demo data also includes 4 named technicians, 15 more employees, 10 assets,
15 knowledge base articles, and 30 tickets spanning every status/priority
combination (with comments, history, notifications, and audit log entries)
so the dashboard is populated immediately after installation.

## 10. Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full step-by-step
instructions. Summary:

- **Frontend**: GitHub Pages, automated via `.github/workflows/deploy.yml`
  on every push to `main`. One-time setup: enable Pages with source
  "GitHub Actions" in repo Settings.
- **Backend**: deploy `apps/api` (Dockerfile included) to Render, Railway,
  Fly.io, or any Node/Docker host, with a PostgreSQL database. Point the
  frontend at it via the `VITE_API_BASE_URL` repository variable.
- **Database**: any managed PostgreSQL (the host's own, or Neon/Supabase).

## 11. API Documentation

Full endpoint reference: [docs/API.md](docs/API.md).

## 12. Testing

```bash
npm run test --workspace=apps/api   # auth, ticket lifecycle/RBAC, SLA calculation
npm run test --workspace=apps/web   # login, ticket creation, filtering, detail, role-based nav
```

The API test suite runs against SQLite locally (isolated `test.db`, never
the seeded `dev.db`) and against a real PostgreSQL service container in CI
(`.github/workflows/ci.yml`), so both the portable schema and the
production-matching database are exercised.

## 13. Security Notes

- Passwords hashed with bcrypt; JWT access tokens (15 min) + rotating
  refresh tokens (7 days, revocable, hashed at rest).
- All mutating endpoints enforce RBAC server-side (`packages/shared`'s
  permission matrix is the single source of truth for both API middleware
  and frontend nav/UI gating).
- Input validated with zod on every write endpoint.
- File uploads: MIME-type allowlist, size limits, memory-buffered (never
  written to disk with a client-controlled name).
- `helmet` security headers, CORS restricted to the configured origin,
  request body size limits.
- Known accepted risk: `express@4` pulls in a transitive `qs` advisory
  (moderate, DoS via crafted query strings) with no non-breaking fix
  available; mitigated by the 1MB body size limit and zod validation on
  every route. Tracked as a future improvement (Express 5 migration).

## 14. Accessibility

Semantic HTML, labeled form controls (including `aria-label` on all select
dropdowns), keyboard-operable menus/dialogs/selects (Radix UI primitives),
visible focus states, and sufficient color contrast on status/priority
badges.

## 15. Future Improvements

- Real-time updates (WebSocket/SSE) instead of polling for notifications
- Business-hours-aware SLA calculation (the `businessHoursOnly` flag exists
  on `SlaPolicy` but resolution math is currently wall-clock)
- Saved/shareable ticket filter views
- Bulk ticket actions (multi-select assign/close)
- Express 5 migration to close the `qs` advisory noted above
- E2E browser tests (Playwright) alongside the existing unit/integration suites

## Deployment Status

- Frontend: **LIVE** - https://themilansoni.github.io/helpdesk-ticketing-system/
  (redeploys automatically on every push to `main`; API calls will fail
  until `VITE_API_BASE_URL` is set per [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
- Backend: **NOT LIVE** - deployment-ready (Dockerfile + full env config),
  but not deployed since no hosting credentials were available in this
  environment. Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) to deploy it.
- Database: **NOT LIVE** - schema and migrations are production-ready;
  provision PostgreSQL on your chosen host as part of the backend deploy.
- CI/CD: **CONFIGURED** - `.github/workflows/ci.yml` (typecheck, lint,
  test against real PostgreSQL, build) and `.github/workflows/deploy.yml`
  (GitHub Pages) both run automatically once pushed.

## License

[MIT](LICENSE)
