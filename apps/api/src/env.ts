export type Env = {
  DB: D1Database;
  ADMIN_TOKEN: string;
  AI_GEMINI_KEY?: string;
  AI_GROQ_KEY?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  EXPLAIN_DAILY_CAP?: string;
  WRITE_DAILY_CAP?: string;
  CONTRIBUTE_DAILY_CAP?: string;
  ALLOWED_ORIGINS?: string;
};
