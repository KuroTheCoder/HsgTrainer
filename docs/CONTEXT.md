# HsgTrainer — Product & Domain Context

Training platform for **Vietnam HSG English exams** (kỳ thi chọn học sinh giỏi — "excellent student" competitions). These are highly academic exams that test intensive linguistic knowledge far beyond school-level English: phonetics/stress rules, advanced lexico-grammar, word derivation, cloze, deep reading comprehension, and formal writing.

## Who it's for

- HSG candidates at grade 9–12 level (national exam is grade 12; provincial exams cover lower grades)
- Self-study students, teachers coaching HSG teams
- Free/community-first: no funding, $0 running cost by design (see `architecture.md`)

## Core product loop

1. Pick a section + skill + difficulty (or run a full past paper as a timed mock exam)
2. Do a set of questions
3. Get instant per-question feedback (deterministic scoring for fixed-answer types; AI scoring for writing)
4. Study your weak spots: wrong answers land in the mistake ledger, re-drill them, and progress analytics track accuracy, streaks, and per-section gaps over time
5. Writing bank: every AI-scored essay is saved with free on-device diagnostics (readability, vocabulary variety, style flags)

## Feature map

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
| Account (/account — local anonymous profile: name, grade, province, CEFR goal) | Shipped |
| Teacher hub (/teachers — classroom guide + shareable practice links) | Shipped |
| Admin overview dashboard (/admin — bank health, review queue) | Shipped |
| Settings hub (/settings — tabbed pause-menu nav: Appearance / Sounds / Dictionary) | Shipped |
| Theming (12 palettes, custom color, 6 backgrounds, pattern intensity, presets, share links) | Shipped |
| Sound effects (clicks/hovers/chimes/warnings) with per-sound volume + confetti on strong runs | Shipped |
| Vocabulary trainer (spaced repetition on the word list) | Shipped |
| Teacher/classroom rosters, data sync/portability | Roadmap |
| Content depth (key real papers) | Ongoing |

See `docs/roadmap.md` for the deferred directions.

## Domain vocabulary

| Term | Meaning |
|---|---|
| Paper | A real past exam (e.g. Đề HSG Quốc gia 2023, Đề HSG tỉnh/thành phố) |
| Section | Exam part: `phonetics`, `lexico-grammar`, `word-formation`, `cloze`, `reading`, `writing` |
| Question type | `mcq`, `fill-blank`, `word-form`, `cloze`, `transformation`, `writing` |
| acceptedVariants | All accepted answers for one question (HSG keys routinely accept multiple word forms/spellings) |
| Provenance | Where a question came from (source type + verification status) |
| Source | A paper or other origin record; carries `official` / `community` / `ai` type |
| Verification | `unverified` → `verified` → (or `rejected`) — gates whether a question serves in practice |

## Content trust rules

- **Official papers** (real past exams) import as `verified`; keys are authoritative but variant lists still need curation.
- **Community content** starts `unverified` and is gated/badged until a human reviews it.
- **AI-generated questions are blocked** from the live bank until human-verified. LLMs are used for scoring and explanations only, never authorship.
- A wrong key in a training tool destroys trust — content review is the product moat.

## Monetization stance

None yet. Free tier quotas drive design decisions everywhere (see `architecture.md`). If this ever monetizes, Vercel-style personal-only free tiers are off the table; the Cloudflare stack has no such restriction.
