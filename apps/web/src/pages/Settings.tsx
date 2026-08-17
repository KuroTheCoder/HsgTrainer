import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DICTIONARIES, getDefaultDictId, setDefaultDictId, getOpenMode, setOpenMode, type OpenMode } from "../dictionary";
import { IconBook, IconBug, IconExternal, IconGear, IconGlobe, IconPalette, IconPlay, IconVolume } from "../icons";
import ThemeControls from "../components/ThemeControls";
import ReportBox from "../components/ReportBox";
import { clearAll, exportData, importData } from "../store";
import { play, setSfxMuted, setSfxVolumeFor, sfxMuted, sfxVolumes, type SfxName } from "../sfx";
import { LOCALES, setLocale, t, useLocale, type Locale } from "../i18n";

const SOUND_LABELS: { name: SfxName; label: string; hint: string }[] = [
  { name: "click", label: "Clicks", hint: "Buttons, links, options" },
  { name: "pop", label: "Chips & swatches", hint: "Small chips, theme swatches, presets" },
  { name: "hover", label: "Hover & sliders", hint: "Moving over interactive elements, slider steps" },
  { name: "confetti", label: "Confetti", hint: "Celebration burst on strong runs" },
  { name: "correct", label: "Strong score", hint: "≥ 80% on practice / exam results" },
  { name: "complete", label: "Good score", hint: "60–79% runs, AI writing feedback" },
  { name: "wrong", label: "Low score", hint: "< 60% on practice / exam results" },
  { name: "save", label: "Saving", hint: "Theme presets" },
  { name: "clear", label: "Clearing", hint: "Deleting mistakes, removing words" },
  { name: "warn", label: "Countdown", hint: "Mock exam 5:00 and 1:00 warnings" },
];

