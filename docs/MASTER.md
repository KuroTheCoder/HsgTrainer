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
| Practice (deterministic sections, instant scoring) | Shipped — **local-first** (client-scored, IndexedDB) |
| Mistake ledger + study loop ("Study now", per-card drill, auto-clear) | Shipped — **local** (browser IndexedDB) |
| Progress & analytics (/progress — accuracy, streaks, per-section bars, skill gaps) | Shipped — **local** (derived from browser data) |
| Mock exam (/exams — past papers, timed run, per-section results, writing stage) | Shipped — deterministic parts local, writing stage server (AI) |
| Writing bank (/writing — essay history + on-device diagnostics) | Shipped (server-side) |
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
| Study notes (/notes — curated Obsidian vault subset, wikilinks + callouts) | Shipped |
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
- **Parking lot (maintainer ideas, unscopped):** page-by-page UX/UI redesign, theme polish (transitions, more palettes/customization), storage strategy to stay costless, guided training path ("a 5-year-old gets it"), contribution UX simplification, pack distribution (Drive link → manual import, see `docs/product-notes.md` §7).

## 8. Recent work log (append newest at top)

- **2026-08-17** — Session: **end-user backup guide + Obsidian vault download + backlinks.** `/notes` gains a **backup-guide** note (idiot-proof, low-tech-first: exact clicks, where the file goes, restore, FAQ — renders as a normal note, linked from Settings → Data). Settings → Data now shows a "Last export" reminder + a step-by-step guide link. The sync script (`scripts/copy-notes.mjs`) now also computes a **backlinks map** in the `notes.json` manifest (wikilink scan across notes; the reader shows a "Linked from" section) and packages the curated vault (`content/vault-template/` — `.obsidian` minimal config + README) with the notes into **`hsgtrainer-vault.zip`** (bsdtar, dev-machine tool; skipped with a warning where missing), downloadable from the /notes landing — users can open the same vault in the real Obsidian app with their own plugins/themes. `copy-notes.mjs` path fix: script-relative, not CWD-relative (npm workspace lifecycle scripts run from the workspace dir). All on `master`, **not pushed**.
- **2026-08-17** — Session: **Obsidian study-notes viewer shipped** (`/notes`). Curated vault subset in `content/notes/**/*.md` → synced to `apps/web/public/notes/` by `scripts/copy-notes.mjs` (runs on predev/prebuild, writes a `notes.json` manifest) → fetched at runtime (no API, $0). Zero-dep renderer `apps/web/src/notes-md.tsx` (tokenizer + React renderer, unit-tested): headings, paragraphs, lists incl. task lists, tables, code fences, blockquotes, Obsidian callouts (`[!note]`, `[!tip]`, `[!warning]`, `[!danger]`, `[!info]`, `[!example]`, `[!quote]`), wikilinks `[[slug]]` → internal navigation (missing targets render muted), `#tag` chips using the app's tag palette, external links; embeds `![[x]]` link-out only. Frontmatter (title/tags) parsed client-side, hidden from render. UI: sticky sidebar with live search (title/tags) + reader at 66ch / 1.7 line-height (ux guidance: 65–75ch, relaxed leading), horizontal scrollable nav under 900px; new "Study" sidebar group + `label-study` token. Demo vault (index, word-formation, cloze-strategy) exercises every syntax feature — real vault files drop in with zero code changes. Graph/canvas/plugins deliberately out of scope (see `docs/product-notes.md` §8). All on `master`, **not pushed**.
- **2026-08-17** — Session: **local-first migration (the grind goes client-side).** New workspace package `packages/scoring` (`@hsgtrainer/scoring` — `scoreQuestion`/`normalizeAnswer`/types moved out of the API; consumed by both API and web; root workspaces now include `packages/*`). Practice and mock exams no longer create server sessions: draws are plain reads (`GET /questions` gained `ids` + `paperId` params, answers now included in the payload for client scoring), and submissions are scored in the browser by the new `apps/web/src/store.ts` IndexedDB ledger (db `hsg`, `sessions` + `answers` with full question snapshots so mistakes/progress work offline; same semantics as the server — a correct retry clears prior wrong rows; `deriveStats` is a faithful port of the server `/stats` aggregation, unit-tested). Mistakes/Progress/Home read the local store; mistake deletion is now user-local (no admin gate). AI explanation fill survives via a new `POST /explain` (logic extracted to `lib/explain.ts`, shared with the legacy submit route, same daily cap). Settings gained a **Data** tab: export/import backup file + delete-all; new `docs/backup.md` guide (export → drop into a Drive/iCloud/OneDrive synced folder). Legacy server session routes remain for API compat. All on `master`, **not pushed**.
- **2026-08-17** — Session: reporting + whole-source verify + admin button colors. Users can flag a question (Report button in practice/exam question actions — wrong key / unclear prompt / duplicate / audio / other) or file a bug (new "Report" tab in Settings); both land in the new `reports` table (migration 0007, docs updated) and get triaged in a new admin **Reports** tab (open/resolved, "Open in queue" shortcut). "Verify all" / "Reject all" buttons flip a whole source at once (new `POST /admin/sources/:id/questions/status` with `fromStatus` guard) — in the review queue when a source filter is active, and per-source in the Sources tab (confirm dialog; spot-check first). Admin action colors are now semantic: **verify = green** (`btn-success`), **reject = red** (`btn-danger`), **edit = blue** (`btn-edit`). Fixed the long-dormant migration bug: `0006_audio.sql` re-written to the pattern that actually works — miniflare ignores `defer_foreign_keys` and the rename-swap rewrites child FK clauses, so the rebuild uses DROP + rename with `foreign_keys OFF` (applies cleanly on fresh DBs with no answers rows; the local DB already had the schema, so 0006+0007 were recorded manually via `d1_migrations`). All on `master`, **not pushed**.
- **2026-08-17** — Session: admin review queue — verbal question view + inline editing + scrollable list. "Details" now renders the question readably (full prompt with `____` blank highlight, key chip, variant/keyword/tag chips, difficulty, source, explanation) instead of a JSON dump; "Edit" opens an inline labeled form (prompt, key, comma-list variants/keywords/tags, explanation, qtype/section/difficulty selects) saved via the existing PATCH endpoint (extended to accept `qtype`/`section`); the queue list scrolls inside its own box (filters/bulk bar/pager stay fixed, no page-long scroll). PATCH round-trip smoke-tested live (incl. qtype/section change) and test edits to sample rows 5/6 restored to seed values. All on `master`, **not pushed**.
- **2026-08-17** — Session: admin review queue upgraded — filter bar (status / source / section / qtype / free-text search on prompt+key), pagination (50/page with `total` count; API now supports `offset` + `section`/`qtype`/`source`/`tag`/`q` params), per-page checkbox selection with bulk Verify/Reject action bar (batched via the existing `POST /admin/questions/status` endpoint), plus per-row quick buttons. Live-verified against local D1 (3903 unverified, filters + search + pagination all correct). All on `master`, **not pushed**.
- **2026-08-17** — Session: first real content — 4000 Câu Word Form Nâng Cao (Chuyên Anh Tutorials) parsed from PDF into `content/papers/4000-wordform.json` (3986 `word-form`/`word-formation` questions, answer-key variants split into `acceptedVariants`, base words as `keyWords`, difficulty defaulted C1). `type: community` → imports **unverified** (not in live bank until human review — key spot-check required). 14 questions excluded (7 book typos with no blank, 7 two-blank sentences the schema can't hold). Imported into local D1 (3976 new rows; import.mjs now auto-chunks at the 500-question bulk cap and reports real statuses). Practice gained a **tag filter** (API `tag` param on draw/session + UI field + `?tag=` URL param) so book drills can be practiced specifically, scrambled, in user-sized sessions; admin gained a bulk-status endpoint used by `import.mjs --verify <status>` (explicit post-spot-check flip — never automatic). All on `master`, **not pushed**.
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
| `docs/backup.md` | Local-data backup guide (export → synced folder) |
| `docs/roadmap.md` | Deferred directions |