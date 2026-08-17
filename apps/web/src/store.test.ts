import { describe, expect, it } from "vitest";
import { buildSession, deriveStats, type AnswerRow, type SessionRow } from "./store";
import type { Question } from "./types";

function q(id: number, section: string, tags: string[] = []): Question {
  return {
    id,
    qtype: "fill-blank",
    section: section as Question["section"],
    prompt: `p${id}`,
    options: [],
    acceptedVariants: [],
    answer: "ans",
    difficulty: "B2",
    tags,
    keyWords: [],
    verificationStatus: "verified",
    explanation: null,
    audio: null,
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function sess(partial: Partial<SessionRow>): SessionRow {
  return { id: 1, section: null, difficulty: null, skill: null, questionCount: 2, score: 2, createdAt: daysAgo(1), ...partial };
}

describe("buildSession (ledger semantics)", () => {
  it("scores deterministically and clears prior wrong rows on a correct retry", () => {
    const q1 = q(1, "lexico-grammar");
    const priorWrong: AnswerRow[] = [
      { id: 5, sessionId: 1, questionId: 1, response: "wrong", score: 0, createdAt: "2026-08-01T00:00:00Z", snap: { qtype: "fill-blank", section: "lexico-grammar", prompt: "p1", options: null, answer: "ans", explanation: null, tags: [], difficulty: "B2" } },
    ];
    const built = buildSession(priorWrong, { section: null, difficulty: null, skill: null }, [{ questionId: 1, response: "ans", question: q1 }]);
    expect(built.result.results[0]?.correct).toBe(true);
    expect(built.result.cleared).toEqual([{ questionId: 1, removed: 1 }]);
  });

  it("keeps wrong rows when the retry is still wrong", () => {
    const q1 = q(1, "lexico-grammar");
    const priorWrong: AnswerRow[] = [
      { id: 5, sessionId: 1, questionId: 1, response: "wrong1", score: 0, createdAt: "2026-08-01T00:00:00Z", snap: { qtype: "fill-blank", section: "lexico-grammar", prompt: "p1", options: null, answer: "ans", explanation: null, tags: [], difficulty: "B2" } },
    ];
    const built = buildSession(priorWrong, { section: null, difficulty: null, skill: null }, [{ questionId: 1, response: "wrong2", question: q1 }]);
    expect(built.result.results[0]?.correct).toBe(false);
    expect(built.result.cleared).toEqual([]);
  });
});

describe("deriveStats (server /stats port)", () => {
  it("computes accuracy, streak, best day, sections, tags, focus, recent", () => {
    const sessions: SessionRow[] = [
      sess({ id: 1, questionCount: 2, score: 1, createdAt: daysAgo(1) }),
      sess({ id: 2, questionCount: 1, score: 1, createdAt: daysAgo(0) }),
    ];
    const answers: AnswerRow[] = [
      { id: 1, sessionId: 1, questionId: 1, response: "a", score: 1, createdAt: daysAgo(1), snap: { qtype: "fill-blank", section: "lexico-grammar", prompt: "p", options: null, answer: "a", explanation: null, tags: ["verbs"], difficulty: "B2" } },
      ...[2, 3, 4, 5, 6].map((n) => ({
        id: n,
        sessionId: 1,
        questionId: n,
        response: "b",
        score: 0,
        createdAt: daysAgo(1),
        snap: { qtype: "fill-blank", section: "reading" as const, prompt: "p", options: null, answer: "c", explanation: null, tags: ["vocab"], difficulty: "C1" },
      })),
    ];
    const s = deriveStats(sessions, answers, 30);
    expect(s.totalSessions).toBe(2);
    expect(s.totalAnswered).toBe(3);
    expect(s.totalCorrect).toBe(2);
    expect(s.accuracy).toBeCloseTo(2 / 3);
    expect(s.streak).toBe(2);
    expect(s.bySection.find((x) => x.section === "reading")?.accuracy).toBe(0);
    expect(s.topTags[0]?.tag).toBe("vocab");
    expect(s.focus).toBe("reading");
    expect(s.recent[0]?.id).toBe(2);
  });

  it("excludes writing sessions from the totals", () => {
    const sessions: SessionRow[] = [
      sess({ id: 1, section: "writing", questionCount: 1, score: 1, createdAt: "2026-08-10T08:00:00Z" }),
    ];
    const s = deriveStats(sessions, [], 30);
    expect(s.totalSessions).toBe(0);
    expect(s.totalAnswered).toBe(0);
  });

  it("ignores sessions outside the requested window", () => {
    const sessions: SessionRow[] = [
      sess({ id: 1, questionCount: 1, score: 1, createdAt: "2026-01-01T08:00:00Z" }),
    ];
    const s = deriveStats(sessions, [], 7);
    expect(s.totalSessions).toBe(0);
  });
});