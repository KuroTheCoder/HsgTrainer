import { describe, expect, it } from "vitest";
import { bandFor, clampCriterion, MAX_TOTAL, totalOf } from "./rubric";

describe("rubric", () => {
  it("computes totals", () => {
    expect(totalOf({ content: 4, organization: 3, vocabulary: 4, grammar: 3 })).toBe(14);
    expect(MAX_TOTAL).toBe(20);
  });
  it("maps totals to bands", () => {
    expect(bandFor(20)).toBe("A+");
    expect(bandFor(18)).toBe("A+");
    expect(bandFor(17)).toBe("A");
    expect(bandFor(16)).toBe("A");
    expect(bandFor(14)).toBe("B+");
    expect(bandFor(12)).toBe("B");
    expect(bandFor(10)).toBe("C+");
    expect(bandFor(4)).toBe("C");
  });
  it("clamps criterion scores to 0–5 and rejects junk", () => {
    expect(clampCriterion(5)).toBe(5);
    expect(clampCriterion(7)).toBe(5);
    expect(clampCriterion(-2)).toBe(0);
    expect(clampCriterion(3.4)).toBe(3);
    expect(clampCriterion("x")).toBeNull();
    expect(clampCriterion(null)).toBeNull();
  });
});
