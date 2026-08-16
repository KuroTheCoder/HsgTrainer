import { useState } from "react";
import { DICTIONARIES, getDefaultDictId, setDefaultDictId, getOpenMode, setOpenMode, type OpenMode } from "../dictionary";
import { IconBook, IconExternal, IconGear } from "../icons";
import ThemeControls from "../components/ThemeControls";

export default function Settings() {
  const [defaultId, setDefaultId] = useState(getDefaultDictId);
  const [openMode, setOpen] = useState<OpenMode>(getOpenMode);

  const choose = (id: string) => {
    setDefaultDictId(id);
    setDefaultId(id);
  };

  const chooseMode = (mode: OpenMode) => {
    setOpenMode(mode);
    setOpen(mode);
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Settings</h2>
      </div>
      <div className="card panel">
        <h3>
          <IconGear size={16} aria-hidden="true" /> Appearance
        </h3>
        <p className="muted">
          Ink color, notebook style, and pattern density. Everything applies instantly and is stored on this
          device — no account needed. Save your favourite combos as presets, or share a theme link: whoever
          opens it gets the same look.
        </p>
        <ThemeControls />
      </div>
      <div className="card panel">
        <h3>
          <IconBook size={16} aria-hidden="true" /> Default dictionary
        </h3>
        <p className="muted">
          When you look up a word (select it in a prompt or tap a key-word chip), a ribbon appears on the popup —
          one click opens your chosen dictionary. You can still pick another one from the popup.
        </p>
        <div className="chip-row" role="radiogroup" aria-label="Default dictionary">
          {DICTIONARIES.map((d) => (
            <button
              key={d.id}
              className={`chip-btn ${defaultId === d.id ? "active" : ""}`}
              role="radio"
              aria-checked={defaultId === d.id}
              title={d.hint}
              onClick={() => choose(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
        <p className="hint">
          {DICTIONARIES.find((d) => d.id === defaultId)?.hint ?? ""}
        </p>
      </div>
      <div className="card panel">
        <h3>
          <IconExternal size={16} aria-hidden="true" /> Open dictionary in
        </h3>
        <p className="muted">
          How dictionary links open. A new tab never covers the page; a small window floats on top but may hide
          the popup when the word is near the top-left corner of your screen.
        </p>
        <div className="chip-row" role="radiogroup" aria-label="Open dictionary in">
          {[
            { key: "tab" as const, label: "New tab", desc: "Safe, never overlaps" },
            { key: "window" as const, label: "Small window", desc: "Floats on top" },
          ].map((m) => (
            <button
              key={m.key}
              className={`chip-btn ${openMode === m.key ? "active" : ""}`}
              role="radio"
              aria-checked={openMode === m.key}
              title={m.desc}
              onClick={() => chooseMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="hint">{openMode === "tab" ? "Opens in a new browser tab." : "Opens a small 560×700 window over the page."}</p>
      </div>
    </div>
  );
}
