import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";
export type Palette =
  | "ocean" | "cyan" | "emerald" | "teal" | "lime"
  | "amber" | "sunset" | "rose" | "red"
  | "violet" | "fuchsia" | "indigo" | "custom";
export type Background = "paper" | "dots" | "grid" | "plain" | "waves" | "stars";
export type Intensity = "subtle" | "normal" | "bold";

export interface PaletteDef {
  id: Palette;
  label: string;
  /** Picker swatch color (theme-agnostic). */
  swatch: string;
  /** Accent hex in dark mode — also used for the favicon. */
  dark: string;
  /** Accent hex in light mode — also used for the favicon. */
  light: string;
}

export interface BackgroundDef {
  id: Background;
  label: string;
  /** Picker thumbnail background (approximates the real look). */
  swatch: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  theme: Theme;
  palette: Palette;
  background: Background;
  intensity: Intensity;
  custom: string;
}

export const INTENSITIES: { id: Intensity; label: string }[] = [
  { id: "subtle", label: "Subtle" },
  { id: "normal", label: "Normal" },
  { id: "bold", label: "Bold" },
];

export const PALETTES: PaletteDef[] = [
  { id: "ocean",   label: "Bút xanh",     swatch: "#5b9bff", dark: "#6ea8ff", light: "#2f54d9" },
  { id: "cyan",    label: "Bút xanh ngọc", swatch: "#22d3ee", dark: "#22d3ee", light: "#0891b2" },
  { id: "emerald", label: "Bút xanh lá",  swatch: "#34d399", dark: "#34d399", light: "#059669" },
  { id: "teal",    label: "Bút xanh lục", swatch: "#2dd4bf", dark: "#2dd4bf", light: "#0d9488" },
  { id: "lime",    label: "Bút vàng chanh", swatch: "#a3e635", dark: "#a3e635", light: "#65a30d" },
  { id: "amber",   label: "Bút vàng",     swatch: "#fbbf24", dark: "#fbbf24", light: "#b45309" },
  { id: "sunset",  label: "Bút cam",      swatch: "#fb923c", dark: "#fb923c", light: "#ea580c" },
  { id: "rose",    label: "Bút hồng",     swatch: "#fb7185", dark: "#fb7185", light: "#e11d48" },
  { id: "red",     label: "Bút đỏ",       swatch: "#f87171", dark: "#f87171", light: "#dc2626" },
  { id: "violet",  label: "Bút tím",      swatch: "#a78bfa", dark: "#b49cff", light: "#7c3aed" },
  { id: "fuchsia", label: "Bút hồng tím", swatch: "#e879f9", dark: "#e879f9", light: "#c026d3" },
  { id: "indigo",  label: "Bút chàm",     swatch: "#818cf8", dark: "#97a3ff", light: "#4f46e5" },
  { id: "custom",  label: "Custom",       swatch: "#6ea8ff", dark: "#6ea8ff", light: "#6ea8ff" },
];

export const BACKGROUNDS: BackgroundDef[] = [
  { id: "paper", label: "Paper", swatch: "repeating-linear-gradient(0deg, #ffffff00 0 22px, rgba(120,120,120,0.35) 22px 23px), radial-gradient(rgba(120,120,120,0.5) 1.3px, transparent 1.3px) 0 0 / 26px 26px" },
  { id: "dots",  label: "Dots",  swatch: "radial-gradient(rgba(120,120,120,0.6) 1.3px, transparent 1.3px) 0 0 / 26px 26px" },
  { id: "grid",  label: "Grid",  swatch: "repeating-linear-gradient(0deg, transparent 0 23px, rgba(120,120,120,0.4) 23px 24px), repeating-linear-gradient(90deg, transparent 0 23px, rgba(120,120,120,0.4) 23px 24px)" },
  { id: "plain", label: "Plain", swatch: "linear-gradient(rgba(120,120,120,0.35), rgba(120,120,120,0.35))" },
  { id: "waves", label: "Waves", swatch: "repeating-linear-gradient(-12deg, rgba(120,120,120,0.25) 0 3px, transparent 3px 14px)" },
  { id: "stars", label: "Stars", swatch: "radial-gradient(1.5px at 20% 30%, rgba(120,120,120,0.9) 1.5px, transparent 2px), radial-gradient(1px at 70% 60%, rgba(120,120,120,0.7) 1px, transparent 1.5px)" },
];

const THEME_KEY = "hsg-theme";
const PALETTE_KEY = "hsg-palette";
const BG_KEY = "hsg-background";
const INTENSITY_KEY = "hsg-intensity";
const CUSTOM_KEY = "hsg-accent-custom";
const PRESETS_KEY = "hsg-presets";

