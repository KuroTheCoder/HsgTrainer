import { useEffect, useState } from "react";
import {
  BACKGROUNDS,
  INTENSITIES,
  PALETTES,
  decodeToken,
  encodeToken,
  loadPresets,
  persistPresets,
  useTheme,
  type ThemePreset,
} from "../theme";
import { play } from "../sfx";

export default function ThemeControls({ compact = false }: { compact?: boolean }) {
  const { theme, palette, background, intensity, custom, setTheme, setPalette, setBackground, setIntensity, setCustom, randomize, reset, applyPreset } = useTheme();
  const [presets, setPresets] = useState<ThemePreset[]>(loadPresets);
  const [presetName, setPresetName] = useState("");
  const [copied, setCopied] = useState(false);
  const [importVal, setImportVal] = useState("");

  useEffect(() => {
    persistPresets(presets);
  }, [presets]);

  const shareUrl = `${location.origin}${location.pathname}?theme=${encodeToken({ theme, palette, background, intensity, custom })}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    setPresets((ps) => [...ps, { id, name, theme, palette, background, intensity, custom }].slice(-8));
    setPresetName("");
    play("save");
  };

  const deletePreset = (id: string) => setPresets((ps) => ps.filter((p) => p.id !== id));

  const tryImport = (raw: string) => {
    const token = raw.includes("?") ? new URLSearchParams(raw.split("?")[1] ?? "").get("theme") : raw.trim();
    if (!token) return;
    const t = decodeToken(token);
    if (t) {
      setTheme(t.theme);
      setPalette(t.palette);
      setBackground(t.background);
      setIntensity(t.intensity);
      if (t.palette === "custom") setCustom(t.custom);
      setImportVal("");
    }
  };

  return (
    <div className={compact ? "" : "theme-panel"}>
      <div className="theme-pop-label">Appearance</div>
      <div className="seg">
        <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
          Dark
        </button>
        <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
          Light
        </button>
        <button className={theme === "system" ? "active" : ""} onClick={() => setTheme("system")}>
          System
        </button>
      </div>

      <div className="theme-pop-label">Accent</div>
      <div className="accent-row">
        <div className="swatches">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              className={`swatch ${palette === p.id ? "active" : ""}`}
              style={{ background: p.id === "custom" ? custom : p.swatch }}
              onClick={() => setPalette(p.id)}
              aria-label={p.label}
              title={p.label}
            />
          ))}
        </div>
        {(!compact || palette === "custom") && (
          <input
            type="color"
            className="custom-color"
            value={custom}
            aria-label="Custom accent color"
            title="Pick any accent color"
            onChange={(e) => setCustom(e.target.value)}
          />
        )}
      </div>

      {!compact && (
        <>
          <div className="theme-pop-label">Pattern</div>
          <div className="seg">
            {INTENSITIES.map((i) => (
              <button key={i.id} className={intensity === i.id ? "active" : ""} onClick={() => setIntensity(i.id)}>
                {i.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="theme-pop-label">Background</div>
      <div className="bg-swatches">
        {BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            className={`bg-swatch ${background === b.id ? "active" : ""}`}
            style={{ backgroundImage: b.swatch }}
            onClick={() => setBackground(b.id)}
            aria-label={b.label}
          >
            {b.label}
          </button>
        ))}
      </div>

      {!compact && (
        <>
          <div className="theme-pop-label">Presets</div>
          <div className="preset-row">
            <input
              value={presetName}
              placeholder="Name this theme…"
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && savePreset()}
            />
            <button className="btn btn-sm" onClick={savePreset} disabled={!presetName.trim()}>
              Save
            </button>
          </div>
          {presets.length > 0 && (
            <div className="preset-chips">
              {presets.map((p) => (
                <span key={p.id} className="preset-chip" title={`${p.palette} · ${p.background} · ${p.intensity} · ${p.theme}`}>
                  <button className="preset-chip-apply" onClick={() => applyPreset(p)}>
                    {p.name}
                  </button>
                  <button className="preset-chip-del" aria-label={`Delete preset ${p.name}`} onClick={() => deletePreset(p.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="theme-pop-label">Share</div>
          <div className="theme-share">
            <input
              value={importVal}
              placeholder="Paste a theme link to apply it…"
              aria-label="Import a theme link"
              onChange={(e) => tryImport(e.target.value)}
            />
            <button className="btn btn-sm" onClick={() => void copy()}>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </>
      )}

      <div className="theme-actions">
        <button className="btn btn-sm" onClick={randomize}>
          Random
        </button>
        <button className="btn btn-sm" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}