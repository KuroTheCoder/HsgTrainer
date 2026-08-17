import { Hono } from "hono";
import type { Env } from "../env";
import { adminAuth } from "../middleware/adminAuth";
import { issueAdminToken } from "../lib/auth";
import { sha256Hex } from "../lib/hash";
import { questionDraftSchema, sourceSchema, bulkImportSchema, VERIFICATION_STATUSES, CEFR_LEVELS, QUESTION_TYPES, SECTIONS } from "../lib/validate";
import type { QuestionRow, SourceType, VerificationStatus } from "../types";

const admin = new Hono<{ Bindings: Env }>();

function statusForSourceType(type: SourceType): VerificationStatus {
  if (type === "official") return "verified";
  if (type === "community") return "unverified";
  return "rejected"; // AI content is blocked until a human verifies it
}

// POST /api/admin/login  { password } → { token }
admin.post("/login", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { password?: string };
  if (!c.env.ADMIN_TOKEN) return c.json({ error: "admin token not configured" }, 500);
  if (body.password !== c.env.ADMIN_TOKEN) return c.json({ error: "invalid password" }, 401);
  const token = await issueAdminToken(c.env);
  return c.json({ token });
});

admin.use("/*", adminAuth);

// -------- sources --------

admin.get("/sources", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM sources ORDER BY id DESC LIMIT 200").all();
  return c.json({ sources: results });
});

async function upsertSource(env: Env, input: unknown): Promise<number> {
  const src = sourceSchema.parse(input);
  const existing = await env.DB.prepare(
    `SELECT id FROM sources WHERE type = ? AND name = ? AND (year IS ? OR year = ?) AND (province IS ? OR province = ?) LIMIT 1`,
  )
    .bind(src.type, src.name, src.year ?? null, src.year ?? null, src.province ?? null, src.province ?? null)
    .first<{ id: number }>();
  if (existing) return existing.id;
  const inserted = await env.DB.prepare(
    `INSERT INTO sources (type, name, grade, year, province, url, attribution_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      src.type,
      src.name,
      src.grade ?? null,
      src.year ?? null,
      src.province ?? null,
      src.url ?? null,
      src.attributionNote ?? null,
    )
    .run();
  return Number(inserted.meta.last_row_id);
}

admin.post("/sources", async (c) => {
  const body = await c.req.json().catch(() => null);
  try {
    const id = await upsertSource(c.env, body);
    return c.json({ id }, 201);
  } catch (err) {
    return c.json({ error: "invalid source", detail: String(err) }, 400);
  }
});

// -------- review queue --------

admin.get("/questions", async (c) => {
  const status = c.req.query("status") ?? "unverified";
  const section = c.req.query("section") ?? null;
  const qtype = c.req.query("qtype") ?? null;
  const sourceId = c.req.query("source") ? Number(c.req.query("source")) : null;
  const tag = c.req.query("tag") ?? null;
  const q = c.req.query("q") ?? null;
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10) || 50, 200);
  const offset = Math.max(parseInt(c.req.query("offset") ?? "0", 10) || 0, 0);

  let where = "WHERE q.verification_status = ?";
  const params: string[] = [status];
  if (section) {
    where += " AND q.section = ?";
    params.push(section);
  }
  if (qtype) {
    where += " AND q.qtype = ?";
    params.push(qtype);
  }
  if (sourceId) {
    where += " AND q.source_id = ?";
    params.push(String(sourceId));
  }
  if (tag) {
    where += " AND q.tags LIKE ?";
    params.push(`%"${tag}"%`);
  }
  if (q) {
    where += " AND (q.prompt LIKE ? OR q.answer LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT q.*, s.name AS source_name, s.type AS source_type
     FROM questions q LEFT JOIN sources s ON s.id = q.source_id
     ${where} ORDER BY q.id DESC LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, offset)
    .all();
  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM questions q ${where}`,
  )
    .bind(...params)
    .first<{ n: number }>();
  return c.json({ questions: results, total: totalRow?.n ?? 0 });
});

// -------- create (single draft) --------

