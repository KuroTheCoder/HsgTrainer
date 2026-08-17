import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useTheme, type Background } from "./theme";
import { SECTIONS } from "./sections";
import { t, useLocale } from "./i18n";
import ThemeControls from "./components/ThemeControls";
import { IconBolt, IconBook, IconClock, IconDoc, IconGear, IconPen, IconPlus, IconTarget, IconTool, IconTrend, IconUser, IconUsers, SectionIcon } from "./icons";
import { NOTES_CHANGED_EVENT, noteIdsForSection } from "./reader";
import { WORD_LIST_CHANGED_EVENT, getWordList } from "./vocab";
import Home from "./pages/Home";
import Practice from "./pages/Practice";
import Mistakes from "./pages/Mistakes";
import Contribute from "./pages/Contribute";
import Admin from "./pages/Admin";
import Tools from "./pages/Tools";
import WordList from "./pages/WordList";
import Settings from "./pages/Settings";
import Account from "./pages/Account";
import Teachers from "./pages/Teachers";
import Progress from "./pages/Progress";
import Exams from "./pages/Exams";
import Writing from "./pages/Writing";
import Notes from "./pages/Notes";
import SnapSlider from "./components/SnapSlider";

function PaletteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a7.35 7.35 0 0 0 4 10.65 7.35 7.35 0 0 1 4 6.1 8 8 0 0 1-8-16.75z" />
      <circle cx="7.5" cy="11" r="0.5" fill="currentColor" />
      <circle cx="11" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="15.5" cy="11.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="theme-menu" ref={ref}>
      <button
        className="theme-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("Theme settings")}
        aria-expanded={open}
      >
        <span className={open ? "rotate" : ""} style={{ display: "inline-flex" }}>
          <PaletteIcon />
        </span>
        {t("Theme")}
      </button>
      {open && (
        <div className="card theme-pop">
          <ThemeControls compact />
        </div>
      )}
    </div>
  );
}

/** Crossfades the previous background pattern out over the new one. */
function BackgroundCrossfade() {
  const { background } = useTheme();
  const prev = useRef(background);
  const [fading, setFading] = useState<Background | null>(null);

  useEffect(() => {
    if (prev.current === background) return;
    setFading(prev.current);
    prev.current = background;
    const t = setTimeout(() => setFading(null), 500);
    return () => clearTimeout(t);
  }, [background]);

  if (!fading) return null;
  return <div className="bg-fade" data-bg-pattern={fading} aria-hidden="true" />;
}

function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark">H</span>
      <b>
        Hsg<span>Trainer</span>
      </b>
    </Link>
  );
}

