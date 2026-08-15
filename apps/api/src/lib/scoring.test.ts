import { describe, expect, it } from "vitest";
import { scoreQuestion } from "./scoring";
import { normalizeAnswer } from "./normalize";
import type { QuestionRow } from "../types";

function q(partial: Partial<QuestionRow>): QuestionRow {
  return {
    id: 1,
    source_id: null,
    qtype: "fill-blank",
    section: "lexico-grammar",
    prompt: "test",
    options: null,
    answer: "answer",
    accepted_variants: "[]",
    rubric_ref: null,
    explanation: null,
    tags: "[]",
    key_words: "[]",
    difficulty: "B2",
    verification_status: "verified",
    prompt_hash: "x",
    submitted_by: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: "",
    ...partial,
  };
}

describe("normalizeAnswer", () => {
  it("trims and lowercases", () => {
    expect(normalizeAnswer("  Hello World  ")).toBe("hello world");
  });
  it("collapses inner whitespace", () => {
    expect(normalizeAnswer("a  b\t c")).toBe("a b c");
  });
  it("strips trailing sentence punctuation", () => {
    expect(normalizeAnswer("answer.")).toBe("answer");
    expect(normalizeAnswer("answer…")).toBe("answer");
    expect(normalizeAnswer("answer!")).toBe("answer");
  });
});

describe("scoreQuestion", () => {
  it("scores mcq by option letter, case-insensitive", () => {
    const mcq = q({ qtype: "mcq", answer: "B" });
    expect(scoreQuestion(mcq, "b").correct).toBe(true);
    expect(scoreQuestion(mcq, "A").correct).toBe(false);
  });

  it("matches key with variants, case and space insensitive", () => {
    const fb = q({ answer: "rely on", accepted_variants: '["rely upon", "RELY  ON."]' });
    expect(scoreQuestion(fb, "rely on").correct).toBe(true);
    expect(scoreQuestion(fb, "rely upon").correct).toBe(true);
    expect(scoreQuestion(fb, "rely on.").correct).toBe(true);
    expect(scoreQuestion(fb, "depend on").correct).toBe(false);
  });

  it("accepts word-form alternates from the key list", () => {
    const wf = q({ qtype: "word-form", answer: "reliance", accepted_variants: '["reliant"]' });
    expect(scoreQuestion(wf, "reliance").correct).toBe(true);
    expect(scoreQuestion(wf, "reliant").correct).toBe(true);
    expect(scoreQuestion(wf, "reliable").correct).toBe(false);
  });

  it("never AI-scores deterministic types silently: transformation returns 0", () => {
    const t = q({ qtype: "transformation", answer: "It was she who won." });
    expect(scoreQuestion(t, "She won it").correct).toBe(false);
    expect(scoreQuestion(t, "She won it").score).toBe(0);
  });
});
