# HsgTrainer — Content Schema & Import Workflow

**Read this before keying any paper.** This is the canonical format every question must satisfy, whether it comes from a Google Sheet, pasted text, or the admin UI.

## Canonical question draft

```jsonc
{
  "source": {
    "type": "official",            // official | community | ai
    "name": "Đề HSG Quốc gia 2023",
    "grade": "12",
    "year": 2023,
    "province": null,
    "url": null
  },
  "questions": [
    {
      "qtype": "mcq",              // mcq | fill-blank | word-form | cloze | transformation | writing
      "section": "lexico-grammar", // phonetics | lexico-grammar | word-formation | cloze | reading | writing | listening
      "prompt": "The committee's decision was ____ by the board.",   // include the passage inline for cloze/reading
      "options": ["ratified", "rectified", "rebutted", "refuted"],
      "answer": "A",               // for mcq: option index letter ("A".."D")
                                   // otherwise: the accepted answer text
      "acceptedVariants": [],      // additional accepted answers (word forms, spellings)
      "tags": ["collocations", "formal-register"],
      "keyWords": ["ratified", "at variance"],  // words/phrases students should look up (optional)
      "audio": "/audio/quoc-gia-2023-part1.mp3", // listening questions only: path to the clip in apps/web/public/audio/ (optional)
      "difficulty": "C1",           // CEFR: A1 | A2 | B1 | B2 | C1 | C2
      "rubricRef": null            // "writing" tasks only — see docs/rubric.md
    }
  ]
}
```

## Per-type rules

| qtype | options | answer | acceptedVariants |
|---|---|---|---|
| mcq | required (string[]) | option letter `A`–`D` | rarely needed |
| fill-blank | omit | the word | required — alternate forms/spellings |
| word-form | omit | derived word | required — e.g. `reliance` / `reliability` style answers |
| cloze | optional (MC-cloze) | word or letter | as above |
| transformation | omit | the target sentence | required — HSG keys accept several phrasings |
| writing | omit | rubric key | n/a (AI-scored, see rubric.md) |

**Listening questions:** regular `mcq` with an `audio` field (path to the mp3
in `apps/web/public/audio/`). Scoring is identical to mcq — no new question
type. Missing files render "audio unavailable", so content can be keyed before
audio exists. See `apps/web/public/audio/README.md`.

**Variant rules (enforced by the scoring engine):**
- Matching is case-insensitive, trims whitespace, collapses inner spaces.
- The engine normalizes the key AND all variants, then matches any.
- Keying tip: put the exam-key answer in `answer`, every other acceptable form in `acceptedVariants`.

## Provenance & verification mapping

| source.type | initial verification_status | Live bank? |
|---|---|---|
| official | `verified` | yes (spot-check keys anyway) |
| community | `unverified` | gated/badged until review |
| ai | `rejected` (blocked) | **no** until human verification |

`prompt_hash` (SHA-256 of normalized prompt) dedupes: imports that hit an existing hash are reported, not inserted. Re-imports with new `keyWords` update the existing row instead ("updated" report status).

**`keyWords` (optional):** short list of words/phrases the submitter flagged for student lookup — tricky options, idioms, or essay-ready vocabulary. Rendered as tap chips under the prompt; a tap opens the lookup popup, which shows a one-click ribbon to the student's chosen default dictionary (Cambridge, Cambridge EN→VI, Oxford or Wiktionary — set in Settings), offers the other dictionaries as quick links, and can save the word to the student's local word list. The ribbon opens the dictionary in a new tab or a small floating window, per the Settings choice. Keep entries to real dictionary lookups (max ~50, comma- or pipe-friendly in forms).

## Workflows

### A. Google Sheet → CSV → admin bulk import (recommended for bulk)

Columns: `qtype, section, prompt, options (pipe-separated), answer, accepted_variants (pipe-separated), tags (comma-separated), key_words (comma-separated), audio, difficulty, source_type, source_name, source_year, source_grade, source_province`

Export as CSV → paste into admin Bulk Import → validation report (per-row errors, dupe warnings) → drafts created.

### B. Admin UI form (single questions, corrections)

Paste question → set type/section → key + variants → pick source → save as draft → review → verify.

### C. scripts/ (JSON seed)

`content/` JSON files matching the canonical format can be loaded directly (used for seed data and CI smoke tests).

## Content JSON layout in repo

```
content/
├─ papers/
│  └─ national-2023.json          # one file per paper, canonical format
└─ README.md
```

## Quality checklist before verifying a question

- [ ] Prompt contains no OCR errors; phonetics symbols/stress marks intact
- [ ] Answer matches the official key; `acceptedVariants` covers known alternates
- [ ] Section and qtype correct; difficulty roughly right for the paper's grade
- [ ] Explanation absent is fine (generated on first use), but answer key must be certain
- [ ] No question from an AI author in the live bank without human review
