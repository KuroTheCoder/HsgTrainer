import { useCallback, useEffect, useState } from "react";
import { api, clearAdminToken, getAdminToken, setAdminToken } from "../api";
import { parseCsv } from "../csv";
import type { AdminQuestion, BulkReportItem, Source } from "../types";

type Tab = "queue" | "add" | "bulk" | "sources";

export default function Admin() {
  const [token, setToken] = useState<string | null>(getAdminToken());
  const [tab, setTab] = useState<Tab>("queue");

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
        {(["queue", "add", "bulk", "sources"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      {tab === "queue" && <ReviewQueue />}
      {tab === "add" && <AddQuestion />}
      {tab === "bulk" && <BulkImport />}
      {tab === "sources" && <Sources />}
    </div>
  );
}

const TAB_LABELS: Record<Tab, string> = {
  queue: "Review queue",
  add: "Add question",
  bulk: "Bulk import",
  sources: "Sources",
};

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
      {error && <div className="banner error">{error}</div>}
    </div>
  );
}

// ---------------- review queue ----------------

function ReviewQueue() {
  const [status, setStatus] = useState("unverified");
  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const variantsOf = (q: AdminQuestion): string[] => {
    try {
      const v = JSON.parse(q.accepted_variants) as unknown;
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.adminQueue(status);
      setItems(res.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: number, verificationStatus: string) => {
    try {
      await api.adminUpdateQuestion(id, { verificationStatus });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "update failed");
    }
  };

  return (
    <div className="card panel">
      <div className="row" style={{ marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="unverified">unverified</option>
          <option value="verified">verified</option>
          <option value="rejected">rejected</option>
        </select>
        <button className="btn btn-sm" onClick={load} disabled={busy}>
          Refresh
        </button>
      </div>
      {error && <div className="banner error">{error}</div>}
      {!busy && items.length === 0 && (
        <div className="empty">
          <b>Nothing here</b>
          <p>No questions in this status.</p>
        </div>
      )}
      {items.map((q) => (
        <div key={q.id} className="question">
          <div className="question-head">
            <span className="qnum">#{q.id}</span>
            <span className="tag accent">{q.qtype}</span>
            <span className="tag">{q.section}</span>
            {q.source_name && <span className="tag">{q.source_name}</span>}
          </div>
          <p className="prompt">{q.prompt.slice(0, 240)}{q.prompt.length > 240 ? "…" : ""}</p>
          <p className="small">
            Key: <b>{q.answer}</b>
            {variantsOf(q).length > 0 && ` · variants: ${variantsOf(q).join(", ")}`}
          </p>
          <div className="row">
            {status !== "verified" && (
              <button className="btn btn-sm btn-primary" onClick={() => decide(q.id, "verified")}>
                Verify
              </button>
            )}
            {status !== "rejected" && (
              <button className="btn btn-sm btn-danger" onClick={() => decide(q.id, "rejected")}>
                Reject
              </button>
            )}
            <button className="btn btn-sm btn-ghost" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
              {expanded === q.id ? "collapse" : "details"}
            </button>
          </div>
          {expanded === q.id && (
            <pre className="json">{JSON.stringify(q, null, 2)}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------- add single ----------------

const TYPES = ["mcq", "fill-blank", "word-form", "cloze", "transformation", "writing"];
const SECTIONS = ["phonetics", "lexico-grammar", "word-formation", "cloze", "reading", "writing"];

function AddQuestion() {
  const [form, setForm] = useState({
    qtype: "mcq",
    section: "lexico-grammar",
    prompt: "",
    options: "",
    answer: "",
    acceptedVariants: "",
    tags: "",
    difficulty: "3",
  });
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

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
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
      difficulty: Number(form.difficulty),
    };
    if (form.qtype === "mcq") payload.options = form.options.split("|").map((s) => s.trim()).filter(Boolean);
    let sid = sourceId ? Number(sourceId) : null;
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
    try {
      const res = await api.adminCreateQuestion(payload);
      setResult(`Created #${res.id}  as ${res.status}.`);
      setForm((f) => ({ ...f, prompt: "", answer: "", acceptedVariants: "", tags: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card panel">
      <h3>add</h3>
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
          Difficulty
          <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
            {[1, 2, 3, 4, 5].map((d) => (
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
          <textarea value={form.prompt} onChange={(e) => set("prompt", e.target.value)} rows={4} />
        </label>
        {form.qtype === "mcq" && (
          <label className="field wide">
            Options (pipe-separated, e.g. "ratified|rectified|rebutted|refuted")
            <input value={form.options} onChange={(e) => set("options", e.target.value)} />
          </label>
        )}
        <label className="field">
          Answer {form.qtype === "mcq" ? "(letter A–D)" : ""}
          <input value={form.answer} onChange={(e) => set("answer", e.target.value)} />
        </label>
        <label className="field">
          Accepted variants (pipe-separated)
          <input value={form.acceptedVariants} onChange={(e) => set("acceptedVariants", e.target.value)} />
        </label>
        <label className="field">
          Tags (comma-separated)
          <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="stress, phrasal-verbs" />
        </label>
      </div>
      <button className="btn btn-primary" onClick={submit} disabled={busy || !form.prompt || !form.answer}>
        {busy ? "Creating…" : "Create draft"}
      </button>
      {result && <div className="banner ok">{result}</div>}
      {error && <div className="banner error">{error}</div>}
    </div>
  );
}

// ---------------- bulk import ----------------

const CSV_COLUMNS = [
  "qtype", "section", "prompt", "options", "answer", "accepted_variants", "tags", "difficulty",
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
          difficulty: get("difficulty") ? Number(get("difficulty")) : 3,
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
      <h3>bulk</h3>
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
      {error && <div className="banner error">{error}</div>}
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
      {error && <div className="banner error">{error}</div>}
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
