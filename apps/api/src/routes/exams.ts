import { Hono } from "hono";
import type { Env } from "../env";

const exams = new Hono<{ Bindings: Env }>();

// Mock-exam papers: verified official sources with per-section question counts.
// Writing questions are listed separately (AI-scored stage, capped per day).
exams.get("/papers", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT s.id, s.name, s.grade, s.year, s.province, q.section AS section,
       COUNT(*) AS n
     FROM sources s
     JOIN questions q ON q.source_id = s.id
     WHERE s.type = 'official' AND q.verification_status = 'verified'
     GROUP BY s.id, q.section
     ORDER BY s.year DESC NULLS LAST, s.id, q.section`,
  ).all<{
    id: number;
    name: string;
    grade: string | null;
    year: number | null;
    province: string | null;
    section: string;
    n: number;
  }>();

  const byPaper = new Map<
    number,
    { id: number; name: string; grade: string | null; year: number | null; province: string | null; total: number; writing: number; sections: Record<string, number> }
  >();
  for (const r of results) {
    const p = byPaper.get(r.id) ?? {
      id: r.id,
      name: r.name,
      grade: r.grade,
      year: r.year,
      province: r.province,
      total: 0,
      writing: 0,
      sections: {},
    };
    p.total += r.n;
    if (r.section === "writing") p.writing += r.n;
    p.sections[r.section] = (p.sections[r.section] ?? 0) + r.n;
    byPaper.set(r.id, p);
  }

  const papers = [...byPaper.values()].filter((p) => p.total > 0);
  return c.json({ papers });
});

export default exams;
