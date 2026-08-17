import { scoreQuestion } from "@hsgtrainer/scoring";
import type { ProgressStats, Question, Section, SectionStat, TagStat } from "./types";

// Local-first ledger: sessions + answers live in IndexedDB so practice/grind
// never touches the network. Mirrors the server semantics exactly:
//  - a session row per practice/exam run (non-writing only)
//  - one answer row per question attempt, with a snapshot of the question
//    data (prompt/options/key/tags/difficulty) so mistakes + stats work
//    offline and stay correct even if the question bank changes later
//  - getting a question right deletes earlier WRONG rows for it (the ledger
//    keeps only your latest attempt per question)
// Writing (AI) sessions, reports, and admin stay server-side.

export interface SessionRow {
  id: number;
  section: string | null;
  difficulty: string | null;
  skill: string | null;
  questionCount: number;
  score: number;
  createdAt: string;
}

export interface AnswerRow {
  id: number;
  sessionId: number;
  questionId: number;
  response: string;
  score: number;
  createdAt: string;
  snap: {
    qtype: string;
    section: string;
    prompt: string;
    options: string[] | null;
    answer: string;
    explanation: string | null;
    tags: string[];
    difficulty: string;
  };
}

const DB_NAME = "hsg";
const DB_VERSION = 1;
const SESSIONS = "sessions";
const ANSWERS = "answers";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SESSIONS)) {
          db.createObjectStore(SESSIONS, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(ANSWERS)) {
          db.createObjectStore(ANSWERS, { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("indexedDB unavailable"));
    });
  }
  return dbPromise;
}

function reqAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB error"));
  });
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return reqAsPromise(db.transaction(store).objectStore(store).getAll() as IDBRequest<T[]>);
}

async function putAll(store: string, rows: unknown[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  const os = tx.objectStore(store);
  for (const row of rows) os.put(row);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB write failed"));
  });
}

function deleteWhere(rows: AnswerRow[], predicate: (a: AnswerRow) => boolean): AnswerRow[] {
  return rows.filter((a) => !predicate(a));
}

// Pure session build: score every answer, create the session + answer rows
// (with question snapshots), and apply the ledger rule (correct clears prior
// wrong rows for the same question). Returns the submit response shape.
export function buildSession(
  existing: AnswerRow[],
  meta: { section: string | null; difficulty: string | null; skill: string | null },
  answers: { questionId: number; response: string; question: Question }[],
): { session: Omit<SessionRow, "id">; answers: Omit<AnswerRow, "id">[]; result: { score: number; total: number; cleared: { questionId: number; removed: number }[]; results: { questionId: number; yourAnswer: string; correct: boolean; expected: string; explanation: string | null }[] } } {
  const now = new Date().toISOString();
  let score = 0;
  const results: {
    questionId: number;
    yourAnswer: string;
    correct: boolean;
    expected: string;
    explanation: string | null;
  }[] = [];
  const rows: Omit<AnswerRow, "id">[] = [];
  const cleared: { questionId: number; removed: number }[] = [];

  for (const a of answers) {
    const q = a.question;
    const s = scoreQuestion(
      { id: q.id, qtype: q.qtype, answer: q.answer, accepted_variants: q.acceptedVariants, explanation: q.explanation },
      a.response,
    );
    if (s.correct) score += s.score;
    rows.push({
      sessionId: 0,
      questionId: q.id,
      response: a.response,
      score: s.score,
      createdAt: now,
      snap: {
        qtype: q.qtype,
        section: q.section,
        prompt: q.prompt,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        tags: q.tags,
        difficulty: q.difficulty,
      },
    });
    if (s.correct) {
      const stale = existing.filter((r) => r.questionId === q.id && r.score === 0);
      existing = deleteWhere(existing, (r) => r.questionId === q.id && r.score === 0);
      if (stale.length > 0) cleared.push({ questionId: q.id, removed: stale.length });
    }
    results.push({
      questionId: q.id,
      yourAnswer: a.response,
      correct: s.correct,
      expected: s.expected,
      explanation: q.explanation,
    });
  }

  return {
    session: {
      section: meta.section,
      difficulty: meta.difficulty,
      skill: meta.skill,
      questionCount: answers.length,
      score,
      createdAt: now,
    },
    answers: rows,
    result: { score, total: results.length, cleared, results },
  };
}

