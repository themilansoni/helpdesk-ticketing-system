# HelpDesk Pro

**Internal IT Service Management Platform**

A full-stack internal helpdesk and ticketing system: employees submit and
track support tickets, technicians triage/assign/resolve them against
configurable SLAs, and administrators manage users, departments, assets,
the knowledge base, and audit history.

**Live Demo:** https://themilansoni.github.io/helpdesk-ticketing-system/
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

HelpDesk Pro is a **serverless single-page app**: there is no backend
server to host. The React frontend talks directly to **Firebase**
(Authentication, Firestore, and Storage) from the browser, and
**Firestore/Storage Security Rules are the entire access-control layer** -
there are no Cloud Functions in this build (a deliberate choice to stay on
Firebase's free Spark plan; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
for the trade-offs this implies).

```
helpdesk-ticketing-system/
├── apps/
│   └── web/                React + TypeScript + Vite SPA
│       └── src/lib/db/       Firestore/Storage data-access layer (one
│                              module per domain: tickets, users, assets...)
├── packages/
│   ├── shared/              Shared types, zod validation, RBAC matrix,
│   │                        SLA math - used by both the app and the
│   │                        Firestore rules' logic (kept in sync by hand)
│   └── config/               Shared lint config
├── firebase/
│   ├── firestore.rules        Access control - the real security boundary
│   ├── storage.rules
│   ├── firestore.indexes.json
│   ├── seed.ts                 One-time demo-data seeding (Admin SDK, run
│   │                            locally with your own service account key)
│   └── seed-data.ts
├── docs/                       Data model reference and deployment guide
└── .github/workflows/          CI (typecheck/lint/test/build + rules
                                 validation) and CD (GitHub Pages)
```

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives, TanStack Query, React Router, Recharts |
| Backend | **Firebase** - Authentication, Firestore (database), Storage (files). No server to deploy. |
| Auth | Firebase Authentication (email/password), role stored on each user's Firestore profile |
| Security | Firestore Security Rules + Storage Security Rules (see `firebase/firestore.rules`) |
| Testing | Vitest + Testing Library (component/unit tests, Firebase mocked) |
| CI/CD | GitHub Actions (typecheck/lint/test/build + rules validation on PR, GitHub Pages deploy on merge) |

## 5. Data Model

