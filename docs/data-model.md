# HsgTrainer — Data Model (D1)

SQLite via Cloudflare D1. All schema changes ship as numbered migrations in `apps/api/migrations/` — never hand-edit production D1.

## Provenance design

Every question points at a **source** (where it came from) and carries a **verification status**. This is the trust backbone of a community content platform:

- `official` sources → questions import `verified` (keys authoritative; variants still curated)
- `community` sources → questions start `unverified`, gated/badged until human review
- `ai` sources → questions start `rejected`-by-default, i.e. **blocked from the live bank** until a human verifies

`prompt_hash` (SHA-256 of normalized prompt text) enforces uniqueness and powers duplicate detection at import.

## Tables

### sources

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| type | TEXT | `official` \| `community` \| `ai` |
| name | TEXT | e.g. "Đề HSG Quốc gia 2023" |
| grade | TEXT | "12", "9–11", … |
| year | INTEGER | |
| province | TEXT | for provincial papers |
| url | TEXT | attribution/origin link |
| attribution_note | TEXT | who to credit |
| created_at | TEXT | ISO |

### questions

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| source_id | INTEGER FK → sources | |
| qtype | TEXT | `mcq` \| `fill-blank` \| `word-form` \| `cloze` \| `transformation` \| `writing` |
| section | TEXT | `phonetics` \| `lexico-grammar` \| `word-formation` \| `cloze` \| `reading` \| `writing` \| `listening` |
| prompt | TEXT | question text (may include passage for cloze/reading) |
| options | TEXT (JSON) | string[] for mcq; null otherwise |
| answer | TEXT | key: option letter/index for mcq; accepted word(s) otherwise |
| accepted_variants | TEXT (JSON) | string[] of additional accepted answers (case-insensitive normalized) |
| rubric_ref | TEXT | rubric key for writing (see docs/rubric.md) |
| explanation | TEXT | cached; generated once by AI, stored forever |
| explanation_generated_at | TEXT | ISO — when the cached explanation was generated (powers the daily AI budget) |
| tags | TEXT (JSON) | skill, topic tags e.g. ["stress","phrasal-verbs"] |
| key_words | TEXT (JSON) | string[] of words/phrases flagged for student dictionary lookup (default `[]`) |
| difficulty | TEXT | CEFR band: `A1` \| `A2` \| `B1` \| `B2` \| `C1` \| `C2` (default `B1`) |
| verification_status | TEXT | `unverified` \| `verified` \| `rejected` (default `unverified`) |
| prompt_hash | TEXT UNIQUE | SHA-256 of normalized prompt |
| submitted_by | TEXT | anon id or "system" |
| reviewed_by | TEXT | admin id |
| reviewed_at | TEXT | ISO |
| created_at | TEXT | ISO |

### sessions

Practice attempt: one row per set a user runs.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| anon_id | TEXT | anonymous user id — client-generated UUID sent as `X-Anon-Id` header |
| section | TEXT | filter used (null for full-paper exam draws) |
| skill | TEXT | filter used; `'exam'` marks full-paper mock-exam sessions (see `/api/exams/papers` + `POST /api/sessions {paperId}`) |
| difficulty | TEXT | CEFR band filter used |
| question_count | INTEGER | |
| score | INTEGER | raw correct count (writing sessions: essay total /20) |
| created_at | TEXT | ISO |

### answers

One row per question answered within a session. This is the mistake ledger.
A correct retry of a previously-wrong question deletes the older wrong rows for that question + anon (`score = 0` answers); the ledger only keeps the latest attempts. Admin can also delete wrong rows directly via `DELETE /api/mistakes` (see `operations.md`).

The **writing bank** (`GET /api/writing/history`) reads the rows where `criterion_scores IS NOT NULL` (AI-scored essays); `response` holds the essay text and `feedback` the band/justification/fixes snapshot.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| session_id | INTEGER FK → sessions | |
| question_id | INTEGER FK → questions | |
| response | TEXT | what the user submitted |
| score | INTEGER | 1/0, or rubric points for writing |
| criterion_scores | TEXT (JSON) | per-criterion for writing |
| feedback | TEXT (JSON) | AI feedback snapshot for writing |
| created_at | TEXT | ISO |

## Indexes

- `questions(section)`, `questions(verification_status)` — practice drawing
- `answers(session_id)` — session result reads
- `sessions(anon_id, created_at)` — analytics + daily caps (M3)

## Migration workflow

```
apps/api/migrations/0001_init.sql      # committed
wrangler d1 migrations apply hsg_trainer --local   # dev
wrangler d1 migrations apply hsg_trainer           # prod
```