export async function submitSession(
  meta: { section: string | null; difficulty: string | null; skill: string | null },
  answers: { questionId: number; response: string; question: Question }[],
): Promise<{ sessionId: number; score: number; total: number; cleared: { questionId: number; removed: number }[]; results: { questionId: number; yourAnswer: string; correct: boolean; expected: string; explanation: string | null }[] }> {
  const db = await openDb();
  const existing = await getAll<AnswerRow>(ANSWERS);
  const built = buildSession(existing, meta, answers);

  const tx = db.transaction([SESSIONS, ANSWERS], "readwrite");
  const sessStore = tx.objectStore(SESSIONS);
  const ansStore = tx.objectStore(ANSWERS);
  const sessionId = (await reqAsPromise(sessStore.add(built.session))) as number;
  for (const row of built.answers) {
    row.sessionId = sessionId;
    ansStore.add(row);
  }
  for (const r of built.result.cleared) {
    // delete prior wrong rows for the question (ledger rule)
    const all = await getAll<AnswerRow>(ANSWERS).catch(() => []);
    const stale = all.filter((x) => x.questionId === r.questionId && x.score === 0);
    for (const s of stale) {
      const delReq = ansStore.delete(s.id);
      await reqAsPromise(delReq);
    }
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("submit failed"));
  });

  return { sessionId, ...built.result };
}

export async function getMistakes(section?: string, limit = 100): Promise<import("./types").Mistake[]> {
  const rows = (await getAll<AnswerRow>(ANSWERS))
    .filter((a) => a.score === 0 && (!section || a.snap.section === section))
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);
  return rows.map((r) => ({
    answerId: r.id,
    sessionId: r.sessionId,
    questionId: r.questionId,
    qtype: r.snap.qtype as Question["qtype"],
    section: r.snap.section as Section,
    prompt: r.snap.prompt,
    options: r.snap.options ?? [],
    yourAnswer: r.response,
    expected: r.snap.answer,
    explanation: r.snap.explanation,
    tags: r.snap.tags,
    difficulty: r.snap.difficulty,
    answeredAt: r.createdAt,
  }));
}

