import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
export type Palette = "ocean" | "emerald" | "violet" | "sunset" | "amber";

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

export const PALETTES: PaletteDef[] = [
  { id: "ocean", label: "Bút xanh", swatch: "#5b9bff", dark: "#5b9bff", light: "#2f54d9" },
  { id: "emerald", label: "Bút xanh lá", swatch: "#34d399", dark: "#34d399", light: "#059669" },
  { id: "violet", label: "Bút tím", swatch: "#a78bfa", dark: "#a78bfa", light: "#7c3aed" },
  { id: "sunset", label: "Bút cam", swatch: "#fb923c", dark: "#fb923c", light: "#ea580c" },
  { id: "amber", label: "Bút vàng", swatch: "#fbbf24", dark: "#fbbf24", light: "#b45309" },
];

const THEME_KEY = "hsg-theme";
const PALETTE_KEY = "hsg-palette";

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
  return v === "dark" || v === "light";
}

export function isPalette(v: string | null): v is Palette {
  return !!v && PALETTES.some((p) => p.id === v);
}

/** Runs before React mounts so the first paint already has the right theme. */
export function applyInitialTheme() {
  const theme = read(THEME_KEY);
  const palette = read(PALETTE_KEY);
  if (isTheme(theme)) document.documentElement.dataset.theme = theme;
  if (isPalette(palette)) document.documentElement.dataset.palette = palette;
}

function faviconUrl(theme: Theme, palette: Palette): string {
  const def = PALETTES.find((p) => p.id === palette) ?? PALETTES[0]!;
  const bg = theme === "dark" ? "%23191829" : "%23fffdf6";
  const color = theme === "dark" ? def.dark : def.light;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<rect width='100' height='100' rx='22' fill='${bg}'/>` +
    `<text x='50' y='70' font-size='54' font-family='system-ui' font-weight='700' text-anchor='middle' transform='rotate(-3 50 50)' fill='${color}'>H</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = read(THEME_KEY);
    return isTheme(saved) ? saved : "dark";
  });
  const [palette, setPaletteState] = useState<Palette>(() => {
    const saved = read(PALETTE_KEY);
    return isPalette(saved) ? saved : "ocean";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    write(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    write(PALETTE_KEY, palette);
  }, [palette]);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = faviconUrl(theme, palette);
  }, [theme, palette]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  const setPalette = useCallback((p: Palette) => setPaletteState(p), []);

  return { theme, palette, toggleTheme, setPalette };
}
