import { useState } from "react";
import { api } from "../api";
import { sectionMeta } from "../sections";

const TYPES: Record<string, string> = {
  mcq: "MCQ",
  "fill-blank": "Fill-blank",
  "word-form": "Word form",
  cloze: "Cloze",
  transformation: "Transformation",
  writing: "Writing",
};
const SECTIONS = ["phonetics", "lexico-grammar", "word-formation", "cloze", "reading", "writing"];

export default function Contribute() {
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
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
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
    try {
      const res = await api.contribute(payload);
      setDone(`Submitted — ${res.message} It will go live after a human review.`);
      setForm((f) => ({ ...f, prompt: "", answer: "", acceptedVariants: "", tags: "", options: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "submission failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Contribute a question</h2>
      </div>
      <div className="card panel">
        <p className="hint" style={{ marginTop: 0 }}>
          Share a good HSG-style question with the community. Submissions start{" "}
          <b>unverified</b> and go live\n          only after a human review — provenance is what keeps
          the bank trustworthy.
        </p>
        <div className="field-grid">
          <label className="field">
            Type
            <select value={form.qtype} onChange={(e) => set("qtype", e.target.value)}>
              {Object.entries(TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Section
            <select value={form.section} onChange={(e) => set("section", e.target.value)}>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {sectionMeta(s)?.label ?? s}
                </option>
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
            Tags (comma-separated)
            <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="stress, phrasal-verbs" />
          </label>
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
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !form.prompt || !form.answer}>
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        {done && <div className="banner ok">{done}</div>}
        {error && <div className="banner error">{error}</div>}
      </div>
    </div>
  );
}
