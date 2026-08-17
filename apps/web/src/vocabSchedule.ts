/** Spaced-repetition schedule for the word list (Leitner boxes, client-side). */

export type VocabRating = "knew" | "almost" | "forgot";

export const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30]; // index = level
export const MAX_LEVEL = 5;

export interface ScheduleState {
  lvl: number;
  due: string; // ISO timestamp
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function nextSchedule(lvl: number, rating: VocabRating, now = Date.now()): ScheduleState {
  if (rating === "forgot") return { lvl: 0, due: new Date(now).toISOString() };
  if (rating === "almost") return { lvl: Math.max(lvl, 1), due: new Date(now + DAY_MS).toISOString() };
  const next = Math.min(lvl + 1, MAX_LEVEL);
  return { lvl: next, due: new Date(now + INTERVALS_DAYS[next] * DAY_MS).toISOString() };
}

export function isDue(entry: { due?: string | null }, now = Date.now()): boolean {
  return !entry.due || new Date(entry.due).getTime() <= now;
}
