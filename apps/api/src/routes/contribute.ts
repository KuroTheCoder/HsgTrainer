import { Hono } from "hono";
import type { Env } from "../env";
import { questionDraftSchema } from "../lib/validate";
import { sha256Hex } from "../lib/hash";

const contribute = new Hono<{ Bindings: Env }>();

function anonId(c: { req: { header: (n: string) => string | undefined } }): string | null {
  return c.req.header("X-Anon-Id") ?? null;
}

const COMMUNITY_SOURCE = "Community contribution";

async function ensureCommunitySource(db: D1Database): Promise<number> {
  const existing = await db
    .prepare("SELECT id FROM sources WHERE type = 'community' AND name = ? LIMIT 1")
    .bind(COMMUNITY_SOURCE)
    .first<{ id: number }>();
  if (existing) return existing.id;
  const inserted = await db
    .prepare("INSERT INTO sources (type, name, attribution_note) VALUES ('community', ?, ?)")
    .bind(COMMUNITY_SOURCE, "Public submissions via the contribute form")
    .run();
  return Number(inserted.meta.last_row_id);
}

// Public contribution — lands unverified, gated from the live bank until review.
contribute.post("/", async (c) => {
  const anon = anonId(c);
  if (!anon) return c.json({ error: "anonymous id required" }, 400);

  const body = await c.req.json().catch(() => null);
  const parsed = questionDraftSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid question", issues: parsed.error.issues }, 400);
  const draft = parsed.data;

  const cap = Math.max(0, parseInt(c.env.CONTRIBUTE_DAILY_CAP ?? "5", 10) || 0);
  if (cap > 0) {
    const { results } = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM questions
       WHERE submitted_by = ? AND created_at >= datetime('now', 'start of day')`,
    )
      .bind(anon)
      .all<{ n: number }>();
    const used = results[0]?.n ?? 0;
    if (used >= cap) {
      return c.json({ error: `Contribution limit reached (${cap}/day).` }, 429);
    }
  }

  const promptHash = await sha256Hex(draft.prompt.trim().toLowerCase());
  const dup = await c.env.DB.prepare("SELECT id FROM questions WHERE prompt_hash = ?")
    .bind(promptHash)
    .first<{ id: number }>();
  if (dup) return c.json({ error: "This question already exists in the bank." }, 409);

  const sourceId = await ensureCommunitySource(c.env.DB);
  const inserted = await c.env.DB.prepare(
    `INSERT INTO questions
      (source_id, qtype, section, prompt, options, answer, accepted_variants, rubric_ref, tags, difficulty, verification_status, prompt_hash, submitted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?, ?)`,
  )
    .bind(
      sourceId,
      draft.qtype,
      draft.section,
      draft.prompt,
      draft.options ? JSON.stringify(draft.options) : null,
      draft.answer,
      JSON.stringify(draft.acceptedVariants ?? []),
      draft.rubricRef ?? null,
      JSON.stringify(draft.tags ?? []),
      draft.difficulty ?? 3,
      promptHash,
      anon,
    )
    .run();

  return c.json({ id: Number(inserted.meta.last_row_id), status: "unverified", message: "Submitted for review." }, 201);
});

export default contribute;
