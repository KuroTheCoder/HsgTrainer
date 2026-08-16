import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { sectionMeta } from "../sections";
import { ScoreRing } from "../components/ScoreRing";
import { IconBolt, IconTarget, IconTrend, SectionIcon } from "../icons";
import type { ProgressStats } from "../types";

function pct(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

function tone(acc: number | null): "ok" | "warn" | "bad" {
  if (acc == null) return "bad";
  if (acc >= 0.7) return "ok";
  if (acc >= 0.4) return "warn";
  return "bad";
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export default function Progress() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [range, setRange] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (days: number) => {
    setBusy(true);
    setError(null);
    try {
      setStats(await api.getStats(days));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const ringTone = tone(stats?.accuracy ?? null);
  const focusMeta = stats?.focus ? sectionMeta(stats.focus) : undefined;

  return (
    <div className="page">
      <div className="page-head">
        <h2>
          <IconTrend size={18} /> Progress
        </h2>
        <div className="row">
          <div className="seg" role="radiogroup" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.value}
                className={range === r.value ? "active" : ""}
                role="radio"
                aria-checked={range === r.value}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => void load(range)} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      {!busy && stats && stats.totalSessions === 0 && (
        <div className="card empty">
          <b>No progress yet</b>
          <p>Run a practice session and your results will start showing up here — accuracy, streaks, and weak spots.</p>
          <Link to="/practice" className="btn btn-primary btn-sm">
            <IconBolt size={14} /> Start practicing
          </Link>
        </div>
      )}

      {stats && stats.totalSessions > 0 && (
        <>
          <div className="stat-grid">
            <div className="card panel stat-card acc-ring">
              <ScoreRing value={stats.totalCorrect} max={Math.max(stats.totalAnswered, 1)} size={72} stroke={7} tone={ringTone} />
              <div>
                <div className="stat-label">Accuracy</div>
                <div className="stat-num">{pct(stats.accuracy)}</div>
              </div>
            </div>
            <div className="card panel stat-card">
              <div className="stat-num">{stats.totalSessions}</div>
              <div className="stat-label">Practice sessions</div>
            </div>
            <div className="card panel stat-card">
              <div className="stat-num">{stats.streak}</div>
              <div className="stat-label">Day streak</div>
            </div>
            <div className="card panel stat-card">
              <div className="stat-num">{stats.bestDay ? pct(stats.bestDay.accuracy) : "—"}</div>
              <div className="stat-label">{stats.bestDay ? `Best day · ${fmtDate(stats.bestDay.date)}` : "Best day"}</div>
            </div>
          </div>

          {stats.focus && focusMeta && (
            <div className="card panel focus-card" style={{ marginBottom: 18 }}>
              <div className="row">
                <span className="tile-icon" style={{ background: `${focusMeta.color}1f`, color: focusMeta.color }}>
                  <SectionIcon icon={focusMeta.icon} size={16} />
                </span>
                <div>
                  <b>Focus: {focusMeta.label}</b>
                  <div className="muted small">Your weakest section with enough attempts — worth a drill.</div>
                </div>
              </div>
              <Link to={`/practice?section=${stats.focus}`} className="btn btn-primary btn-sm">
                <IconBolt size={14} /> Drill {focusMeta.short}
              </Link>
            </div>
          )}

          {stats.bySection.length > 0 && (
            <div className="card panel" style={{ marginBottom: 18 }}>
              <h3>By section</h3>
              <div className="section-bars">
                {stats.bySection.map((s) => {
                  const meta = sectionMeta(s.section);
                  return (
                    <div key={s.section} className="section-bar-row">
                      <span className="bar-label" title={meta?.label}>
                        <SectionIcon icon={meta?.icon ?? ""} size={14} />
                        {meta?.short ?? s.section}
                      </span>
                      <div className="bar">
                        <div
                          className="bar-fill"
                          style={{ width: `${Math.round(s.accuracy * 100)}%`, background: meta?.color ?? undefined }}
                        />
                      </div>
                      <span className="bar-num">
                        {s.correct}/{s.answered} · {pct(s.accuracy)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {stats.topTags.length > 0 && (
            <div className="card panel" style={{ marginBottom: 18 }}>
              <h3>Skill gaps</h3>
              <p className="muted small">Most-failed tags across your answers. Drill by topic when you practice.</p>
              <div className="row-chips">
                {stats.topTags.map((t) => (
                  <span key={t.tag} className="tag accent" title={`${t.wrong} wrong of ${t.total}`}>
                    <IconTarget size={11} /> {t.tag} · {t.wrong} missed
                  </span>
                ))}
              </div>
            </div>
          )}

          {stats.recent.length > 0 && (
            <div className="card panel">
              <h3>Recent sessions</h3>
              <div>
                {stats.recent.map((r) => {
                  const meta = sectionMeta(r.section ?? "");
                  return (
                    <div key={r.id} className="recent-row">
                      <span className="tag">
                        <SectionIcon icon={meta?.icon ?? ""} size={11} /> {meta?.short ?? (r.section ?? "Mixed")}
                      </span>
                      <span className="grow muted small">
                        {r.count} question{r.count === 1 ? "" : "s"} · {fmtDate(r.createdAt)}
                      </span>
                      <span className="tag ok">
                        {r.score}/{r.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
