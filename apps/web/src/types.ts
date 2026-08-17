export type QuestionType = "mcq" | "fill-blank" | "word-form" | "cloze" | "transformation" | "writing";

export type Section = "phonetics" | "lexico-grammar" | "word-formation" | "cloze" | "reading" | "writing" | "listening";

export interface Question {
  id: number;
  qtype: QuestionType;
  section: Section;
  prompt: string;
  options: string[];
  acceptedVariants: string[];
  difficulty: string;
  tags: string[];
  keyWords: string[];
  verificationStatus: string;
  explanation: string | null;
  audio: string | null;
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
  key_words: string | null;
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

export interface ReportRow {
  id: number;
  report_type: "question" | "bug";
  question_id: number | null;
  reason: string;
  message: string | null;
  anon_id: string | null;
  status: "open" | "resolved";
  created_at: string;
  question_prompt: string | null;
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
  keyWords: string[];
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

export interface SectionStat {
  section: Section;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface TagStat {
  tag: string;
  wrong: number;
  total: number;
  accuracy: number;
}

export interface RecentSession {
  id: number;
  section: string | null;
  difficulty: number | null;
  count: number;
  score: number;
  createdAt: string;
}

export interface Paper {
  id: number;
  name: string;
  grade: string | null;
  year: number | null;
  province: string | null;
  total: number;
  writing: number;
  sections: Partial<Record<Section, number>>;
}

export interface ExamSectionResult {
  section: Section;
  correct: number;
  answered: number;
}

export interface WritingHistoryEntry {
  id: number;
  questionId: number;
  prompt: string;
  response: string;
  score: number;
  criterionScores: Record<string, number> | null;
  band: string | null;
  justification: string | null;
  fixes: string[];
  createdAt: string;
}

export interface ProgressStats {
  days: number;
  totalSessions: number;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number | null;
  streak: number;
  bestDay: { date: string; answered: number; correct: number; accuracy: number } | null;
  bySection: SectionStat[];
  topTags: TagStat[];
  focus: string | null;
  recent: RecentSession[];
}