const DARK = "dark" as const;
const LIGHT = "light" as const;

const DARK_BG = "#1a2034";
const LIGHT_BG = "#faf6ea";
const DARK_INK = "#1a2034";
const LIGHT_INK = "#ffffff";
const DEFAULT_CUSTOM = "#6ea8ff";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function isTheme(v: string | null): v is Theme {
  return v === "dark" || v === "light" || v === "system";
}

export function isPalette(v: string | null): v is Palette {
  return !!v && PALETTES.some((p) => p.id === v);
}

export function isBackground(v: string | null): v is Background {
  return !!v && BACKGROUNDS.some((b) => b.id === v);
}

export function isIntensity(v: string | null): v is Intensity {
  return v === "subtle" || v === "normal" || v === "bold";
}

export function prefersLight(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches;
}

/** Maps "system" to the actual OS preference. */
export function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") return prefersLight() ? LIGHT : DARK;
  return theme;
}

/* ---------- color math ---------- */

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(v: string): string | null {
  const m = v.trim().match(HEX_RE);
  if (!m) return null;
  const h = m[1]!;
  return "#" + (h.length === 3 ? h.split("").map((c) => c + c).join("") : h).toLowerCase();
}

function luminance(hex: string): number {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255);
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = luminance(hexA);
  const b = luminance(hexB);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Ink color that stays readable on an arbitrary accent. */
export function inkFor(hex: string): string {
  return luminance(hex) > 0.45 ? DARK_INK : LIGHT_INK;
}

export function hasGoodContrast(accent: string, ink: string): boolean {
  return contrastRatio(accent, ink) >= 4.5;
}

/* ---------- presets ---------- */

export function loadPresets(): ThemePreset[] {
  const raw = read(PRESETS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list.filter((p) => p && typeof p.name === "string") as ThemePreset[]) : [];
  } catch {
    return [];
  }
}

export function persistPresets(list: ThemePreset[]) {
  write(PRESETS_KEY, JSON.stringify(list.slice(0, 8)));
}

/** Compact share token: dark.lime.stars.bold[.a3e635] */
export function encodeToken(t: { theme: Theme; palette: Palette; background: Background; intensity: Intensity; custom: string }): string {
  const parts: string[] = [t.theme, t.palette, t.background, t.intensity];
  if (t.palette === "custom") parts.push(t.custom.replace("#", ""));
  return parts.join(".");
}

export function decodeToken(token: string): { theme: Theme; palette: Palette; background: Background; intensity: Intensity; custom: string } | null {
  const parts = token.trim().split(".");
  const [theme, palette, background, intensity, customHex] = parts as [string, string, string, string, string | undefined];
  if (!isTheme(theme) || !isPalette(palette) || !isBackground(background) || !isIntensity(intensity)) return null;
  const custom = palette === "custom" ? (customHex ? normalizeHex(customHex) : null) : DEFAULT_CUSTOM;
  if (palette === "custom" && !custom) return null;
  return { theme, palette, background, intensity, custom: custom ?? DEFAULT_CUSTOM };
}

/* ---------- bootstrap ---------- */

function applyCustomAccent(palette: Palette, custom: string) {
  const el = document.documentElement;
  if (palette === "custom") {
    el.style.setProperty("--accent", custom);
    el.style.setProperty("--accent-ink", inkFor(custom));
  } else {
    el.style.removeProperty("--accent");
    el.style.removeProperty("--accent-ink");
  }
}

