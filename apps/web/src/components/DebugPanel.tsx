import { useState } from "react";
import { Link } from "react-router-dom";
import { launchConfetti } from "../confetti";
import { play, setSfxMuted, sfxMuted, type SfxName } from "../sfx";

const SOUNDS: { name: SfxName; label: string }[] = [
  { name: "click", label: "Click" },
  { name: "pop", label: "Pop" },
  { name: "hover", label: "Hover" },
  { name: "confetti", label: "Confetti" },
  { name: "correct", label: "Score ≥ 80%" },
  { name: "complete", label: "Score 60–79%" },
  { name: "wrong", label: "Score < 60%" },
  { name: "save", label: "Save" },
  { name: "clear", label: "Clear" },
  { name: "warn", label: "Countdown warning" },
];

const PAGES: [string, string][] = [
  ["/", "Home"],
  ["/practice", "Practice"],
  ["/exams", "Exams"],
  ["/mistakes", "Mistakes"],
  ["/progress", "Progress"],
  ["/writing", "Writing"],
  ["/words", "Word list"],
  ["/settings", "Settings"],
  ["/contribute", "Contribute"],
  ["/tools", "Tools"],
  ["/teachers", "Teachers"],
  ["/account", "Account"],
];

export default function DebugPanel() {
  const [sfxOn, setSfxOn] = useState(!sfxMuted());

  const toggleSfx = (on: boolean) => {
    setSfxMuted(!on);
    setSfxOn(on);
  };

  return (
    <div className="card panel">
      <h3>Debug playground</h3>
      <p className="muted">
        Dev-only tools — preview every feature (sounds, confetti, pages) without running a full flow.
      </p>

      <h4 className="debug-sect">Confetti</h4>
      <div className="chip-row">
        <button className="btn" onClick={() => launchConfetti({ count: 140 })}>
          Run ≥ 80%
        </button>
        <button className="btn" onClick={() => launchConfetti({ count: 220 })}>
          Perfect 100%
        </button>
      </div>

      <h4 className="debug-sect">Sounds</h4>
      <div className="chip-row">
        <button className={`chip-btn ${sfxOn ? "active" : ""}`} onClick={() => toggleSfx(true)}>
          SFX on
        </button>
        <button className={`chip-btn ${!sfxOn ? "active" : ""}`} onClick={() => toggleSfx(false)}>
          SFX off
        </button>
      </div>
      <div className="chip-row" style={{ marginTop: 8 }}>
        {SOUNDS.map((s) => (
          <button key={s.name} className="chip-btn" onClick={() => play(s.name)} title={s.label}>
            {s.label}
          </button>
        ))}
      </div>

      <h4 className="debug-sect">Pages</h4>
      <div className="chip-row">
        {PAGES.map(([path, label]) => (
          <Link key={path} className="chip-btn" to={path}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}