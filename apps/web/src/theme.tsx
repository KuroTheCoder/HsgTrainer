import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";
export type Palette =
  | "ocean" | "cyan" | "emerald" | "teal" | "lime"
  | "amber" | "sunset" | "rose" | "red"
  | "violet" | "fuchsia" | "indigo";
export type Background = "paper" | "dots" | "grid" | "plain" | "waves" | "stars";

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

const DARK = "dark" as const;
const LIGHT = "light" as const;

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

export function prefersLight(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches;
}

/** Maps "system" to the actual OS preference. */
export function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") return prefersLight() ? LIGHT : DARK;
  return theme;
}

/** Runs before React mounts so the first paint already has the right look. */
export function applyInitialTheme() {
  const theme = read(THEME_KEY);
  if (isTheme(theme)) document.documentElement.dataset.theme = resolveTheme(theme);
  const palette = read(PALETTE_KEY);
  if (isPalette(palette)) document.documentElement.dataset.palette = palette;
  const bg = read(BG_KEY);
  if (isBackground(bg)) document.documentElement.dataset.background = bg;
}

function faviconUrl(theme: "dark" | "light", palette: Palette): string {
  const def = PALETTES.find((p) => p.id === palette) ?? PALETTES[0]!;
  const bg = theme === "dark" ? "%23191829" : "%23fffdf6";
  const color = theme === "dark" ? def.dark : def.light;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<rect width='100' height='100' rx='22' fill='${bg}'/>` +
    `<text x='50' y='70' font-size='54' font-family='system-ui' font-weight='700' text-anchor='middle' transform='rotate(-3 50 50)' fill='${color}'>H</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const DEFAULTS = { theme: DARK, palette: "ocean", background: "paper" } as const;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = read(THEME_KEY);
    return isTheme(saved) ? saved : DEFAULTS.theme;
  });
  const [palette, setPaletteState] = useState<Palette>(() => {
    const saved = read(PALETTE_KEY);
    return isPalette(saved) ? saved : DEFAULTS.palette;
  });
  const [background, setBackgroundState] = useState<Background>(() => {
    const saved = read(BG_KEY);
    return isBackground(saved) ? saved : DEFAULTS.background;
  });

  const effectiveTheme = resolveTheme(theme);

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    write(THEME_KEY, theme);
  }, [theme, effectiveTheme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    write(PALETTE_KEY, palette);
  }, [palette]);

  useEffect(() => {
    document.documentElement.dataset.background = background;
    write(BG_KEY, background);
  }, [background]);

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
    if (link) link.href = faviconUrl(effectiveTheme, palette);
  }, [effectiveTheme, palette]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);
  const setPalette = useCallback((p: Palette) => setPaletteState(p), []);
  const setBackground = useCallback((b: Background) => setBackgroundState(b), []);
  const randomize = useCallback(() => {
    const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]!;
    setPaletteState(pick(PALETTES).id);
    setBackgroundState(pick(BACKGROUNDS).id);
  }, []);
  const reset = useCallback(() => {
    setThemeState(DEFAULTS.theme);
    setPaletteState(DEFAULTS.palette);
    setBackgroundState(DEFAULTS.background);
  }, []);

  return { theme, palette, background, effectiveTheme, setTheme, toggleTheme, setPalette, setBackground, randomize, reset };
}
