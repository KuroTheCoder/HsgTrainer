import { useCallback, useEffect, useState } from "react";
import { api, clearAdminToken, getAdminToken, setAdminToken } from "../api";
import { parseCsv } from "../csv";
import { validateField, validateForm, type FormErrors, type QuestionFormValues } from "../formRules";
import { ErrorSummary, type FormError } from "../components/ErrorSummary";
import DebugPanel from "../components/DebugPanel";
import { tagStyle } from "../sections";
import type { AdminQuestion, BulkReportItem, Source } from "../types";

type Tab = "overview" | "queue" | "add" | "bulk" | "sources" | "debug";

interface EditFormValues {
  prompt: string;
  answer: string;
  variants: string;
  keyWords: string;
  tags: string;
  explanation: string;
  qtype: string;
  section: string;
  difficulty: string;
}

function errorsToList(errors: FormErrors): FormError[] {
  return (Object.keys(errors) as (keyof FormErrors)[])
    .map((k) => ({ field: `a-${k}`, message: errors[k]! }))
    .filter((e) => e.message);
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(getAdminToken());
  const [tab, setTab] = useState<Tab>("overview");
  const [counts, setCounts] = useState<{ unverified: number; verified: number; rejected: number } | null>(null);

  const loadCounts = useCallback(async () => {
    try {
      const [u, v, r] = await Promise.all([
        api.adminQueue({ status: "unverified" }),
        api.adminQueue({ status: "verified" }),
        api.adminQueue({ status: "rejected" }),
      ]);
      setCounts({ unverified: u.total, verified: v.total, rejected: r.total });
    } catch {
      // counts are decorative; never block the page on them
    }
  }, []);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  if (!token) return <Login onLogin={setToken} />;

  return (
    <div className="page">
      <div className="page-head">
        <h2>Admin</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            clearAdminToken();
            setToken(null);
          }}
        >
          Log out
        </button>
      </div>
      <div className="seg">
        {(["overview", "queue", "add", "bulk", "sources", ...(import.meta.env.DEV ? (["debug"] as Tab[]) : [])] as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            aria-label={t === "queue" && counts ? `${TAB_LABELS[t]}, ${counts.unverified} pending` : TAB_LABELS[t]}
          >
            {TAB_LABELS[t]}
            {t === "queue" && (counts?.unverified ?? 0) > 0 && <span className="tab-badge">{counts!.unverified}</span>}
          </button>
        ))}
      </div>
      <span className="sr-only" role="status">
        {counts ? `${counts.unverified} questions in the review queue` : ""}
      </span>
      {tab === "overview" && <Overview />}
      {tab === "queue" && <ReviewQueue onChanged={() => void loadCounts()} />}
      {tab === "add" && <AddQuestion />}
      {tab === "bulk" && <BulkImport />}
      {tab === "sources" && <Sources />}
      {tab === "debug" && import.meta.env.DEV && <DebugPanel />}
    </div>
  );
}

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  queue: "Review queue",
  add: "Add question",
  bulk: "Bulk import",
  sources: "Sources",
  debug: "Debug",
};

// ---------------- overview dashboard ----------------

