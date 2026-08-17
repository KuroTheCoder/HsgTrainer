// Sync content/notes/**/*.md → apps/web/public/notes/ (static serving for the
// /notes viewer) and write notes.json (slug/title/tags + backlinks manifest).
// Also packages the curated vault (notes + .obsidian template) into a zip so
// users can open the same notes in Obsidian.
// Zero-dep (node stdlib; zip via the bsdtar that ships with Windows/macOS).
// Runs as predev/prebuild so dev and production stay in sync.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, "content/notes");
const outDir = join(root, "apps/web/public/notes");
const templateDir = join(root, "content/vault-template");

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
const bodies = new Map();
const manifest = [];
for (const f of files) {
  const raw = readFileSync(f, "utf8");
  const rel = relative(srcDir, f).replace(/\\/g, "/");
  const slug = rel.replace(/\.md$/, "");
  const { title, tags } = frontmatter(raw);
  manifest.push({ slug, title: title ?? slug, tags });
  bodies.set(slug, raw);
  copyFileSync(f, join(outDir, `${slug}.md`));
}

// Backlinks: which existing notes link to each note ([[wikilink]] scan).
for (const n of manifest) {
  const raw = bodies.get(n.slug) ?? "";
  n.backlinks = [];
  for (const [other, body] of bodies) {
    if (other === n.slug) continue;
    for (const m of body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      if (m[1].trim() === n.slug) n.backlinks.push(other);
    }
  }
}

writeFileSync(join(outDir, "notes.json"), JSON.stringify({ notes: manifest }, null, 2));
console.log(`notes: synced ${manifest.length} note(s) → ${outDir}`);

// Vault zip: template (.obsidian + README) + notes, for opening in Obsidian.
const zipPath = join(outDir, "hsgtrainer-vault.zip");
const tmp = mkdtempSync(join(tmpdir(), "hsg-vault-"));
const vault = join(tmp, "hsgtrainer-vault");
cpSync(templateDir, vault, { recursive: true });
for (const f of files) {
  copyFileSync(f, join(vault, relative(srcDir, f)));
}
try {
  execFileSync("tar", ["-a", "-cf", zipPath, "-C", tmp, "hsgtrainer-vault"], { stdio: "pipe" });
  console.log(`notes: vault zip → ${zipPath}`);
} catch {
  console.warn("notes: vault zip skipped — bsdtar not available on this system");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}