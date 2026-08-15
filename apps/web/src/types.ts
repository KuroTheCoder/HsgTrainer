export type QuestionType = "mcq" | "fill-blank" | "word-form" | "cloze" | "transformation" | "writing";

export type Section = "phonetics" | "lexico-grammar" | "word-formation" | "cloze" | "reading" | "writing";

export interface Question {
  id: number;
  qtype: QuestionType;
  section: Section;
  prompt: string;
  options: string[];
  acceptedVariants: string[];
  difficulty: string;
  tags: string[];
  verificationStatus: string;
  explanation: string | null;
}

export interface SessionQuestions {
  sessionId: number;
  anonId: string;
  questions: Question[];
}

export interface AnswerResult {
  questionId: number;
  yourAnswer: string;
  correct: boolean;
  expected: string;
  explanation: string | null;
}

export interface SessionResult {
  sessionId: number;
  score: number;
  total: number;
  results: AnswerResult[];
}

export interface Source {
  id: number;
  type: "official" | "community" | "ai";
  name: string;
  grade: string | null;
  year: number | null;
  province: string | null;
  url: string | null;
  attribution_note: string | null;
}

export interface AdminQuestion {
  id: number;
  qtype: QuestionType;
  section: Section;
  prompt: string;
  answer: string;
  accepted_variants: string;
  options: string | null;
  difficulty: string;
  verification_status: string;
  tags: string;
  explanation: string | null;
  source_name: string | null;
  source_type: string | null;
}

export interface BulkReportItem {
  index: number;
  status: string;
  id?: number;
  error?: string;
}

export interface Mistake {
  answerId: number;
  sessionId: number;
  questionId: number;
  qtype: QuestionType;
  section: Section;
  prompt: string;
  options: string[];
  yourAnswer: string;
  expected: string;
  explanation: string | null;
  tags: string[];
  difficulty: string;
  answeredAt: string;
}

export interface WritingQuestion {
  id: number;
  qtype: QuestionType;
  section: Section;
  prompt: string;
  difficulty: string;
  tags: string[];
}

export interface CriterionScores {
  content: number;
  organization: number;
  vocabulary: number;
  grammar: number;
}

export interface WritingFeedback {
  status: "ok" | "unavailable" | "error";
  criterionScores?: CriterionScores;
  total?: number;
  band?: string;
  justification?: string;
  fixes?: string[];
  error?: string;
}

export interface WritingScoreResponse {
  sessionId: number;
  score: WritingFeedback;
  remaining: number | null;
}
