import { Link } from "react-router-dom";
import { sectionGradient, SECTIONS } from "../sections";
import {
  IconArrow,
  IconBolt,
  IconCheck,
  IconClock,
  IconPlus,
  IconShield,
  IconShuffle,
  IconSparkle,
  IconTarget,
  IconUser,
  IconUsers,
  IconX,
  SectionIcon,
} from "../icons";
import { ScoreRing } from "../components/ScoreRing";
import type { CSSProperties } from "react";

const PAINS = [
  {
    icon: <IconShuffle size={18} />,
    title: "A different game",
    text: "HSG papers test lexical depth and formats that school textbooks never touch.",
  },
  {
    icon: <IconX size={18} />,
    title: "Keys mark, never explain",
    text: "Official answer keys say right or wrong — they never tell you why an option fails.",
  },
  {
    icon: <IconClock size={18} />,
    title: "Self-study is blind",
    text: "No teacher, no tracker, no idea where you keep dropping points.",
  },
];

const FEATURES = [
  {
    icon: <IconCheck size={20} />,
    title: "Instant feedback",
    text: "Check answers as you go — accepted variants, plus an explanation of every option so a wrong guess still teaches you something.",
    tint: "#3b82f6",
    cls: "bento-lg",
  },
  {
    icon: <IconSparkle size={20} />,
    title: "AI writing feedback",
    text: "Essays are scored on content, organization, vocabulary, and grammar — with concrete fixes, not a vague grade.",
    tint: "#f43f5e",
    cls: "bento-lg",
  },
  {
    icon: <IconTarget size={20} />,
    title: "A ledger of your mistakes",
    text: "Every wrong answer is remembered and grouped, so you drill exactly what you keep missing.",
    tint: "#8b5cf6",
    cls: "bento-md",
  },
  {
    icon: <IconShield size={20} />,
    title: "Human-verified content",
    text: "Official papers come in as verified; community and AI content is reviewed by people before it reaches you.",
    tint: "#10b981",
    cls: "bento-md",
  },
];

const CASES = [
  {
    icon: <IconUser size={18} />,
    title: "For students",
    items: [
      "Practice any section, any difficulty — no account needed",
      "See exactly where you lose marks, section by section",
      "Drill your mistake ledger until weaknesses become strengths",
    ],
  },
  {
    icon: <IconUsers size={18} />,
    title: "For teachers & clubs",
    items: [
      "Assign practice sets without grading homework by hand",
      "Writing feedback at rubric level, ready to discuss in class",
      "Free and unlimited — run an entire HSG team on it",
    ],
  },
];

export default function Home() {
  return (
    <div className="landing-wrap">
      <section className="hero">
        <div className="hero-grid">
          <div>
            <span className="hero-eyebrow">
              <IconShield size={13} />
              For HSG English candidates · free forever
            </span>
            <h1>
              Train for the <em>HSG English</em> exam.
            </h1>
            <p>
              Real question formats from Vietnam học sinh giỏi papers — phonetics, lexico-grammar,
              word formation, cloze, reading, and writing with AI rubric feedback. Instant results,
              human-verified content, zero cost.
            </p>
            <div className="hero-actions">
              <Link to="/practice" className="btn btn-primary btn-lg">
                <IconBolt size={17} />
                Start practicing
              </Link>
              <Link to="/contribute" className="btn btn-ghost btn-lg">
                <IconPlus size={17} />
                Contribute a question
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

      <section className="problem-band">
        <p className="lead">
          <b>HSG exams don't look like school tests.</b> This is what usually happens when
          candidates prepare on their own.
        </p>
        <div className="pain-grid">
          {PAINS.map((p, i) => (
            <div key={p.title} className="card pain-card" style={{ "--i": i } as CSSProperties}>
              <span className="tile-icon">{p.icon}</span>
              <b>{p.title}</b>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

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
            <span
              className="tile-icon"
              style={{ background: `${s.color}1f`, color: s.color }}
            >
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

      <h3 className="landing-title">
        Why it works <span className="muted">— built for real improvement</span>
      </h3>
      <div className="bento">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`card bento-card ${f.cls}`}
            style={{ "--i": i, "--card-tint": sectionGradient(f.tint), "--card-fg": f.tint } as CSSProperties}
          >
            <span className="tile-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>

      <h3 className="landing-title">
        Made for students and teachers
      </h3>
      <div className="use-cases">
        {CASES.map((c, i) => (
          <div key={c.title} className="card case-card" style={{ "--i": i } as CSSProperties}>
            <div className="case-head">
              <span className="tile-icon">{c.icon}</span>
              <b>{c.title}</b>
            </div>
            <ul>
              {c.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section className="card cta-banner">
        <h2>Your next HSG paper doesn't have to be a guess.</h2>
        <p>
          Start free in ten seconds — no account, no credit card, no ads. Practice, get feedback,
          and keep the mistakes that matter.
        </p>
        <div className="hero-actions">
          <Link to="/practice" className="btn btn-primary btn-lg">
            <IconBolt size={17} />
            Start practicing free
          </Link>
          <Link to="/contribute" className="btn btn-ghost btn-lg">
            <IconPlus size={17} />
            Share a question
          </Link>
        </div>
      </section>
    </div>
  );
}