/** Runs before React mounts so the first paint already has the right look. */
export function applyInitialTheme() {
  // Shared theme link (?theme=dark.lime.stars.bold.hex) — apply + persist, then strip from the URL.
  try {
    const url = new URL(location.href);
    const token = url.searchParams.get("theme");
    if (token) {
      const t = decodeToken(token);
      if (t) {
        write(THEME_KEY, t.theme);
        write(PALETTE_KEY, t.palette);
        write(BG_KEY, t.background);
        write(INTENSITY_KEY, t.intensity);
        if (t.palette === "custom") write(CUSTOM_KEY, t.custom);
        url.searchParams.delete("theme");
        history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    }
  } catch {
    /* ignore malformed links */
  }

  const theme = read(THEME_KEY);
  if (isTheme(theme)) document.documentElement.dataset.theme = resolveTheme(theme);
  const palette = read(PALETTE_KEY);
  if (isPalette(palette)) {
    document.documentElement.dataset.palette = palette;
    applyCustomAccent(palette, read(CUSTOM_KEY) ?? DEFAULT_CUSTOM);
  }
  const bg = read(BG_KEY);
  if (isBackground(bg)) document.documentElement.dataset.background = bg;
  const intensity = read(INTENSITY_KEY);
  if (isIntensity(intensity)) document.documentElement.dataset.intensity = intensity;
}

function faviconUrl(theme: "dark" | "light", palette: Palette, custom: string): string {
  const def = PALETTES.find((p) => p.id === palette) ?? PALETTES[0]!;
  const bg = theme === "dark" ? DARK_BG.replace("#", "%23") : LIGHT_BG.replace("#", "%23");
  const color = (palette === "custom" ? custom : theme === "dark" ? def.dark : def.light).replace("#", "%23");
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<rect width='100' height='100' rx='22' fill='${bg}'/>` +
    `<text x='50' y='70' font-size='54' font-family='system-ui' font-weight='700' text-anchor='middle' transform='rotate(-3 50 50)' fill='${color}'>H</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ---------- hook ---------- */

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = read(THEME_KEY);
    return isTheme(saved) ? saved : DARK;
  });
  const [palette, setPaletteState] = useState<Palette>(() => {
    const saved = read(PALETTE_KEY);
    return isPalette(saved) ? saved : "ocean";
  });
  const [background, setBackgroundState] = useState<Background>(() => {
    const saved = read(BG_KEY);
    return isBackground(saved) ? saved : "paper";
  });
  const [intensity, setIntensityState] = useState<Intensity>(() => {
    const saved = read(INTENSITY_KEY);
    return isIntensity(saved) ? saved : "normal";
  });
  const [custom, setCustomState] = useState<string>(() => {
    const saved = read(CUSTOM_KEY);
    return saved ? (normalizeHex(saved) ?? DEFAULT_CUSTOM) : DEFAULT_CUSTOM;
  });

  const effectiveTheme = resolveTheme(theme);

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    write(THEME_KEY, theme);
  }, [theme, effectiveTheme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    write(PALETTE_KEY, palette);
    write(CUSTOM_KEY, custom);
    applyCustomAccent(palette, custom);
  }, [palette, custom]);

  useEffect(() => {
    document.documentElement.dataset.background = background;
    write(BG_KEY, background);
  }, [background]);

  useEffect(() => {
    document.documentElement.dataset.intensity = intensity;
    write(INTENSITY_KEY, intensity);
  }, [intensity]);

  // Keep the resolved theme in sync with the OS while in "system" mode.
  useEffect(() => {
    if (theme !== "system" || typeof matchMedia === "undefined") return;
    const mql = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      document.documentElement.dataset.theme = mql.matches ? LIGHT : DARK;
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = faviconUrl(effectiveTheme, palette, custom);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = effectiveTheme === "dark" ? DARK_BG : LIGHT_BG;
  }, [effectiveTheme, palette, custom]);

  // Cross-tab sync: theme changes in one tab apply in all others.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      switch (e.key) {
        case THEME_KEY:
          if (isTheme(e.newValue)) setThemeState(e.newValue);
          break;
        case PALETTE_KEY:
          if (isPalette(e.newValue)) setPaletteState(e.newValue);
          break;
        case BG_KEY:
          if (isBackground(e.newValue)) setBackgroundState(e.newValue);
          break;
        case INTENSITY_KEY:
          if (isIntensity(e.newValue)) setIntensityState(e.newValue);
          break;
        case CUSTOM_KEY: {
          const hex = normalizeHex(e.newValue);
          if (hex) setCustomState(hex);
          break;
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const setPalette = useCallback((p: Palette) => setPaletteState(p), []);
  const setBackground = useCallback((b: Background) => setBackgroundState(b), []);
  const setIntensity = useCallback((i: Intensity) => setIntensityState(i), []);
  const setCustom = useCallback((c: string) => {
    const hex = normalizeHex(c);
    if (hex) setCustomState(hex);
  }, []);
  const randomize = useCallback(() => {
    const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]!;
    setPaletteState(pick(PALETTES).id);
    setBackgroundState(pick(BACKGROUNDS).id);
    setIntensityState(pick(INTENSITIES).id);
  }, []);
  const reset = useCallback(() => {
    setThemeState(DARK);
    setPaletteState("ocean");
    setBackgroundState("paper");
    setIntensityState("normal");
    setCustomState(DEFAULT_CUSTOM);
  }, []);
  const applyPreset = useCallback((p: ThemePreset) => {
    setThemeState(p.theme);
    setPaletteState(p.palette);
    setBackgroundState(p.background);
    setIntensityState(p.intensity);
    setCustomState(p.custom);
  }, []);

  return { theme, palette, background, intensity, custom, effectiveTheme, setTheme, setPalette, setBackground, setIntensity, setCustom, randomize, reset, applyPreset };
}