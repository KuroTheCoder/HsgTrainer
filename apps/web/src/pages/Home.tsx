import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { sectionGradient, SECTIONS, sectionMeta } from "../sections";
import {
  IconArrow,
  IconBolt,
  IconCheck,
  IconClock,
  IconPen,
  IconPlus,
  IconShield,
  IconSparkle,
  IconTarget,
  IconTrend,
  SectionIcon,
} from "../icons";
import { ScoreRing } from "../components/ScoreRing";
import type { CSSProperties } from "react";
import type { ProgressStats } from "../types";

function pct(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

function ringTone(acc: number | null): "ok" | "warn" | "bad" {
  if (acc == null) return "bad";
  if (acc >= 0.7) return "ok";
  if (acc >= 0.4) return "warn";
  return "bad";
}

export default function Home() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [mistakeCount, setMistakeCount] = useState<number | null>(null);
  const [paperCount, setPaperCount] = useState<number | null>(null);
  const [essayCount, setEssayCount] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.allSettled([api.getStats(30), api.getMistakes(), api.getPapers(), api.getWritingHistory()]).then(
      ([s, m, p, w]) => {
        if (s.status === "fulfilled") setStats(s.value);
        if (m.status === "fulfilled") setMistakeCount(m.value.mistakes.length);
        if (p.status === "fulfilled") setPaperCount(p.value.papers.length);
        if (w.status === "fulfilled") setEssayCount(w.value.entries.length);
        setLoaded(true);
      },
    );
  }, []);

  const hasProgress = !!stats && stats.totalSessions > 0;
  const topSections = (stats?.bySection ?? [])
    .filter((s) => s.answered > 0)
    .sort((a, b) => b.answered - a.answered)
    .slice(0, 4);
  const focusMeta = stats?.focus ? sectionMeta(stats.focus) : undefined;

  return (
    <div className="landing-wrap home-dash">
      <section className="hero home-hero">
        <div className="hero-grid">
          <div>
            <span className="hero-eyebrow">
              <IconShield size={13} />
              For HSG English candidates · free forever
            </span>
            <h1>
              Train for the <em>HSG English</em> exam.
            </h1>
            <p>Real exam formats, instant feedback, human-verified content — and a ledger that shows exactly where you keep dropping points.</p>
            <div className="hero-actions">
              <Link to="/practice" className="btn btn-primary btn-lg">
                <IconBolt size={17} />
                Start practicing
              </Link>
              <Link to="/exams" className="btn btn-ghost btn-lg">
                <IconClock size={17} />
                Mock exam
              </Link>
            </div>
            <div className="hero-stats">
              <span>
                <b>6</b>
                exam sections
              </span>
              <span>
                <b>100%</b>
                free forever
              </span>
              <span>
                <b>Human</b>
                -verified content
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="mock-card">
              <div className="mock-head">
                <span className="tag accent">lexico-grammar</span>
                <span className="tag">mcq</span>
              </div>
              <p className="mock-q">
                The committee's decision was <b>____</b> by the board.
              </p>
              <div className="mock-options">
                <span className="mock-opt correct">
                  <i>A</i> ratified
                </span>
                <span className="mock-opt">
                  <i>B</i> rectified
                </span>
                <span className="mock-opt">
                  <i>C</i> rebutted
                </span>
                <span className="mock-opt">
                  <i>D</i> refuted
                </span>
              </div>
              <div className="mock-foot">
                <ScoreRing value={4} max={5} size={44} stroke={5} tone="ok" />
                <span>
                  Correct — <b>C1 · advanced</b>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <h3 className="dash-title">
        <IconTrend size={15} /> Jump back in
      </h3>
      <div className="quick-tiles">
        <Link to="/practice" className="quick-tile">
          <span className="tile-icon" style={{ background: "#3b82f61f", color: "#3b82f6" }}>
            <IconBolt size={18} />
          </span>
          <span>
            <b>Practice</b>
            <span className="tile-sub">New set in any section</span>
          </span>
        </Link>
        <Link to="/exams" className="quick-tile">
          <span className="tile-icon" style={{ background: "#8b5cf61f", color: "#8b5cf6" }}>
            <IconClock size={18} />
          </span>
          <span>
            <b>Mock exam</b>
            <span className="tile-sub">
              {paperCount == null ? "Checking papers…" : paperCount === 0 ? "No full papers yet" : `${paperCount} paper${paperCount === 1 ? "" : "s"} ready`}
            </span>
          </span>
        </Link>
        <Link to="/mistakes" className="quick-tile">
          <span className="tile-icon" style={{ background: "#f43f5e1f", color: "#f43f5e" }}>
            <IconTarget size={18} />
          </span>
          <span>
            <b>Mistakes</b>
            <span className="tile-sub">
              {mistakeCount == null ? "Checking…" : mistakeCount === 0 ? "All clear" : `${mistakeCount} to drill`}
            </span>
          </span>
        </Link>
        <Link to="/writing" className="quick-tile">
          <span className="tile-icon" style={{ background: "#10b9811f", color: "#10b981" }}>
            <IconPen size={18} />
          </span>
          <span>
            <b>Writing bank</b>
            <span className="tile-sub">
              {essayCount == null ? "Checking…" : essayCount === 0 ? "Write your first essay" : `${essayCount} essay${essayCount === 1 ? "" : "s"} saved`}
            </span>
          </span>
        </Link>
      </div>

      {!loaded && (
        <section className="card panel dash-progress dash-loading" aria-hidden="true">
          <span />
          <span />
          <span />
        </section>
      )}

      {loaded && !hasProgress && (
        <section className="card panel dash-empty">
          <b>Your progress will appear here</b>
          <p>Run a practice session and this dashboard starts tracking accuracy, streaks, and your weakest sections.</p>
          <Link to="/practice" className="btn btn-primary btn-sm">
            <IconBolt size={14} /> Start practicing
          </Link>
        </section>
      )}

      {loaded && hasProgress && stats && (
        <section className="card panel dash-progress">
          <div className="dash-kpis">
            <div className="dash-ring">
              <ScoreRing value={stats.totalCorrect} max={Math.max(stats.totalAnswered, 1)} size={84} stroke={8} tone={ringTone(stats.accuracy)} />
              <div>
                <div className="stat-label">Accuracy</div>
                <b>{pct(stats.accuracy)}</b>
              </div>
            </div>
            <div className="dash-kpi">
              <span>Streak</span>
              <b>{stats.streak} day{stats.streak === 1 ? "" : "s"}</b>
            </div>
            <div className="dash-kpi">
              <span>Sessions</span>
              <b>{stats.totalSessions}</b>
            </div>
          </div>

          <div className="dash-mini-bars">
            {topSections.map((s) => {
              const meta = sectionMeta(s.section);
              return (
                <div key={s.section} className="dash-mini-row">
                  <span className="b" title={meta?.label}>
                    <SectionIcon icon={meta?.icon ?? ""} size={13} /> {meta?.short ?? s.section}
                  </span>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${Math.round(s.accuracy * 100)}%`, background: meta?.color ?? undefined }} />
                  </div>
                  <span className="dash-mini-num">{pct(s.accuracy)}</span>
                </div>
              );
            })}
          </div>

          <div className="dash-side">
            {focusMeta && (
              <Link to={`/practice?section=${stats.focus ?? ""}`} className="focus-chip" style={{ "--fg": focusMeta.color } as CSSProperties}>
                <IconTarget size={14} />
                Focus: {focusMeta.short}
              </Link>
            )}
            <Link to="/progress" className="btn btn-ghost btn-sm">
              <IconTrend size={14} /> Full progress
            </Link>
          </div>
        </section>
      )}

      <h3 className="landing-title">
        Train every section <span className="muted">— real exam formats</span>
      </h3>
      <div className="section-grid">
        {SECTIONS.map((s, i) => (
          <Link
            key={s.key}
            to={`/practice?section=${s.key}`}
            className="card card-link section-card"
            style={{ "--i": i, "--card-tint": sectionGradient(s.color) } as CSSProperties}
          >
            <span className="tile-icon" style={{ background: `${s.color}1f`, color: s.color }}>
              <SectionIcon icon={s.icon} size={22} />
            </span>
            <div className="card-body">
              <h3>{s.label}</h3>
              <p>{s.description}</p>
            </div>
            <span className="card-meta">
              {s.deterministic ? "Instant feedback" : "AI-scored"}
              <IconArrow size={14} />
            </span>
          </Link>
        ))}
      </div>

      <section className="card strip">
        <div className="strip-body">
          <IconPlus size={22} />
          <div>
            <b>Have a good HSG question?</b>
            <span className="muted">Share it — it goes live after a quick human review.</span>
          </div>
        </div>
        <Link to="/contribute" className="btn btn-primary">
          Contribute
        </Link>
      </section>

      <div className="why-row">
        <span className="why-point">
          <IconCheck size={15} />
          <b>Instant feedback</b> &middot; every option explained
        </span>
        <span className="why-point">
          <IconShield size={15} />
          <b>Human-verified</b> content only
        </span>
        <span className="why-point">
          <IconSparkle size={15} />
          <b>Free forever</b> &middot; no account needed
        </span>
      </div>
    </div>
  );
}
