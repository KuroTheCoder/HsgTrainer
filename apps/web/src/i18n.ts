import { useEffect, useState } from "react";
import viJson from "./i18n/vi.json";

// Tiny i18n: UI strings ARE the English keys, so en needs no dictionary and
// code stays readable. The maintainer translates by adding English → Vietnamese
// pairs to src/i18n/vi.json (the i18n-report script shows what's missing).
// Untranslated keys render their English text, so the app never breaks mid-way.

export type Locale = "en" | "vi";

export const LOCALES: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

const STORE_KEY = "hsg_locale";

function detect(): Locale {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s === "en" || s === "vi") return s;
  } catch {
    /* private mode */
  }
  try {
    return navigator.language?.toLowerCase().startsWith("vi") ? "vi" : "en";
  } catch {
    return "en";
  }
}

let locale: Locale = typeof window === "undefined" ? "en" : detect();

export function getLocale(): Locale {
  return locale;
}

export function setLocale(l: Locale) {
  locale = l;
  try {
    localStorage.setItem(STORE_KEY, l);
  } catch {
    /* private mode */
  }
  document.documentElement.lang = l;
  window.dispatchEvent(new CustomEvent("hsg-locale"));
}

/** Translate. `{name}` placeholders are substituted from vars. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const s = (locale === "vi" ? VI[key] : undefined) ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Subscribe a component to locale changes (re-renders it on switch). */
export function useLocale(): Locale {
  const [, force] = useState(0);
  useEffect(() => {
    const bump = () => force((n) => n + 1);
    window.addEventListener("hsg-locale", bump);
    return () => window.removeEventListener("hsg-locale", bump);
  }, []);
  return locale;
}

/** English → Vietnamese pairs. Add keys as you translate; missing keys fall back to English. */
export const VI: Record<string, string> = viJson;