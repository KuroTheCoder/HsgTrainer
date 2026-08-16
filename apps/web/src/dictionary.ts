/** Normalize a lookup query: collapse whitespace and drop anything that is
 *  not a letter/number/apostrophe/hyphen (quotes, emojis, stray punctuation). */
export function normalizeLookup(word: string): string {
  return word
    .replace(/[^\p{L}\p{N}'’\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface DictLink {
  id: string;
  name: string;
  url: string;
  hint?: string;
}

export interface DictionaryDef {
  id: string;
  name: string;
  hint?: string;
  /** Build the deep link for a single-word query + its slug. */
  url: (word: string, slug: string) => string;
}

export const DICTIONARIES: DictionaryDef[] = [
  {
    id: "cambridge",
    name: "Cambridge",
    hint: "Clear EN–EN definitions",
    url: (_w, slug) => `https://dictionary.cambridge.org/dictionary/english/${slug}`,
  },
  {
    id: "cambridge-vi",
    name: "Cambridge EN→VI",
    hint: "English–Vietnamese",
    url: (_w, slug) => `https://dictionary.cambridge.org/dictionary/english-vietnamese/${slug}`,
  },
  {
    id: "oxford",
    name: "Oxford",
    hint: "Learner's dictionary",
    url: (_w, slug) => `https://www.oxfordlearnersdictionaries.com/definition/english/${slug}`,
  },
  {
    id: "wiktionary",
    name: "Wiktionary",
    hint: "Free multilingual dictionary",
    url: (word, _slug) => `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
  },
];

/** First alphabetic token of a selection (ignores quotes, punctuation).
 *  A trailing possessive (`'s`/`’s`) is stripped: Cambridge has no entry for
 *  "student's" and its own fuzzy match surfaces wrong pages (e.g. "test-s" →
 *  "test-patience"), but the base form always resolves. */
export function firstWord(word: string): string | null {
  const match = word.trim().toLowerCase().match(/[a-z]+(?:'[a-z]+)*/);
  if (!match || match[0].length < 2) return null;
  return match[0].replace(/[’']s$/, "");
}

/** Deep links to the configured dictionaries — legal, keyless, no scraping.
 *  Multi-word entries are slugified (spaces → hyphens, lowercase); if the
 *  exact page does not exist the site shows its own search results instead. */
export function dictionaryLinks(word: string): DictLink[] {
  const clean = normalizeLookup(word).toLowerCase();
  const word1 = firstWord(word) ?? clean;
  const slug = word1.replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return [];
  return DICTIONARIES.map((d) => ({ id: d.id, name: d.name, url: d.url(word1, slug), hint: d.hint }));
}

export const DEFAULT_DICT_KEY = "hsg-default-dict";
export const DEFAULT_DICT_ID = "cambridge-vi";

/** The user's chosen default dictionary (settings), validated against the
 *  known list so a stale value can't break lookups. */
export function getDefaultDictId(): string {
  try {
    const v = localStorage.getItem(DEFAULT_DICT_KEY);
    if (v && DICTIONARIES.some((d) => d.id === v)) return v;
  } catch {
    /* private mode */
  }
  return DEFAULT_DICT_ID;
}

export function setDefaultDictId(id: string): void {
  try {
    localStorage.setItem(DEFAULT_DICT_KEY, id);
  } catch {
    /* private mode */
  }
}

/** URL of the user's default dictionary for a word (used to auto-open on
 *  lookup). Null when the word produces no usable slug. */
export function defaultDictUrl(word: string): string | null {
  const links = dictionaryLinks(word);
  return links.find((l) => l.id === getDefaultDictId())?.url ?? links[0]?.url ?? null;
}

/** Open a dictionary in a small floating window; falls back to a new tab
 *  when the browser blocks popups (returns null from window.open). */
export function openDictionaryWindow(url: string): void {
  const popup = window.open(url, "_blank", "width=560,height=700,scrollbars=yes");
  if (!popup) openDictionaryTab(url);
}

/** Open a dictionary in a new tab. Used when a popup window would cover the
 *  page (a 560×700 window parks near the top-left of the screen and can sit
 *  over the app's own popup). */
export function openDictionaryTab(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.click();
}

/** How dictionary links open: a whole new tab or a small floating window.
 *  The user picks in Settings; default is a tab so nothing ever covers the
 *  app. */
export type OpenMode = "tab" | "window";

export const OPEN_MODE_KEY = "hsg-dict-open-mode";

export function getOpenMode(): OpenMode {
  try {
    const v = localStorage.getItem(OPEN_MODE_KEY);
    if (v === "tab" || v === "window") return v;
  } catch {
    /* private mode */
  }
  return "tab";
}

export function setOpenMode(mode: OpenMode): void {
  try {
    localStorage.setItem(OPEN_MODE_KEY, mode);
  } catch {
    /* private mode */
  }
}

export function openDictionary(url: string): void {
  if (getOpenMode() === "window") openDictionaryWindow(url);
  else openDictionaryTab(url);
}
