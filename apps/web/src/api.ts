import type { AnswerResult, BulkReportItem, Question, SessionQuestions, SessionResult, Source } from "./types";

const ADMIN_TOKEN_KEY = "hsg_admin_token";
const ANON_KEY = "hsg_anon_id";

export function getAnonId(): string {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}
export function setAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}
export function clearAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Anon-Id", getAnonId());
  const token = getAdminToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      /* keep statusText */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),

  drawQuestions: (opts: { section?: string; difficulty?: string; count?: number }) => {
    const qs = new URLSearchParams();
    if (opts.section) qs.set("section", opts.section);
    if (opts.difficulty) qs.set("difficulty", opts.difficulty);
    if (opts.count) qs.set("count", String(opts.count));
    return request<{ questions: Question[] }>(`/questions?${qs}`);
  },

  startSession: (opts: { section?: string; difficulty?: string; count?: number; questionIds?: number[]; paperId?: number }) =>
    request<SessionQuestions>("/sessions", {
      method: "POST",
      body: JSON.stringify(opts),
    }),

  getMistakes: (section?: string) =>
    request<{ mistakes: import("./types").Mistake[] }>(`/mistakes${section ? `?section=${encodeURIComponent(section)}` : ""}`),

  deleteMistakes: (opts: { ids?: number[]; section?: string } = {}) => {
    const qs = new URLSearchParams();
    if (opts.ids?.length) qs.set("ids", opts.ids.join(","));
    if (opts.section) qs.set("section", opts.section);
    return request<{ deleted: number }>(`/mistakes?${qs}`, { method: "DELETE" });
  },

  submitAnswers: (sessionId: number, answers: { questionId: number; response: string }[]) =>
    request<SessionResult>(`/sessions/${sessionId}/answers`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),

  getSession: (sessionId: number) => request<SessionResult & { session: unknown }>(`/sessions/${sessionId}`),

  getStats: (days = 30) => request<import("./types").ProgressStats>(`/stats?days=${days}`),

  getPapers: () => request<{ papers: import("./types").Paper[] }>("/exams/papers"),
  paperWriting: (paperId: number) => request<{ questions: import("./types").WritingQuestion[] }>(`/writing/questions?paperId=${paperId}`),

  // writing (AI-scored)
  writingQuestions: (count = 1) =>
    request<{ questions: import("./types").WritingQuestion[] }>(`/writing/questions?count=${count}`),
  scoreWriting: (questionId: number, response: string) =>
    request<import("./types").WritingScoreResponse>("/writing/score", {
      method: "POST",
      body: JSON.stringify({ questionId, response }),
    }),
  getWritingHistory: () => request<{ entries: import("./types").WritingHistoryEntry[] }>("/writing/history"),

  // public contributions
  contribute: (draft: Record<string, unknown>) =>
    request<{ id: number; status: string; message: string }>("/contribute", {
      method: "POST",
      body: JSON.stringify(draft),
    }),

  // admin
  adminLogin: (password: string) =>
    request<{ token: string }>("/admin/login", { method: "POST", body: JSON.stringify({ password }) }),
  adminSources: () => request<{ sources: Source[] }>("/admin/sources"),
  adminCreateSource: (source: Record<string, unknown>) =>
    request<{ id: number }>("/admin/sources", { method: "POST", body: JSON.stringify(source) }),
  adminQueue: (status: string) => request<{ questions: import("./types").AdminQuestion[] }>(`/admin/questions?status=${status}`),
  adminCreateQuestion: (draft: Record<string, unknown>) =>
    request<{ id: number; status: string }>("/admin/questions", { method: "POST", body: JSON.stringify(draft) }),
  adminBulkImport: (payload: unknown) =>
    request<{ report: BulkReportItem[] }>("/admin/questions/bulk", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateQuestion: (id: number, patch: Record<string, unknown>) =>
    request<{ question: unknown }>(`/admin/questions/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
};

export type { AnswerResult };
