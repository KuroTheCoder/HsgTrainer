import { useRef, useState } from "react";
import { play } from "../sfx";

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  /** Common values — tick marks on the track, gently pulled to on release. */
  snapPoints?: number[];
  snapDistance?: number;
  format?: (v: number) => string;
}

export default function SnapSlider({ min, max, step, value, onChange, snapPoints = [], snapDistance = 1, format = (v) => String(v) }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const lastValue = useRef(value);
  lastValue.current = value;

  const valueFromX = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(max, Math.max(min, min + Math.round((pct * (max - min)) / step) * step));
  };

  const settle = () => {
    const v = lastValue.current;
    let target: number | null = null;
    for (const p of snapPoints) {
      if (Math.abs(v - p) <= snapDistance && (target === null || Math.abs(v - p) < Math.abs(v - target))) {
        target = p;
      }
    }
    if (target !== null && target !== v) onChange(target);
  };

  const apply = (clientX: number) => {
    const v = valueFromX(clientX);
    if (v !== lastValue.current) {
      onChange(v);
      play("hover");
    }
  };

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    trackRef.current?.focus();
    setDragging(true);
    apply(e.clientX);
    const move = (ev: PointerEvent) => apply(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setDragging(false);
      settle();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let v: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") v = Math.min(max, value + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v = Math.max(min, value - step);
    else if (e.key === "Home") v = min;
    else if (e.key === "End") v = max;
    if (v !== null && v !== value) {
      e.preventDefault();
      onChange(v);
      play("hover");
    }
  };

  const pct = ((value - min) / (max - min)) * 100;
  const ticks = snapPoints.filter((p) => p > min && p < max);

  return (
    <div className="snap-slider">
      <div
        ref={trackRef}
        className="snap-track"
        role="slider"
        tabIndex={0}
        aria-label={format(value)}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        onPointerDown={startDrag}
        onKeyDown={onKeyDown}
      >
        <span className={`snap-bubble${dragging ? " drag" : ""}`} style={{ left: `${Math.max(4, Math.min(96, pct))}%` }}>
          {format(value)}
        </span>
        <div className="snap-fill" style={{ width: `${pct}%` }} />
        {ticks.map((p) => (
          <span
            key={p}
            className="snap-tick"
            style={{ left: `${((p - min) / (max - min)) * 100}%`, opacity: p === value ? 0 : undefined }}
          />
        ))}
        <div className="snap-thumb" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}