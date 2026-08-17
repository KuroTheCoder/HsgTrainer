import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { deleteMistakes, getMistakes } from "../store";
import { cefrBand, sectionMeta, SECTIONS, tagStyle } from "../sections";
import { IconBolt, IconTarget, IconTrash, SectionIcon } from "../icons";
import { renderMarkdown } from "../md";
import { play } from "../sfx";
import { t } from "../i18n";
import type { Mistake } from "../types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (diff < min) return t("just now");
  if (diff < hour) return t("{n}m ago", { n: Math.floor(diff / min) });
  if (diff < day) return t("{n}h ago", { n: Math.floor(diff / hour) });
  if (diff < 30 * day) return t("{n}d ago", { n: Math.floor(diff / day) });
  return new Date(iso).toLocaleDateString();
}

export default function Mistakes() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [section, setSection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  const load = useCallback(async (sec: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await getMistakes(sec || undefined);
      setMistakes(res);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("load failed"));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(section);
  }, [load, section]);

  const practiceThese = () => {
    const ids = [...new Set(mistakes.map((m) => m.questionId))];
    if (ids.length === 0) return;
    navigate(`/practice?questions=${ids.join(",")}`);
  };

  const toggleSelected = (answerId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(answerId)) next.delete(answerId);
      else next.add(answerId);
      return next;
    });
  };

  const clearSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(t("Delete {n} mistake(s)? This cannot be undone.", { n: ids.length }))) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await deleteMistakes({ ids });
      setNotice(t("{n} mistake(s) deleted.", { n: res.deleted }));
      play("clear");
      await load(section);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("delete failed"));
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (mistakes.length === 0) return;
    const scope = section ? t(" in {section}", { section: sectionMeta(section)?.label ?? section }) : "";
    if (!window.confirm(t("Delete ALL mistake rows{s}? This cannot be undone.", { s: scope }))) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await deleteMistakes({ section: section || undefined });
      setNotice(t("{n} mistake(s) deleted.", { n: res.deleted }));
      play("clear");
      await load(section);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("delete failed"));
      setBusy(false);
    }
  };

  const countBySection = new Map<string, number>();
  for (const m of mistakes) countBySection.set(m.section, (countBySection.get(m.section) ?? 0) + 1);

  const topGap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of mistakes) {
      for (const t of m.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    let best: { tag: string; count: number } | null = null;
    for (const [tag, n] of counts) {
      if (!best || n > best.count) best = { tag, count: n };
    }
    return best;
  }, [mistakes]);

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t("My mistakes")}</h2>
        <div className="row">
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">{t("All sections")}</option>
            {SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => void load(section)} disabled={busy}>
            {t("Refresh")}
          </button>
        </div>
      </div>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="banner ok" role="status">
          {notice}
        </div>
      )}

      {!busy && mistakes.length === 0 && (
        <div className="card empty">
          <b>{t("No mistakes yet")}</b>
          <p>{t("Keep practicing — wrong answers land here so you can drill your weak spots.")}</p>
        </div>
      )}

      {countBySection.size > 0 && (
        <div className="card panel mistake-summary" style={{ padding: "16px 20px", marginBottom: 18 }}>
          <div className="row">
            <span className="tag accent">
              <IconTarget size={12} /> {t("{n} mistake(s)", { n: mistakes.length })}
            </span>
            {[...countBySection.entries()].map(([sec, n]) => {
              const meta = sectionMeta(sec);
              return (
                <span key={sec} className="tag" style={tagStyle(sec)} title={meta?.label}>
                  <SectionIcon icon={meta?.icon ?? ""} size={12} />
                  {n} · {meta?.short ?? sec}
                </span>
              );
            })}
            {topGap && (
              <span className="tag accent" title={t("Most frequent tag across your mistakes ({n})", { n: topGap.count })}>
                {t("Top gap")}: {topGap.tag}
              </span>
            )}
          </div>
          <div className="spread" style={{ marginTop: 10 }}>
            <span className="hint">{t("Study loop: drill these in a fresh session — get each one right and it clears from this list automatically.")}</span>
            <div className="row">
              <button
                className="btn btn-primary btn-sm"
                onClick={practiceThese}
                disabled={mistakes.length === 0}
              >
                <IconBolt size={14} />
                {t("Study now")}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => void clearSelected()}
                disabled={selected.size === 0 || busy}
                title={t("Delete the selected mistakes")}
              >
                <IconTrash size={14} />
                {t("Clear selected")}{selected.size > 0 ? t(" ({n})", { n: selected.size }) : ""}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => void clearAll()}
                disabled={mistakes.length === 0 || busy}
                title={t("Delete every mistake in this browser")}
              >
                <IconTrash size={14} />
                {t("Clear all")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card-grid">
        {mistakes.map((m, i) => {
          const meta = sectionMeta(m.section);
          return (
            <div key={m.answerId} className={`question wrong ${selected.has(m.answerId) ? "row-selected" : ""}`} style={{ "--i": i } as CSSProperties}>
              <div className="question-head">
                <label className="row-check" title={t("Select for deletion")}>
                  <input
                    type="checkbox"
                    checked={selected.has(m.answerId)}
                    onChange={() => toggleSelected(m.answerId)}
                  />
                  <span className="sr-only">{t("Select mistake {n}", { n: i + 1 })}</span>
                </label>
                <span className="qnum">
                  <span className="qnum-icon">
                    <SectionIcon icon={meta?.icon ?? ""} size={15} />
                    {meta?.short ?? m.section} · {m.qtype}
                  </span>
                </span>
                <span className={`tag cefr ${cefrBand(m.difficulty)}`}>{m.difficulty}</span>
                {m.tags.map((t) => (
                  <span key={t} className="tag" style={tagStyle(t)}>
                    {t}
                  </span>
                ))}
                <span className="tag">{timeAgo(m.answeredAt)}</span>
                <button
                  className="btn btn-ghost btn-sm ml-auto"
                  onClick={() => navigate(`/practice?questions=${m.questionId}`)}
                  title={t("Drill this question in a fresh session — get it right to clear it")}
                >
                  <IconBolt size={12} />
                  {t("Drill")}
                </button>
              </div>
              <p className="prompt">{renderMarkdown(m.prompt)}</p>
              <p className="small">
                {t("Your answer")}: <b>{m.yourAnswer}</b> — {t("correct")}: <b>{m.expected}</b>
              </p>
              {m.explanation && <p className="explanation">{renderMarkdown(m.explanation)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
