import type { CSSProperties } from "react";

interface ScoreRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  /** tone = color class on the ring stroke. */
  tone?: "accent" | "ok" | "warn" | "bad";
}

export function ScoreRing({ value, max, size = 92, stroke = 9, tone = "accent" }: ScoreRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className={`ring-fg ${tone}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c}
          strokeLinecap="round"
          style={{ "--len": c, "--off": c * (1 - pct) } as CSSProperties}
        />
      </svg>
      <div className="ring-label">
        <b>
          {value}
          <span>/{max}</span>
        </b>
      </div>
    </div>
  );
}