export async function deleteMistakes(opts: { ids?: number[]; section?: string } = {}): Promise<{ deleted: number }> {
  const rows = await getAll<AnswerRow>(ANSWERS);
  const target = rows.filter((a) => {
    if (a.score !== 0) return false;
    if (opts.ids?.length) return opts.ids.includes(a.id);
    if (opts.section) return a.snap.section === opts.section;
    return true;
  });
  if (target.length > 0) await putAll(ANSWERS, rows.filter((a) => !target.includes(a)));
  return { deleted: target.length };
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// Port of the server /stats aggregation over local data (same semantics:
// accuracy on latest retained attempts; writing sessions excluded).
export function deriveStats(sessions: SessionRow[], answers: AnswerRow[], days: number): ProgressStats {
  const since = dayKey(new Date(Date.now() - days * 86_400_000).toISOString());
  const sess = sessions
    .filter((s) => s.section !== "writing" && dayKey(s.createdAt) >= since);

  const totalSessions = sess.length;
  const totalAnswered = sess.reduce((n, s) => n + s.questionCount, 0);
  const totalCorrect = sess.reduce((n, s) => n + s.score, 0);

  const byDate = new Map<string, { answered: number; correct: number }>();
  for (const s of sess) {
    const d = dayKey(s.createdAt);
    const e = byDate.get(d) ?? { answered: 0, correct: 0 };
    e.answered += s.questionCount;
    e.correct += s.score;
    byDate.set(d, e);
  }

  const dates = new Set(byDate.keys());
  let streak = 0;
  {
    let cursor = new Date();
    if (!dates.has(dayKey(cursor.toISOString()))) cursor = new Date(Date.now() - 86_400_000);
    while (dates.has(dayKey(cursor.toISOString()))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 86_400_000);
    }
  }

  let bestDay: ProgressStats["bestDay"] = null;
  for (const [d, e] of byDate) {
    if (e.answered < 5) continue;
    const acc = e.answered ? e.correct / e.answered : 0;
    if (!bestDay || acc > bestDay.accuracy) bestDay = { date: d, answered: e.answered, correct: e.correct, accuracy: acc };
  }

  const inRange = answers.filter((a) => dayKey(a.createdAt) >= since);
  const secCount = new Map<string, { answered: number; correct: number }>();
  for (const a of inRange) {
    const e = secCount.get(a.snap.section) ?? { answered: 0, correct: 0 };
    e.answered += 1;
    e.correct += a.score;
    secCount.set(a.snap.section, e);
  }
  const bySection: SectionStat[] = [...secCount.entries()].map(([section, e]) => ({
    section: section as Section,
    answered: e.answered,
    correct: e.correct,
    accuracy: e.answered ? e.correct / e.answered : 0,
  }));

  const tagAcc = new Map<string, { wrong: number; total: number }>();
  for (const a of inRange) {
    for (const t of a.snap.tags) {
      const e = tagAcc.get(t) ?? { wrong: 0, total: 0 };
      e.total += 1;
      if (a.score === 0) e.wrong += 1;
      tagAcc.set(t, e);
    }
  }
  const topTags: TagStat[] = [...tagAcc.entries()]
    .map(([tag, v]) => ({ tag, wrong: v.wrong, total: v.total, accuracy: v.total ? (v.total - v.wrong) / v.total : 0 }))
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 8);

  const sampled = bySection.filter((s) => s.answered >= 5);
  const focus = sampled.length > 0 ? sampled.reduce((a, b) => (b.accuracy < a.accuracy ? b : a)).section : null;

  const recent = [...sess]
    .sort((a, b) => b.id - a.id)
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      section: s.section,
      difficulty: s.difficulty === null ? null : Number(s.difficulty) || null,
      count: s.questionCount,
      score: s.score,
      createdAt: s.createdAt,
    }));

  return {
    days,
    totalSessions,
    totalAnswered,
    totalCorrect,
    accuracy: totalAnswered ? totalCorrect / totalAnswered : null,
    streak,
    bestDay,
    bySection,
    topTags,
    focus,
    recent,
  };
}

export async function getStats(days = 30): Promise<ProgressStats> {
  const [sessions, answers] = await Promise.all([getAll<SessionRow>(SESSIONS), getAll<AnswerRow>(ANSWERS)]);
  return deriveStats(sessions, answers, days);
}

export async function exportData(): Promise<string> {
  const [sessions, answers] = await Promise.all([getAll<SessionRow>(SESSIONS), getAll<AnswerRow>(ANSWERS)]);
  return JSON.stringify({ app: "hsgtrainer", version: 1, exportedAt: new Date().toISOString(), sessions, answers });
}

export async function importData(json: string): Promise<{ sessions: number; answers: number }> {
  const parsed = JSON.parse(json) as { sessions?: SessionRow[]; answers?: AnswerRow[] };
  if (!parsed || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.answers)) {
    throw new Error("not an HsgTrainer backup file");
  }
  const db = await openDb();
  const tx = db.transaction([SESSIONS, ANSWERS], "readwrite");
  tx.objectStore(SESSIONS).clear();
  tx.objectStore(ANSWERS).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("import failed"));
  });
  await putAll(SESSIONS, parsed.sessions);
  await putAll(ANSWERS, parsed.answers);
  return { sessions: parsed.sessions.length, answers: parsed.answers.length };
}

export async function clearAll(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([SESSIONS, ANSWERS], "readwrite");
  tx.objectStore(SESSIONS).clear();
  tx.objectStore(ANSWERS).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("clear failed"));
  });
}
