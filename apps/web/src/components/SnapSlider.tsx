import { type CSSProperties } from "react";

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  /** Common values — rendered as tick marks and snapped to when nearby. */
  snapPoints?: number[];
  snapDistance?: number;
  format?: (v: number) => string;
}

export default function SnapSlider({ min, max, step, value, onChange, snapPoints = [], snapDistance = 1, format = (v) => String(v) }: Props) {
  const handle = (raw: number) => {
    for (const p of snapPoints) {
      if (Math.abs(raw - p) <= snapDistance) {
        onChange(p);
        return;
      }
    }
    onChange(raw);
  };

  const pct = ((value - min) / (max - min)) * 100;
  const bubbleLeft = Math.max(4, Math.min(96, pct));

  return (
    <div className="snap-slider">
      <span className="snap-bubble" style={{ left: `${bubbleLeft}%` }}>
        {format(value)}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={format(value)}
        onChange={(e) => handle(Number(e.target.value))}
        style={{ "--fill": `${pct}%` } as CSSProperties}
      />
      <div className="snap-ticks" aria-hidden="true">
        {snapPoints.map((p) => (
          <span key={p} style={{ left: `${((p - min) / (max - min)) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}