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
    // After a human spot-check of the keys: flip the just-imported rows to a
    // verification status (e.g. --verify verified). Never used automatically.
    verify: { type: "string" },
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

  // The bulk endpoint accepts at most 500 questions per payload — chunk automatically.
  const chunks = [];
  for (let i = 0; i < payload.questions.length; i += 500) {
    chunks.push({ ...payload, questions: payload.questions.slice(i, i + 500) });
  }

  let counts = new Map();
  const reportRows = new Map();
  for (const [ci, chunk] of chunks.entries()) {
    const res = await fetch(`${base}/api/admin/questions/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.error(`chunk ${ci + 1}/${chunks.length} failed: ${res.status} ${await res.text()}`);
      errors += chunk.questions.length;
      continue;
    }
    const { report } = await res.json();
    for (const r of report) {
      console.log(`[${r.index}] ${r.status}${r.id ? ` id=${r.id}` : ""}${r.error ? ` error=${r.error}` : ""}`);
    }
    for (const r of report) {
      counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
      if (r.id) {
        const list = reportRows.get(r.status) ?? [];
        list.push(r.id);
        reportRows.set(r.status, list);
      }
    }
  }
  console.log(
    `done: ${chunks.length} chunk(s), ${payload.questions.length} questions — ${[...counts.entries()]
      .map(([s, n]) => `${n} ${s}`)
      .join(", ")}`,
  );
  if ((counts.get("error") ?? 0) > 0) process.exitCode = 1;

  if (values.verify) {
    const ids = [...counts.keys()]
      .flatMap((s) => reportRows.get(s) ?? [])
      .filter((id) => id > 0);
    if (ids.length > 0) {
      console.log(`setting ${ids.length} rows to "${values.verify}" (after human spot-check!)`);
      const res = await fetch(`${base}/api/admin/questions/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, status: values.verify }),
      });
      if (!res.ok) {
        console.error(`status flip failed: ${res.status} ${await res.text()}`);
        process.exitCode = 1;
      } else {
        const { updated } = await res.json();
        console.log(`status flip applied to ${updated} row(s)`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
