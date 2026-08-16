interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vrot: number;
  sway: number;
  color: string;
}

let canvas: HTMLCanvasElement | null = null;
let raf = 0;
let pieces: Piece[] = [];

const COLORS = ["#6ea8ff", "#fbbf24", "#fb7185", "#34d399", "#a78bfa", "#22d3ee"];

/** One celebratory burst — canvas confetti, zero assets. */
export function launchConfetti(opts?: { count?: number; power?: number }) {
  const count = opts?.count ?? 140;
  const power = opts?.power ?? 1;
  const dpr = window.devicePixelRatio || 1;

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    document.body.appendChild(canvas);
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const layer = canvas;
  const cw = layer.width;
  const ch = layer.height;

  cancelAnimationFrame(raf);
  pieces = Array.from({ length: count }, () => ({
    x: w * (0.2 + 0.6 * Math.random()),
    y: -30 - Math.random() * 90,
    vx: (Math.random() - 0.5) * 7 * power,
    vy: (2 + Math.random() * 4) * power,
    w: 6 + Math.random() * 7,
    h: 4 + Math.random() * 5,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.3,
    sway: Math.random() * Math.PI * 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
  }));

  const t0 = performance.now();
  const duration = 2600;
  const gravity = 0.11;

  const tick = (now: number) => {
    const elapsed = now - t0;
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.scale(dpr, dpr);
    for (const p of pieces) {
      p.vy += gravity;
      p.x += p.vx + Math.sin(elapsed / 420 + p.sway) * 0.9;
      p.y += p.vy;
      p.rot += p.vrot;
      if (p.y > h + 40) {
        p.y = -20;
        p.x = Math.random() * w;
        p.vy = 2 + Math.random() * 3;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.restore();
    if (elapsed < duration) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      layer.remove();
      canvas = null;
      pieces = [];
    }
  };
  raf = requestAnimationFrame(tick);
}