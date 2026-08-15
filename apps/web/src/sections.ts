import type { Section } from "./types";

export interface SectionMeta {
  key: Section;
  label: string;
  short: string;
  description: string;
  deterministic: boolean;
  /** Icon key — resolved through SECTION_ICONS in icons.tsx. */
  icon: string;
  /** Accent hex per section (identity + card gradients). */
  color: string;
}

export const SECTIONS: SectionMeta[] = [
  {
    key: "phonetics",
    label: "Phonetics & Stress",
    short: "Phonetics",
    description: "Sound distinctions, silent letters, word-stress patterns.",
    deterministic: true,
    icon: "phonetics",
    color: "#ec4899",
  },
  {
    key: "lexico-grammar",
    label: "Lexico-Grammar",
    short: "Lexico",
    description: "Advanced grammar, idioms, collocations, phrasal verbs (MCQ).",
    deterministic: true,
    icon: "lexico",
    color: "#3b82f6",
  },
  {
    key: "word-formation",
    label: "Word Formation",
    short: "Words",
    description: "Deriving the right word form from a root in context.",
    deterministic: true,
    icon: "words",
    color: "#10b981",
  },
  {
    key: "cloze",
    label: "Cloze",
    short: "Cloze",
    description: "Gap-fill passages testing coherence and cohesion.",
    deterministic: true,
    icon: "cloze",
    color: "#f59e0b",
  },
  {
    key: "reading",
    label: "Reading",
    short: "Reading",
    description: "Deep comprehension of academic passages.",
    deterministic: true,
    icon: "reading",
    color: "#8b5cf6",
  },
  {
    key: "writing",
    label: "Writing",
    short: "Writing",
    description: "Essays and letters — AI-scored rubric feedback.",
    deterministic: false,
    icon: "writing",
    color: "#f43f5e",
  },
];

export function sectionMeta(key: string | null | undefined): SectionMeta | undefined {
  return SECTIONS.find((s) => s.key === key);
}

export const DIFFICULTIES = [
  { value: "", label: "All" },
  { value: "1", label: "1 · easy" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5 · hard" },
];

/** Soft gradient from a section color — used for icon tiles and card tops. */
export function sectionGradient(color: string): string {
  return `linear-gradient(160deg, ${color}2e, ${color}0a 70%, transparent)`;
}
