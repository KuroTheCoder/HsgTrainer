// Translation progress report: scans apps/web/src for t("...") keys and diffs
// them against src/i18n/vi.json. Run: node scripts/i18n-report.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, "apps/web/src");
const vi = JSON.parse(readFileSync(join(srcDir, "i18n/vi.json"), "utf8"));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const used = new Set();
for (const f of walk(srcDir)) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/(?<![A-Za-z0-9_$])t\(\s*(["'`])([^"'`]+)\1/g)) {
    if (!m[2].includes("${")) used.add(m[2]);
  }
}

const translated = [...used].filter((k) => vi[k]);
const missing = [...used].filter((k) => !vi[k]);
const total = used.size;
const pct = total > 0 ? Math.round((translated.length / total) * 100) : 100;

console.log(`Translation progress: ${translated.length}/${total} keys (${pct}%)`);
if (missing.length > 0) {
  console.log(`Missing from src/i18n/vi.json (${missing.length}):`);
  for (const k of missing.slice(0, 120)) console.log(`  "${k}"`);
  if (missing.length > 120) console.log(`  … and ${missing.length - 120} more`);
} else {
  console.log("All keys translated. 🎉");
}