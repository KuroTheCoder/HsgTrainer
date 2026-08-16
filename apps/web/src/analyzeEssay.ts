export interface EssayFlag {
  id: string;
  label: string;
  severity: "warn" | "info";
}

export interface EssayDiagnostics {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentenceWords: number;
  uniqueWords: number;
  uniqueRatio: number;
  longWords: number;
  longRatio: number;
  readability: {
    fleschReadingEase: number;
    fleschKincaidGrade: number;
    gunningFog: number;
    label: string;
  };
  overused: { word: string; count: number }[];
  flags: EssayFlag[];
}

const WEAK_WORDS: Record<string, string> = {
  very: "an intensifier — pick one precise word",
  really: "an intensifier — pick one precise word",
  "a lot": "wordy — prefer 'many' or 'much'",
  "lots of": "informal — prefer 'many'",
  thing: "vague noun — name what you mean",
  things: "vague noun — name what you mean",
  stuff: "informal — name what you mean",
  get: "weak verb — consider a stronger one",
  got: "weak verb — consider a stronger one",
  getting: "weak verb — consider a stronger one",
  gonna: "informal — write 'going to'",
  wanna: "informal — write 'want to'",
  kinda: "informal — write 'kind of'",
  yeah: "informal in exam writing",
  okay: "informal in exam writing",
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "so", "of", "to", "in", "on", "at", "for", "with", "from",
  "by", "as", "is", "are", "was", "were", "be", "been", "being", "it", "its", "this", "that",
  "these", "those", "i", "you", "he", "she", "we", "they", "my", "your", "our", "their", "his",
  "her", "not", "no", "do", "does", "did", "have", "has", "had", "can", "could", "will", "would",
  "should", "may", "might", "there", "which", "who", "what", "when", "where", "how", "if", "than",
  "then", "also", "more", "most", "some", "any", "all", "about", "into", "over", "out", "up",
]);

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = (w.match(/[aeiouy]+/g) ?? []).length;
  let n = groups;
  if (w.endsWith("e") && groups > 1) n -= 1;
  if (w.endsWith("le") && w.length > 3 && !w.endsWith("ble") && !w.endsWith("cle")) n += 1;
  return Math.max(1, n);
}

function sentencesOf(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Quick clarity / style diagnostics for an essay. Intentionally conservative —
 *  rules flag *likely* issues; it is NOT an AI grade (see Writing page note). */
export function analyzeEssay(text: string): EssayDiagnostics {
  const words = (text.toLowerCase().match(/[a-z]+(?:['’][a-z]+)*/g) ?? []).filter((w) => w.length > 0);
  const uniqueWords = new Set(words.map((w) => w.replace(/['’]s$/, "")));
  const longWords = words.filter((w) => w.replace(/['’]/g, "").length > 6).length;
  const sentences = sentencesOf(text);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length || (text.trim() ? 1 : 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const nWords = words.length;
  const nSent = Math.max(sentences.length, 1);
  const avgSentenceWords = nWords / nSent;

  const fleschReadingEase = nWords > 0 ? 206.835 - 1.015 * avgSentenceWords - 84.6 * (syllables / nWords) : 0;
  const fleschKincaidGrade = nWords > 0 ? 0.39 * avgSentenceWords + 11.8 * (syllables / nWords) - 15.59 : 0;
  const complexWords = words.filter((w) => countSyllables(w) >= 3).length;
  const gunningFog = nWords > 0 ? 0.4 * (avgSentenceWords + 100 * (complexWords / nWords)) : 0;
  const fre = Math.max(0, Math.min(100, fleschReadingEase));
  const label = fre >= 80 ? "very easy" : fre >= 60 ? "easy" : fre >= 50 ? "fairly easy" : fre >= 30 ? "fairly hard" : "hard";

  const freq = new Map<string, number>();
  for (const w of uniqueWords) {
    const clean = w.replace(/['’]/g, "");
    if (clean.length > 2 && !STOP_WORDS.has(clean)) {
      const count = words.filter((x) => x.replace(/['’]s$/, "") === w).length;
      if (count > 1) freq.set(clean, (freq.get(clean) ?? 0) + count);
    }
  }
  const overused = [...freq.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const flags: EssayFlag[] = [];
  const seen = new Set<string>();
  const push = (id: string, label: string, severity: "warn" | "info") => {
    if (seen.has(id)) return;
    seen.add(id);
    flags.push({ id, label, severity });
  };

  for (const [word, hint] of Object.entries(WEAK_WORDS)) {
    const re = new RegExp(`\\b${word.replace(/ /g, "\\s+")}\\b`, "i");
    if (re.test(text)) push(`weak-${word}`, `"${word}" — ${hint}`, "warn");
  }

  const passive = text.match(/\b(?:am|is|are|was|were|be|been|being)\s+[a-z]+ed\b/gi);
  if (passive) push("passive", "Passive voice (e.g. " + passive[0] + ") — the active voice is usually stronger", "info");

  const longSents = sentences.filter((s) => s.split(/\s+/).length > 30).length;
  if (longSents > 0) push("long-sentence", `${longSents} sentence${longSents > 1 ? "s" : ""} over 30 words — split for clarity`, "warn");

  if (nWords > 60 && paragraphs <= 1) push("paragraphs", "No paragraph breaks — divide the essay into paragraphs", "info");

  const exclaims = (text.match(/!/g) ?? []).length;
  if (exclaims > 1) push("exclamations", `${exclaims} exclamation marks — prefer statements in exam writing`, "info");

  if (overused.length > 0 && overused[0].count >= 4) {
    push("overused", `"${overused[0].word}" appears ${overused[0].count} times — vary your vocabulary`, "warn");
  }

  const oneWordSentences = sentences.filter((s) => s.split(/\s+/).filter(Boolean).length === 1);
  if (oneWordSentences.length > 0) push("one-word", `${oneWordSentences.length} one-word sentence${oneWordSentences.length > 1 ? "s" : ""}`, "info");

  return {
    words: nWords,
    sentences: nSent,
    paragraphs,
    avgSentenceWords,
    uniqueWords: uniqueWords.size,
    uniqueRatio: nWords > 0 ? uniqueWords.size / nWords : 0,
    longWords,
    longRatio: nWords > 0 ? longWords / nWords : 0,
    readability: {
      fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
      fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
      gunningFog: Math.round(gunningFog * 10) / 10,
      label,
    },
    overused,
    flags,
  };
}
