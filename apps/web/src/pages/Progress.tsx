import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sectionMeta, tagStyle } from "../sections";
import { ScoreRing } from "../components/ScoreRing";
import { getStats } from "../store";
import { t } from "../i18n";
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
      setStats(await getStats(days));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("load failed"));
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
          <IconTrend size={18} /> {t("Progress")}
        </h2>
        <div className="row">
          <div className="seg" role="radiogroup" aria-label={t("Time range")}>
            {RANGES.map((r) => (
              <button
                key={r.value}
                className={range === r.value ? "active" : ""}
                role="radio"
                aria-checked={range === r.value}
                onClick={() => setRange(r.value)}
              >
                {t(r.label)}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => void load(range)} disabled={busy}>
            {t("Refresh")}
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
          <b>{t("No progress yet")}</b>
          <p>{t("Run a practice session and your results will start showing up here — accuracy, streaks, and weak spots.")}</p>
          <Link to="/practice" className="btn btn-primary btn-sm">
            <IconBolt size={14} /> {t("Start practicing")}
          </Link>
        </div>
      )}

      {stats && stats.totalSessions > 0 && (
        <>
          <div className="stat-grid">
            <div className="card panel stat-card acc-ring">
              <ScoreRing value={stats.totalCorrect} max={Math.max(stats.totalAnswered, 1)} size={72} stroke={7} tone={ringTone} />
              <div>
                <div className="stat-label">{t("Accuracy")}</div>
                <div className="stat-num">{pct(stats.accuracy)}</div>
              </div>
            </div>
            <div className="card panel stat-card">
              <div className="stat-num">{stats.totalSessions}</div>
              <div className="stat-label">{t("Practice sessions")}</div>
            </div>
            <div className="card panel stat-card">
              <div className="stat-num">{stats.streak}</div>
              <div className="stat-label">{t("Day streak")}</div>
            </div>
            <div className="card panel stat-card">
              <div className="stat-num">{stats.bestDay ? pct(stats.bestDay.accuracy) : "—"}</div>
              <div className="stat-label">{stats.bestDay ? t("Best day · {date}", { date: fmtDate(stats.bestDay.date) }) : t("Best day")}</div>
            </div>
          </div>

          {stats.focus && focusMeta && (
            <div className="card panel focus-card" style={{ marginBottom: 18 }}>
              <div className="row">
                <span className="tile-icon" style={{ background: `${focusMeta.color}1f`, color: focusMeta.color }}>
                  <SectionIcon icon={focusMeta.icon} size={16} />
                </span>
                <div>
                  <b>{t("Focus: {section}", { section: focusMeta.label })}</b>
                  <div className="muted small">{t("Your weakest section with enough attempts — worth a drill.")}</div>
                </div>
              </div>
              <Link to={`/practice?section=${stats.focus}`} className="btn btn-primary btn-sm">
                <IconBolt size={14} /> {t("Drill {section}", { section: focusMeta.short })}
              </Link>
            </div>
          )}

          {stats.bySection.length > 0 && (
            <div className="card panel" style={{ marginBottom: 18 }}>
              <h3>{t("By section")}</h3>
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
              <h3>{t("Skill gaps")}</h3>
              <p className="muted small">{t("Most-failed tags across your answers. Drill by topic when you practice.")}</p>
              <div className="row-chips">
                {stats.topTags.map((tag) => (
                  <span key={tag.tag} className="tag accent" title={t("{n} wrong of {total}", { n: tag.wrong, total: tag.total })}>
                    <IconTarget size={11} /> {tag.tag} · {t("{n} missed", { n: tag.wrong })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {stats.recent.length > 0 && (
            <div className="card panel">
              <h3>{t("Recent sessions")}</h3>
              <div>
                {stats.recent.map((r) => {
                  const meta = sectionMeta(r.section ?? "");
                  const pct = r.count > 0 ? Math.round((r.score / r.count) * 100) : 0;
                  const scoreCls = pct >= 80 ? "ok" : pct >= 60 ? "warn" : "bad";
                  return (
                    <div key={r.id} className="recent-row">
                      <span className="tag" style={tagStyle(r.section || "mixed")}>
                        <SectionIcon icon={meta?.icon ?? ""} size={11} /> {meta?.short ?? (r.section ?? t("Mixed"))}
                      </span>
                      <span className="grow muted small">
                        {t("{n} question{s}", { n: r.count, s: r.count === 1 ? "" : "s" })} · {fmtDate(r.createdAt)}
                      </span>
                      <span className={`tag ${scoreCls}`}>
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
