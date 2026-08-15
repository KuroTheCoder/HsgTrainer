import type { Env } from "../env";
import type { QuestionRow } from "../types";
import { bandFor, clampCriterion, totalOf, type CriterionScores } from "../lib/rubric";

export interface WritingScore {
  status: "ok" | "unavailable" | "error";
  criterionScores?: CriterionScores;
  total?: number;
  band?: string;
  justification?: string;
  fixes?: string[];
  error?: string;
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const TIMEOUT_MS = 9000;

/**
 * AI adapter — the ONLY place providers are called (see docs/architecture.md).
 * Fallback chain: Gemini → Groq → Workers AI. All free tiers, no card.
 * Providers are skipped when their key is not configured; total failure returns null
 * so callers degrade gracefully (e.g. no explanation yet).
 */

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<{ status: number; json: unknown }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as unknown;
  return { status: res.status, json };
}

async function gemini(env: Env, messages: ChatMessage[]): Promise<string | null> {
  if (!env.AI_GEMINI_KEY) return null;
  const { status, json } = await postJson(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    { Authorization: `Bearer ${env.AI_GEMINI_KEY}` },
    {
      model: "gemini-2.5-flash",
      messages,
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: "json_object" },
    },
  );
  if (status !== 200) return null;
  const data = json as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

async function groq(env: Env, messages: ChatMessage[]): Promise<string | null> {
  if (!env.AI_GROQ_KEY) return null;
  const { status, json } = await postJson(
    "https://api.groq.com/openai/v1/chat/completions",
    { Authorization: `Bearer ${env.AI_GROQ_KEY}` },
    {
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: "json_object" },
    },
  );
  if (status !== 200) return null;
  const data = json as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

async function workersAi(env: Env, messages: ChatMessage[]): Promise<string | null> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) return null;
  const { status, json } = await postJson(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/@cf/zai-org/glm-4.7-flash`,
    { Authorization: `Bearer ${env.CF_API_TOKEN}` },
    { messages },
  );
  if (status !== 200) return null;
  const data = json as { result?: { response?: string } };
  return data.result?.response ?? null;
}

/** Pull the first JSON object out of a model reply (handles markdown fences). */
export function extractJson(content: string): unknown | null {
  let text = content.trim();
  if (text.startsWith("```")) {
    const fence = text.indexOf("\n");
    text = fence === -1 ? "" : text.slice(fence + 1);
    text = text.replace(/```\s*$/, "").trim();
  }
  const start = text.indexOf("{");
  if (start === -1) return null;
  const candidate = text.slice(start);
  try {
    return JSON.parse(candidate);
  } catch {
    const end = candidate.lastIndexOf("}");
    if (end === -1) return null;
    try {
      return JSON.parse(candidate.slice(0, end + 1));
    } catch {
      return null;
    }
  }
}

async function chain(env: Env, messages: ChatMessage[]): Promise<string | null> {
  for (const call of [gemini, groq, workersAi]) {
    try {
      const content = await call(env, messages);
      if (content) return content;
    } catch {
      // provider down/rate-limited → next in chain
    }
  }
  return null;
}

const EXPLAIN_SYSTEM =
  "You write concise, exam-focused explanations for Vietnam HSG English practice questions. " +
  'Reply with JSON only: {"explanation": "..."}. Explain why the correct answer is right and name the ' +
  "explicit rule (stress pattern, collocation, derivation, grammar point). Under 120 words. " +
  "Do not mention being an AI.";

function questionToUserMessage(q: QuestionRow): string {
  return JSON.stringify({
    qtype: q.qtype,
    section: q.section,
    prompt: q.prompt,
    options: q.options ? JSON.parse(q.options) : null,
    answer: q.answer,
    acceptedVariants: q.accepted_variants ? JSON.parse(q.accepted_variants) : [],
    difficulty: q.difficulty,
  });
}

/**
 * Generate a cached explanation for a deterministic question. One-time cost per
 * question — the result is stored forever (see docs/architecture.md quota rules).
 * Returns null on missing keys/failure; callers must degrade gracefully.
 */
export async function generateExplanation(env: Env, q: QuestionRow): Promise<string | null> {
  const content = await chain(env, [
    { role: "system", content: EXPLAIN_SYSTEM },
    { role: "user", content: questionToUserMessage(q) },
  ]);
  if (!content) return null;
  const parsed = extractJson(content);
  if (typeof parsed !== "object" || parsed === null) return null;
  const explanation = (parsed as { explanation?: unknown }).explanation;
  return typeof explanation === "string" && explanation.trim() ? explanation.trim() : null;
}

const WRITING_SYSTEM =
  "You are an examiner for the Vietnam HSG national English exam (writing section). " +
  "Score the student's essay against these four criteria, each out of 5: " +
  "content (relevance and development of ideas), organization (coherence and cohesion), " +
  "vocabulary (range, precision, formal register), grammar (range and accuracy). " +
  'Reply with JSON only: {"criterionScores": {"content": 0-5, "organization": 0-5, "vocabulary": 0-5, "grammar": 0-5}, ' +
  '"justification": "2-4 sentences explaining the scores", "fixes": ["2-4 concrete, specific improvements"]}. ' +
  "Be strict but fair; score actual performance, not potential. Do not mention being an AI.";

export interface WritingDraft {
  prompt: string;
  answer: string;
  response: string;
}

/**
 * Score a writing submission with rubric-structured output.
 * Free-tier note: Gemini may use prompts to improve products; for essay content
 * prefer configuring Groq as primary if privacy matters (see docs/operations.md).
 */
export async function scoreWriting(env: Env, draft: WritingDraft): Promise<WritingScore> {
  const content = await chain(env, [
    { role: "system", content: WRITING_SYSTEM },
    {
      role: "user",
      content: JSON.stringify({
        task: draft.prompt,
        modelAnswerGuidance: draft.answer,
        studentAnswer: draft.response,
      }),
    },
  ]);
  if (!content) {
    return {
      status: "unavailable",
      error: "AI scoring is not configured yet (no AI keys set) — add AI_GEMINI_KEY to .dev.vars.",
    };
  }
  const parsed = extractJson(content);
  if (typeof parsed !== "object" || parsed === null) {
    return { status: "error", error: "AI returned an unparseable response" };
  }
  const raw = parsed as {
    criterionScores?: Record<string, unknown>;
    justification?: unknown;
    fixes?: unknown;
  };
  const cs = raw.criterionScores;
  if (typeof cs !== "object" || cs === null) {
    return { status: "error", error: "AI response missing criterionScores" };
  }
  const contentScore = clampCriterion(cs.content);
  const organizationScore = clampCriterion(cs.organization);
  const vocabularyScore = clampCriterion(cs.vocabulary);
  const grammarScore = clampCriterion(cs.grammar);
  if (contentScore === null || organizationScore === null || vocabularyScore === null || grammarScore === null) {
    return { status: "error", error: "AI response has invalid criterion scores" };
  }
  const criterionScores: CriterionScores = {
    content: contentScore,
    organization: organizationScore,
    vocabulary: vocabularyScore,
    grammar: grammarScore,
  };
  const total = totalOf(criterionScores);
  return {
    status: "ok",
    criterionScores,
    total,
    band: bandFor(total),
    justification: typeof raw.justification === "string" ? raw.justification : undefined,
    fixes: Array.isArray(raw.fixes) ? raw.fixes.filter((f): f is string => typeof f === "string").slice(0, 6) : [],
  };
}
