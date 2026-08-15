-- Key words & phrases flagged by the question submitter for quick student
-- lookup (dictionary links + personal word list). Stored as a JSON array of
-- strings; parsed via parseJsonList in the API.

ALTER TABLE questions ADD COLUMN key_words TEXT NOT NULL DEFAULT '[]';
