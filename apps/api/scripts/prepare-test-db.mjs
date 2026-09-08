#!/usr/bin/env node
// Syncs the Prisma schema to a dedicated test database before the test
// suite runs - never the dev/demo dev.db, since the tests call
// resetDatabase() on every table.
//
// In CI, DATABASE_URL is already set to the real Postgres service
// container defined in ci.yml, matching the canonical
// `provider = "postgresql"` in schema.prisma, and is used as-is. Locally,
// apps/api/.env always sets DATABASE_URL to the dev.db used for browsing
// seeded demo data, so this always overrides it with a dedicated sqlite
// test.db instead - which only works while the schema's datasource has
// also been temporarily switched via `npm run db:use:sqlite` (see the
// README's local setup section).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "..", "..", "packages", "database", "prisma", "schema.prisma");
const databaseUrl = process.env.CI ? process.env.DATABASE_URL : "file:./test.db";

const result = spawnSync("npx", ["prisma", "db", "push", "--schema", schemaPath, "--skip-generate", "--accept-data-loss"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

process.exit(result.status ?? 1);
