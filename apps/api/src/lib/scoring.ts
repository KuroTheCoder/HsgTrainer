import { normalizeAnswer } from "./normalize";
import { DETERMINISTIC_TYPES, parseJsonList, type QuestionRow } from "../types";

export interface ScoreResult {
  correct: boolean;
  expected: string;
  score: number;
}

/**
 * Deterministic scoring for fixed-answer question types.
 * Never touches the AI — this is the $0 path (see docs/architecture.md).
 */
export function scoreQuestion(q: QuestionRow, response: string): ScoreResult {
  if (!DETERMINISTIC_TYPES.includes(q.qtype)) {
    return { correct: false, expected: q.answer, score: 0 };
  }

  if (q.qtype === "mcq") {
    const key = q.answer.trim().toUpperCase();
    const submitted = response.trim().toUpperCase();
    const correct = submitted === key;
    return { correct, expected: key, score: correct ? 1 : 0 };
  }

  const accepted = [q.answer, ...parseJsonList(q.accepted_variants)].map(normalizeAnswer);
  const correct = accepted.includes(normalizeAnswer(response));
  return { correct, expected: q.answer, score: correct ? 1 : 0 };
}
