import { describe, expect, it } from "vitest";
import { parseNote, tagsInBody } from "./notes";
import { tokenize } from "./notes-md";

describe("parseNote", () => {
  it("extracts title and tags from frontmatter, strips the block", () => {
    const n = parseNote("---\ntitle: \"My Note\"\ntags: [grammar, cloze]\n---\n# Body heading\n\ncontent", "my-note");
    expect(n.title).toBe("My Note");
    expect(n.tags).toEqual(["grammar", "cloze"]);
    expect(n.body).toBe("# Body heading\n\ncontent");
  });

  it("falls back to H1 then slug", () => {
    expect(parseNote("# Heading only", "slug").title).toBe("Heading only");
    expect(parseNote("no heading", "slug").title).toBe("slug");
  });
});

describe("tagsInBody", () => {
  it("collects #tags in order, deduped", () => {
    expect(tagsInBody("a #cloze and #word-formation then #cloze")).toEqual(["cloze", "word-formation"]);
  });
});

describe("tokenize", () => {
  it("splits headings, paragraphs, lists, quotes, tables, code, callouts", () => {
    const blocks = tokenize(
      "# H\n\npara one\n\n- a\n- b\n\n1. x\n2. y\n\n> quote\n\n> [!tip] Pro tip\n> body\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1\n```\n\n---",
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      "h1",
      "p",
      "ul",
      "ol",
      "quote",
      "callout",
      "table",
      "code",
      "hr",
    ]);
  });

  it("groups task list items with their checked state", () => {
    const blocks = tokenize("- [x] done\n- [ ] todo");
    expect(blocks[0]).toEqual({ kind: "task", items: [["x", "done"], [" ", "todo"]] });
  });

  it("keeps paragraphs with internal line breaks merged", () => {
    const blocks = tokenize("line one\nline two");
    expect(blocks).toEqual([{ kind: "p", text: "line one\nline two" }]);
  });
});