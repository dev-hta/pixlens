import { useEffect, useRef, useState } from "react";
import { useApp } from "../store";
import { cn } from "../utils/cn";
import { Logo, IconSwitch, IconUpload, IconGrid, IconBurst, IconImage } from "./icons";
import { GallerySheet } from "./GallerySheet";
import { FocusLayer } from "./FocusLayer";
import { SAMPLES } from "../lib/samples";

export function Viewfinder() {
  const {
    camera,
    startCamera,
    stopCamera,
    capture,
    mode,
    setMode,
    facing,
    toggleFacing,
    cameraStatus,
    cameraMessage,
    gallery,
    params,
    onUploadFile,
    processSource,
  } = useApp();

  const hostRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Attach the managed <video> element and drive the camera lifecycle.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const v = camera.videoEl;
    v.className = "absolute inset-0 h-full w-full object-cover";
    host.appendChild(v);
    startCamera();
    return () => {
      stopCamera();
      if (v.parentElement === host) host.removeChild(v);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const mirror = facing === "user";
  const evStops = (params.exposure / 100) * 2;
  camera.videoEl.style.transform = mirror ? "scaleX(-1)" : "none";
  // Live exposure preview: brighten/darken the viewfinder to match the EV bias.
  camera.videoEl.style.filter = `brightness(${Math.pow(2, evStops).toFixed(3)})`;

  const handleShutter = () => {
    capture();
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUploadFile(f);
    e.target.value = "";
  };

  const last = gallery[0];
  const showFallback =
    cameraStatus === "unsupported" ||
    cameraStatus === "denied" ||
    cameraStatus === "error";

  return (
    <div className="absolute inset-0 flex flex-col bg-black">
      {/* Video host */}
      <div ref={hostRef} className="absolute inset-0" />

      {/* Subtle vignette + processing tint */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(0,0,0,0.45)_100%)]" />

      {/* Rule-of-thirds grid */}
      {showGrid && cameraStatus === "live" && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
          <div className="absolute inset-x-0 top-1/3 h-px bg-white" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white" />
          <div className="absolute inset-y-0 left-1/3 w-px bg-white" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white" />
        </div>
      )}

      {cameraStatus === "live" && <FocusLayer />}

      {/* Top bar */}
      <div
        className="relative z-20 flex items-center justify-between px-4 pb-2 pt-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="accent-grad inset-hi flex h-9 w-9 items-center justify-center rounded-2xl text-black/80 shadow-lg shadow-black/30">
            <Logo width={20} height={20} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold tracking-tight text-white">
              Pixel<span className="text-grad">Lens</span>
            </div>
            <CameraStatusChip status={cameraStatus} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="icon-btn glass inset-hi h-10 w-10"
            title="Upload photo"
          >
            <IconUpload width={19} height={19} />
          </button>
          <button
            onClick={() => setShowGrid((g) => !g)}
            className={cn(
              "icon-btn inset-hi h-10 w-10 glass",
              showGrid ? "text-accent" : "text-white/80"
            )}
            title="Grid"
          >
            <IconGrid width={19} height={19} />
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />

      {/* Spacer pushes controls to bottom */}
      <div className="relative z-10 flex-1" />

      {/* Bottom controls */}
      <div
        className="relative z-20 px-5 pb-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
      >
        {/* Mode pills */}
        <div className="mb-5 flex items-center justify-center gap-2">
          <ModePill active={mode === "hdr"} onClick={() => setMode("hdr")} icon={<IconBurst width={15} height={15} />}>
            HDR+ Burst
          </ModePill>
          <ModePill active={mode === "photo"} onClick={() => setMode("photo")}>
            Single
          </ModePill>
        </div>

        <div className="flex items-center justify-between">
          {/* Gallery thumb */}
          <button
            onClick={() => setGalleryOpen(true)}
            className="icon-btn glass inset-hi relative h-13 w-13 overflow-hidden rounded-2xl"
            style={{ height: 52, width: 52 }}
          >
            {last ? (
              <img src={last.dataUrl} alt="gallery" className="h-full w-full object-cover" />
            ) : (
              <IconImage width={20} height={20} />
            )}
            {gallery.length > 1 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-black">
                {gallery.length}
              </span>
            )}
          </button>

          {/* Shutter */}
          <button
            onClick={handleShutter}
            disabled={cameraStatus !== "live"}
            className="group relative flex h-[74px] w-[74px] items-center justify-center disabled:opacity-50"
            aria-label="Capture"
          >
            <span
              className="shutter-ring absolute inset-0 rounded-full p-[3px]"
              style={{ ["--cap" as string]: mode === "hdr" ? "360deg" : "260deg" }}
            >
              <span className="block h-full w-full rounded-full bg-black" />
            </span>
            <span className="h-[58px] w-[58px] rounded-full bg-white shadow-inner transition-transform duration-150 group-active:scale-90" />
          </button>

          {/* Switch camera */}
          <button
            onClick={toggleFacing}
            disabled={cameraStatus !== "live"}
            className="icon-btn glass inset-hi h-13 w-13 rounded-full disabled:opacity-40"
            style={{ height: 52, width: 52 }}
            aria-label="Switch camera"
          >
            <IconSwitch width={22} height={22} />
          </button>
        </div>
      </div>

      {/* Initializing spinner */}
      {cameraStatus === "starting" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin-slow rounded-full border-2 border-white/20 border-t-accent" />
            <p className="text-xs text-white/70">Starting camera…</p>
          </div>
        </div>
      )}

      {/* Fallback for unsupported / denied / errored cameras */}
      {showFallback && (
        <Fallback
          message={cameraMessage}
          status={cameraStatus}
          onUpload={() => fileRef.current?.click()}
          onSample={(s) => processSource(s)}
          onRetry={startCamera}
        />
      )}

      {galleryOpen && <GallerySheet onClose={() => setGalleryOpen(false)} />}
    </div>
  );
}

