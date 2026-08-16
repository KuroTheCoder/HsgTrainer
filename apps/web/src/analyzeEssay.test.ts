import { describe, expect, it } from "vitest";
import { analyzeEssay } from "./analyzeEssay";

describe("analyzeEssay", () => {
  it("handles empty text without crashing", () => {
    const d = analyzeEssay("");
    expect(d.words).toBe(0);
    expect(d.sentences).toBe(1);
    expect(d.flags).toEqual([]);
  });

  it("flags weak words and computes readability on a wordy essay", () => {
    const d = analyzeEssay(
      "I really think that very many people have a lot of things to say about this stuff. " +
        "It is a thing that matters a great deal to everyone I know. We should get going on it soon.",
    );
    const ids = d.flags.map((f) => f.id);
    expect(ids).toContain("weak-very");
    expect(ids).toContain("weak-really");
    expect(ids).toContain("weak-a lot");
    expect(d.words).toBeGreaterThan(20);
    expect(d.readability.fleschKincaidGrade).toBeGreaterThan(0);
  });

  it("marks short simple text as easy to read", () => {
    const d = analyzeEssay("Cats are small. They like milk. The milk is warm and sweet.");
    expect(d.readability.label).toBe("very easy");
  });

  it("flags repeated content words when overused", () => {
    const d = analyzeEssay("Education helps everyone. Education changes lives. Education builds skills.");
    const over = d.overused.find((o) => o.word === "education");
    expect(over?.count).toBeGreaterThanOrEqual(3);
  });
});
