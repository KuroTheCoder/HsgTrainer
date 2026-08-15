-- M5: restore explanation_generated_at (0003's table rebuild dropped it),
-- which powers the daily explanation budget in POST /api/sessions/:id/answers.
ALTER TABLE questions ADD COLUMN explanation_generated_at TEXT;