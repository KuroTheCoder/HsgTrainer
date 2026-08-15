import type { ReactNode } from "react";

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/**
 * Minimal inline markdown for question prompts/explanations.
 * Supports **bold**, *italic* and `code`. Deliberately ignores _
 * so cloze blanks like "____" render as-is. React escapes all text.
 * Optional `highlights` wrap every occurrence of each string in <mark>.
 */
export function renderMarkdown(text: string, highlights: string[] = []): ReactNode[] {
  let parts: ReactNode[] = [text];
  for (const hl of highlights) {
    if (!hl) continue;
    const next: ReactNode[] = [];
    for (const part of parts) {
      if (typeof part !== "string" || !part.includes(hl)) {
        next.push(part);
        continue;
      }
      const chunks = part.split(hl);
      chunks.forEach((chunk, i) => {
        if (chunk) next.push(chunk);
        if (i < chunks.length - 1) next.push(<mark key={`${hl}-${i}`}>{hl}</mark>);
      });
    }
    parts = next;
  }
  const out: ReactNode[] = [];
  for (const part of parts) {
    if (typeof part === "string") out.push(...renderInline(part));
    else out.push(part);
  }
  return out;
}
