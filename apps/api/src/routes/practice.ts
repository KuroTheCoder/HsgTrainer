import { Hono } from "hono";
import type { Env } from "../env";
import { adminAuth } from "../middleware/adminAuth";
import { DETERMINISTIC_TYPES, parseJsonList, type QuestionRow } from "../types";
import { scoreQuestion } from "@hsgtrainer/scoring";
import { fillExplanations } from "../lib/explain";

const practice = new Hono<{ Bindings: Env }>();

function toQuestionShape(row: QuestionRow) {
  return {
    id: row.id,
    qtype: row.qtype,
    section: row.section,
    prompt: row.prompt,
    options: parseJsonList(row.options),
    acceptedVariants: parseJsonList(row.accepted_variants),
    answer: row.answer,
    difficulty: row.difficulty,
    tags: parseJsonList(row.tags),
    keyWords: parseJsonList(row.key_words),
    audio: row.audio,
    verificationStatus: row.verification_status,
    explanation: row.explanation,
  };
}

function anonId(c: { req: { header: (n: string) => string | undefined } }): string | null {
  return c.req.header("X-Anon-Id") ?? null;
}

// Draw practice questions: verified, deterministic types only.
// Filters: ids (explicit set), paperId (full paper), section/difficulty/tag, count.
practice.get("/questions", async (c) => {
  const section = c.req.query("section") ?? null;
  const difficulty = c.req.query("difficulty") ?? null;
  const tag = c.req.query("tag") ?? null;
  const ids = (c.req.query("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 25);
  const paperId = c.req.query("paperId") ? Number(c.req.query("paperId")) : null;
  const count = Math.min(parseInt(c.req.query("count") ?? "10", 10) || 10, 25);

  let sql = `SELECT * FROM questions
    WHERE verification_status = 'verified' AND qtype IN (${DETERMINISTIC_TYPES.map(() => "?").join(",")})`;
  const params: string[] = [...DETERMINISTIC_TYPES];

  if (ids.length > 0) {
    // Explicit drill set (mistakes flow). Ignore other filters.
    sql += ` AND id IN (${ids.map(() => "?").join(",")}) ORDER BY id`;
    params.push(...ids.map(String));
  } else if (paperId && Number.isInteger(paperId) && paperId > 0) {
    // Full-paper draw (mock exam): every verified deterministic question.
    sql += ` AND source_id = ? ORDER BY section, id`;
    params.push(String(paperId));
  } else {
    if (section) {
      sql += ` AND section = ?`;
      params.push(section);
    }
    if (difficulty) {
      sql += ` AND difficulty = ?`;
      params.push(difficulty);
    }
    if (tag) {
      sql += ` AND tags LIKE ?`;
      params.push(`%"${tag}"%`);
    }
    sql += ` ORDER BY RANDOM() LIMIT ?`;
    params.push(String(count));
  }

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<QuestionRow>();
  return c.json({ questions: results.map(toQuestionShape) });
});

// Create a session (server-side draw, explicit questionIds, or a full paper)
// and return its questions.
practice.post("/sessions", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    section?: string;
    difficulty?: string;
    tag?: string;
    count?: number;
    questionIds?: number[];
    paperId?: number;
  };
  const anon = anonId(c) ?? crypto.randomUUID();

  let sql: string;
  const params: string[] = [];
  let skill: string | null = null;
  if (body.paperId) {
    // Full-paper draw (mock exam): every verified deterministic question.
    sql = `SELECT * FROM questions
      WHERE source_id = ? AND verification_status = 'verified'
        AND qtype IN (${DETERMINISTIC_TYPES.map(() => "?").join(",")})
      ORDER BY section, id`;
    params.push(String(body.paperId), ...DETERMINISTIC_TYPES);
    skill = "exam";
  } else if (Array.isArray(body.questionIds) && body.questionIds.length > 0) {
    const ids = [...new Set(body.questionIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 25);
    if (ids.length === 0) return c.json({ error: "invalid questionIds" }, 400);
    sql = `SELECT * FROM questions
      WHERE id IN (${ids.map(() => "?").join(",")})
        AND verification_status = 'verified'
        AND qtype IN (${DETERMINISTIC_TYPES.map(() => "?").join(",")})`;
    params.push(...ids.map(String), ...DETERMINISTIC_TYPES);
  } else {
    const count = Math.min(body.count ?? 10, 25);
    sql = `SELECT * FROM questions
      WHERE verification_status = 'verified' AND qtype IN (${DETERMINISTIC_TYPES.map(() => "?").join(",")})`;
    params.push(...DETERMINISTIC_TYPES);
    if (body.section) {
      sql += ` AND section = ?`;
      params.push(body.section);
    }
    if (body.difficulty) {
      sql += ` AND difficulty = ?`;
      params.push(body.difficulty);
    }
    if (body.tag) {
      sql += ` AND tags LIKE ?`;
      params.push(`%"${body.tag}"%`);
    }
    sql += ` ORDER BY RANDOM() LIMIT ?`;
    params.push(String(count));
  }

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<QuestionRow>();
  const questions = results.map(toQuestionShape);

  const inserted = await c.env.DB.prepare(
    `INSERT INTO sessions (anon_id, section, skill, difficulty, question_count, score)
     VALUES (?, ?, ?, ?, ?, 0)`,
  )
    .bind(anon, body.section ?? null, skill, body.difficulty ?? null, questions.length)
    .run();
  const sessionId = Number(inserted.meta.last_row_id);

  return c.json({ sessionId, anonId: anon, questions }, 201);
});

// Submit answers in batch; deterministic scoring + answer rows (mistake ledger).
practice.post("/sessions/:id/answers", async (c) => {
  const sessionId = Number(c.req.param("id"));
  const body = (await c.req.json().catch(() => ({}))) as {
    answers: { questionId: number; response: string }[];
  };
  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return c.json({ error: "answers required" }, 400);
  }

  const session = await c.env.DB.prepare("SELECT * FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ id: number; anon_id: string; question_count: number }>();
  if (!session) return c.json({ error: "session not found" }, 404);

  const ids = [...new Set(body.answers.map((a) => a.questionId))];
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM questions WHERE id IN (${ids.map(() => "?").join(",")})`,
  )
    .bind(...ids)
    .all<QuestionRow>();

  const byId = new Map(results.map((q) => [q.id, q]));
  const resultsOut: {
    questionId: number;
    yourAnswer: string;
    correct: boolean;
    expected: string;
    explanation: string | null;
  }[] = [];

  let score = 0;
  const wrongDeterministic: QuestionRow[] = [];
  const cleared: { questionId: number; removed: number }[] = [];
  for (const a of body.answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const response = String(a.response ?? "");
    const s = scoreQuestion(q, response);
    if (s.correct) score += s.score;
    else if (DETERMINISTIC_TYPES.includes(q.qtype) && !q.explanation) wrongDeterministic.push(q);
    await c.env.DB.prepare(
      `INSERT INTO answers (session_id, question_id, response, score) VALUES (?, ?, ?, ?)`,
    )
      .bind(sessionId, q.id, response, s.score)
      .run();
    // Retry promise: getting it right clears earlier wrong rows for this
    // question + anon (the ledger only keeps your latest attempts per question).
    if (s.correct) {
      const { results: stale } = await c.env.DB.prepare(
        `SELECT a.id FROM answers a
         JOIN sessions s ON s.id = a.session_id
         WHERE s.anon_id = ? AND a.question_id = ? AND a.score = 0`,
      )
        .bind(session.anon_id, q.id)
        .all<{ id: number }>();
      if (stale.length > 0) {
        const removed = await c.env.DB.prepare(
          `DELETE FROM answers WHERE id IN (${stale.map(() => "?").join(",")})`,
        )
          .bind(...stale.map((r) => r.id))
          .run();
        cleared.push({ questionId: q.id, removed: Number(removed.meta.changes ?? 0) });
      }
    }
    resultsOut.push({
      questionId: q.id,
      yourAnswer: response,
      correct: s.correct,
      expected: s.expected,
      explanation: q.explanation,
    });
  }

  // Explanation cache: generate once per question (only for wrong answers),
  // under the daily budget. Deterministic types only — writing is M3.
  // Best-effort: a DB/AI failure here must never fail the submission itself.
  if (wrongDeterministic.length > 0) {
    const generated = await fillExplanations(c.env, wrongDeterministic);
    for (const r of resultsOut) {
      const gen = generated.get(r.questionId);
      if (gen) r.explanation = gen;
    }
  }

  await c.env.DB.prepare("UPDATE sessions SET score = ? WHERE id = ?").bind(score, sessionId).run();

  return c.json({
    sessionId,
    score,
    total: resultsOut.length,
    cleared,
    results: resultsOut,
  });
});

// Best-effort explanation fill for local (client-scored) sessions. The web
// app asks only for wrong deterministic answers missing an explanation;
// the daily cap + failure tolerance live in lib/explain.ts.
practice.post("/explain", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { questionIds?: number[] };
  const ids = [...new Set((body.questionIds ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 25);
  if (ids.length === 0) return c.json({ explanations: {} });

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM questions WHERE id IN (${ids.map(() => "?").join(",")})`,
  )
    .bind(...ids.map(String))
    .all<QuestionRow>();
  const generated = await fillExplanations(c.env, results);
  return c.json({ explanations: Object.fromEntries(generated) });
});