admin.post("/questions", async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = questionDraftSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid question", issues: parsed.error.issues }, 400);

  const draft = parsed.data;
  const promptHash = await sha256Hex(draft.prompt.trim().toLowerCase());
  const existing = await c.env.DB.prepare("SELECT id FROM questions WHERE prompt_hash = ?")
    .bind(promptHash)
    .first();
  if (existing) return c.json({ error: "duplicate question (same prompt already in bank)", id: existing.id }, 409);

  let sourceId: number | null = null;
  if (typeof body?.sourceId === "number") {
    const src = await c.env.DB.prepare("SELECT id FROM sources WHERE id = ?").bind(body.sourceId).first<{ id: number }>();
    if (!src) return c.json({ error: "source not found" }, 400);
    sourceId = src.id;
  }

  const status: VerificationStatus = "unverified";

  const inserted = await c.env.DB.prepare(
    `INSERT INTO questions
      (source_id, qtype, section, prompt, options, answer, accepted_variants, rubric_ref, tags, key_words, difficulty, verification_status, prompt_hash, submitted_by, audio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      JSON.stringify(draft.keyWords ?? []),
      draft.difficulty ?? "B1",
      status,
      promptHash,
      "admin",
      draft.audio ?? null,
    )
    .run();

  return c.json({ id: Number(inserted.meta.last_row_id), status }, 201);
});

// -------- bulk import (canonical content-schema format) --------

admin.post("/questions/bulk", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = bulkImportSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid import payload", issues: parsed.error.issues }, 400);

  const { source, questions } = parsed.data;
  let sourceId: number | null = null;
  const fallbackStatus: VerificationStatus = "unverified";
  if (source) {
    sourceId = await upsertSource(c.env, source);
  }

  const report: { index: number; status: string; id?: number; error?: string }[] = [];
  for (const [i, draft] of questions.entries()) {
    try {
      const promptHash = await sha256Hex(draft.prompt.trim().toLowerCase());
      const dup = await c.env.DB.prepare("SELECT id FROM questions WHERE prompt_hash = ?")
        .bind(promptHash)
        .first<{ id: number }>();
      if (dup) {
        await c.env.DB.prepare("UPDATE questions SET key_words = ? WHERE id = ?")
          .bind(JSON.stringify(draft.keyWords ?? []), dup.id)
          .run();
        report.push({ index: i, status: "updated", id: dup.id });
        continue;
      }
      const status = source ? statusForSourceType(source.type) : fallbackStatus;
      const inserted = await c.env.DB.prepare(
        `INSERT INTO questions
          (source_id, qtype, section, prompt, options, answer, accepted_variants, rubric_ref, tags, key_words, difficulty, verification_status, prompt_hash, submitted_by, audio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          JSON.stringify(draft.keyWords ?? []),
          draft.difficulty ?? "B1",
          status,
          promptHash,
          "admin",
          draft.audio ?? null,
        )
        .run();
      report.push({ index: i, status, id: Number(inserted.meta.last_row_id) });
    } catch (err) {
      report.push({ index: i, status: "error", error: String(err) });
    }
  }

  return c.json({ report }, 201);
});

// -------- bulk status flip (explicit admin action: e.g. verify a whole book after spot-check) --------

admin.post("/questions/status", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { ids?: unknown; status?: unknown } | null;
  const status = body?.status;
  if (typeof status !== "string" || !(VERIFICATION_STATUSES as readonly string[]).includes(status)) {
    return c.json({ error: "status must be one of: " + VERIFICATION_STATUSES.join(", ") }, 400);
  }
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))] : [];
  if (ids.length === 0 || ids.length > 5000) return c.json({ error: "ids[] required (1-5000)" }, 400);
  const res = await c.env.DB.prepare(
    `UPDATE questions SET verification_status = ?, reviewed_by = ?, reviewed_at = datetime('now')
     WHERE id IN (${ids.map(() => "?").join(",")})`,
  )
    .bind(status, "admin", ...ids.map(String))
    .run();
  return c.json({ updated: res.meta.changes });
});

// -------- whole-source status flip (verify/reject a book at once) --------

