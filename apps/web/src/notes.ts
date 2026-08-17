// Curated Obsidian-vault subset rendered as study notes (/notes).
// Notes live in content/notes/**/*.md and are synced to public/notes/ by
// scripts/copy-notes.mjs (predev/prebuild) — served statically, fetched
// at runtime. Zero network to the API, zero server cost.
// Keep this viewer a faithful *subset* of Obsidian: frontmatter hidden,
// wikilinks → internal navigation, tags → chips, embeds → link-out.

export interface NoteMeta {
  slug: string;
  title: string;
  tags: string[];
}

export interface Note extends NoteMeta {
  body: string;
  index: string;
}

const mdCache = new Map<string, Promise<string>>();

function fetchMd(slug: string): Promise<string> {
  let p = mdCache.get(slug);
  if (!p) {
    p = fetch(`/notes/${slug}.md`).then((r) => {
      if (!r.ok) throw new Error(`note not found: ${slug}`);
      return r.text();
    });
    mdCache.set(slug, p);
  }
  return p;
}

const TITLE_RE = /^#\s+(.+)$/;

/** Split frontmatter (--- block) from body; title = frontmatter > H1 > slug. */
export function parseNote(raw: string, slug: string): Note {
  let body = raw;
  let tags: string[] = [];
  let fmTitle: string | null = null;
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (m) {
    body = raw.slice(m[0].length);
    for (const line of m[1].split(/\r?\n/)) {
      const t = /^title\s*:\s*(.+)$/.exec(line);
      if (t) fmTitle = t[1]!.trim().replace(/^["']|["']$/g, "");
      const tg = /^tags\s*:\s*(\[.*\]|.+)$/.exec(line);
      if (tg) {
        const v = tg[1]!.trim();
        tags = v.startsWith("[")
          ? v
              .slice(1, -1)
              .split(",")
              .map((s) => s.trim().replace(/^["']|["']$/g, ""))
              .filter(Boolean)
          : [v];
      }
    }
  }
  const h1 = TITLE_RE.exec(body.trimStart());
  const title = fmTitle ?? h1?.[1] ?? slug;
  return {
    slug,
    title: title.trim(),
    tags,
    body,
    index: `${title} ${tags.join(" ")} ${body}`.toLowerCase(),
  };
}

/** All note slugs + frontmatter metadata from the build-time manifest. */
export async function loadNoteMetas(): Promise<NoteMeta[]> {
  const res = await fetch("/notes/notes.json");
  if (!res.ok) throw new Error("notes manifest unavailable");
  const data = (await res.json()) as { notes?: NoteMeta[] };
  return (data.notes ?? []).sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Full note content for one slug (frontmatter parsed client-side). */
export async function loadNote(slug: string): Promise<Note> {
  return parseNote(await fetchMd(slug), slug);
}

/** slug → note lookup for wikilink resolution (from loaded content). */
export function noteMap(notes: Note[]): Map<string, Note> {
  return new Map(notes.map((n) => [n.slug, n]));
}

/** All #tags referenced in a note body (deduped, order of appearance). */
export function tagsInBody(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/(^|\s)#([A-Za-zÀ-ž0-9_\-/]+)/g)) {
    const t = m[2]!;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}