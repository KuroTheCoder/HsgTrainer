import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { PALETTES, useTheme } from "./theme";
import { SECTIONS } from "./sections";
import { IconBolt, IconPlus, IconTarget, SectionIcon } from "./icons";
import Home from "./pages/Home";
import Practice from "./pages/Practice";
import Mistakes from "./pages/Mistakes";
import Contribute from "./pages/Contribute";
import Admin from "./pages/Admin";

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
      <NavLink to="/contribute" className={({ isActive }) => (isActive ? "active" : "")}>
        <IconPlus size={15} />
        Contribute
      </NavLink>
    </>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/practice": "Practice",
  "/mistakes": "My mistakes",
  "/contribute": "Contribute",
  "/admin": "Admin",
};

export default function App() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="Main">
          <NavLinks />
        </nav>
        <div className="sidebar-label">Sections</div>
        <nav className="sidebar-sections" aria-label="Sections">
          {SECTIONS.map((s) => (
            <Link key={s.key} to={`/practice?section=${s.key}`}>
              <span className="side-section-icon" style={{ background: `${s.color}1f`, color: s.color }}>
                <SectionIcon icon={s.icon} size={15} />
              </span>
              {s.short}
            </Link>
          ))}
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
            <ThemeMenu />
          </div>
        </header>
        <main key={location.pathname} className="page-shell">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/contribute" element={<Contribute />} />
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
