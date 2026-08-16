import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { PALETTES, useTheme } from "./theme";
import { SECTIONS } from "./sections";
import { IconBolt, IconBook, IconClock, IconGear, IconPen, IconPlus, IconTarget, IconTool, SectionIcon } from "./icons";
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
  const { theme, palette, toggleTheme, setPalette } = useTheme();
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
        aria-label="Theme settings"
        aria-expanded={open}
      >
        <span className={open ? "rotate" : ""} style={{ display: "inline-flex" }}>
          <PaletteIcon />
        </span>
        Theme
      </button>
      {open && (
        <div className="card theme-pop">
          <div className="theme-pop-label">Appearance</div>
          <div className="seg">
            <button className={theme === "dark" ? "active" : ""} onClick={() => theme !== "dark" && toggleTheme()}>
              Dark
            </button>
            <button className={theme === "light" ? "active" : ""} onClick={() => theme !== "light" && toggleTheme()}>
              Light
            </button>
          </div>
          <div className="theme-pop-label">Accent</div>
          <div className="swatches">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                className={`swatch ${palette === p.id ? "active" : ""}`}
                style={{ background: p.swatch }}
                onClick={() => setPalette(p.id)}
                aria-label={p.label}
                title={p.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
      <NavLink to="/practice" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconBolt size={15} />
        Practice
      </NavLink>
      <NavLink to="/mistakes" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconTarget size={15} />
        My mistakes
      </NavLink>
      <NavLink to="/words" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconBook size={15} />
        Word list
        {vocabCount > 0 && <span className="nav-count">{vocabCount}</span>}
      </NavLink>
      <NavLink to="/contribute" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconPlus size={15} />
        Contribute
      </NavLink>
      <NavLink to="/tools" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconTool size={15} />
        Free tools
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconGear size={15} />
        Settings
      </NavLink>
    </>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/practice": "Practice",
  "/mistakes": "My mistakes",
  "/words": "Word list",
  "/contribute": "Contribute",
  "/tools": "Free tools",
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
      <div className="timer-display" role="timer" aria-label={`${prefs.mode === "timer" ? "Countdown" : "Stopwatch"} ${mm}:${ss}`}>
        {prefs.mode === "timer" ? <IconClock size={13} aria-hidden="true" /> : null}
        <b>{mm}:{ss}</b>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={running ? pause : start}>
        {running ? "Pause" : timeUp ? "Restart" : "Start"}
      </button>
      <button className="btn btn-sm btn-ghost" onClick={reset}>
        Reset
      </button>
      <button
        className="timer-gear"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Timer settings"
        title="Timer settings"
      >
        <IconGear size={15} />
      </button>
      <span className="sr-only" aria-live="polite">
        {timeUp ? "Time is up." : ""}
      </span>
      {open && (
        <div className="card timer-settings">
          <div className="timer-settings-label">Mode</div>
          <div className="seg">
            <button
              className={prefs.mode === "stopwatch" ? "active" : ""}
              aria-pressed={prefs.mode === "stopwatch"}
              onClick={() => applyPrefs({ ...prefs, mode: "stopwatch" })}
            >
              Stopwatch
            </button>
            <button
              className={prefs.mode === "timer" ? "active" : ""}
              aria-pressed={prefs.mode === "timer"}
              onClick={() => applyPrefs({ ...prefs, mode: "timer" })}
            >
              Countdown
            </button>
          </div>
          {prefs.mode === "timer" && (
            <>
              <div className="timer-settings-label">Countdown time</div>
              <div className="chip-row timer-durs">
                {TIMER_DURATIONS.map((m) => (
                  <button
                    key={m}
                    className={`chip-btn ${prefs.durationMin === m ? "active" : ""}`}
                    aria-pressed={prefs.durationMin === m}
                    onClick={() => applyPrefs({ ...prefs, durationMin: m })}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="timer-settings-hint">
            {prefs.mode === "timer"
              ? "Counts down — exam-style pacing. Stops and flashes when time runs out."
              : "Counts up — track how long a set takes you."}
          </p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setNoteTick] = useState(0);

  useEffect(() => {
    const bump = () => setNoteTick((t) => t + 1);
    window.addEventListener(NOTES_CHANGED_EVENT, bump);
    return () => window.removeEventListener(NOTES_CHANGED_EVENT, bump);
  }, []);

  return (
    <div className="app-shell">
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
        <div className="sidebar-label">Sections</div>
        <nav className="sidebar-sections" aria-label="Sections">
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
                    title={`Review ${noted.length} noted question${noted.length > 1 ? "s" : ""} in ${s.short}`}
                    aria-label={`Review ${noted.length} noted questions in ${s.short}`}
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
            Admin
          </Link>
          <span className="sidebar-note">Free HSG English training — community content, zero cost.</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-mobile">
            <Brand />
          </div>
          <h2 className="topbar-title">{PAGE_TITLES[location.pathname] ?? "HsgTrainer"}</h2>
          <div className="topbar-right">
            <nav className="topbar-nav" aria-label="Main">
              <NavLinks />
            </nav>
            <TimerTool />
            <ThemeMenu />
          </div>
        </header>
        <main key={location.pathname} className="page-shell">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/words" element={<WordList />} />
            <Route path="/contribute" element={<Contribute />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <footer className="footer">
          <span>Free HSG English training — community content, zero cost.</span>
          <Link to="/admin">Admin</Link>
        </footer>
      </div>
    </div>
  );
}
