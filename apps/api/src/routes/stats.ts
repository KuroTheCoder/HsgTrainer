import { Hono } from "hono";
import type { Env } from "../env";
import { DETERMINISTIC_TYPES } from "../types";

const stats = new Hono<{ Bindings: Env }>();

function anonId(c: { req: { header: (n: string) => string | undefined } }): string | null {
  return c.req.header("X-Anon-Id") ?? null;
}

// Overall progress & analytics for one anonymous user. Aggregate reads only —
// no per-event rows, so it stays comfortably inside D1's free read budget.
// Note: accuracy is measured on the *latest retained attempts* (corrected
// wrong rows are deleted from the ledger), which reads as current mastery.
stats.get("/", async (c) => {
  const anon = anonId(c);
  if (!anon) return c.json({});

  const days = Math.min(parseInt(c.req.query("days") ?? "30", 10) || 30, 90);
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const det = DETERMINISTIC_TYPES.map(() => "?").join(",");

  const sess = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n,
       COALESCE(SUM(CASE WHEN section IS NULL OR section != 'writing' THEN question_count ELSE 0 END), 0) AS answered,
       COALESCE(SUM(CASE WHEN section IS NULL OR section != 'writing' THEN score ELSE 0 END), 0) AS correct
     FROM sessions
     WHERE anon_id = ? AND date(created_at) >= ?`,
  )
    .bind(anon, since)
    .first<{ n: number; answered: number; correct: number }>();

  const daysRes = await c.env.DB.prepare(
    `SELECT date(created_at) AS d,
       COALESCE(SUM(CASE WHEN section IS NULL OR section != 'writing' THEN question_count ELSE 0 END), 0) AS answered,
       COALESCE(SUM(CASE WHEN section IS NULL OR section != 'writing' THEN score ELSE 0 END), 0) AS correct
     FROM sessions
     WHERE anon_id = ? AND date(created_at) >= ?
     GROUP BY d ORDER BY d`,
  )
    .bind(anon, since)
    .all<{ d: string; answered: number; correct: number }>();

  // Streak: consecutive days with a session, counting back from today
  // (a session yesterday still keeps today's streak alive).
  const dates = new Set(daysRes.results.map((r) => r.d));
  let streak = 0;
  {
    let cursor = new Date();
    if (!dates.has(cursor.toISOString().slice(0, 10))) cursor = new Date(Date.now() - 86_400_000);
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 86_400_000);
    }
  }

  let bestDay: { date: string; answered: number; correct: number; accuracy: number } | null = null;
  for (const r of daysRes.results) {
    if (r.answered < 5) continue;
    const acc = r.answered ? r.correct / r.answered : 0;
    if (!bestDay || acc > bestDay.accuracy) bestDay = { date: r.d, answered: r.answered, correct: r.correct, accuracy: acc };
  }

  const secRes = await c.env.DB.prepare(
    `SELECT q.section AS section, COUNT(*) AS answered, COALESCE(SUM(a.score), 0) AS correct
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     JOIN sessions s ON s.id = a.session_id
     WHERE s.anon_id = ? AND q.qtype IN (${det}) AND date(a.created_at) >= ?
     GROUP BY q.section`,
  )
    .bind(anon, ...DETERMINISTIC_TYPES, since)
    .all<{ section: string; answered: number; correct: number }>();

  const tagRes = await c.env.DB.prepare(
    `SELECT q.tags AS tags, a.score AS score
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     JOIN sessions s ON s.id = a.session_id
     WHERE s.anon_id = ? AND q.qtype IN (${det}) AND date(a.created_at) >= ?`,
  )
    .bind(anon, ...DETERMINISTIC_TYPES, since)
    .all<{ tags: string | null; score: number }>();

  const tagAcc: Record<string, { wrong: number; total: number }> = {};
  for (const r of tagRes.results) {
    let tags: string[] = [];
    try {
      const v = r.tags ? JSON.parse(r.tags) : [];
      tags = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      /* unparseable tags — ignore */
    }
    for (const t of tags) {
      const e = tagAcc[t] ?? { wrong: 0, total: 0 };
      e.total += 1;
      if (r.score === 0) e.wrong += 1;
      tagAcc[t] = e;
    }
  }

  const topTags = Object.entries(tagAcc)
    .map(([tag, v]) => ({ tag, wrong: v.wrong, total: v.total, accuracy: v.total ? (v.total - v.wrong) / v.total : 0 }))
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 8);

  const recent = await c.env.DB.prepare(
    `SELECT id, section, difficulty, question_count, score, created_at
     FROM sessions WHERE anon_id = ? ORDER BY id DESC LIMIT 10`,
  )
    .bind(anon)
    .all<{
      id: number;
      section: string | null;
      difficulty: number | null;
      question_count: number;
      score: number;
      created_at: string;
    }>();

  const bySection = secRes.results.map((r) => ({
    section: r.section,
    answered: r.answered,
    correct: r.correct,
    accuracy: r.answered ? r.correct / r.answered : 0,
  }));

  // Suggested focus: the weakest section with enough attempts to trust.
  const sampled = bySection.filter((s) => s.answered >= 5);
  let focus: string | null = null;
  if (sampled.length > 0) {
    focus = sampled.reduce((a, b) => (b.accuracy < a.accuracy ? b : a)).section;
  }

  return c.json({
    days,
    totalSessions: sess?.n ?? 0,
    totalAnswered: sess?.answered ?? 0,
    totalCorrect: sess?.correct ?? 0,
    accuracy: sess && sess.answered ? sess.correct / sess.answered : null,
    streak,
    bestDay,
    bySection,
    topTags,
    focus,
    recent: recent.results.map((r) => ({
      id: r.id,
      section: r.section,
      difficulty: r.difficulty,
      count: r.question_count,
      score: r.score,
      createdAt: r.created_at,
    })),
  });
});

export default stats;
