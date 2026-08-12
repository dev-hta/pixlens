import { useApp } from "../store";
import { BeforeAfter } from "./BeforeAfter";
import { IconBack, IconTune, IconShare, IconDownload } from "./icons";
import { cn } from "../utils/cn";

export function ReviewView() {
  const { review, backToViewfinder, openAdjust, downloadCurrent, shareCurrent, reprocessing, profile } = useApp();
  if (!review) return null;

  const subtitle =
    review.framesMerged > 1 ? `HDR+ · ${review.framesMerged} frames merged` : "Computational enhancement";

  return (
    <div className="absolute inset-0 flex flex-col bg-black animate-fade-in">
      {/* Top bar */}
      <div
        className="relative z-20 flex items-center justify-between px-3 pb-2 pt-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
      >
        <button onClick={backToViewfinder} className="icon-btn glass inset-hi h-10 w-10" aria-label="Back">
          <IconBack width={21} height={21} />
        </button>
        <div className="text-center">
          <p className="text-[13px] font-bold text-white">Review</p>
          <p className="text-[10.5px] font-medium text-accent">{subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center">
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-opacity",
              reprocessing ? "opacity-100" : "opacity-0"
            )}
          >
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
            <span className="text-white/70">Updating</span>
          </span>
        </div>
      </div>

      {/* Compare area */}
      <div className="relative flex-1 px-3 pb-3">
        <div className="checker relative h-full w-full overflow-hidden rounded-3xl border border-white/10">
          <BeforeAfter before={review.rawUrl} after={review.processedUrl} />
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-md">
            Drag to compare · {profile.name}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div
        className="relative z-20 flex items-center justify-around px-4 pb-2 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <ReviewAction label="Adjust" onClick={openAdjust} highlight>
          <IconTune width={21} height={21} />
        </ReviewAction>
        <ReviewAction label="Share" onClick={shareCurrent}>
          <IconShare width={21} height={21} />
        </ReviewAction>
        <ReviewAction label="Save" onClick={downloadCurrent}>
          <IconDownload width={21} height={21} />
        </ReviewAction>
      </div>
    </div>
  );
}

function ReviewAction({
  children,
  label,
  onClick,
  highlight,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex w-20 flex-col items-center gap-1.5">
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full inset-hi transition-transform active:scale-95",
          highlight ? "accent-grad text-black" : "glass text-white"
        )}
      >
        {children}
      </span>
      <span className={cn("text-[11.5px] font-semibold", highlight ? "text-white" : "text-white/70")}>
        {label}
      </span>
    </button>
  );
}
