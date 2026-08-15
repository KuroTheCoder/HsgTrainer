import { describe, expect, it } from "vitest";
import { extractJson } from "../ai/adapter";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"explanation": "hi"}')).toEqual({ explanation: "hi" });
  });
  it("parses fenced JSON", () => {
    const out = extractJson('```json\n{"explanation": "hi"}\n```');
    expect(out).toEqual({ explanation: "hi" });
  });
  it("parses JSON after prose", () => {
    const out = extractJson('Here you go:\n{"a": 1}');
    expect(out).toEqual({ a: 1 });
  });
  it("returns null on garbage", () => {
    expect(extractJson("not json at all")).toBeNull();
    expect(extractJson("")).toBeNull();
  });
});
