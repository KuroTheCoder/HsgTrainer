import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { analyzeEssay } from "../analyzeEssay";
import { IconPen, IconSparkle, IconX } from "../icons";
import { renderMarkdown } from "../md";
import { t } from "../i18n";
import type { WritingHistoryEntry } from "../types";

const NOTE_KEY = "hsg-writing-note-dismissed";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

const CRITERIA = [
  { key: "content", label: "Content" },
  { key: "organization", label: "Organization" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "grammar", label: "Grammar" },
] as const;

function Diagnostics({ text }: { text: string }) {
  const d = useMemo(() => analyzeEssay(text), [text]);
  return (
    <div className="card diagnostics">
      <div className="spread">
        <b>{t("Diagnostics")}</b>
        <span className="tag accent">{t("Not an AI grade")}</span>
      </div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-num">{d.words}</div>
          <div className="stat-label">{t("Words")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{d.sentences}</div>
          <div className="stat-label">{t("Sentences")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{Math.round(d.avgSentenceWords * 10) / 10}</div>
          <div className="stat-label">{t("Avg sentence length")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{Math.round(d.uniqueRatio * 100)}%</div>
          <div className="stat-label">{t("Vocabulary variety")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{d.readability.fleschKincaidGrade}</div>
          <div className="stat-label">{t("Grade level ({label})", { label: d.readability.label })}</div>
        </div>
      </div>
      <p className="muted small" style={{ margin: "4px 0 10px" }}>
        {t("Flesch Reading Ease {fre} · Gunning Fog {fog} · {pct}% words over 6 letters. Rule-of-thumb readability only.", { fre: d.readability.fleschReadingEase, fog: d.readability.gunningFog, pct: Math.round(d.longRatio * 100) })}
      </p>
      {d.flags.length > 0 && (
        <ul className="flag-list">
          {d.flags.map((f) => (
            <li key={f.id} className={f.severity}>
              {f.label}
            </li>
          ))}
        </ul>
      )}
      {d.flags.length === 0 && <p className="hint">{t("No obvious issues — looks clean.")}</p>}
    </div>
  );
}

function Entry({ entry }: { entry: WritingHistoryEntry }) {
  return (
    <details className="card panel writing-entry">
      <summary>
        <span className="tag ok">
          {entry.band ? t("Band {band}", { band: entry.band }) : t("{score}/20", { score: entry.score })}
        </span>
        <span className="muted small">{fmtDate(entry.createdAt)}</span>
        <span className="muted small">{t("{n} words", { n: entry.response.trim().split(/\s+/).filter(Boolean).length })}</span>
      </summary>
      <div style={{ marginTop: 12 }}>
        <p className="prompt">{renderMarkdown(entry.prompt)}</p>
        <div className="essay-text">{entry.response}</div>

        {entry.criterionScores && (
          <div className="criterion-grid" style={{ marginTop: 12 }}>
            {CRITERIA.map((c) => {
              const v = entry.criterionScores?.[c.key] ?? 0;
              return (
                <div key={c.key} className="criterion">
                  <span>{c.label}</span>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${v * 20}%` }} />
                  </div>
                  <b>
                    {v}/5
                  </b>
                </div>
              );
            })}
          </div>
        )}
        {entry.justification && (
          <p className="small" style={{ marginTop: 10 }}>
            <b>{t("Why this score")}: </b> {entry.justification}
          </p>
        )}
        {entry.fixes && entry.fixes.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <b className="small">{t("How to improve")}</b>
            <ul style={{ marginTop: 4 }}>
              {entry.fixes.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        <Diagnostics text={entry.response} />
      </div>
    </details>
  );
}

export default function Writing() {
  const [entries, setEntries] = useState<WritingHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(() => !localStorage.getItem(NOTE_KEY));

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.getWritingHistory();
      setEntries(res.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("load failed"));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const dismissNote = () => {
    localStorage.setItem(NOTE_KEY, "1");
    setNoteOpen(false);
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>
          <IconPen size={18} /> {t("Writing bank")}
        </h2>
        <Link to="/practice?section=writing" className="btn btn-primary btn-sm">
          <IconSparkle size={14} />
          {t("New essay")}
        </Link>
      </div>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      {noteOpen && (
        <div className="banner info writing-note" role="status">
          <div>
            <b>{t("How your writing is handled")}</b>
            <span className="small">
              {" "}
              {t("Essays are stored anonymously and used only to give you feedback. AI scoring sends your essay to a scoring service — we never publish or share it. You get 3 AI feedback credits a day; the diagnostics below are free and run entirely on your device.")}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={dismissNote} aria-label={t("Dismiss note")}>
            <IconX size={14} /> {t("Got it")}
          </button>
        </div>
      )}

      {!busy && entries.length === 0 && (
        <div className="card empty">
          <b>{t("No essays yet")}</b>
          <p>{t("Write your first essay and get AI feedback — every scored essay is saved here with diagnostics.")}</p>
          <Link to="/practice?section=writing" className="btn btn-primary btn-sm">
            <IconSparkle size={14} /> {t("Write an essay")}
          </Link>
        </div>
      )}

      <div className="card-grid">
        {entries.map((e) => (
          <Entry key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}
