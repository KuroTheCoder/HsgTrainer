import { Link } from "react-router-dom";
import { IconExternal } from "../icons";

interface BuiltInTool {
  name: string;
  purpose: string;
  to: string;
}

interface ExternalTool {
  name: string;
  purpose: string;
  free: string;
  href: string;
}

const BUILT_IN: BuiltInTool[] = [
  {
    name: "Practice sessions",
    purpose: "Section-based drills with instant, deterministic scoring — phonetics to reading.",
    to: "/practice",
  },
  {
    name: "My mistakes",
    purpose: "Every wrong answer is filed here automatically, so review is one click away.",
    to: "/mistakes",
  },
  {
    name: "Notes & highlights",
    purpose: "Highlight phrases in any passage and keep a note on every question. Stored on your device.",
    to: "/practice",
  },
  {
    name: "Dictionary",
    purpose: "Look up any word in a reading prompt — a ribbon on the popup opens your chosen dictionary (pick one in Settings).",
    to: "/practice",
  },
  {
    name: "AI writing feedback",
    purpose: "Essays scored against the HSG rubric (content, organization, vocabulary, grammar) — 3 credits a day.",
    to: "/practice",
  },
  {
    name: "Session timer",
    purpose: "A stopwatch in the header to pace yourself through a set, exam-style.",
    to: "/practice",
  },
];

const COMMUNITY: Record<string, ExternalTool[]> = {
  "Dictionaries & reference": [
    {
      name: "Cambridge Dictionary",
      purpose: "Learner-friendly definitions, UK/US audio, and common collocation notes.",
      free: "Free",
      href: "https://dictionary.cambridge.org",
    },
    {
      name: "Oxford Learner's Dictionaries",
      purpose: "Definitions graded to learner levels with word-frequency (A1–C2) labels.",
      free: "Free",
      href: "https://www.oxfordlearnersdictionaries.com",
    },
    {
      name: "Merriam-Webster",
      purpose: "Full English-English definitions plus vocabulary quizzes.",
      free: "Free",
      href: "https://www.merriam-webster.com",
    },
  ],
  Pronunciation: [
    {
      name: "YouGlish",
      purpose: "Hear any word spoken by real people — searches YouTube clips for you.",
      free: "Free",
      href: "https://youglish.com",
    },
    {
      name: "Forvo",
      purpose: "Native-speaker audio for words in hundreds of accents.",
      free: "Free",
      href: "https://forvo.com",
    },
  ],
  "Reading & graded texts": [
    {
      name: "News in Levels",
      purpose: "The same news written at three reading levels — build toward the original.",
      free: "Free",
      href: "https://www.newsinlevels.com",
    },
    {
      name: "Breaking News English",
      purpose: "Graded news lessons with vocabulary and gap-fill exercises.",
      free: "Free",
      href: "https://breakingnewsenglish.com",
    },
    {
      name: "Project Gutenberg",
      purpose: "60,000+ public-domain classics for serious literary reading.",
      free: "Free",
      href: "https://www.gutenberg.org",
    },
  ],
  "Vocabulary & flashcards": [
    {
      name: "Anki",
      purpose: "Spaced-repetition flashcards — the standard for long-term vocabulary retention.",
      free: "Free",
      href: "https://apps.ankiweb.net",
    },
    {
      name: "Quizlet",
      purpose: "Ready-made flashcard sets and games for exam vocabulary.",
      free: "Free tier",
      href: "https://quizlet.com",
    },
  ],
  "Writing & feedback": [
    {
      name: "Write & Improve",
      purpose: "Cambridge's free tool that grades short pieces of writing instantly.",
      free: "Free",
      href: "https://writeandimprove.com",
    },
    {
      name: "Hemingway Editor",
      purpose: "Highlights long sentences and passive voice — a quick clarity check.",
      free: "Free on web",
      href: "https://hemingwayapp.com",
    },
  ],
  "Level tests & practice": [
    {
      name: "Cambridge Test Your English",
      purpose: "A three-minute CEFR placement test to see where you really stand.",
      free: "Free",
      href: "https://www.cambridgeenglish.org/test-your-english",
    },
    {
      name: "ExamEnglish",
      purpose: "Free practice tests for Cambridge and IELTS exam formats.",
      free: "Free",
      href: "https://www.examenglish.com",
    },
  ],
};

export default function Tools() {
  return (
    <div className="page-stack">
      <section className="card panel">
        <h2>Free tools archive</h2>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Everything on this page costs nothing. Tools we can't host or build for free are linked here instead — a
          curated archive of what the community finds useful for HSG-style study.
        </p>
      </section>

      <section>
        <h3 className="tools-cat">Built into HsgTrainer</h3>
        <div className="tools-grid">
          {BUILT_IN.map((t) => (
            <Link key={t.name} to={t.to} className="tool-card">
              <b>{t.name}</b>
              <span className="tool-purpose">{t.purpose}</span>
              <span className="tag ok">Built in · free</span>
            </Link>
          ))}
        </div>
      </section>

      {Object.entries(COMMUNITY).map(([category, tools]) => (
        <section key={category}>
          <h3 className="tools-cat">{category}</h3>
          <div className="tools-grid">
            {tools.map((t) => (
              <a key={t.name} href={t.href} target="_blank" rel="noopener noreferrer" className="tool-card">
                <b>
                  {t.name}
                  <IconExternal size={13} aria-hidden="true" />
                </b>
                <span className="tool-purpose">{t.purpose}</span>
                <span className="tag ok">{t.free}</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <p className="hint">
        Know a great free tool that belongs here? Mention it in a Contribute submission — the maintainer checks
        community picks before adding them to the archive.
      </p>
    </div>
  );
}
