import { useState, type CSSProperties, type FC } from "react";
import { Link } from "react-router-dom";
import { SECTIONS, sectionGradient, sectionMeta } from "../sections";
import {
  IconBolt,
  IconCheck,
  IconClock,
  IconPen,
  IconShield,
  IconTarget,
  IconTrend,
  IconUsers,
  SectionIcon,
} from "../icons";
import type { IconProps } from "../icons";
import { t } from "../i18n";

const IconCopy: FC<IconProps> = (p) => (
  <svg width={p.size ?? 15} height={p.size ?? 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CLASSROOM = [
  {
    icon: IconBolt,
    title: "Instant drills",
    text: "Students open a section link and start answering immediately — deterministic questions are scored on the spot with explanations.",
  },
  {
    icon: IconClock,
    title: "Exam pacing",
    text: "Use the in-app timer (stopwatch or countdown) to run timed rounds, or send students to a full mock exam.",
  },
  {
    icon: IconTarget,
    title: "Mistake review",
    text: "Every wrong answer lands in a student's mistake ledger — drill a whole class on the same weak spots.",
  },
  {
    icon: IconTrend,
    title: "Progress tracking",
    text: "Students can watch their accuracy, streaks, and weakest sections on their Progress page — no account needed.",
  },
  {
    icon: IconShield,
    title: "Privacy-first",
    text: "No student accounts, no emails, no personal data collected. Each student works under an anonymous ID.",
  },
];

export default function Teachers() {
  const [sec, setSec] = useState("lexico-grammar");
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/practice?section=${sec}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("Copy this link:"), link);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>
          <IconUsers size={18} /> {t("For teachers")}
        </h2>
      </div>

      <section className="card panel">
        <h2 style={{ marginBottom: 8 }}>{t("HSG practice for your class — no accounts, no setup.")}</h2>
        <p className="muted" style={{ maxWidth: "60ch", marginTop: 0 }}>
          {t("HsgTrainer gives every student real HSG-style questions with instant feedback, a mistakes ledger, and progress tracking. There's nothing to install, no roster to manage, and no student data to protect — it all stays anonymous.")}
        </p>
        <div className="row">
          <Link to="/practice" className="btn btn-primary">
            <IconBolt size={16} /> {t("Try a session")}
          </Link>
          <Link to="/exams" className="btn btn-ghost">
            <IconClock size={16} /> {t("Browse mock exams")}
          </Link>
        </div>
      </section>

      <section className="card panel">
        <h3>{t("Share a practice link")}</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("Pick a section, copy the link, and send it to your class. Students start instantly — no sign-up.")}
        </p>
        <div className="chip-row" role="radiogroup" aria-label={t("Section to share")}>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`chip-btn ${sec === s.key ? "active" : ""}`}
              role="radio"
              aria-checked={sec === s.key}
              onClick={() => setSec(s.key)}
            >
              {s.short}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <code className="share-link">{link}</code>
          <button className="btn btn-primary" onClick={() => void copy()}>
            {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
            {copied ? t("Copied!") : t("Copy link")}
          </button>
        </div>
      </section>

      <h3 className="tools-cat">{t("Using it in the classroom")}</h3>
      <div className="tools-grid">
        {CLASSROOM.map((c) => (
          <div key={c.title} className="tool-card">
            <b>
              <c.icon size={15} /> {t(c.title)}
            </b>
            <span className="tool-purpose">{t(c.text)}</span>
          </div>
        ))}
      </div>

      <h3 className="tools-cat">{t("What students can train")}</h3>
      <div className="section-grid">
        {SECTIONS.map((s, i) => {
          const meta = sectionMeta(s.key);
          return (
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
                <p>{meta?.deterministic ? t("Instant feedback") : t("AI-scored writing")}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <section className="card panel">
        <h3>
          <IconPen size={16} aria-hidden="true" /> {t("Coming next")}
        </h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("Real classroom features — classes, student rosters, and result overviews — are on the roadmap. They need a proper account system, so until then the app stays fully anonymous and free.")}
        </p>
      </section>
    </div>
  );
}
