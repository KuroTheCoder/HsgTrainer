export interface CriterionScores {
  content: number;
  organization: number;
  vocabulary: number;
  grammar: number;
}

export const MAX_PER_CRITERION = 5;
export const MAX_TOTAL = MAX_PER_CRITERION * 4;

export function totalOf(s: CriterionScores): number {
  return s.content + s.organization + s.vocabulary + s.grammar;
}

/** HSG-style band from the 0–20 total. */
export function bandFor(total: number): string {
  if (total >= 18) return "A+";
  if (total >= 16) return "A";
  if (total >= 14) return "B+";
  if (total >= 12) return "B";
  if (total >= 10) return "C+";
  return "C";
}

export function clampCriterion(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(MAX_PER_CRITERION, Math.round(n)));
}