const TABS = [
  { id: "language", label: "Language", icon: IconGlobe },
  { id: "appearance", label: "Appearance", icon: IconPalette },
  { id: "sounds", label: "Sounds", icon: IconVolume },
  { id: "dictionary", label: "Dictionary", icon: IconBook },
  { id: "data", label: "Data", icon: IconGear },
  { id: "report", label: "Report", icon: IconBug },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Settings() {
  const locale = useLocale();
  const [tab, setTab] = useState<TabId>("appearance");
  const [defaultId, setDefaultId] = useState(getDefaultDictId);
  const [openMode, setOpen] = useState<OpenMode>(getOpenMode);
  const [sfxOn, setSfxOn] = useState(!sfxMuted());
  const [volumes, setVolumes] = useState(sfxVolumes());

  const choose = (id: string) => {
    setDefaultDictId(id);
    setDefaultId(id);
  };

  const chooseMode = (mode: OpenMode) => {
    setOpenMode(mode);
    setOpen(mode);
  };

  const toggleSfx = (on: boolean) => {
    setSfxMuted(!on);
    setSfxOn(on);
  };

  const changeSoundVolume = (name: SfxName, v: number) => {
    setSfxVolumeFor(name, v / 100);
    setVolumes({ ...volumes, [name]: v / 100 });
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t("Settings")}</h2>
      </div>

      <nav className="settings-nav" aria-label={t("Settings sections")}>
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={tab === item.id ? "active" : ""} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>
              <Icon size={16} aria-hidden="true" />
              {t(item.label)}
            </button>
          );
        })}
      </nav>

      {tab === "language" && (
        <div className="card panel settings-panel">
          <h3>
            <IconGlobe size={16} aria-hidden="true" /> {t("Language")}
          </h3>
          <p className="muted">
            {t("Choose the interface language. Vietnamese is still being translated — anything not translated yet shows in English, so the app never breaks.")}
          </p>
          <div className="chip-row" role="radiogroup" aria-label={t("Language")}>
            {(Object.keys(LOCALES) as Locale[]).map((l) => (
              <button
                key={l}
                className={`chip-btn ${locale === l ? "active" : ""}`}
                role="radio"
                aria-checked={locale === l}
                onClick={() => setLocale(l)}
              >
                {LOCALES[l]}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "appearance" && (
        <div className="card panel settings-panel">
          <h3>
            <IconPalette size={16} aria-hidden="true" /> {t("Appearance")}
          </h3>
          <p className="muted">
            {t("Ink color, notebook style, and pattern density. Everything applies instantly and is stored on this device — no account needed. Save your favourite combos as presets, or share a theme link: whoever opens it gets the same look.")}
          </p>
          <ThemeControls />
        </div>
      )}

      {tab === "sounds" && (
        <div className="card panel settings-panel">
          <h3>
            <IconVolume size={16} aria-hidden="true" /> {t("Sounds")}
          </h3>
          <p className="muted">
            {t("Small sounds for clicks, hovers, answers, and countdown warnings. Sound starts only after your first click (browser rule) — and stays off until you turn it on here.")}
          </p>
          <div className="sfx-row">
            <div className="chip-row" role="radiogroup" aria-label={t("Sound effects")}>
              <button
                className={`chip-btn ${sfxOn ? "active" : ""}`}
                role="radio"
                aria-checked={sfxOn}
                onClick={() => toggleSfx(true)}
              >
                {t("On")}
              </button>
              <button
                className={`chip-btn ${!sfxOn ? "active" : ""}`}
                role="radio"
                aria-checked={!sfxOn}
                onClick={() => toggleSfx(false)}
              >
                {t("Off")}
              </button>
            </div>
          </div>
          <div className="sound-list">
            {SOUND_LABELS.map((s) => (
              <div key={s.name} className={`sound-row ${sfxOn ? "" : "muted-row"}`}>
                <div className="sound-info">
                  <b>{t(s.label)}</b>
                  <span className="muted small">{t(s.hint)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  disabled={!sfxOn}
                  aria-label={t("{label} volume", { label: s.label })}
                  value={Math.round((volumes[s.name] ?? 0.8) * 100)}
                  onChange={(e) => changeSoundVolume(s.name, Number(e.target.value))}
                />
                <span className="muted small sound-pct">{Math.round((volumes[s.name] ?? 0.8) * 100)}%</span>
                <button
                  className="btn btn-ghost btn-sm sound-test"
                  disabled={!sfxOn}
                  aria-label={t("Play {label} sound", { label: s.label })}
                  title={t("Preview this sound")}
                  onClick={() => play(s.name)}
                >
                  <IconPlay size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <p className="hint">
            {t("Drop your own sound files into")} <code>public/sfx/</code> {t("(see the README there for filenames) — missing files are simply silent.")}
          </p>
        </div>
      )}

      {tab === "dictionary" && (
        <>
          <div className="card panel settings-panel">
            <h3>
              <IconBook size={16} aria-hidden="true" /> {t("Default dictionary")}
            </h3>
            <p className="muted">
              {t("When you look up a word (select it in a prompt or tap a key-word chip), a ribbon appears on the popup — one click opens your chosen dictionary. You can still pick another one from the popup.")}
            </p>
            <div className="chip-row" role="radiogroup" aria-label={t("Default dictionary")}>
              {DICTIONARIES.map((d) => (
                <button
                  key={d.id}
                  className={`chip-btn ${defaultId === d.id ? "active" : ""}`}
                  role="radio"
                  aria-checked={defaultId === d.id}
                  title={d.hint ? t(d.hint) : undefined}
                  onClick={() => choose(d.id)}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <p className="hint">{t(DICTIONARIES.find((d) => d.id === defaultId)?.hint ?? "")}</p>
          </div>
          <div className="card panel settings-panel">
            <h3>
              <IconExternal size={16} aria-hidden="true" /> {t("Open dictionary in")}
            </h3>
            <p className="muted">
              {t("How dictionary links open. A new tab never covers the page; a small window floats on top but may hide the popup when the word is near the top-left corner of your screen.")}
            </p>
            <div className="chip-row" role="radiogroup" aria-label={t("Open dictionary in")}>
              {[
                { key: "tab" as const, label: "New tab", desc: "Safe, never overlaps" },
                { key: "window" as const, label: "Small window", desc: "Floats on top" },
              ].map((m) => (
                <button
                  key={m.key}
                  className={`chip-btn ${openMode === m.key ? "active" : ""}`}
                  role="radio"
                  aria-checked={openMode === m.key}
                  title={t(m.desc)}
                  onClick={() => chooseMode(m.key)}
                >
                  {t(m.label)}
                </button>
              ))}
            </div>
            <p className="hint">
              {openMode === "tab" ? t("Opens in a new browser tab.") : t("Opens a small 560×700 window over the page.")}
            </p>
          </div>
        </>
      )}

      {tab === "data" && <DataTab />}

      {tab === "report" && (
        <div className="card panel settings-panel">
          <h3>
            <IconBug size={16} aria-hidden="true" /> {t("Report a problem")}
          </h3>
          <p className="muted">
            {t("Something broken, missing, or off about the site? Tell us what happened — bug reports go straight to the maintainer's review queue. Found a wrong key on a question? Use the Report button next to that question.")}
          </p>
          <ReportBox bug />
        </div>
      )}
    </div>
  );
}

function DataTab() {
  const LAST_EXPORT_KEY = "hsg_last_export";

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastExport, setLastExport] = useState<number | null>(() => {
    try {
      const v = Number(localStorage.getItem(LAST_EXPORT_KEY));
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch {
      return null;
    }
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hsgtrainer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const now = Date.now();
      try {
        localStorage.setItem(LAST_EXPORT_KEY, String(now));
      } catch {
        /* private mode */
      }
      setLastExport(now);
      setNotice(t("Backup downloaded. Keep the file somewhere safe (e.g. a Drive/iCloud/OneDrive folder)."));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("export failed"));
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await importData(await file.text());
      setNotice(t("Imported {sessions} session(s) and {answers} answer(s).", { sessions: res.sessions, answers: res.answers }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("import failed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const doClear = async () => {
    if (!window.confirm(t("Delete ALL local practice data (sessions, mistakes, progress) in this browser? This cannot be undone."))) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await clearAll();
      setNotice(t("Local data cleared."));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clear failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card panel settings-panel">
      <h3>
        <IconGear size={16} aria-hidden="true" /> {t("Your local data")}
      </h3>
      <p className="muted">
        {t("All practice sessions, mistakes, and progress are stored in this browser — nothing lives on a server. Export a backup file regularly and drop it into a synced folder (Drive, iCloud, OneDrive…) so the OS backs it up for free. See the guide in")} <code>docs/backup.md</code>.
      </p>
      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="banner ok" role="status">
          {notice}
        </div>
      )}
      {lastExport !== null && (
        <p className="hint">
          {t("Last export")}: {new Date(lastExport).toLocaleDateString()}. {t("Re-export every few weeks — a backup is the only copy of your progress.")}
        </p>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={() => void doExport()} disabled={busy}>
          {t("Export backup")}
        </button>
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
          {t("Import backup")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
          }}
        />
        <button className="btn btn-sm btn-danger" onClick={() => void doClear()} disabled={busy}>
          {t("Delete all local data")}
        </button>
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        {t("Confused? The")}{" "}
        <Link to="/notes/backup-guide" className="note-link">
          {t("step-by-step backup guide")}
        </Link>{" "}
        {t("walks you through export, import, and what happens if you lose your data.")}
      </p>
    </div>
  );
}