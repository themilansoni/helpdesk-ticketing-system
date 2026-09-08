#!/usr/bin/env node
// Toggles the Prisma datasource provider between "postgresql" (production,
// canonical) and "sqlite" (local dev/test without Docker). The schema
// intentionally avoids Postgres-only features so this swap is safe.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "prisma", "schema.prisma");

const target = process.argv[2];
if (target !== "sqlite" && target !== "postgresql") {
  console.error('Usage: node set-provider.js <sqlite|postgresql>');
  process.exit(1);
}

const original = readFileSync(schemaPath, "utf8");
const updated = original.replace(
  /(datasource db \{\s*\n\s*provider = ")(postgresql|sqlite)(")/,
  `$1${target}$3`
);

if (updated === original && !original.includes(`provider = "${target}"`)) {
  console.error("Could not find datasource provider line to update.");
  process.exit(1);
}

writeFileSync(schemaPath, updated);
console.log(`Prisma datasource provider set to "${target}".`);
