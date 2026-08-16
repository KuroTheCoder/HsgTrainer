import { type CSSProperties, useState } from "react";
import { play } from "../sfx";

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  /** Common values — rendered as tick marks on the track, gently pulled to on release. */
  snapPoints?: number[];
  snapDistance?: number;
  format?: (v: number) => string;
}

export default function SnapSlider({ min, max, step, value, onChange, snapPoints = [], snapDistance = 1, format = (v) => String(v) }: Props) {
  const [dragging, setDragging] = useState(false);

  const settle = (e: { currentTarget: { value: string } }) => {
    const v = Number(e.currentTarget.value);
    let target: number | null = null;
    for (const p of snapPoints) {
      if (Math.abs(v - p) <= snapDistance && (target === null || Math.abs(v - p) < Math.abs(v - target))) {
        target = p;
      }
    }
    if (target !== null && target !== v) onChange(target);
  };

  const pct = ((value - min) / (max - min)) * 100;
  const bubbleLeft = Math.max(4, Math.min(96, pct));

  return (
    <div className="snap-slider">
      <span className={`snap-bubble${dragging ? " drag" : ""}`} style={{ left: `${bubbleLeft}%` }}>
        {format(value)}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={format(value)}
        onPointerDown={() => setDragging(true)}
        onPointerUp={(e) => {
          setDragging(false);
          settle(e);
        }}
        onBlur={(e) => {
          setDragging(false);
          settle(e);
        }}
        onKeyUp={settle}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v !== value) {
            onChange(v);
            play("tick");
          }
        }}
        style={{ "--fill": `${pct}%` } as CSSProperties}
      />
      <div className="snap-ticks" aria-hidden="true">
        {snapPoints.map((p) => (
          <span key={p} style={{ left: `${((p - min) / (max - min)) * 100}%`, opacity: p === value ? 0 : undefined }} />
        ))}
      </div>
    </div>
  );
}