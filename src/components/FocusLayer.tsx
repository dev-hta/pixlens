import { useRef, useState } from "react";
import { useApp } from "../store";
import { cn } from "../utils/cn";

interface Reticle {
  x: number;
  y: number;
  state: "focus" | "lock";
  id: number;
}

/**
 * Tap-to-focus + drag-to-expose layer over the live viewfinder.
 *
 * • Tap → an amber reticle pulls in (the classic "focusing" animation) and we
 *   ask the physical lens to focus on that point of interest where the platform
 *   supports it (pointsOfInterest / focusMode constraints).
 * • Tap-and-drag vertically → live exposure bias: the preview brightens/darkens
 *   via a CSS filter, the value is committed to the pipeline exposure, and we
 *   also push hardware exposureCompensation where supported. Another tap
 *   refocuses anywhere.
 */
export function FocusLayer() {
  const { camera, params, setParam } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [reticle, setReticle] = useState<Reticle | null>(null);
  const [ev, setEv] = useState<number | null>(null);

  const startRef = useRef<{ y: number; exp: number; moved: boolean } | null>(null);
  const expRef = useRef(params.exposure);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    clearTimers();
    setReticle({ x, y, state: "focus", id: e.timeStamp });
    setEv(null);
    startRef.current = { y: e.clientY, exp: expRef.current, moved: false };
    camera.applyFocus(x / rect.width, y / rect.height);

    timers.current.push(
      window.setTimeout(() => setReticle((r) => (r ? { ...r, state: "lock" } : r)), 460),
      window.setTimeout(() => setReticle(null), 2800)
    );
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = startRef.current;
    if (!s) return;
    const dy = s.y - e.clientY; // drag up = brighter
    if (!s.moved && (dy > 6 || dy < -6)) s.moved = true;
    if (s.moved) {
      const next = Math.max(-100, Math.min(100, Math.round(s.exp + dy * 0.6)));
      expRef.current = next;
      setParam("exposure", next);
      setEv(next);
    }
  };

  const onPointerUp = () => {
    const s = startRef.current;
    if (s?.moved) {
      const evStops = (expRef.current / 100) * 2;
      camera.applyExposureCompensation(evStops);
    }
    startRef.current = null;
    setEv(null);
  };

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-[15] touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {reticle && (
        <div
          className={cn("absolute", reticle.state === "focus" ? "reticle-focus" : "reticle-lock")}
          style={{ left: reticle.x, top: reticle.y, transform: "translate(-50%, -50%)" }}
        >
          {ev !== null && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-[#ffd24a] backdrop-blur-md">
              ☀ {(ev / 50).toFixed(1)} EV
            </div>
          )}
          <div className="reticle-box relative flex h-[68px] w-[68px] items-center justify-center rounded-xl">
            <span className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-[#ffd24a]" />
            <span className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-[#ffd24a]" />
            <span className="absolute left-0 top-1/2 h-px w-2 -translate-y-1/2 bg-[#ffd24a]" />
            <span className="absolute right-0 top-1/2 h-px w-2 -translate-y-1/2 bg-[#ffd24a]" />
          </div>
        </div>
      )}
    </div>
  );
}
