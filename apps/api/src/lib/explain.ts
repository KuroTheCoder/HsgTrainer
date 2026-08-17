import type { Env } from "../env";
import type { QuestionRow } from "../types";
import { DETERMINISTIC_TYPES } from "../types";
import { generateExplanation } from "../ai/adapter";

// Explanation cache: generate once per question, under the daily budget.
// Deterministic types only — writing is M3. Best-effort: a DB/AI failure
// here must never fail the caller. Returns a map of questionId -> text.
export async function fillExplanations(
  env: Env,
  questions: QuestionRow[],
): Promise<Map<number, string>> {
  const generated = new Map<number, string>();
  const missing = questions.filter(
    (q) => DETERMINISTIC_TYPES.includes(q.qtype) && !q.explanation,
  );
  if (missing.length === 0) return generated;

  try {
    const cap = Math.max(0, parseInt(env.EXPLAIN_DAILY_CAP ?? "100", 10) || 0);
    if (cap <= 0) return generated;
    const { results: countRows } = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM questions
       WHERE explanation IS NOT NULL AND explanation_generated_at >= datetime('now', 'start of day')`,
    ).all<{ n: number }>();
    const used = countRows[0]?.n ?? 0;
    const budget = Math.max(0, cap - used);
    for (const q of missing.slice(0, budget)) {
      const text = await generateExplanation(env, q);
      if (text) {
        generated.set(q.id, text);
        await env.DB.prepare(
          `UPDATE questions SET explanation = ?, explanation_generated_at = datetime('now') WHERE id = ?`,
        )
          .bind(text, q.id)
          .run();
      }
    }
  } catch {
    // explanation cache unavailable → proceed without explanations
  }
  return generated;
}