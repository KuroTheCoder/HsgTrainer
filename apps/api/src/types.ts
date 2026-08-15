export type QuestionType = "mcq" | "fill-blank" | "word-form" | "cloze" | "transformation" | "writing";

export type Section = "phonetics" | "lexico-grammar" | "word-formation" | "cloze" | "reading" | "writing";

export type VerificationStatus = "unverified" | "verified" | "rejected";

export type SourceType = "official" | "community" | "ai";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface QuestionRow {
  id: number;
  source_id: number | null;
  qtype: QuestionType;
  section: Section;
  prompt: string;
  options: string | null;
  answer: string;
  accepted_variants: string | null;
  rubric_ref: string | null;
  explanation: string | null;
  tags: string | null;
  difficulty: CefrLevel;
  verification_status: VerificationStatus;
  prompt_hash: string;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface SessionRow {
  id: number;
  anon_id: string;
  section: string | null;
  skill: string | null;
  difficulty: string | null;
  question_count: number;
  score: number;
  created_at: string;
}

export interface AnswerRow {
  id: number;
  session_id: number;
  question_id: number;
  response: string;
  score: number;
  criterion_scores: string | null;
  feedback: string | null;
  created_at: string;
}

export const DETERMINISTIC_TYPES: QuestionType[] = ["mcq", "fill-blank", "word-form", "cloze"];

export function parseJsonList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toQuestionShape(row: QuestionRow) {
  return {
    id: row.id,
    qtype: row.qtype,
    section: row.section,
    prompt: row.prompt,
    options: parseJsonList(row.options),
    acceptedVariants: parseJsonList(row.accepted_variants),
    difficulty: row.difficulty,
    tags: parseJsonList(row.tags),
    verificationStatus: row.verification_status,
    explanation: row.explanation,
  };
}