function Overview() {
  const [data, setData] = useState<{ verified: number; unverified: number; rejected: number; sources: number; papers: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [u, v, r, src, p] = await Promise.all([
        api.adminQueue({ status: "unverified" }),
        api.adminQueue({ status: "verified" }),
        api.adminQueue({ status: "rejected" }),
        api.adminSources(),
        api.getPapers(),
      ]);
      setData({
        unverified: u.total,
        verified: v.total,
        rejected: r.total,
        sources: src.sources.length,
        papers: p.papers.length,
      });
    } catch {
      // counts are decorative; never block the page on them
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = data ? data.verified + data.unverified + data.rejected : 0;
  const verifiedPct = total > 0 ? Math.round((data!.verified / total) * 100) : 0;

  return (
    <div>
      <div className="stat-grid">
        <div className="card panel stat-card">
          <div className="stat-num">{data?.verified ?? "…"}</div>
          <div className="stat-label">Verified (live)</div>
        </div>
        <div className="card panel stat-card">
          <div className="stat-num">{data?.unverified ?? "…"}</div>
          <div className="stat-label">Awaiting review</div>
        </div>
        <div className="card panel stat-card">
          <div className="stat-num">{data?.rejected ?? "…"}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="card panel stat-card">
          <div className="stat-num">{data?.sources ?? "…"}</div>
          <div className="stat-label">Sources</div>
        </div>
        <div className="card panel stat-card">
          <div className="stat-num">{data?.papers ?? "…"}</div>
          <div className="stat-label">Papers</div>
        </div>
      </div>

      {data && (
        <div className="card panel">
          <h3>Bank health</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {total} total questions — {verifiedPct}% verified and live. Content only reaches students once verified.
          </p>
          <div className="bar" style={{ height: 14 }}>
            <div className="bar-fill" style={{ width: `${verifiedPct}%`, background: "var(--ok)" }} />
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <span className="hint">Start with the review queue — clear what's pending, then bulk-import papers.</span>
            <button className="btn btn-primary btn-sm" onClick={() => void load()} disabled={busy}>
              {busy ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.adminLogin(password);
      setAdminToken(res.token);
      onLogin(res.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card auth-card">
      <h3 style={{ marginBottom: 4 }}>Staff login</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Content curation is behind a token. Keep it private.
      </p>
      <label className="field">
        Password
        <input
          type="password"
          placeholder="ADMIN_TOKEN"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </label>
      <button className="btn btn-primary" onClick={submit} disabled={busy}>
        {busy ? "Logging in…" : "Login"}
      </button>
      {error && <div className="banner error" role="alert">{error}</div>}
    </div>
  );
}

// ---------------- review queue ----------------

function ReviewQueue({ onChanged }: { onChanged?: () => void }) {
  const [status, setStatus] = useState("unverified");
  const [section, setSection] = useState("");
  const [qtype, setQtype] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<EditFormValues>({
    prompt: "", answer: "", variants: "", keyWords: "", tags: "", explanation: "",
    qtype: "mcq", section: "lexico-grammar", difficulty: "B1",
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  const variantsOf = (q: AdminQuestion): string[] => {
    try {
      const v = JSON.parse(q.accepted_variants) as unknown;
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };

  const keyWordsOf = (q: AdminQuestion): string[] => {
    try {
      const v = JSON.parse(q.key_words ?? "[]") as unknown;
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };

  const tagsOf = (q: AdminQuestion): string[] => {
    try {
      const v = JSON.parse(q.tags) as unknown;
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };

  const splitList = (s: string): string[] => s.split(",").map((x) => x.trim()).filter(Boolean);

  const openEdit = (q: AdminQuestion) => {
    setForm({
      prompt: q.prompt,
      answer: q.answer,
      variants: variantsOf(q).join(", "),
      keyWords: keyWordsOf(q).join(", "),
      tags: tagsOf(q).join(", "),
      explanation: q.explanation ?? "",
      qtype: q.qtype,
      section: q.section,
      difficulty: q.difficulty,
    });
    setSaveError(null);
    setEditing(q.id);
  };

  const saveEdit = async (q: AdminQuestion) => {
    if (!form.prompt.trim() || !form.answer.trim()) {
      setSaveError("Prompt and key are required.");
      return;
    }
    try {
      await api.adminUpdateQuestion(q.id, {
        prompt: form.prompt.trim(),
        answer: form.answer.trim(),
        acceptedVariants: splitList(form.variants),
        keyWords: splitList(form.keyWords),
        tags: splitList(form.tags),
        explanation: form.explanation.trim() || undefined,
        qtype: form.qtype,
        section: form.section,
        difficulty: form.difficulty,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "save failed");
    }
  };

  const set = (k: keyof EditFormValues) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.adminSources().then((r) => setSources(r.sources)).catch(() => undefined);
  }, []);

  const filters = { status, section, qtype, source, q: search.trim() };

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.adminQueue({ ...filters, page });
      setItems(res.questions);
      setTotal(res.total);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, [filters.status, filters.section, filters.qtype, filters.source, filters.q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / 50));

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = items.length > 0 && items.every((q) => selected.has(q.id));

  const decide = async (ids: number[], verificationStatus: string) => {
    try {
      const res = await api.adminBulkStatus(ids, verificationStatus);
      setError(null);
      await load();
      onChanged?.();
      if (ids.length === 1) return;
      setError(`${res.updated} question(s) ${verificationStatus === "verified" ? "verified" : "rejected"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "update failed");
    }
  };

  return (
    <div className="card panel">
      <div className="queue-filters">
        <label className="field">
          Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="unverified">unverified</option>
            <option value="verified">verified</option>
            <option value="rejected">rejected</option>
          </select>
        </label>
        <label className="field">
          Source
          <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
            <option value="">all sources</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Section
          <select value={section} onChange={(e) => { setSection(e.target.value); setPage(1); }}>
            <option value="">all sections</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Type
          <select value={qtype} onChange={(e) => { setQtype(e.target.value); setPage(1); }}>
            <option value="">all types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <input
          type="text"
          className="answer-input"
          placeholder="Search prompt or key…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              void load();
            }
          }}
          aria-label="Search prompt or key"
        />
        <button className="btn btn-sm" onClick={() => void load()} disabled={busy}>
          {busy ? "Loading…" : "Apply"}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar" role="status">
          <b>{selected.size} selected</b>
          <div className="row">
            <button className="btn btn-sm btn-primary" onClick={() => void decide([...selected], "verified")} disabled={busy}>
              Verify selected
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => void decide([...selected], "rejected")} disabled={busy}>
              Reject selected
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())} disabled={busy}>
              Clear
            </button>
          </div>
        </div>
      )}

      {error && <div className="banner error" role="alert">{error}</div>}
      {!busy && items.length === 0 && (
        <div className="empty">
          <b>Nothing here</b>
          <p>No questions match these filters.</p>
        </div>
      )}

      {items.length > 0 && (
        <label className="queue-select-all">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((x) => x.id)))}
          />
          Select all {items.length} on this page
        </label>
      )}

      <div className="queue-scroll">
        {items.map((q) => (
          <div key={q.id} className="question">
            <div className="question-head">
              <input
                type="checkbox"
                checked={selected.has(q.id)}
                onChange={() => toggle(q.id)}
                aria-label={`Select question ${q.id}`}
              />
              <span className="qnum">#{q.id}</span>
              <span className="tag" style={tagStyle(q.qtype)}>{q.qtype}</span>
              <span className="tag" style={tagStyle(q.section)}>{q.section}</span>
              {q.source_name && <span className="tag">{q.source_name}</span>}
            </div>
            <p className="prompt">{q.prompt.slice(0, 240)}{q.prompt.length > 240 ? "…" : ""}</p>
            <p className="small">
              Key: <b>{q.answer}</b>
              {variantsOf(q).length > 0 && ` · variants: ${variantsOf(q).join(", ")}`}
            </p>
            {keyWordsOf(q).length > 0 && (
              <div className="row-chips">
                {keyWordsOf(q).map((kw) => (
                  <span key={kw} className="tag">
                    {kw}
                  </span>
                ))}
              </div>
            )}
            <div className="row">
              {editing !== q.id && (
                <button className="btn btn-sm btn-ghost" onClick={() => openEdit(q)}>
                  Edit
                </button>
              )}
              {status !== "verified" && (
                <button className="btn btn-sm btn-primary" onClick={() => void decide([q.id], "verified")}>
                  Verify
                </button>
              )}
              {status !== "rejected" && (
                <button className="btn btn-sm btn-danger" onClick={() => void decide([q.id], "rejected")}>
                  Reject
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                {expanded === q.id ? "collapse" : "details"}
              </button>
            </div>
            {expanded === q.id && editing !== q.id && (
              <div className="verbal-details">
                <p className="prompt">
                  {q.prompt.split("____").map((part, i) => (
                    <span key={i}>
                      {part}
                      {i < q.prompt.split("____").length - 1 && <mark className="blank">____</mark>}
                    </span>
                  ))}
                </p>
                <p className="small">
                  Key: <b className="key-chip">{q.answer}</b>
                </p>
                {variantsOf(q).length > 0 && (
                  <div className="row-chips">
                    <span className="muted small">accepted variants:</span>
                    {variantsOf(q).map((v) => (
                      <span key={v} className="tag">{v}</span>
                    ))}
                  </div>
                )}
                {keyWordsOf(q).length > 0 && (
                  <div className="row-chips">
                    <span className="muted small">key words:</span>
                    {keyWordsOf(q).map((kw) => (
                      <span key={kw} className="tag">{kw}</span>
                    ))}
                  </div>
                )}
                {tagsOf(q).length > 0 && (
                  <div className="row-chips">
                    <span className="muted small">tags:</span>
                    {tagsOf(q).map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                )}
                <p className="small muted">
                  difficulty <b>{q.difficulty}</b>
                  {q.source_name && ` · source: ${q.source_name} (${q.source_type ?? "?"})`}
                </p>
                {q.explanation && <p className="small">{q.explanation}</p>}
              </div>
            )}
            {editing === q.id && (
              <div className="edit-form">
                {saveError && <div className="banner error" role="alert">{saveError}</div>}
                <label className="field">
                  Prompt (use ____ for the blank)
                  <textarea rows={3} value={form.prompt} onChange={set("prompt")} />
                </label>
                <label className="field">
                  Key
                  <input type="text" value={form.answer} onChange={set("answer")} />
                </label>
                <div className="edit-grid">
                  <label className="field">
                    Accepted variants (comma-separated)
                    <input type="text" value={form.variants} onChange={set("variants")} />
                  </label>
                  <label className="field">
                    Key words (comma-separated)
                    <input type="text" value={form.keyWords} onChange={set("keyWords")} />
                  </label>
                  <label className="field">
                    Tags (comma-separated)
                    <input type="text" value={form.tags} onChange={set("tags")} />
                  </label>
                  <label className="field">
                    Type
                    <select value={form.qtype} onChange={set("qtype")}>
                      {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    Section
                    <select value={form.section} onChange={set("section")}>
                      {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    Difficulty
                    <select value={form.difficulty} onChange={set("difficulty")}>
                      {CEFR_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                </div>
                <label className="field">
                  Explanation (optional)
                  <textarea rows={2} value={form.explanation} onChange={set("explanation")} />
                </label>
                <div className="row">
                  <button className="btn btn-sm btn-primary" onClick={() => void saveEdit(q)}>Save</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="queue-pager">
        <button className="btn btn-sm btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={busy || page <= 1}>
          ← Prev
        </button>
        <span className="muted small">
          Page {page} / {pages} · {total} question{total === 1 ? "" : "s"}
        </span>
        <button className="btn btn-sm btn-ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={busy || page >= pages}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ---------------- add single ----------------

const TYPES = ["mcq", "fill-blank", "word-form", "cloze", "transformation", "writing"];
const SECTIONS = ["phonetics", "lexico-grammar", "word-formation", "cloze", "reading", "writing", "listening"];
const CEFR_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function AddQuestion() {
  const [form, setForm] = useState<QuestionFormValues>({
    qtype: "mcq",
    section: "lexico-grammar",
    prompt: "",
    options: "",
    answer: "",
    acceptedVariants: "",
    tags: "",
    keyWords: "",
    audio: "",
    difficulty: "B1",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [newSource, setNewSource] = useState(false);
  const [newSourceForm, setNewSourceForm] = useState({ type: "official", name: "", year: "" });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.adminSources().then((r) => setSources(r.sources)).catch(() => undefined);
  }, []);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => {
      const keys = k === "qtype" ? (["prompt", "options", "answer"] as const) : [k];
      const next = { ...prev };
      for (const key of keys) delete next[key as keyof FormErrors];
      return next;
    });
  };

  const onBlur = (k: keyof FormErrors) => {
    setErrors((prev) => {
      const msg = validateField(form, k);
      const next = { ...prev };
      if (msg) next[k] = msg;
      else delete next[k];
      return next;
    });
  };

  const submit = async () => {
    const errs = validateForm(form);
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    const payload: Record<string, unknown> = {
      qtype: form.qtype,
      section: form.section,
      prompt: form.prompt,
      answer: form.answer,
      acceptedVariants: form.acceptedVariants ? form.acceptedVariants.split("|").map((s) => s.trim()).filter(Boolean) : [],
      tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      keyWords: form.keyWords ? form.keyWords.split(",").map((s) => s.trim()).filter(Boolean) : [],
      audio: form.audio.trim() || null,
      difficulty: form.difficulty,
    };
    if (form.qtype === "mcq") payload.options = form.options.split("|").map((s) => s.trim()).filter(Boolean);
    let sid = sourceId ? Number(sourceId) : null;
    try {
      if (newSource && newSourceForm.name) {
        const created = await api.adminCreateSource({
          type: newSourceForm.type as Source["type"],
          name: newSourceForm.name,
          year: newSourceForm.year ? Number(newSourceForm.year) : null,
        });
        sid = created.id;
        setSources((prev) => [
          ...prev,
          { id: created.id, type: newSourceForm.type as Source["type"], name: newSourceForm.name, grade: null, year: newSourceForm.year ? Number(newSourceForm.year) : null, province: null, url: null, attribution_note: null },
        ]);
      }
      if (sid) payload.sourceId = sid;
      const res = await api.adminCreateQuestion(payload);
      setResult(`Created #${res.id} as ${res.status}.`);
      setErrors({});
      setForm((f) => ({ ...f, prompt: "", answer: "", acceptedVariants: "", tags: "", keyWords: "", audio: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card panel">
      <h3>Add a question</h3>
      <ErrorSummary errors={errorsToList(errors)} />
      <div className="field-grid">
        <label className="field">
          Type
          <select value={form.qtype} onChange={(e) => set("qtype", e.target.value)}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Section
          <select value={form.section} onChange={(e) => set("section", e.target.value)}>
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Difficulty (CEFR)
          <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
            {CEFR_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Source (optional)
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">— none —</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type})
              </option>
            ))}
          </select>
        </label>
        <label className="field checkbox-line">
          <input type="checkbox" checked={newSource} onChange={(e) => setNewSource(e.target.checked)} />
          Create a new source
        </label>
        {newSource && (
          <>
            <label className="field">
              Source type
              <select value={newSourceForm.type} onChange={(e) => setNewSourceForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="official">official</option>
                <option value="community">community</option>
                <option value="ai">ai</option>
              </select>
            </label>
            <label className="field">
              Source name
              <input value={newSourceForm.name} onChange={(e) => setNewSourceForm((f) => ({ ...f, name: e.target.value }))} placeholder="Đề HSG Quốc gia 2023" />
            </label>
            <label className="field">
              Year
              <input value={newSourceForm.year} onChange={(e) => setNewSourceForm((f) => ({ ...f, year: e.target.value }))} />
            </label>
          </>
        )}
        <label className="field wide">
          Prompt (include the passage inline for cloze/reading)
          <textarea
            id="a-prompt"
            value={form.prompt}
            onChange={(e) => set("prompt", e.target.value)}
            onBlur={() => onBlur("prompt")}
            rows={4}
            aria-invalid={errors.prompt ? true : undefined}
            aria-describedby={errors.prompt ? "a-prompt-error" : undefined}
          />
          {errors.prompt && (
            <span className="field-error" id="a-prompt-error">
              {errors.prompt}
            </span>
          )}
        </label>
        {form.qtype === "mcq" && (
          <label className="field wide">
            Options (pipe-separated, e.g. "ratified|rectified|rebutted|refuted")
            <input
              id="a-options"
              value={form.options}
              onChange={(e) => set("options", e.target.value)}
              onBlur={() => onBlur("options")}
              aria-invalid={errors.options ? true : undefined}
              aria-describedby={errors.options ? "a-options-error" : undefined}
            />
            {errors.options && (
              <span className="field-error" id="a-options-error">
                {errors.options}
              </span>
            )}
          </label>
        )}
        <label className="field">
          Answer {form.qtype === "mcq" ? "(letter A–D)" : ""}
          <input
            id="a-answer"
            value={form.answer}
            onChange={(e) => set("answer", e.target.value)}
            onBlur={() => onBlur("answer")}
            aria-invalid={errors.answer ? true : undefined}
            aria-describedby={errors.answer ? "a-answer-error" : undefined}
          />
          {errors.answer && (
            <span className="field-error" id="a-answer-error">
              {errors.answer}
            </span>
          )}
        </label>
        <label className="field">
          Accepted variants (pipe-separated)
          <input value={form.acceptedVariants} onChange={(e) => set("acceptedVariants", e.target.value)} />
        </label>
        <label className="field">
          Tags (comma-separated)
          <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="stress, phrasal-verbs" />
        </label>
        <label className="field wide">
          Audio clip path (for Listening questions — e.g. "/audio/paper-2023-part2.mp3")
          <input value={form.audio} onChange={(e) => set("audio", e.target.value)} placeholder="/audio/…" />
        </label>
        <label className="field wide">
          Key words & phrases (comma-separated) — shown to students for quick dictionary lookup
          <input value={form.keyWords} onChange={(e) => set("keyWords", e.target.value)} placeholder="at variance, abrupt, ratify" />
        </label>
      </div>
      <button className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
        {busy ? "Creating…" : "Create draft"}
      </button>
      {result && (
        <div className="banner ok" role="status">
          {result}
        </div>
      )}
      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------- bulk import ----------------

const CSV_COLUMNS = [
  "qtype", "section", "prompt", "options", "answer", "accepted_variants", "tags", "key_words", "audio", "difficulty",
  "source_type", "source_name", "source_year", "source_grade", "source_province",
];

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsvTemplate() {
  const example = [
    "mcq",
    "lexico-grammar",
    'The board\'s decision was ____ by all members. Options: ratified|rectified|rebutted|refuted',
    "ratified|rectified|rebutted|refuted",
    "A",
    "",
    "collocations",
    "at variance, ratify",
    "/audio/lexico-2023-p1.mp3",
    "3",
    "official",
    "Đề HSG Quốc gia 2023",
    "2023",
    "",
    "",
  ];
  const lines = [CSV_COLUMNS.map(csvCell).join(","), example.map(csvCell).join(",")];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hsg-question-bank-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function BulkImport() {
  const [text, setText] = useState("");
  const [report, setReport] = useState<BulkReportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const importJson = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = JSON.parse(text) as unknown;
      const res = await api.adminBulkImport(payload);
      setReport(res.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "import failed");
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error("CSV needs a header row + at least one question");
      const headers = rows[0]!.map((h) => h.trim());
      const col = (name: string) => headers.indexOf(name);
      const questions: Record<string, unknown>[] = [];
      let source: Record<string, unknown> | undefined;

      for (const row of rows.slice(1)) {
        const get = (name: string): string => (col(name) >= 0 ? row[col(name)] ?? "" : "");
        const sourceName = get("source_name");
        if (sourceName && !source) {
          source = {
            type: get("source_type") || "official",
            name: sourceName,
            year: get("source_year") ? Number(get("source_year")) : null,
            grade: get("source_grade") || null,
            province: get("source_province") || null,
          };
        }
        const splitPipe = (s: string) => s.split("|").map((x) => x.trim()).filter(Boolean);
        questions.push({
          qtype: get("qtype"),
          section: get("section"),
          prompt: get("prompt"),
          options: get("qtype") === "mcq" && get("options") ? splitPipe(get("options")) : undefined,
          answer: get("answer"),
          acceptedVariants: get("accepted_variants") ? splitPipe(get("accepted_variants")) : [],
          tags: get("tags") ? get("tags").split(",").map((x) => x.trim()).filter(Boolean) : [],
          keyWords: get("key_words") ? get("key_words").split(",").map((x) => x.trim()).filter(Boolean) : [],
          audio: get("audio") || null,
          difficulty: get("difficulty") ? String(get("difficulty")) : "B1",
        });
      }

      const res = await api.adminBulkImport(source ? { source, questions } : { questions });
      setReport(res.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card panel">
      <h3>Bulk import</h3>
      <p className="hint">
        Paste canonical JSON (docs/content-schema.md) or Google-Sheet CSV with header:{" "}
        <code>{CSV_COLUMNS.join(",")}</code>  (options/variants pipe-separated).
      </p>
      <textarea rows={14} className="answer-input" value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "source": { "type": "official", "name": "…" }, "questions": [ … ] }' />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={downloadCsvTemplate}>
          Download CSV template
        </button>
        <button className="btn" onClick={importJson} disabled={busy || !text.trim()}>
          {busy ? "Importing…" : "Import JSON"}
        </button>
        <button className="btn btn-primary" onClick={importCsv} disabled={busy || !text.trim()}>
          Import CSV
        </button>
      </div>
      {error && <div className="banner error" role="alert">{error}</div>}
      {report && (
        <div>
          <h4>Report ({report.length} rows)</h4>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>status</th>
                <th>id</th>
                <th>error</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r) => (
                <tr key={r.index}>
                  <td>{r.index}</td>
                  <td>{r.status}</td>
                  <td>{r.id ?? "—"}</td>
                  <td>{r.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------- sources ----------------

function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [form, setForm] = useState({ type: "official", name: "", year: "", province: "", url: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.adminSources().then((r) => setSources(r.sources)).catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  const create = async () => {
    setError(null);
    try {
      await api.adminCreateSource({
        type: form.type,
        name: form.name,
        year: form.year ? Number(form.year) : null,
        province: form.province || null,
        url: form.url || null,
      });
      setForm({ type: "official", name: "", year: "", province: "", url: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    }
  };

  return (
    <div className="card panel">
      <h3>Sources</h3>
      <div className="field-grid">
        <label className="field">
          Source type
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="official">official</option>
            <option value="community">community</option>
            <option value="ai">ai</option>
          </select>
        </label>
        <label className="field">
          Source name
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Đề HSG Quốc gia 2023" />
        </label>
        <label className="field">
          Year
          <input value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
        </label>
        <label className="field">
          Province
          <input value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} />
        </label>
        <label className="field">
          URL
          <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
        </label>
      </div>
      <button className="btn btn-primary" onClick={create} disabled={!form.name}>
        Add source
      </button>
      {error && <div className="banner error" role="alert">{error}</div>}
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>type</th>
            <th>name</th>
            <th>year</th>
            <th>province</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.type}</td>
              <td>{s.name}</td>
              <td>{s.year ?? "—"}</td>
              <td>{s.province ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
