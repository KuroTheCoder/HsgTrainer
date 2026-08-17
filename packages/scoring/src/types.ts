export type QuestionType = "mcq" | "fill-blank" | "word-form" | "cloze" | "transformation" | "writing";

export const DETERMINISTIC_TYPES: QuestionType[] = ["mcq", "fill-blank", "word-form", "cloze"];

export interface ScoreableQuestion {
  id: number;
  qtype: QuestionType;
  answer: string;
  accepted_variants: string | string[] | null;
  explanation?: string | null;
}

export function parseJsonList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
