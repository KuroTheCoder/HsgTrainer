#!/usr/bin/env node
/**
 * Import content JSON (canonical format, docs/content-schema.md) into the bank
 * via the admin bulk endpoint. No dependencies — plain Node 20+ fetch.
 *
 * Usage:
 *   ADMIN_URL=http://localhost:8787 ADMIN_TOKEN=<password> node scripts/import.mjs --file content/sample.json
 *
 * A login call obtains a session token automatically.
 */
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    file: { type: "string" },
    url: { type: "string", default: process.env.ADMIN_URL ?? "http://localhost:8787" },
    password: { type: "string", default: process.env.ADMIN_TOKEN ?? "" },
  },
});

if (!values.file) {
  console.error("usage: node scripts/import.mjs --file <json> [--url base] [--password pwd]");
  process.exit(1);
}

async function main() {
  const base = values.url.replace(/\/$/, "");
  const payload = JSON.parse(await readFile(values.file, "utf8"));

  const login = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: values.password }),
  });
  if (!login.ok) {
    console.error(`login failed: ${login.status} — is ADMIN_TOKEN set in .dev.vars?`);
    process.exit(1);
  }
  const { token } = await login.json();

  const res = await fetch(`${base}/api/admin/questions/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`import failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const { report } = await res.json();
  for (const r of report) {
    console.log(`[${r.index}] ${r.status}${r.id ? ` id=${r.id}` : ""}${r.error ? ` error=${r.error}` : ""}`);
  }
  const errors = report.filter((r) => r.status === "error").length;
  console.log(`done: ${report.length} rows, ${errors} errors`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
