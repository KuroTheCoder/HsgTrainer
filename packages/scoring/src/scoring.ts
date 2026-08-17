import { normalizeAnswer } from "./normalize";
import { DETERMINISTIC_TYPES, parseJsonList, type ScoreableQuestion } from "./types";

export interface ScoreResult {
  correct: boolean;
  expected: string;
  score: number;
}

/**
 * Deterministic scoring for fixed-answer question types.
 * Never touches the AI — this is the $0 path (see docs/architecture.md).
 * Shared by the API (server-side scoring) and the web app (local-first scoring).
 */
export function scoreQuestion(q: ScoreableQuestion, response: string): ScoreResult {
  if (!DETERMINISTIC_TYPES.includes(q.qtype)) {
    return { correct: false, expected: q.answer, score: 0 };
  }

  if (q.qtype === "mcq") {
    const key = q.answer.trim().toUpperCase();
    const submitted = response.trim().toUpperCase();
    const correct = submitted === key;
    return { correct, expected: key, score: correct ? 1 : 0 };
  }

  const accepted = [q.answer, ...(Array.isArray(q.accepted_variants) ? q.accepted_variants : parseJsonList(q.accepted_variants))].map(normalizeAnswer);
  const correct = accepted.includes(normalizeAnswer(response));
  return { correct, expected: q.answer, score: correct ? 1 : 0 };
}
