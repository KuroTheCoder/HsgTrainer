export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[.…!?]$/, "");
}
