/** Personal word list — stored locally (anonymous-first, like notes/highlights). */

const KEY = "hsg-word-list";

export const WORD_LIST_CHANGED_EVENT = "hsg-vocab-changed";

import { nextSchedule, isDue, type VocabRating } from "./vocabSchedule";

export type VocabEntry = { addedAt: string; lvl?: number; due?: string };

export function getWordList(): Record<string, VocabEntry> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Record<string, VocabEntry>;
      if (typeof v === "object" && v !== null) {
        const out: Record<string, VocabEntry> = {};
        for (const [word, entry] of Object.entries(v)) {
          if (typeof word === "string" && typeof entry?.addedAt === "string") out[word] = entry;
        }
        return out;
      }
    }
  } catch {
    /* private mode */
  }
  return {};
}

function write(list: Record<string, VocabEntry>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(WORD_LIST_CHANGED_EVENT));
}

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hasWord(word: string): boolean {
  return normalizeWord(word) in getWordList();
}

export function addWord(word: string): void {
  const list = getWordList();
  list[normalizeWord(word)] = { addedAt: new Date().toISOString() };
  write(list);
}

export function removeWord(word: string): void {
  const list = getWordList();
  delete list[normalizeWord(word)];
  write(list);
}

/** Words due for review right now (never-scheduled words count as due). */
export function dueWords(now = Date.now()): string[] {
  const list = getWordList();
  return Object.entries(list)
    .filter(([, e]) => isDue(e, now))
    .map(([w]) => w);
}

/** Apply a review rating to a word's spaced-repetition schedule. */
export function rateWord(word: string, rating: VocabRating, now = Date.now()): void {
  const list = getWordList();
  const key = normalizeWord(word);
  const entry = list[key];
  if (!entry) return;
  list[key] = { ...entry, ...nextSchedule(entry.lvl ?? 0, rating, now) };
  write(list);
}
