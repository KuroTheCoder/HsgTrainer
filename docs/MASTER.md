# HsgTrainer — MASTER.md (living context — read first)

The one file that gets any agent (or human) to full context fast: what this product is, where it stands, what's in flight, what's parked, and how things work here.

> **Maintenance rule (mandatory):** update this file at the end of every session or task — append to the work log (§8), refresh status (§9), adjust the feature map (§4). A stale MASTER.md is worse than none. Check AGENTS.md for the full convention set.

## 1. What it is

Training platform for **Vietnam HSG English exams** (kỳ thi chọn học sinh giỏi) — free, community-first, $0 running cost by design. HSG candidates (grade 9–12), self-study students, and teachers coaching HSG teams. Core loop: pick a section/paper → train → instant feedback → mistakes land in a study ledger → progress analytics close the loop. Deterministic scoring for fixed-answer types; AI (capped 3/day) only for writing/transformation feedback.

## 2. Stack & architecture (summary — see `docs/architecture.md`)

| Piece | What |
|---|---|
| `apps/web/` | React + Vite SPA, static on Cloudflare Pages; all personal data in the browser (localStorage) |
| `apps/api/` | Cloudflare Worker (Hono): API routes, D1 (question bank + aggregate analytics), scoring engine, AI adapter |
| `content/` | Seed content JSON (question banks by paper) |
| `scripts/` | Utility scripts (import, seed) |
| `docs/` | Design docs (this file is the index + status) |

Rules that keep it free: deterministic-first scoring, AI only where it earns the 3/day cap, aggregate reads for analytics (no per-event rows), AI calls only through `apps/api/src/ai/adapter.ts` (Gemini → Groq → Workers AI).

## 3. Commands

| Command | What |
|---|---|
| `npm install` | Install all workspaces (once) |
| `npm run dev:api` | API worker locally on :8787 (wrangler dev, D1 local) |
| `npm run dev:web` | Vite dev server on :5173, proxies `/api` → :8787 |
| `npm run typecheck` | Type-check all workspaces (run after every task) |
| `npm test` | Vitest suites (scoring engine, etc.) |
| `npm run build` | Production build of all workspaces |

## 4. Feature map

| Area | Status |
|---|---|
| Practice (deterministic sections, instant scoring) | Shipped |
| Mistake ledger + study loop ("Study now", per-card drill, auto-clear) | Shipped |
| Progress & analytics (/progress — accuracy, streaks, per-section bars, skill gaps) | Shipped |
| Mock exam (/exams — past papers, timed run, per-section results, writing stage) | Shipped |
| Writing bank (/writing — essay history + on-device diagnostics) | Shipped |
| AI writing feedback (HSG rubric, 3 credits/day) | Shipped |
| Contribute + admin review | Shipped |
| Free tools archive (dictionaries, external graders with consent gate) | Shipped |
| Account (/account — local anonymous profile) | Shipped |
| Teacher hub (/teachers — classroom guide + shareable practice links) | Shipped |
| Admin dashboard (/admin — bank health, review queue, debug playground in dev) | Shipped |
| Settings hub (/settings — tabbed: Appearance / Sounds / Dictionary) | Shipped |
| Theming (12 palettes, custom color, 6 backgrounds, intensity, presets, share links) | Shipped |
| Sound effects (per-sound volumes) + confetti on ≥80% runs | Shipped |
| Snap slider (boxed custom slider: count/time pickers) | Shipped |
| Listening section (mcq + audio clip, static mp3s, native player) | Shipped (basics) |
| Vocabulary trainer (Leitner spaced review on the word list, client-side) | Shipped |
| Teacher/classroom rosters, data sync/portability | Roadmap |
| Content depth (key real papers) | Ongoing |

## 5. Key conventions (full list in AGENTS.md)

- TypeScript everywhere; no `any` unless forced and documented. Routes thin; domain logic in `apps/api/src/lib/*.ts`.
- SQL only via numbered migrations in `apps/api/migrations/`; never hand-edit production D1.
- Content trust: official papers = `verified`; community = `unverified`; AI-generated questions blocked until human-verified.
- UI copy stays English in the repo — the maintainer translates to Vietnamese themselves.
- Git: commit per task (typecheck/build green first); do NOT push unless asked; big features get `feature/<name>` branches merged when done.
- Session start: read this file; surface parked ideas from `docs/product-notes.md`.
- UI/UX work: load the `ui-ux-pro-max` skill first (mandatory per AGENTS.md).

## 6. Design language (sketchbook / neubrutalism)

