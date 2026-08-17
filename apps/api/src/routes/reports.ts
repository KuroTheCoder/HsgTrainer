import { Hono } from "hono";
import type { Env } from "../env";

const reports = new Hono<{ Bindings: Env }>();

// -------- public: submit a report (question issue or bug) --------

reports.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return c.json({ error: "invalid body" }, 400);

  const reportType = body.type === "bug" ? "bug" : "question";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 100) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const questionId = Number.isInteger(body.questionId) ? Number(body.questionId) : null;
  const anonId = typeof body.anonId === "string" ? body.anonId.slice(0, 100) : null;

  if (!reason) return c.json({ error: "reason is required" }, 400);
  if (reportType === "question" && !questionId) return c.json({ error: "questionId is required" }, 400);

  const res = await c.env.DB.prepare(
    `INSERT INTO reports (report_type, question_id, reason, message, anon_id) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(reportType, questionId, reason, message || null, anonId)
    .run();

  return c.json({ id: Number(res.meta.last_row_id) }, 201);
});

export default reports;