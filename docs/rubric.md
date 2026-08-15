# HsgTrainer — Writing Rubric & AI Scoring

Writing (and transformation) submissions are scored by the AI adapter (`apps/api/src/ai/adapter.ts` → `scoreWriting`) against a rubric-aligned system prompt. The prompt asks for strict JSON; the route clamps and re-validates everything server-side, so no AI output is ever trusted blindly.

## Rubric dimensions

Four criteria, each out of **5**, total **20**:

| Criterion | Out of | Looks at |
|---|---|---|
| Content | 5 | Relevance to the task, idea development, completeness |
| Organization | 5 | Coherence, cohesion, paragraphing, logical flow |
| Vocabulary | 5 | Range, precision, formal register, avoiding repetition |
| Grammar | 5 | Range and accuracy of structures, word order, articles, agreement |

## Band conversion (HSG-style)

| Total | Band |
|---|---|
| 18–20 | A+ |
| 16–17 | A |
| 14–15 | B+ |
| 12–13 | B |
| 10–11 | C+ |
| 0–9 | C |

Band conversion lives in `apps/api/src/lib/rubric.ts` (`bandFor`, `clampCriterion`, `totalOf`) — pure functions with unit tests in `rubric.test.ts`.

## Prompt & output contract

The scoring prompt (`WRITING_SYSTEM` in `adapter.ts`) instructs the model to reply with JSON only:

```json
{
  "criterionScores": { "content": 3, "organization": 4, "vocabulary": 3, "grammar": 3 },
  "justification": "2–4 sentences explaining the scores",
  "fixes": ["2–4 concrete, specific improvements"]
}
```

Server-side validation (never skipped):

1. `criterionScores` values are clamped to 0–5 integers (`clampCriterion`); anything non-numeric → `status: "error"`.
2. `total` and `band` are recomputed from the clamped scores — never taken from the model.
3. `fixes` is filtered to strings, capped at 6 items.

## Flow (POST /api/writing/score)

1. Anonymous id required (`X-Anon-Id`).
2. Question must exist and be `verified` + `qtype = 'writing'`.
3. Daily cap check: count of today's answers with `criterion_scores IS NOT NULL` for this user (`WRITE_DAILY_CAP`, default 3) → `429` when exhausted.
4. Call `scoreWriting`; if no AI keys are configured the adapter returns `unavailable` → route answers `503` with a friendly message.
5. Persist a `sessions` row (`section = 'writing'`) + an `answers` row carrying `score`, `criterion_scores` (JSON), and `feedback` (JSON: band, justification, fixes).
6. Response includes the feedback plus `remaining` feedback credits for the day.

Practice-draw endpoints (`GET /api/writing/questions`) serve only verified writing prompts. Deterministic question types never call the AI.

## Privacy

Free-tier Gemini may use prompts to improve Google products. Student essays are sensitive: prefer setting `AI_GROQ_KEY` and, if the audience objects, ordering Groq before Gemini in `chain()` (see `operations.md`).
