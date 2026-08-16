const SFX_KEY = "hsg-sfx-muted";
const VOL_KEY = "hsg-sfx-volumes";

export type SfxName = "click" | "hover" | "pop" | "tick" | "correct" | "wrong" | "complete" | "save" | "clear" | "warn";

const DEFAULT_VOLUMES: Record<SfxName, number> = {
  click: 0.8,
  hover: 0.5,
  pop: 0.8,
  tick: 0.3,
  correct: 0.9,
  wrong: 0.8,
  complete: 0.9,
  save: 0.8,
  clear: 0.8,
  warn: 0.9,
};

const COOLDOWN_MS: Partial<Record<SfxName, number>> = {
  hover: 120,
  click: 70,
  pop: 70,
  tick: 80,
};

let muted = false;
let volumes: Record<string, number> = {};
const cache = new Map<string, HTMLAudioElement | null>();
const last = new Map<string, number>();

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

export function sfxMuted(): boolean {
  return muted;
}

export function setSfxMuted(v: boolean) {
  muted = v;
  write(SFX_KEY, v ? "1" : "0");
}

export function sfxVolumes(): Record<string, number> {
  return volumes;
}

export function setSfxVolumeFor(name: SfxName, v: number) {
  volumes = { ...volumes, [name]: Math.min(1, Math.max(0, v)) };
  write(VOL_KEY, JSON.stringify(volumes));
}

export function initSfx() {
  muted = read(SFX_KEY) === "1";
  volumes = {};
  const raw = read(VOL_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, number>;
      for (const name of Object.keys(DEFAULT_VOLUMES)) {
        const v = parsed[name];
        if (typeof v === "number" && Number.isFinite(v)) volumes[name] = Math.min(1, Math.max(0, v));
      }
    } catch {
      /* corrupt map — fall through to defaults */
    }
  }
}

/** Plays an asset from /sfx/<name>.mp3. Missing files are silent (asset ownership lives outside the repo). */
export function play(name: SfxName) {
  if (muted) return;
  const cd = COOLDOWN_MS[name] ?? 500;
  const now = performance.now();
  if (now - (last.get(name) ?? 0) < cd) return;
  last.set(name, now);

  let audio = cache.get(name);
  if (audio === undefined) {
    audio = new Audio(`${import.meta.env.BASE_URL}sfx/${name}.mp3`);
    audio.preload = "auto";
    audio.addEventListener("error", () => cache.set(name, null), { once: true });
    cache.set(name, audio);
  }
  if (!audio) return;
  audio.volume = volumes[name] ?? DEFAULT_VOLUMES[name] ?? 0.8;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    /* blocked before first user gesture — fine, later plays unlock */
  });
}

/** One of the three score moments: strong run, middling run, rough run. */
export function playScore(pct: number) {
  play(pct >= 80 ? "correct" : pct >= 60 ? "complete" : "wrong");
}

const CLICKABLE =
  "button, a[href], [role='button'], .option, .dict-link, .word-card-word, .section-tile, .side-section a, .theme-toggle, input[type='color']";
const POPPY = ".swatch, .bg-swatch, .chip-btn, .preset-chip, .seg button, .word-card-word";

let enabled = false;

/** One delegated listener pair covers every click and hover on interactive elements. */
export function enableGlobalSfx() {
  if (enabled) return;
  enabled = true;
  initSfx();

  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    if (!(target instanceof Element)) return;
    const el = target.closest<HTMLElement>(CLICKABLE);
    if (!el) return;
    if (el.matches("button") && (el as HTMLButtonElement).disabled) return;
    play(el.matches(POPPY) ? "pop" : "click");
  });

  document.addEventListener("mouseover", (e) => {
    const target = e.target as Element | null;
    if (!(target instanceof Element)) return;
    const el = target.closest<HTMLElement>(`${CLICKABLE}, .tile, .side-section a`);
    if (!el) return;
    if (el.matches("button") && (el as HTMLButtonElement).disabled) return;
    play("hover");
  });
}