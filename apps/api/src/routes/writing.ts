import { Hono } from "hono";
import type { Env } from "../env";
import { scoreWriting } from "../ai/adapter";
import type { QuestionRow } from "../types";

const writing = new Hono<{ Bindings: Env }>();

function anonId(c: { req: { header: (n: string) => string | undefined } }): string | null {
  return c.req.header("X-Anon-Id") ?? null;
}

// Draw writing prompts (verified writing questions only). Optional ?paperId=
// scopes the draw to one paper's writing task (mock exam stage).
writing.get("/questions", async (c) => {
  const count = Math.min(parseInt(c.req.query("count") ?? "1", 10) || 1, 5);
  const paperId = c.req.query("paperId") ? Number(c.req.query("paperId")) : null;
  let sql = `SELECT * FROM questions
     WHERE verification_status = 'verified' AND qtype = 'writing'`;
  const params: unknown[] = [];
  if (paperId && Number.isInteger(paperId) && paperId > 0) {
    sql += ` AND source_id = ?`;
    params.push(paperId);
  }
  sql += ` ORDER BY RANDOM() LIMIT ?`;
  params.push(count);
  const { results } = await c.env.DB.prepare(sql).bind(...params).all<QuestionRow>();
  return c.json({
    questions: results.map((q) => ({
      id: q.id,
      qtype: q.qtype,
      section: q.section,
      prompt: q.prompt,
      difficulty: q.difficulty,
      tags: q.tags ? JSON.parse(q.tags) : [],
    })),
  });
});

async function usedToday(db: D1Database, anon: string): Promise<number> {
  const { results } = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM answers a
       JOIN sessions s ON s.id = a.session_id
       WHERE s.anon_id = ? AND a.criterion_scores IS NOT NULL
         AND a.created_at >= datetime('now', 'start of day')`,
    )
    .bind(anon)
    .all<{ n: number }>();
  return results[0]?.n ?? 0;
}

// Score one writing submission (AI). Capped per user per day.
writing.post("/score", async (c) => {
  const anon = anonId(c);
  if (!anon) return c.json({ error: "anonymous id required" }, 400);

  const body = (await c.req.json().catch(() => ({}))) as {
    questionId?: number;
    response?: string;
  };
  const questionId = Number(body.questionId);
  const response = (body.response ?? "").trim();
  if (!Number.isInteger(questionId) || questionId <= 0) return c.json({ error: "questionId required" }, 400);
  if (!response) return c.json({ error: "response required" }, 400);
  if (response.length > 4000) return c.json({ error: "response too long (max 4000 chars)" }, 400);

  const q = await c.env.DB.prepare("SELECT * FROM questions WHERE id = ? AND verification_status = 'verified'")
    .bind(questionId)
    .first<QuestionRow>();
  if (!q || q.qtype !== "writing") return c.json({ error: "writing question not found" }, 404);

  const cap = Math.max(0, parseInt(c.env.WRITE_DAILY_CAP ?? "3", 10) || 0);
  if (cap > 0) {
    const used = await usedToday(c.env.DB, anon);
    if (used >= cap) {
      return c.json({ error: `Daily AI feedback limit reached (${cap}/day). Try again tomorrow.` }, 429);
    }
  }

  const score = await scoreWriting(c.env, { prompt: q.prompt, answer: q.answer, response });
  if (score.status !== "ok" || !score.criterionScores) {
    return c.json({ error: score.error ?? "AI scoring unavailable" }, 503);
  }

  const session = await c.env.DB.prepare(
    `INSERT INTO sessions (anon_id, section, question_count, score) VALUES (?, 'writing', 1, ?)`,
  )
    .bind(anon, score.total)
    .run();
  const sessionId = Number(session.meta.last_row_id);

  await c.env.DB.prepare(
    `INSERT INTO answers (session_id, question_id, response, score, criterion_scores, feedback)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      sessionId,
      q.id,
      response,
      score.total,
      JSON.stringify(score.criterionScores),
      JSON.stringify({ band: score.band, justification: score.justification, fixes: score.fixes }),
    )
    .run();

  return c.json({ sessionId, score, remaining: cap > 0 ? Math.max(0, cap - (await usedToday(c.env.DB, anon))) : null }, 201);
});

export default writing;