// Mistake ledger: every wrong answer for this anonymous user, newest first.
practice.get("/mistakes", async (c) => {
  const anon = anonId(c);
  if (!anon) return c.json({ mistakes: [] });

  const section = c.req.query("section") ?? null;
  const limit = Math.min(parseInt(c.req.query("limit") ?? "100", 10) || 100, 200);

  let sql = `SELECT a.id AS answer_id, a.session_id, a.response AS your_answer,
      a.created_at AS answered_at,
      q.id AS question_id, q.qtype, q.section, q.prompt, q.options, q.answer,
      q.explanation, q.tags, q.difficulty
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    JOIN sessions s ON s.id = a.session_id
    WHERE s.anon_id = ? AND a.score = 0
      AND q.qtype IN (${DETERMINISTIC_TYPES.map(() => "?").join(",")})`;
  const params: string[] = [anon, ...DETERMINISTIC_TYPES];
  if (section) {
    sql += ` AND q.section = ?`;
    params.push(section);
  }
  sql += ` ORDER BY a.id DESC LIMIT ?`;
  params.push(String(limit));

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<{
    answer_id: number;
    session_id: number;
    your_answer: string;
    answered_at: string;
    question_id: number;
    qtype: string;
    section: string;
    prompt: string;
    options: string | null;
    answer: string;
    explanation: string | null;
    tags: string | null;
    difficulty: number;
  }>();
  return c.json({
    mistakes: results.map((r) => ({
      answerId: r.answer_id,
      sessionId: r.session_id,
      questionId: r.question_id,
      qtype: r.qtype,
      section: r.section,
      prompt: r.prompt,
      options: r.options ? JSON.parse(r.options) : null,
      yourAnswer: r.your_answer,
      expected: r.answer,
      explanation: r.explanation,
      tags: r.tags ? JSON.parse(r.tags) : [],
      difficulty: r.difficulty,
      answeredAt: r.answered_at,
    })),
  });
});