function CameraStatusChip({ status }: { status: string }) {
  const map: Record<string, { t: string; c: string }> = {
    live: { t: "● Live", c: "text-emerald-300" },
    starting: { t: "Starting", c: "text-amber-300" },
    idle: { t: "Idle", c: "text-zinc-400" },
    denied: { t: "Blocked", c: "text-rose-300" },
    unsupported: { t: "No camera", c: "text-zinc-400" },
    error: { t: "Error", c: "text-rose-300" },
  };
  const s = map[status] ?? map.idle;
  return <div className={cn("text-[10.5px] font-semibold", s.c)}>{s.t}</div>;
}

function ModePill({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all",
        active
          ? "bg-white text-black shadow-lg shadow-black/30"
          : "glass text-white/70"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Fallback({
  message,
  status,
  onUpload,
  onSample,
  onRetry,
}: {
  message: string;
  status: string;
  onUpload: () => void;
  onSample: (src: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-gradient-to-b from-black/30 via-black/60 to-black/90 p-5"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)" }}
    >
      <div className="glass-strong inset-hi animate-fade-up rounded-3xl p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[13px] font-bold text-white">Process any photo</span>
        </div>
        <p className="mb-4 text-[12.5px] leading-relaxed text-white/65">
          {message ||
            "The full PixelLens pipeline — HDR+ merge, dual-domain denoise and Google color science — runs on any image."}
        </p>

        <div className="mb-4 grid grid-cols-3 gap-2.5">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              onClick={() => onSample(s.src)}
              className="group relative overflow-hidden rounded-2xl border border-white/10"
            >
              <img src={s.src} alt={s.title} className="aspect-square w-full object-cover transition-transform group-active:scale-95" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-left text-[9px] font-semibold leading-tight text-white">
                {s.tag}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onUpload}
          className="accent-grad inset-hi flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-bold text-black shadow-lg shadow-black/30"
        >
          <IconUpload width={18} height={18} />
          Upload a photo
        </button>

        {status === "denied" && (
          <button
            onClick={onRetry}
            className="mt-2.5 w-full rounded-2xl border border-white/12 py-2.5 text-[13px] font-semibold text-white/80"
          >
            Try camera again
          </button>
        )}
      </div>
    </div>
  );
}
