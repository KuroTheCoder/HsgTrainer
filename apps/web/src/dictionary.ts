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

/** Free, keyless English dictionary (dictionaryapi.dev). Degrades to null offline. */
export async function lookupWord(word: string): Promise<DictEntry | null> {
  // Look up a single word. Multi-word selections look up their first word —
  // the API has no phrase endpoint.
  const match = word.trim().toLowerCase().match(/[a-z]+(?:'[a-z]+)*/);
  if (!match || match[0].length < 2) return null;
  const clean = match[0];
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`);
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
    return { word: first.word, phonetic: first.phonetic, meanings };
  } catch {
    return null; // offline
  }
}