// Admin-only mistake cleanup: delete selected answer rows (?ids=1,2,3) or,
// without ids, clear every wrong answer (optionally scoped by ?section=).
practice.delete("/mistakes", adminAuth, async (c) => {
  const ids = (c.req.query("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);

  let sql: string;
  const params: string[] = [];
  if (ids.length > 0) {
    sql = `DELETE FROM answers WHERE id IN (${ids.map(() => "?").join(",")})`;
    params.push(...ids.map(String));
  } else {
    const section = c.req.query("section") ?? null;
    sql = `DELETE FROM answers WHERE id IN (
      SELECT a.id FROM answers a
      JOIN questions q ON q.id = a.question_id
      WHERE a.score = 0
        AND q.qtype IN (${DETERMINISTIC_TYPES.map(() => "?").join(",")})`;
    params.push(...DETERMINISTIC_TYPES);
    if (section) {
      sql += ` AND q.section = ?`;
      params.push(section);
    }
    sql += `)`;
  }

  const { meta } = await c.env.DB.prepare(sql).bind(...params).run();
  return c.json({ deleted: Number(meta.changes ?? 0) });
});

// Session result (review page / mistake ledger).
practice.get("/sessions/:id", async (c) => {
  const sessionId = Number(c.req.param("id"));
  const session = await c.env.DB.prepare("SELECT * FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first();
  if (!session) return c.json({ error: "session not found" }, 404);

  const { results } = await c.env.DB.prepare(
    `SELECT a.response, a.score, q.* FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.session_id = ? ORDER BY a.id`,
  )
    .bind(sessionId)
    .all<QuestionRow & { response: string; score: number }>();

  return c.json({
    session,
    results: results.map((r) => ({
      questionId: r.id,
      qtype: r.qtype,
      section: r.section,
      prompt: r.prompt,
      audio: r.audio,
      options: r.options ? JSON.parse(r.options) : null,
      yourAnswer: r.response,
      correct: r.score === 1,
      expected: r.answer,
      explanation: r.explanation,
    })),
  });
});

export default practice;