function NavLinks() {
  const [vocabCount, setVocabCount] = useState(() => Object.keys(getWordList()).length);

  useEffect(() => {
    const bump = () => setVocabCount(Object.keys(getWordList()).length);
    window.addEventListener(WORD_LIST_CHANGED_EVENT, bump);
    return () => window.removeEventListener(WORD_LIST_CHANGED_EVENT, bump);
  }, []);

  return (
    <>
      <div className="sidebar-label label-train">{t("Train")}</div>
      <NavLink to="/practice" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconBolt size={15} />
        {t("Practice")}
      </NavLink>
      <NavLink to="/exams" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconClock size={15} />
        {t("Mock exam")}
      </NavLink>

      <div className="sidebar-label label-review">{t("Review")}</div>
      <NavLink to="/mistakes" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconTarget size={15} />
        {t("My mistakes")}
      </NavLink>
      <NavLink to="/progress" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconTrend size={15} />
        {t("Progress")}
      </NavLink>

      <div className="sidebar-label label-saved">{t("Saved")}</div>
      <NavLink to="/writing" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconPen size={15} />
        {t("Writing bank")}
      </NavLink>
      <NavLink to="/words" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconBook size={15} />
        {t("Word list")}
        {vocabCount > 0 && <span className="nav-count">{vocabCount}</span>}
      </NavLink>

      <div className="sidebar-label label-study">{t("Study")}</div>
      <NavLink to="/notes" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconDoc size={15} />
        {t("Notes")}
      </NavLink>

      <div className="sidebar-label label-community">{t("Community")}</div>
      <NavLink to="/contribute" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconPlus size={15} />
        {t("Contribute")}
      </NavLink>
      <NavLink to="/tools" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconTool size={15} />
        {t("Free tools")}
      </NavLink>
      <NavLink to="/teachers" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconUsers size={15} />
        {t("For teachers")}
      </NavLink>

      <div className="sidebar-label label-account">{t("Account")}</div>
      <NavLink to="/account" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconUser size={15} />
        {t("Account")}
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconGear size={15} />
        {t("Settings")}
      </NavLink>
    </>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/practice": "Practice",
  "/mistakes": "My mistakes",
  "/progress": "Progress",
  "/exams": "Mock exam",
  "/writing": "Writing bank",
  "/words": "Word list",
  "/notes": "Notes",
  "/contribute": "Contribute",
  "/tools": "Free tools",
  "/teachers": "For teachers",
  "/account": "Account",
  "/settings": "Settings",
  "/admin": "Admin",
};

type TimerMode = "stopwatch" | "timer";

interface TimerPrefs {
  mode: TimerMode;
  durationMin: number;
}

const TIMER_PREFS_KEY = "hsg-timer-prefs";
const TIMER_DURATIONS = [5, 10, 15, 20, 30, 45, 60];

function loadTimerPrefs(): TimerPrefs {
  try {
    const raw = localStorage.getItem(TIMER_PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as TimerPrefs;
      if ((p.mode === "stopwatch" || p.mode === "timer") && TIMER_DURATIONS.includes(p.durationMin)) return p;
    }
  } catch {
    /* private mode */
  }
  return { mode: "stopwatch", durationMin: 15 };
}

function TimerTool() {
  const [prefs, setPrefs] = useState<TimerPrefs>(loadTimerPrefs);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds: count-up for stopwatch, count-down base for timer
  const [timeUp, setTimeUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const startRef = useRef<number>(0);

  const total = prefs.mode === "timer" ? prefs.durationMin * 60 : 0;
  const shown = prefs.mode === "timer" ? Math.max(total - elapsed, 0) : elapsed;
  const mm = String(Math.floor(shown / 60)).padStart(2, "0");
  const ss = String(shown % 60).padStart(2, "0");

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const e = Math.floor((Date.now() - startRef.current) / 1000);
      if (prefs.mode === "timer" && e >= total) {
        setElapsed(total);
        setRunning(false);
        setTimeUp(true);
      } else {
        setElapsed(e);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, prefs.mode, total]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const start = () => {
    if (timeUp) {
      setElapsed(0);
      setTimeUp(false);
    }
    startRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
  };

  const pause = () => {
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setTimeUp(false);
  };

  const applyPrefs = (next: TimerPrefs) => {
    setPrefs(next);
    setRunning(false);
    setElapsed(0);
    setTimeUp(false);
    try {
      localStorage.setItem(TIMER_PREFS_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  return (
    <div className={`timer-tool ${timeUp ? "timeup" : ""}`} ref={ref}>
      <div className="timer-display" role="timer" aria-label={`${prefs.mode === "timer" ? t("Countdown") : t("Stopwatch")} ${mm}:${ss}`}>
        {prefs.mode === "timer" ? <IconClock size={13} aria-hidden="true" /> : null}
        <b>{mm}:{ss}</b>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={running ? pause : start}>
        {running ? t("Pause") : timeUp ? t("Restart") : t("Start")}
      </button>
      <button className="btn btn-sm btn-ghost" onClick={reset}>
        {t("Reset")}
      </button>
      <button
        className="timer-gear"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("Timer settings")}
        title={t("Timer settings")}
      >
        <IconGear size={15} />
      </button>
      <span className="sr-only" aria-live="polite">
        {timeUp ? t("Time is up.") : ""}
      </span>
      {open && (
        <div className="card timer-settings">
          <div className="timer-settings-label">{t("Mode")}</div>
          <div className="seg">
            <button
              className={prefs.mode === "stopwatch" ? "active" : ""}
              aria-pressed={prefs.mode === "stopwatch"}
              onClick={() => applyPrefs({ ...prefs, mode: "stopwatch" })}
            >
              {t("Stopwatch")}
            </button>
            <button
              className={prefs.mode === "timer" ? "active" : ""}
              aria-pressed={prefs.mode === "timer"}
              onClick={() => applyPrefs({ ...prefs, mode: "timer" })}
            >
              {t("Countdown")}
            </button>
          </div>
          {prefs.mode === "timer" && (
            <>
              <div className="timer-settings-label">{t("Countdown time")}</div>
              <SnapSlider
                min={5}
                max={60}
                step={1}
                value={prefs.durationMin}
                onChange={(m) => applyPrefs({ ...prefs, durationMin: m })}
                snapPoints={TIMER_DURATIONS}
                format={(v) => `${v} ${t("min")}`}
              />
            </>
          )}
          <p className="timer-settings-hint">
            {prefs.mode === "timer"
              ? t("Counts down — exam-style pacing. Stops and flashes when time runs out.")
              : t("Counts up — track how long a set takes you.")}
          </p>
        </div>
      )}
    </div>
  );
}

const NAV_KEYS: Record<string, string> = {
  h: "/",
  p: "/practice",
  e: "/exams",
  m: "/mistakes",
  r: "/progress",
  w: "/words",
  n: "/notes",
  c: "/contribute",
  t: "/tools",
  f: "/teachers",
  a: "/account",
  s: "/settings",
};

function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["g then h", "Home"],
    ["g then p", "Practice"],
    ["g then e", "Mock exam"],
    ["g then m", "My mistakes"],
    ["g then r", "Progress"],
    ["g then w", "Word list"],
    ["g then n", "Notes"],
    ["g then c", "Contribute"],
    ["g then t", "Free tools"],
    ["g then f", "For teachers"],
    ["g then a", "Account"],
    ["g then s", "Settings"],
    ["g then 1–7", "Practice a section"],
    ["/", "Search notes (on Notes)"],
    ["v / r / x / e / s", "Queue: verify / reject / details / edit / select"],
    ["Esc", "Close dialogs and popups"],
  ];
  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-label={t("Keyboard shortcuts")} onClick={onClose}>
      <div className="card help-card" onClick={(e) => e.stopPropagation()}>
        <h3>{t("Keyboard shortcuts")}</h3>
        <table className="help-table">
          <tbody>
            {rows.map(([keys, label]) => (
              <tr key={keys}>
                <td>
                  <kbd>{keys}</kbd>
                </td>
                <td>{t(label)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">{t("Press ? to toggle this help. Shortcuts are disabled while typing.")}</p>
        <button className="btn btn-primary" onClick={onClose}>
          {t("Close")}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setNoteTick] = useState(0);
  const locale = useLocale();
  const [helpOpen, setHelpOpen] = useState(false);
  const gRef = useRef(false);
  const gTimer = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.key === "?") {
        setHelpOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setHelpOpen(false);
        return;
      }
      if (e.key === "g") {
        gRef.current = true;
        window.clearTimeout(gTimer.current);
        gTimer.current = window.setTimeout(() => {
          gRef.current = false;
        }, 1500);
        return;
      }
      if (gRef.current) {
        gRef.current = false;
        window.clearTimeout(gTimer.current);
        if (NAV_KEYS[e.key]) {
          navigate(NAV_KEYS[e.key]!);
          return;
        }
        const n = Number(e.key);
        if (n >= 1 && n <= SECTIONS.length) navigate(`/practice?section=${SECTIONS[n - 1]!.key}`);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(gTimer.current);
    };
  }, [navigate]);

  useEffect(() => {
    const bump = () => setNoteTick((t) => t + 1);
    window.addEventListener(NOTES_CHANGED_EVENT, bump);
    return () => window.removeEventListener(NOTES_CHANGED_EVENT, bump);
  }, []);

  return (
    <div className="app-shell">
      <div className="bg-layer" aria-hidden="true" />
      <BackgroundCrossfade />
      <div className="paper-doodles" aria-hidden="true">
        <svg className="doodle-star" viewBox="0 0 24 24">
          <path d="M12 2l2.9 6.2 6.6.6-5 4.4 1.5 6.5L12 16.2 5.9 19.7l1.5-6.5-5-4.4 6.6-.6z" />
        </svg>
        <svg className="doodle-spiral" viewBox="0 0 24 24">
          <path d="M4 12a8 8 0 1 1 8 8 6.5 6.5 0 1 1 6.5-6.5 5 5 0 1 1-5 5" />
        </svg>
        <svg className="doodle-scribble" viewBox="0 0 60 24">
          <path d="M1 18C10 8 18 8 26 14s16 6 24-1-6-6-9-4" />
        </svg>
      </div>
      <aside className="sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="Main">
          <NavLinks />
        </nav>
        <div className="sidebar-label">{t("Sections")}</div>
        <nav className="sidebar-sections" aria-label={t("Sections")}>
          {SECTIONS.map((s) => {
            const noted = noteIdsForSection(s.key);
            return (
              <div key={s.key} className="side-section">
                <Link to={`/practice?section=${s.key}`}>
                  <span className="side-section-icon" style={{ background: `${s.color}1f`, color: s.color }}>
                    <SectionIcon icon={s.icon} size={15} />
                  </span>
                  {s.short}
                </Link>
                {noted.length > 0 && (
                  <button
                    className="side-notes"
                    title={t("Review {n} noted question{s} in {section}", { n: noted.length, s: noted.length > 1 ? "s" : "", section: s.short })}
                    aria-label={t("Review {n} noted questions in {section}", { n: noted.length, section: s.short })}
                    onClick={() => navigate(`/practice?questions=${noted.join(",")}`)}
                  >
                    <IconPen size={11} />
                    {noted.length}
                  </button>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <Link to="/admin" className="sidebar-admin">
            {t("Admin")}
          </Link>
          <span className="sidebar-note">{t("Free HSG English training — community content, zero cost.")}</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-mobile">
            <Brand />
          </div>
          <h2 className="topbar-title">{t(PAGE_TITLES[location.pathname] ?? "HsgTrainer")}</h2>
          <div className="topbar-right">
            <nav className="topbar-nav" aria-label="Main">
              <NavLinks />
            </nav>
            <TimerTool />
            <ThemeMenu />
          </div>
        </header>
        {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}
        <main key={`${location.pathname}-${locale}`} className="page-shell">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/writing" element={<Writing />} />
            <Route path="/words" element={<WordList />} />
            <Route path="/notes/:slug?" element={<Notes />} />
            <Route path="/contribute" element={<Contribute />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/account" element={<Account />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <footer className="footer">
          <span>{t("Free HSG English training — community content, zero cost.")}</span>
          <Link to="/admin">{t("Admin")}</Link>
        </footer>
      </div>
    </div>
  );
}