admin.post("/sources/:id/questions/status", async (c) => {
  const sourceId = Number(c.req.param("id"));
  if (!Number.isInteger(sourceId) || sourceId <= 0) return c.json({ error: "bad source id" }, 400);
  const body = (await c.req.json().catch(() => null)) as { status?: unknown; fromStatus?: unknown } | null;
  const status = body?.status;
  if (typeof status !== "string" || !(VERIFICATION_STATUSES as readonly string[]).includes(status)) {
    return c.json({ error: "status must be one of: " + VERIFICATION_STATUSES.join(", ") }, 400);
  }
  const from = body?.fromStatus;
  if (typeof from !== "string" || !(VERIFICATION_STATUSES as readonly string[]).includes(from)) {
    return c.json({ error: "fromStatus must be one of: " + VERIFICATION_STATUSES.join(", ") }, 400);
  }
  const res = await c.env.DB.prepare(
    `UPDATE questions SET verification_status = ?, reviewed_by = ?, reviewed_at = datetime('now')
     WHERE source_id = ? AND verification_status = ?`,
  )
    .bind(status, "admin", sourceId, from)
    .run();
  return c.json({ updated: res.meta.changes });
});

// -------- reports queue --------

admin.get("/reports", async (c) => {
  const status = c.req.query("status") ?? "open";
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10) || 50, 200);
  const { results } = await c.env.DB.prepare(
    `SELECT r.*, q.prompt AS question_prompt
     FROM reports r LEFT JOIN questions q ON q.id = r.question_id
     WHERE r.status = ? ORDER BY r.id DESC LIMIT ?`,
  )
    .bind(status, limit)
    .all();
  return c.json({ reports: results });
});

admin.post("/reports/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  const body = (await c.req.json().catch(() => null)) as { status?: unknown } | null;
  const status = body?.status === "resolved" ? "resolved" : "open";
  const res = await c.env.DB.prepare("UPDATE reports SET status = ? WHERE id = ?").bind(status, id).run();
  if (res.meta.changes === 0) return c.json({ error: "report not found" }, 404);
  return c.json({ id, status });
});

// -------- edit / verify / reject --------

admin.patch("/questions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const row = await c.env.DB.prepare("SELECT * FROM questions WHERE id = ?").bind(id).first<QuestionRow>();
  if (!row) return c.json({ error: "question not found" }, 404);

  const updates: string[] = [];
  const params: unknown[] = [];

  const stringField = (col: string, key: string) => {
    if (typeof body[key] === "string") {
      updates.push(`${col} = ?`);
      params.push(body[key]);
    }
  };
  const jsonListField = (col: string, key: string) => {
    if (Array.isArray(body[key])) {
      updates.push(`${col} = ?`);
      params.push(JSON.stringify(body[key]));
    }
  };
  const cefrField = (col: string, key: string) => {
    if (typeof body[key] === "string" && (CEFR_LEVELS as readonly string[]).includes(body[key] as string)) {
      updates.push(`${col} = ?`);
      params.push(body[key]);
    }
  };

  stringField("prompt", "prompt");
  stringField("answer", "answer");
  stringField("explanation", "explanation");
  stringField("rubric_ref", "rubricRef");
  stringField("audio", "audio");
  jsonListField("options", "options");
  jsonListField("accepted_variants", "acceptedVariants");
  jsonListField("tags", "tags");
  jsonListField("key_words", "keyWords");
  cefrField("difficulty", "difficulty");
  if (typeof body.qtype === "string" && (QUESTION_TYPES as readonly string[]).includes(body.qtype)) {
    updates.push("qtype = ?");
    params.push(body.qtype);
  }
  if (typeof body.section === "string" && (SECTIONS as readonly string[]).includes(body.section)) {
    updates.push("section = ?");
    params.push(body.section);
  }

  if (typeof body.verificationStatus === "string" && (VERIFICATION_STATUSES as readonly string[]).includes(body.verificationStatus)) {
    updates.push("verification_status = ?", "reviewed_by = ?", "reviewed_at = datetime('now')");
    params.push(body.verificationStatus, "admin");
  }

  if (updates.length === 0) return c.json({ error: "no updatable fields" }, 400);

  params.push(id);
  await c.env.DB.prepare(`UPDATE questions SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();

  const updated = await c.env.DB.prepare("SELECT * FROM questions WHERE id = ?").bind(id).first<QuestionRow>();
  return c.json({ question: updated });
});

export default admin;
