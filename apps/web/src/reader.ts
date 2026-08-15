export interface Note {
  text: string;
  section: string;
  updatedAt: number;
}

const NOTES_KEY = "hsg-notes";
const HIGHLIGHTS_KEY = "hsg-highlights";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback; // private mode / corrupt data
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

export function getNotes(): Record<string, Note> {
  return read<Record<string, Note>>(NOTES_KEY, {});
}

export function getNote(questionId: number): Note | undefined {
  return getNotes()[String(questionId)];
}

export const NOTES_CHANGED_EVENT = "hsg-notes-changed";

function emitNotesChanged() {
  try {
    window.dispatchEvent(new Event(NOTES_CHANGED_EVENT));
  } catch {
    /* noop */
  }
}

export function saveNote(questionId: number, section: string, text: string) {
  const notes = getNotes();
  const key = String(questionId);
  if (text.trim()) {
    notes[key] = { text: text.trim(), section, updatedAt: Date.now() };
  } else {
    delete notes[key];
  }
  write(NOTES_KEY, notes);
  emitNotesChanged();
}

export function noteIdsForSection(section: string): number[] {
  return Object.entries(getNotes())
    .filter(([, n]) => n.section === section)
    .map(([id]) => Number(id));
}

export function getHighlights(questionId: number): string[] {
  return read<Record<string, string[]>>(HIGHLIGHTS_KEY, {})[String(questionId)] ?? [];
}

export function addHighlight(questionId: number, text: string) {
  const all = read<Record<string, string[]>>(HIGHLIGHTS_KEY, {});
  const key = String(questionId);
  const list = all[key] ?? [];
  if (!list.includes(text)) list.push(text);
  all[key] = list;
  write(HIGHLIGHTS_KEY, all);
}

export function removeHighlight(questionId: number, text: string) {
  const all = read<Record<string, string[]>>(HIGHLIGHTS_KEY, {});
  const key = String(questionId);
  all[key] = (all[key] ?? []).filter((t) => t !== text);
  if ((all[key] ?? []).length === 0) delete all[key];
  write(HIGHLIGHTS_KEY, all);
}
