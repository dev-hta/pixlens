import { useApp } from "../store";
import { IconCheck } from "./icons";
import { cn } from "../utils/cn";

const STAGES = [
  { key: "align", label: "Aligning burst" },
  { key: "merge", label: "Merging frames" },
  { key: "denoise", label: "Dual-domain denoise" },
  { key: "tone", label: "Google color science" },
  { key: "sharpen", label: "Detail sharpening" },
];

export function ProcessingOverlay() {
  const { progress } = useApp();
  const currentKey = progress?.stage ?? "align";
  const currentIdx = Math.max(0, STAGES.findIndex((s) => s.key === currentKey));
  const pct = Math.round((progress?.progress ?? 0) * 100);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-ink">
      {/* ambient depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_30%,rgba(55,224,255,0.08),transparent_70%)]" />
      {/* shutter flash */}
      <div key="flash" className="animate-flash pointer-events-none absolute inset-0 bg-white" />

      {/* scanning beam */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 animate-scan bg-gradient-to-b from-accent/25 to-transparent" />

      <div className="relative flex w-[78%] max-w-xs flex-col items-center">
        <div className="relative mb-7 h-16 w-16">
          <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-white/10 border-t-accent" />
          <div className="absolute inset-2 animate-pulse-soft rounded-full bg-accent/10" />
          <div className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tnum text-white">
            {pct}%
          </div>
        </div>

        <p className="mb-1 text-[15px] font-bold text-white">Processing</p>
        <p className="mb-6 h-4 text-[12.5px] text-accent">{progress?.label ?? "Working…"}</p>

        <div className="w-full space-y-2.5">
          {STAGES.map((s, i) => {
            const done = i < currentIdx || currentKey === "done";
            const activeStage = i === currentIdx && currentKey !== "done";
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-colors",
                    done
                      ? "border-accent bg-accent text-black"
                      : activeStage
                        ? "border-accent/60 text-accent"
                        : "border-white/15 text-white/25"
                  )}
                >
                  {done ? (
                    <IconCheck width={12} height={12} />
                  ) : activeStage ? (
                    <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[12.5px] font-medium transition-colors",
                    done ? "text-white/55" : activeStage ? "text-white" : "text-white/30"
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* progress bar */}
        <div className="mt-7 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="accent-grad h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
