import { useState } from "react";
import { Link } from "react-router-dom";
import { IconBug, IconX } from "../icons";
import { launchConfetti } from "../confetti";
import { play, setSfxMuted, sfxMuted, type SfxName } from "../sfx";

const SOUNDS: { name: SfxName; label: string }[] = [
  { name: "click", label: "Click" },
  { name: "pop", label: "Pop" },
  { name: "hover", label: "Hover" },
  { name: "tick", label: "Slider tick" },
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
  ["/admin", "Admin"],
];

export default function DebugMenu() {
  const [open, setOpen] = useState(false);
  const [sfxOn, setSfxOn] = useState(!sfxMuted());

  const toggleSfx = (on: boolean) => {
    setSfxMuted(!on);
    setSfxOn(on);
  };

  return (
    <>
      <button
        className="debug-fab"
        aria-label="Open debug menu"
        title="Debug — preview features instantly"
        onClick={() => setOpen(true)}
      >
        <IconBug size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="debug-overlay" role="dialog" aria-modal="true" aria-label="Debug menu" onClick={() => setOpen(false)}>
          <div className="debug-panel" onClick={(e) => e.stopPropagation()}>
            <div className="debug-head">
              <b>Debug</b>
              <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
                <IconX size={16} />
              </button>
            </div>

            <section>
              <h4>Confetti</h4>
              <div className="debug-row">
                <button className="btn" onClick={() => launchConfetti({ count: 140 })}>
                  Run ≥ 80%
                </button>
                <button className="btn" onClick={() => launchConfetti({ count: 220 })}>
                  Perfect 100%
                </button>
              </div>
            </section>

            <section>
              <h4>Sounds</h4>
              <div className="debug-row wrap">
                <button className={`chip-btn ${sfxOn ? "active" : ""}`} onClick={() => toggleSfx(true)}>
                  SFX on
                </button>
                <button className={`chip-btn ${!sfxOn ? "active" : ""}`} onClick={() => toggleSfx(false)}>
                  SFX off
                </button>
              </div>
              <div className="debug-row wrap">
                {SOUNDS.map((s) => (
                  <button key={s.name} className="chip-btn" onClick={() => play(s.name)} title={s.label}>
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h4>Pages</h4>
              <div className="debug-row wrap">
                {PAGES.map(([path, label]) => (
                  <Link key={path} className="chip-btn" to={path} onClick={() => setOpen(false)}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}