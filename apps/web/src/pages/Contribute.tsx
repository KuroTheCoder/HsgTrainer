import { useState } from "react";
import { api } from "../api";
import { CEFR_OPTIONS, sectionMeta } from "../sections";
import { validateField, validateForm, type FormErrors, type QuestionFormValues } from "../formRules";
import { ErrorSummary, type FormError } from "../components/ErrorSummary";
import { t } from "../i18n";

const TYPES: Record<string, string> = {
  mcq: "MCQ",
  "fill-blank": "Fill-blank",
  "word-form": "Word form",
  cloze: "Cloze",
  transformation: "Transformation",
  writing: "Writing",
};
const SECTIONS = ["phonetics", "lexico-grammar", "word-formation", "cloze", "reading", "writing", "listening"];

function errorsToList(errors: FormErrors): FormError[] {
  return (Object.keys(errors) as (keyof FormErrors)[])
    .map((k) => ({ field: `c-${k}`, message: errors[k]! }))
    .filter((e) => e.message);
}

export default function Contribute() {
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
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);

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
    setDone(null);
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
    try {
      const res = await api.contribute(payload);
      setDone(t("Submitted — {msg} It will go live after a human review.", { msg: res.message }));
      setErrors({});
      setForm((f) => ({ ...f, prompt: "", answer: "", acceptedVariants: "", tags: "", keyWords: "", options: "", audio: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("submission failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t("Contribute a question")}</h2>
      </div>
      <div className="card panel">
        <p className="hint" style={{ marginTop: 0 }}>
          {t("Share a good HSG-style question with the community. Submissions start")} <b>{t("unverified")}</b> {t("and go live only after a human review — provenance is what keeps the bank trustworthy.")}
        </p>
        <ErrorSummary errors={errorsToList(errors)} />
        <div className="field-grid">
          <label className="field">
            {t("Type")}
            <select value={form.qtype} onChange={(e) => set("qtype", e.target.value)}>
              {Object.entries(TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("Section")}
            <select value={form.section} onChange={(e) => set("section", e.target.value)}>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {sectionMeta(s)?.label ?? s}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("Difficulty (CEFR)")}
            <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
              {CEFR_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("Tags (comma-separated)")}
            <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="stress, phrasal-verbs" />
          </label>
          <label className="field wide">
            {t("Prompt (include the passage inline for cloze/reading)")}
            <textarea
              id="c-prompt"
              value={form.prompt}
              onChange={(e) => set("prompt", e.target.value)}
              onBlur={() => onBlur("prompt")}
              rows={4}
              aria-invalid={errors.prompt ? true : undefined}
              aria-describedby={errors.prompt ? "c-prompt-error" : undefined}
            />
            {errors.prompt && (
              <span className="field-error" id="c-prompt-error">
                {errors.prompt}
              </span>
            )}
          </label>
          {form.qtype === "mcq" && (
            <label className="field wide">
              {t("Options (pipe-separated, e.g. \"ratified|rectified|rebutted|refuted\")")}
              <input
                id="c-options"
                value={form.options}
                onChange={(e) => set("options", e.target.value)}
                onBlur={() => onBlur("options")}
                aria-invalid={errors.options ? true : undefined}
                aria-describedby={errors.options ? "c-options-error" : undefined}
              />
              {errors.options && (
                <span className="field-error" id="c-options-error">
                  {errors.options}
                </span>
              )}
            </label>
          )}
          <label className="field">
            {t("Answer")} {form.qtype === "mcq" ? t("(letter A–D)") : ""}
            <input
              id="c-answer"
              value={form.answer}
              onChange={(e) => set("answer", e.target.value)}
              onBlur={() => onBlur("answer")}
              aria-invalid={errors.answer ? true : undefined}
              aria-describedby={errors.answer ? "c-answer-error" : undefined}
            />
            {errors.answer && (
              <span className="field-error" id="c-answer-error">
                {errors.answer}
              </span>
            )}
          </label>
          <label className="field">
            {t("Accepted variants (pipe-separated)")}
            <input value={form.acceptedVariants} onChange={(e) => set("acceptedVariants", e.target.value)} />
          </label>
          <label className="field wide">
            {t("Audio clip path (for Listening questions — e.g. \"/audio/paper-2023-part2.mp3\")")}
            <input value={form.audio} onChange={(e) => set("audio", e.target.value)} placeholder="/audio/…" />
          </label>
          <label className="field wide">
            {t("Key words & phrases (comma-separated) — shown to students for quick dictionary lookup")}
            <input value={form.keyWords} onChange={(e) => set("keyWords", e.target.value)} placeholder="at variance, abrupt, ratify" />
          </label>
        </div>
        <button className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
          {busy ? t("Submitting…") : t("Submit for review")}
        </button>
        {done && (
          <div className="banner ok" role="status">
            {done}
          </div>
        )}
        {error && (
          <div className="banner error" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
