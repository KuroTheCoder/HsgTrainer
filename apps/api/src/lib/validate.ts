import { z } from "zod";

export const QUESTION_TYPES = ["mcq", "fill-blank", "word-form", "cloze", "transformation", "writing"] as const;
export const SECTIONS = ["phonetics", "lexico-grammar", "word-formation", "cloze", "reading", "writing"] as const;
export const SOURCE_TYPES = ["official", "community", "ai"] as const;
export const VERIFICATION_STATUSES = ["unverified", "verified", "rejected"] as const;

export const sourceSchema = z.object({
  type: z.enum(SOURCE_TYPES),
  name: z.string().min(1).max(200),
  grade: z.string().max(20).optional().nullable(),
  year: z.number().int().min(1990).max(2100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  url: z.string().url().max(500).optional().nullable(),
  attributionNote: z.string().max(500).optional().nullable(),
});

export const questionDraftSchema = z.object({
  qtype: z.enum(QUESTION_TYPES),
  section: z.enum(SECTIONS),
  prompt: z.string().min(1).max(10000),
  options: z.array(z.string().min(1)).min(2).max(8).optional(),
  answer: z.string().min(1).max(2000),
  acceptedVariants: z.array(z.string().min(1)).max(50).optional(),
  rubricRef: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().min(1)).max(20).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

export const bulkImportSchema = z.object({
  source: sourceSchema.optional(),
  questions: z.array(questionDraftSchema).min(1).max(500),
});

export type QuestionDraft = z.infer<typeof questionDraftSchema>;
export type SourceInput = z.infer<typeof sourceSchema>;
