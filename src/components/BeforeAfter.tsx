import { useCallback, useRef, useState } from "react";

interface BeforeAfterProps {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  initial?: number;
  className?: string;
}

export function BeforeAfter({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  initial = 50,
  className = "",
}: BeforeAfterProps) {
  const [pos, setPos] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) setFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={ref}
      className={`relative h-full w-full touch-none select-none overflow-hidden ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* After (full) */}
      <img
        src={after}
        alt={afterLabel}
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {/* Before (clipped to the left of the handle) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img
          src={before}
          alt={beforeLabel}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-md">
        {beforeLabel}
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-accent/80 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-black/80 backdrop-blur-md">
        {afterLabel}
      </div>

      {/* Divider + handle */}
      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-[2px] -translate-x-1/2 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.5)]"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/15 backdrop-blur-md">
          <div className="flex gap-0.5 text-white">
            <span className="text-[13px] leading-none">‹</span>
            <span className="text-[13px] leading-none">›</span>
          </div>
        </div>
      </div>
    </div>
  );
}
