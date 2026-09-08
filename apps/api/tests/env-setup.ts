// Runs before every test file. The dev/demo database is meant to be
// browsable while you work (seeded with 30 tickets, demo users, etc), and
// the test suite calls resetDatabase()/deleteMany() on every table - so
// tests must never point at that same database.
//
// In CI, DATABASE_URL is already set to the dedicated Postgres service
// container defined in ci.yml and must be left alone. Locally, apps/api/.env
// always sets DATABASE_URL to the dev.db used for browsing the seeded demo
// data, so it can't be used as a "not set yet" signal here - GitHub
// Actions' own CI=true env var is the reliable way to tell the two apart.
// This must run before anything imports the Prisma client singleton from
// @helpdesk/database.
if (!process.env.CI) {
  process.env.DATABASE_URL = "file:./test.db";
}
