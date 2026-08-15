-- M2: track when a cached explanation was generated (powers the daily AI budget).
ALTER TABLE questions ADD COLUMN explanation_generated_at TEXT;
