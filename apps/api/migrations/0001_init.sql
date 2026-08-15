-- HsgTrainer initial schema. Provenance-first: every question tracks its source
-- and verification status. See docs/data-model.md.

CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('official', 'community', 'ai')),
  name TEXT NOT NULL,
  grade TEXT,
  year INTEGER,
  province TEXT,
  url TEXT,
  attribution_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE questions (
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
  difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
  prompt_hash TEXT NOT NULL UNIQUE,
  submitted_by TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_questions_section ON questions(section);
CREATE INDEX idx_questions_status ON questions(verification_status);
CREATE INDEX idx_questions_source ON questions(source_id);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anon_id TEXT NOT NULL,
  section TEXT,
  skill TEXT,
  difficulty INTEGER,
  question_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_anon ON sessions(anon_id, created_at);

CREATE TABLE answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  response TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  criterion_scores TEXT,
  feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_answers_session ON answers(session_id);
CREATE INDEX idx_answers_question ON answers(question_id);
