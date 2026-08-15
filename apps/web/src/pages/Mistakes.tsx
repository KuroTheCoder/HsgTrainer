import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { sectionMeta, SECTIONS } from "../sections";
import { IconBolt, IconTarget, SectionIcon } from "../icons";
import type { Mistake } from "../types";

export default function Mistakes() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [section, setSection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async (sec: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.getMistakes(sec || undefined);
      setMistakes(res.mistakes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
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

  const countBySection = new Map<string, number>();
  for (const m of mistakes) countBySection.set(m.section, (countBySection.get(m.section) ?? 0) + 1);

  return (
    <div className="page">
      <div className="page-head">
        <h2>My mistakes</h2>
        <div className="row">
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">All sections</option>
            {SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => void load(section)} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      {!busy && mistakes.length === 0 && (
        <div className="card empty">
          <b>No mistakes yet</b>
          <p>Keep practicing — wrong answers land here so you can drill your weak spots.</p>
        </div>
      )}

      {countBySection.size > 0 && (
        <div className="card panel" style={{ padding: "16px 20px", marginBottom: 18 }}>
          <div className="row">
            <span className="tag accent">
              <IconTarget size={12} /> {mistakes.length} mistake(s)
            </span>
            {[...countBySection.entries()].map(([sec, n]) => {
              const meta = sectionMeta(sec);
              return (
                <span key={sec} className="tag" title={meta?.label}>
                  <SectionIcon icon={meta?.icon ?? ""} size={12} />
                  {n} · {meta?.short ?? sec}
                </span>
              );
            })}
          </div>
          <div className="spread" style={{ marginTop: 10 }}>
            <span className="hint">Retry these in a fresh session — get them right to clear them.</span>
            <button className="btn btn-primary btn-sm" onClick={practiceThese} disabled={mistakes.length === 0}>
              <IconBolt size={14} />
              Practice these
            </button>
          </div>
        </div>
      )}

      {mistakes.map((m, i) => {
        const meta = sectionMeta(m.section);
        return (
          <div key={m.answerId} className="question wrong" style={{ "--i": i } as CSSProperties}>
            <div className="question-head">
              <span className="qnum">
                <span className="qnum-icon">
                  <SectionIcon icon={meta?.icon ?? ""} size={15} />
                  {meta?.short ?? m.section} · {m.qtype}
                </span>
              </span>
              <span className="tag">difficulty {m.difficulty}</span>
              {m.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
              <span className="tag">{new Date(m.answeredAt).toLocaleDateString()}</span>
            </div>
            <p className="prompt">{m.prompt}</p>
            <p className="small">
              Your answer: <b>{m.yourAnswer}</b> — correct: <b>{m.expected}</b>
            </p>
            {m.explanation && <p className="explanation">{m.explanation}</p>}
          </div>
        );
      })}
    </div>
  );
}