See [docs/DATA-MODEL.md](docs/DATA-MODEL.md) for the full Firestore
collection reference. In short: documents are denormalized (a ticket
stores the requester's name, category name, etc. directly) since
Firestore has no joins, and the fixed-choice fields that used to be
lookup tables in a relational schema (roles, ticket statuses) are now
TypeScript union types in `packages/shared`, validated both in the UI and
in `firestore.rules`.

## 6. Environment Variables

The only configuration is your Firebase project's web app config - see
[apps/web/.env.example](apps/web/.env.example). These values identify
*which* Firebase project to talk to; they are not secrets (Firebase's own
docs are explicit about this) - real access control is `firestore.rules`
and `storage.rules`, not hiding this config.

## 7. Local Development

Prerequisites: Node.js 20+, npm 10+, and a Firebase project (see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for exact setup steps if you
don't have one yet).

```bash
git clone https://github.com/themilansoni/helpdesk-ticketing-system.git
cd helpdesk-ticketing-system
npm install
cp apps/web/.env.example apps/web/.env.local   # fill in your Firebase config
npm run dev
```

Then open http://localhost:5173. Sign in with one of the
[demo accounts](#demo-accounts) once you've run the seed script (below),
or create your first Administrator manually in the Firebase console
(Authentication -> Add user, then create a matching document at
`users/<that user's UID>` in Firestore with `role: "Administrator"` and
`status: "active"`).

### Seeding demo data

```bash
# Firebase console -> Project settings -> Service accounts -> Generate new private key
npm run seed:firebase -- /path/to/serviceAccountKey.json
```

Creates 22 demo users (including the 4 accounts below), 10 assets, 15
knowledge base articles, and 30 tickets spanning every status/priority
combination (with comments, history, notifications, and audit log
entries) so the dashboard is populated immediately.

### Common commands

```bash
npm run build       # build the app
npm run test         # run the test suite
npm run typecheck    # typecheck
npm run lint          # lint
```

## 8. Deploying the Firestore/Storage Security Rules

The rules in `firebase/` are the actual access-control layer and must be
deployed to your Firebase project before the app is usable:

```bash
npx firebase-tools login
npx firebase-tools use --add   # pick your project, alias it "default"
npm run firebase:deploy:rules
```

## 9. Demo Credentials

Seeded by `npm run seed:firebase`. **Change these before using this in
anything resembling production.**

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@helpdesk.local` | `Passw0rd!123` |
| Technician | `technician@helpdesk.local` | `Passw0rd!123` |
| Manager | `manager@helpdesk.local` | `Passw0rd!123` |
| Employee | `employee@helpdesk.local` | `Passw0rd!123` |

## 10. Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full step-by-step
instructions. Summary:

- **Frontend**: GitHub Pages, automated via `.github/workflows/deploy.yml`
  on every push to `main`, using your Firebase config from repository
  Variables (Settings -> Secrets and variables -> Actions -> Variables).
- **Backend**: nothing to deploy - Firebase Authentication/Firestore/
  Storage are managed services. You only deploy the *rules*
  (`npm run firebase:deploy:rules`).
- **Database**: Firestore, provisioned as part of Firebase project setup.

## 11. Data Model / API Reference

[docs/DATA-MODEL.md](docs/DATA-MODEL.md) documents every Firestore
collection and the client-side functions in `apps/web/src/lib/db/` that
read/write them (the closest equivalent to a REST API reference for a
backend-as-a-service app).

## 12. Testing

```bash
npm run test
```

Covers login, ticket creation, ticket filtering, ticket detail rendering,
and role-based navigation. The Firebase SDK is mocked at the
`apps/web/src/lib/db` and `apps/web/src/lib/auth` module boundaries, so
tests exercise real page/component logic without needing a live project
or the emulator suite.

## 13. Security Notes

- Firebase Authentication handles password hashing/storage - HelpDesk Pro
  never sees or stores a password.
- **`firestore.rules` and `storage.rules` are the entire authorization
  layer** (no server exists to double-check them) - they mirror the same
  RBAC matrix in `packages/shared/src/permissions.ts` that gates the UI,
  so a client bypassing the UI still can't bypass access control.
- Ticket status transitions are validated both in the UI
  (`STATUS_TRANSITIONS` in `packages/shared`) and would ideally also be
  enforced in rules; the current rules gate *who* can update a ticket
  (staff only) but not the specific transition graph - a known
  simplification of the "no Cloud Functions" trade-off, noted in Future
  Improvements below.
- Every Storage upload is size- and MIME-type-restricted in
  `storage.rules`, matching the client-side check.
- Notification documents can be created by any authenticated user
  targeting any recipient (there's no server to broker this without Cloud
  Functions) - a user could spam another user's notification feed, but
  can never read another user's notifications, and every other write
  remains properly scoped. Documented, deliberate trade-off.

## 14. Accessibility

Semantic HTML, labeled form controls (including `aria-label` on all select
dropdowns), keyboard-operable menus/dialogs/selects (Radix UI primitives),
visible focus states, and sufficient color contrast on status/priority
badges.

## 15. Future Improvements

- Add Cloud Functions (upgrading to the Blaze plan) for the handful of
  operations that are safest server-side: enforcing the exact ticket
  status transition graph, and setting Firebase Auth custom claims for
  role instead of trusting the Firestore profile document read in rules.
- Real-time updates (Firestore `onSnapshot` listeners) instead of the
  current polling/refetch-on-mutation pattern.
- Business-hours-aware SLA calculation (the `businessHoursOnly` flag
  exists on each priority's SLA policy but resolution math is currently
  wall-clock).
- Saved/shareable ticket filter views; bulk ticket actions.
- Firestore full-text search (e.g. via a third-party extension) instead of
  the current client-side filter-after-fetch approach.
- E2E browser tests (Playwright) against the Firebase Emulator Suite.

## Deployment Status

- Frontend: **LIVE** - https://themilansoni.github.io/helpdesk-ticketing-system/
  (redeploys automatically on every push to `main`)
- Backend: **N/A** - Firebase is a managed service, nothing to deploy
  beyond the security rules (`npm run firebase:deploy:rules`)
- Database: depends on your Firebase project being set up and the rules
  deployed - see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- CI/CD: **CONFIGURED** - `.github/workflows/ci.yml` (typecheck, lint,
  test, build, rules validation) and `.github/workflows/deploy.yml`
  (GitHub Pages) both run automatically once pushed.

## License

[MIT](LICENSE)
