# HsgTrainer — Agent Guide

Training platform for Vietnam HSG (học sinh giỏi) English exams. Free/community-first, $0 running cost.

## Repo layout

```
apps/web/     React + Vite SPA (Cloudflare Pages static)
apps/api/     Cloudflare Worker (Hono) — API, D1, scoring engine, AI adapter
content/      Seed content JSON (question banks by paper)
docs/         Architecture, data model, content schema, operations
scripts/      Utility scripts (import, seed)
```

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install all workspaces (run once) |
| `npm run dev:api` | Start API worker locally on :8787 (wrangler dev, D1 local) |
| `npm run dev:web` | Vite dev server on :5173, proxies `/api` → :8787 |
| `npm run typecheck` | Type-check all workspaces |
| `npm test` | Run vitest suites (scoring engine, etc.) |
| `npm run build` | Production build of all workspaces |

## Conventions

- **UI/UX rule (mandatory):** whenever planning, designing, building, or reviewing anything UI/UX-related — pages, components, layouts, design systems, styling, accessibility — the `ui-ux-pro-max` skill MUST be loaded and followed first (run its `search.py` design-system/domain/stack queries and apply the returned guidance). This applies to every agent and all future sessions.
- TypeScript everywhere; no `any` in new code unless forced and documented.
- API routes live in `apps/api/src/routes/*.ts`; domain logic (scoring, normalization) in `apps/api/src/lib/*.ts` — keep routes thin.
- All SQL goes through D1 migrations in `apps/api/migrations/` (numbered `NNNN_*.sql`); never hand-edit production D1.
- AI calls only through the adapter in `apps/api/src/ai/adapter.ts` — never call providers directly. Fallback chain: Gemini → Groq → Workers AI.
- Content rules: official papers import as `verified`; community content starts `unverified`; AI-generated questions are blocked from the live bank until human-verified.
- Deterministic question types (mcq, fill-blank, word-form, cloze) never call the AI. Writing/transformation scoring is capped per user per day (3).
- Docs ship with the code: if a change touches schema, scoring, or AI behavior, update the matching file under `docs/`.
- **Parking lot:** at session start, read `docs/product-notes.md` and surface any parked ideas to the maintainer — they want to be reminded.
- UI copy stays in English in the repo — the maintainer translates to Vietnamese themselves. Do not translate user-facing strings proactively.
- **Git flow:** after a task is done and verified (typecheck/build green), commit it immediately with a clear one-line message describing the change — commit after every task. Do NOT push: pushing is batched and only happens when the user asks. Big features/components get their own branch (`feature/<name>`) from the start and merge back when done.

## Environment (never commit)

- `apps/api/.dev.vars` — local dev secrets: `ADMIN_TOKEN`, `AI_GEMINI_KEY`, `AI_GROQ_KEY` (optional; adapter degrades gracefully)
- Cloudflare secrets via `wrangler secret put` for production.

## Docs index

- `docs/CONTEXT.md` — product/domain overview
- `docs/architecture.md` — stack + free-tier quota rules
- `docs/data-model.md` — D1 schema + provenance design
- `docs/content-schema.md` — canonical question-draft schema + import workflow (read this before keying papers)
- `docs/rubric.md` — writing rubric + AI scoring prompt (M3)
- `docs/operations.md` — quota guardrails, keys, deploy
