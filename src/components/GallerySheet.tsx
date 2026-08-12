import { useState } from "react";
import { useApp } from "../store";
import type { Photo } from "../lib/image/types";
import { BeforeAfter } from "./BeforeAfter";
import { IconClose, IconTrash, IconDownload, IconShare } from "./icons";

function downloadDataUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

async function shareDataUrl(url: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], "pixellens.jpg", { type: "image/jpeg" });
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
      share?: (d: { files: File[] }) => Promise<void>;
    };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({ files: [file] });
      return;
    }
  } catch {
    /* noop */
  }
  downloadDataUrl(url, "pixellens.jpg");
}

export function GallerySheet({ onClose }: { onClose: () => void }) {
  const { gallery, removePhoto, clearGallery } = useApp();
  const [active, setActive] = useState<Photo | null>(null);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-xl animate-fade-in">
      <div
        className="flex items-center justify-between px-4 pb-2 pt-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
      >
        <div>
          <h2 className="text-[16px] font-bold text-white">Gallery</h2>
          <p className="text-[11.5px] text-white/50">{gallery.length} processed photo{gallery.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2">
          {gallery.length > 0 && (
            <button
              onClick={clearGallery}
              className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-rose-300/90"
            >
              Clear all
            </button>
          )}
          <button onClick={onClose} className="icon-btn glass inset-hi h-10 w-10">
            <IconClose width={20} height={20} />
          </button>
        </div>
      </div>

      {gallery.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="text-[14px] font-semibold text-white/80">No photos yet</p>
          <p className="text-[12.5px] text-white/45">
            Capture a shot or upload an image and your processed results will appear here.
          </p>
        </div>
      ) : (
        <div className="no-scrollbar grid grid-cols-3 gap-1.5 overflow-y-auto p-3">
          {gallery.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-white/8"
            >
              <img
                src={p.dataUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 group-active:scale-95"
              />
              <span className="absolute left-1 top-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[8.5px] font-bold text-white backdrop-blur">
                {p.framesMerged > 1 ? `HDR+${p.framesMerged}` : "FX"}
              </span>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="absolute inset-0 z-10 flex flex-col bg-black animate-fade-in">
          <div className="relative flex-1">
            <BeforeAfter before={active.rawUrl} after={active.dataUrl} />
          </div>
          <div
            className="flex items-center justify-around border-t border-white/8 px-4 py-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
          >
            <ActionBtn label="Delete" onClick={() => { removePhoto(active.id); setActive(null); }}>
              <IconTrash width={20} height={20} />
            </ActionBtn>
            <ActionBtn label="Share" onClick={() => shareDataUrl(active.dataUrl)}>
              <IconShare width={20} height={20} />
            </ActionBtn>
            <ActionBtn label="Save" onClick={() => downloadDataUrl(active.dataUrl, `pixellens-${active.id}.jpg`)}>
              <IconDownload width={20} height={20} />
            </ActionBtn>
            <ActionBtn label="Close" onClick={() => setActive(null)}>
              <IconClose width={20} height={20} />
            </ActionBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-16 flex-col items-center gap-1 text-white/80">
      <span className="flex h-11 w-11 items-center justify-center rounded-full glass inset-hi">{children}</span>
      <span className="text-[10.5px] font-medium">{label}</span>
    </button>
  );
}
