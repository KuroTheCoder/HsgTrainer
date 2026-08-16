# HsgTrainer — Architecture

$0 budget, free/community-first. Every choice below was verified against live free-tier docs (Aug 2026).

## Stack

| Layer | Choice | Free allowance | Notes |
|---|---|---|---|
| Frontend | React + Vite SPA → **Cloudflare Pages** | 100k req/day | Static; commercial use allowed (unlike Vercel Hobby) |
| API | **Cloudflare Worker** (Hono) | 100k req/day, 10ms CPU/invocation | I/O wait doesn't count against CPU; fine for LLM proxying |
| DB | **Cloudflare D1** (SQLite) | 5GB/account, 500MB/db, 5M rows read + 100k rows written per day | Scale-to-zero; no pause risk (vs Supabase 7-day pause) |
| AI | Adapter fallback chain (below) | Gemini 1,500 req/day; Groq 1,000 req/day; Workers AI 10k neurons/day | All no-card free tiers |
| Analytics | Cloudflare Web Analytics | Free, cookie-less | — |
| Domain | `hsgtrainer.pages.dev` | Free | Optional `is-a.dev` later |

## Why not Vercel/Supabase/OpenRouter-primary

- Vercel Hobby ToS restricts to personal/non-commercial use — wrong for a public community platform.
- Supabase free pauses projects after 7 days of inactivity and has no backups.
- OpenRouter `:free` caps at 50 req/day on a fresh account — not viable as primary.

## AI adapter (apps/api/src/ai/adapter.ts)

Single interface for AI calls; **never call providers directly** from routes.

```
Gemini 2.5 Flash (primary — best free quality, 1,500 req/day)
  → Groq llama-3.3-70b (fallback — no prompt training, 1,000 req/day)
  → Workers AI glm-4.7-flash (last resort — 10k neurons/day)
```

- 429/5xx → exponential backoff, then next provider in chain.
- Free-tier Gemini may use prompts to improve products (privacy note in ops docs); Groq does not.

## Quota guardrails (the $0 contract)

1. **Deterministic types never touch the AI.** MCQ/cloze/word-form scoring is a rule engine (`lib/scoring.ts`) — zero cost.
2. **Explanations are generated once, cached in D1 forever.** Generated on first wrong answer, capped at `EXPLAIN_DAILY_CAP` (default 100) per day. A ~1,000-question bank ≈ 1,000 one-time AI calls total.
3. **AI-scored submissions capped at 3 per user per day** (writing/transformation) → ~500 essays/day fits Gemini free tier. Mock-exam writing uses the same cap.
4. **No per-event analytics rows.** Only session-summary writes (~3–5 rows/session) → ~20k sessions/day D1 ceiling. The `/api/stats` endpoint is aggregate reads only (no extra writes).
5. **On-device writing diagnostics are free.** Readability/vocabulary/style checks in `apps/web/src/analyzeEssay.ts` run entirely in the browser — zero API cost.
6. Workers CPU limit (10ms/invocation): all heavy work (AI calls, large parsing) happens as awaited I/O; keep local compute light.

## API ↔ SPA origin split

In production the SPA (Pages) and API (Worker) live on **different origins**, so:

- The web client reads `VITE_API_BASE` (build-time env) and prefixes all `/api` calls with it; empty in local dev where Vite proxies `/api` → `:8787`. See `apps/web/.env.example`.
- The Worker's CORS allows only origins in the `ALLOWED_ORIGINS` secret (comma-separated). The default is `http://localhost:5173` — **you must set `ALLOWED_ORIGINS` to the Pages URL in production or the SPA's API calls will be CORS-blocked.**

## Repo topology

```
apps/web/    React SPA (Pages static), proxies /api → worker in dev
apps/api/    Hono worker: routes/, lib/ (scoring, normalization), ai/ (adapter), migrations/
content/     Seed/question-bank JSON per paper
scripts/     Import/seed utilities
docs/        This set of docs
```

## Deploy (see operations.md for detail)

- `apps/api` → `wrangler deploy` (worker with D1 binding)
- `apps/web` → `wrangler pages deploy dist`
- Secrets via `wrangler secret put` (never in git)
