# HsgTrainer — Roadmap (deferred directions)

Deliberately deferred during the progress/study/exam push (branch `feature/progress-study-exam`). Revisit in priority order when the current features have real usage.

## Shortlist (in-flight / next)

Parking lot: maintainer ideas that are not yet scoped live in `docs/product-notes.md` (page redesigns, theme polish, storage strategy, guided training path, contribution UX). Surface them at session start.

- **Content depth — key real papers.** The live bank has only the DEMO sample. The single highest-value next step is importing verified past papers (Quốc gia + tỉnh/thành phố) with curated variants. Everything else is exercised by real usage.
  - **Listening is part of this:** tỉnh/thành phố papers include a listening part, and the product has zero listening support (no section, no audio question type — see `docs/product-notes.md` §6). Import tooling must handle audio questions; static mp3s in the web bundle keep it free.
  - **Speedup candidate: Firecrawl (github.com/firecrawl/firecrawl).** A scraping API that turns education-site pages into clean markdown — a fast way to pull official paper PDFs/pages into `content/` for keying. Needs an API key (paid/free-tier) and stays a *drafting* helper: keys/variants still get human review before `verified` (content-trust rule). Add as a `scripts/` importer only when a real paper backlog exists and the key cost is accepted.
- ~~**Vocabulary trainer.** The word list (`/words`) is a plain saved list. Add spaced-repetition review sessions over saved words — same deterministic scoring path, no AI cost. Low effort, high retention value.~~ **Shipped 2026-08-17** — Leitner boxes (levels 0–5, 1/3/7/14/30-day intervals), self-graded forgot/almost/knew with in-session re-drill, client-side only, no AI cost.

## Longer-term (parked)

- **Teacher / classroom.** Teacher accounts, class rosters, assignment of sets/papers, and per-student progress views. Conflicts with anonymous-first — needs an account layer that doesn't exist yet.
- **Data portability & sync.** Export/import (JSON/PDF/CSV) of sessions, mistakes, and writing history; optional passphrase-encrypted D1 sync across devices. Storage stays in D1 (≈500MB ≈ 150k essays); R2 (10GB free) only if blobs are ever needed. Explicitly rejected: Drive/Dropbox/Yandex (per-user OAuth contradicts anonymous-first).
- **Client-side storage expansion (localStorage first, IndexedDB when blobs arrive).** Everything personal already lives in the browser (profile, word list, notes, themes) and never touches the server. When scaling needs it: draft autosave (writing/contributions), "resume where you left off" (last section/question), cached progress summaries so `/progress` renders before the API answers, offline papers for exam mode, and the vocab-trainer schedule. Hard rule: preferences/drafts/caches → browser; anything that must survive device switches or feed analytics → D1. localStorage caps at ~5MB; IndexedDB only if audio/images ever ship.
- **External AI grading integration (API).** Engnovate (2 evals/month free, essays may be public) and ai4ielts (20 credits/month, IELTS rubric) are linked out from the Free Tools archive behind an explicit consent gate for Engnovate. No API exists for either — revisit if they ship one.
- **Richer writing diagnostics.** Current on-device diagnostics (`apps/web/src/analyzeEssay.ts`) cover readability, vocabulary variety, and conservative style flags. Add spelling (nspell) and write-good-style lints when a real content library justifies it.
- **AI-generated questions.** Currently blocked from the live bank (trust rule). Revisit only with a human-verification pipeline and strong guardrails.
- **UX polish.** Reduced-motion audits, keyboard navigation passes, more fine-grained analytics (topic-level trends), and progress history charts (day/week sparklines over `answers`).
- **Mock-exam fidelity.** ~~Timed section pacing (per-section clocks), answer-review-only mode after an exam, and automatic paper difficulty calibration once real papers exist.~~ **Shipped 2026-08-17** — review-only replay (no timer/score, per-question "Reveal answer") and draft autosave/resume (exam answers + writing draft survive refresh, timer deadline preserved, resume/discard banner). Still open when real papers exist: per-section clocks (needs official per-part timings) and difficulty calibration.

## Guardrails that shape all of the above

- $0 running cost: deterministic first, AI only where it earns the 3/day cap; aggregate reads for analytics (no per-event rows).
- Content trust: official = verified; community = unverified; AI = blocked until human-verified.
- Privacy: anonymous-first; anything touching third-party AI is disclosed up front and third-party sharing is opt-in (never default).
