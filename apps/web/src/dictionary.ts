export interface DictMeaning {
  partOfSpeech?: string;
  definition: string;
  example?: string;
}

export interface DictEntry {
  word: string;
  phonetic?: string;
  meanings: DictMeaning[];
}

interface RawEntry {
  word: string;
  phonetic?: string;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string; example?: string }>;
  }>;
}

/** Normalize a lookup query: collapse whitespace and drop anything that is
 *  not a letter/number/apostrophe/hyphen (quotes, emojis, stray punctuation). */
export function normalizeLookup(word: string): string {
  return word
    .replace(/[^\p{L}\p{N}'’\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Candidate tokens for a lookup, in order of preference. A selection often
 *  drags in part of an adjacent word ("at variancew") — each alpha run is a
 *  candidate, tried in parallel, first success wins. */
export function lookupTokens(word: string): string[] {
  const clean = normalizeLookup(word).toLowerCase();
  const tokens = [...new Set(clean.split(/[\s-]+/).filter((t) => t.length >= 2))];
  return tokens.slice(0, 4);
}

async function fetchEntry(word: string): Promise<DictEntry | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as RawEntry[];
    const first = data[0];
    if (!first) return null;
    const meanings: DictMeaning[] = (first.meanings ?? [])
      .slice(0, 3)
      .map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definition: m.definitions?.[0]?.definition ?? "",
        example: m.definitions?.[0]?.example,
      }))
      .filter((m) => m.definition);
    if (meanings.length === 0) return null;
    return { word: first.word, phonetic: first.phonetic, meanings };
  } catch {
    return null; // offline
  }
}

/** Free, keyless English dictionary (dictionaryapi.dev). Fires all candidate
 *  tokens in parallel and returns the first one the API knows. Null if none
 *  resolve (or offline). */
export async function lookupWord(word: string): Promise<DictEntry | null> {
  const tokens = lookupTokens(word);
  if (tokens.length === 0) return null;
  const entries = await Promise.all(tokens.map((t) => fetchEntry(t)));
  return entries.find((e) => e !== null) ?? null;
}

export interface DictLink {
  name: string;
  url: string;
  hint?: string;
}

/** First alphabetic token of a selection (ignores quotes, punctuation). */
export function firstWord(word: string): string | null {
  const match = word.trim().toLowerCase().match(/[a-z]+(?:'[a-z]+)*/);
  if (!match || match[0].length < 2) return null;
  return match[0];
}

/** Deep links to real dictionary pages — legal, keyless, no scraping.
 *  Multi-word entries are slugified (spaces → hyphens, lowercase); if the
 *  exact page does not exist the site shows its own search results instead. */
export function dictionaryLinks(word: string): DictLink[] {
  const clean = normalizeLookup(word).toLowerCase();
  const word1 = firstWord(word) ?? clean;
  const slug = word1.replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return [];
  return [
    {
      name: "Cambridge",
      url: `https://dictionary.cambridge.org/dictionary/english/${slug}`,
      hint: "Clear EN–EN definitions",
    },
    {
      name: "Cambridge EN→VI",
      url: `https://dictionary.cambridge.org/dictionary/english-vietnamese/${slug}`,
      hint: "English–Vietnamese",
    },
    {
      name: "Oxford",
      url: `https://www.oxfordlearnersdictionaries.com/definition/english/${slug}`,
      hint: "Learner's dictionary",
    },
    {
      name: "Wiktionary",
      url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word1)}`,
    },
  ];
}

/** Open a dictionary in a small floating window; falls back to a new tab
 *  when the browser blocks popups (returns null from window.open). */
export function openDictionaryWindow(url: string): void {
  const popup = window.open(url, "_blank", "width=560,height=700,scrollbars=yes");
  if (!popup) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }
}
