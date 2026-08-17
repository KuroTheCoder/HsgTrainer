// Sync content/notes/**/*.md → apps/web/public/notes/ (static serving for the
// /notes viewer) and write notes.json (slug/title/tags manifest).
// Zero-dep; runs as predev/prebuild so dev and production stay in sync.
// No JSON deps: a minimal frontmatter read here duplicates parseNote's logic —
// keep the two in agreement on title/tags only (body parsing is client-side).
import { mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, "content/notes");
const outDir = join(root, "apps/web/public/notes");

function frontmatter(raw) {
  let title = null;
  let tags = [];
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const t = /^title\s*:\s*(.+)$/.exec(line);
      if (t) title = t[1].trim().replace(/^["']|["']$/g, "");
      const tg = /^tags\s*:\s*(\[.*\]|.+)$/.exec(line);
      if (tg) {
        const v = tg[1].trim();
        tags = v.startsWith("[")
          ? v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
          : [v];
      }
    }
  }
  return { title, tags };
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

mkdirSync(outDir, { recursive: true });
const files = walk(srcDir).sort();
const manifest = [];
for (const f of files) {
  const raw = readFileSync(f, "utf8");
  const rel = relative(srcDir, f).replace(/\\/g, "/");
  const slug = rel.replace(/\.md$/, "");
  const { title, tags } = frontmatter(raw);
  manifest.push({ slug, title: title ?? slug, tags });
  copyFileSync(f, join(outDir, `${slug}.md`));
}
writeFileSync(join(outDir, "notes.json"), JSON.stringify({ notes: manifest }, null, 2));
console.log(`notes: synced ${manifest.length} note(s) → ${outDir}`);