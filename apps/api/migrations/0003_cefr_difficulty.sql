-- Difficulty moves from an arbitrary 1–5 scale to the CEFR bands
-- (A1–C2) used by learner dictionaries, so ratings are meaningful to
-- students. SQLite cannot ALTER a CHECK constraint, so rebuild the table.

CREATE TABLE questions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER REFERENCES sources(id),
  qtype TEXT NOT NULL CHECK (qtype IN ('mcq', 'fill-blank', 'word-form', 'cloze', 'transformation', 'writing')),
  section TEXT NOT NULL CHECK (section IN ('phonetics', 'lexico-grammar', 'word-formation', 'cloze', 'reading', 'writing')),
  prompt TEXT NOT NULL,
  options TEXT,
  answer TEXT NOT NULL,
  accepted_variants TEXT NOT NULL DEFAULT '[]',
  rubric_ref TEXT,
  explanation TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  difficulty TEXT NOT NULL DEFAULT 'B1'
    CHECK (difficulty IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
  prompt_hash TEXT NOT NULL UNIQUE,
  submitted_by TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO questions_new (
  id, source_id, qtype, section, prompt, options, answer, accepted_variants,
  rubric_ref, explanation, tags, difficulty, verification_status, prompt_hash,
  submitted_by, reviewed_by, reviewed_at, created_at
)
SELECT
  id, source_id, qtype, section, prompt, options, answer, accepted_variants,
  rubric_ref, explanation, tags,
  CASE difficulty
    WHEN 1 THEN 'A2'
    WHEN 2 THEN 'B1'
    WHEN 3 THEN 'B2'
    WHEN 4 THEN 'C1'
    WHEN 5 THEN 'C2'
    ELSE 'B1'
  END,
  verification_status, prompt_hash, submitted_by, reviewed_by, reviewed_at, created_at
FROM questions;

DROP TABLE questions;

ALTER TABLE questions_new RENAME TO questions;

CREATE INDEX idx_questions_section ON questions(section);
CREATE INDEX idx_questions_status ON questions(verification_status);
CREATE INDEX idx_questions_source ON questions(source_id);