Hand fonts (Kalam display, Patrick Hand UI), wobbly irregular radii, hard offset shadows, directional 3D bevels (light top-left, `--bevel-light/--bevel-dark` tokens), gloss + press states, scribble underlines, paper grain, notebook margin line. Tokens in `apps/web/src/styles.css` `:root`. Theme = palette + background pattern + intensity; stored client-side with share links.

## 7. Roadmap & parking lot (short — see `docs/roadmap.md`, `docs/product-notes.md`)

- **Shortlist:** content depth (import real past papers — the moat; includes a missing **listening** section, see `docs/product-notes.md` §6).
- **Exam flow depth:** review-only replay + draft autosave/resume shipped; still open: per-section clocks (needs official per-part timings), paper difficulty calibration (needs real content).
- **Parked:** teacher/classroom (needs account layer — conflicts with anonymous-first), AI question authorship, data sync/portability, richer writing diagnostics.
- **Parking lot (maintainer ideas, unscopped):** page-by-page UX/UI redesign, theme polish (transitions, more palettes/customization), storage strategy to stay costless, guided training path ("a 5-year-old gets it"), contribution UX simplification.

## 8. Recent work log (append newest at top)

- **2026-08-17** — Session: content-keying ergonomics — `npm run lint:content` (scripts/lint-content.mjs, zero-dep local validator of the canonical schema with fix-included messages, exit 1 on errors) + selection toolbar now trims trailing punctuation (commas/periods/quotes) and line-break hyphens, not just whitespace. Ready for the maintainer's ~5 test papers. All on `master`, **not pushed**.
- **2026-08-17** — Session: exam flow depth — review-only replay (re-run a finished exam with no timer/score; per-question "Reveal answer" shows your answer + correct + explanation) and draft autosave/resume (exam answers, timer deadline, and writing draft survive refresh/close via localStorage; "Resume exam"/"Discard" banner on the paper picker). Deliberately deferred: per-section clocks (needs official per-part timings) and difficulty calibration (needs real content). Vocabulary trainer + highlight fixes earlier same day (see below). All on `master`, **not pushed**.
- **2026-08-17** — Session: vocabulary trainer shipped (Leitner spaced review on the word list — levels 0–5, intervals 1/3/7/14/30 days, self-graded forgot/almost/knew, re-drill forgot words in-session, look-up button, level dots + due panel; pure scheduler in `vocabSchedule.ts` + 5 unit tests). All on `master`, **not pushed**.
- **2026-08-16** — Session: listening basics shipped (section + `audio` column, migration 0006 rebuilds questions table; player in practice/exam/review; audio field in admin/contribute/bulk CSV; demo listening questions; `/audio/` static-files convention). All on `master`, **not pushed**.
- **2026-08-16** — Session: SnapSlider custom redesign (boxed, ticks on track, no-lag bubble, hover-sound steps) → countdown picker uses it; debug playground moved into Admin (dev tab); directional 3D pass (bevels, gloss, press states); background shift fix (own fixed `bg-layer` div); color-coded tags everywhere (sections/qtypes/hashed free-form, progress scores by ratio); `docs/product-notes.md` parking lot + MASTER.md created. All on `master`, **not pushed**.
- **2026-08-16** — Earlier: theming redo merged (feature/theming); sfx + confetti + tabbed settings hub + SnapSlider merged (feature/sfx).

## 9. Current state / handoff facts

- **Branch:** `master`. All feature branches merged (`feature/sfx`, `feature/theming`, `feature/progress-study-exam`, `feature/ui-rework`, `feature/vocab-dictionary`).
- **Push state:** `master` is 35 commits ahead of `origin/master`, 1 behind (remote has a duplicate-content PR merge of vocab-dictionary — safe to reconcile on push; do NOT push without being asked).
- **Unmerged work:** none. **Open TODOs:** none tracked.
- **Environment (never commit):** `apps/api/.dev.vars` — `ADMIN_TOKEN`, `AI_GEMINI_KEY`, `AI_GROQ_KEY` (optional; adapter degrades gracefully). Production secrets via `wrangler secret put`.

## 10. Docs index

| File | Purpose |
|---|---|
| `docs/MASTER.md` | This file — living status + context |
| `docs/product-notes.md` | Maintainer parking lot (surface at session start) |
| `docs/CONTEXT.md` | Product/domain overview (deep version of §1) |
| `docs/architecture.md` | Stack + free-tier quota rules |
| `docs/data-model.md` | D1 schema + provenance design |
| `docs/content-schema.md` | Canonical question-draft schema + import workflow (read before keying papers) |
| `docs/rubric.md` | Writing rubric + AI scoring prompt |
| `docs/operations.md` | Quota guardrails, keys, deploy |
| `docs/roadmap.md` | Deferred directions |