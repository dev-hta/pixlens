import type { FloatImage } from "../image/types";
import { fitDimensions, imageDataToFloat } from "../image/conversions";

export type Facing = "user" | "environment";

export function cameraSupported(): boolean {
  return !!(
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/**
 * Owns the live `getUserMedia` video stream and extracts bursts of frames for
 * the HDR+ engine. Each captured frame is a fresh noise realisation from the
 * sensor, which is exactly what temporal merging needs to cancel noise.
 */
export class CameraManager {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement;

  constructor() {
    this.video = document.createElement("video");
    this.video.setAttribute("playsinline", "");
    this.video.muted = true;
    this.video.autoplay = true;
  }

  get videoEl(): HTMLVideoElement {
    return this.video;
  }

  get ready(): boolean {
    return !!this.stream && this.video.videoWidth > 0;
  }

  get dimensions(): { width: number; height: number } {
    return { width: this.video.videoWidth, height: this.video.videoHeight };
  }

  async start(facing: Facing): Promise<void> {
    this.stop();
    if (!cameraSupported()) {
      throw new Error("Camera API unavailable in this browser.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facing,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    this.stream = stream;
    this.video.srcObject = stream;
    await this.video.play();
  }

  switchFacing(facing: Facing): Promise<void> {
    return this.start(facing);
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
  }

  /** Capture `count` independent frames at the working resolution. */
  async captureBurst(
    count: number,
    maxLong: number,
    mirror = false
  ): Promise<{ frames: FloatImage[]; dataUrl: string; width: number; height: number }> {
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    if (!vw || !vh) throw new Error("Camera not ready");

    const { width, height } = fitDimensions(vw, vh, maxLong);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    const draw = () => {
      ctx.save();
      if (mirror) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(this.video, 0, 0, width, height);
      ctx.restore();
    };

    const frames: FloatImage[] = [];
    for (let i = 0; i < count; i++) {
      // Wait two animation frames so consecutive captures sample distinct sensor
      // readouts → independent noise (the whole point of burst denoise).
      await nextFrame();
      await nextFrame();
      draw();
      frames.push(imageDataToFloat(ctx.getImageData(0, 0, width, height)));
    }

    draw();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    return { frames, dataUrl, width, height };
  }

  /**
   * Drive the physical lens to focus on a normalised point of interest.
   * Uses the MediaTrack `pointsOfInterest` + `focusMode` constraints where the
   * platform supports them (e.g. Android Chrome). Silently no-ops elsewhere so
   * the on-screen reticle still feels responsive.
   */
  async applyFocus(nx: number, ny: number): Promise<boolean> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track || !track.getCapabilities) return false;
    const caps = track.getCapabilities() as Record<string, unknown>;
    const advanced: Record<string, unknown> = {};
    if ("focusMode" in caps) advanced.focusMode = "manual";
    if ("pointsOfInterest" in caps) {
      const x = nx < 0 ? 0 : nx > 1 ? 1 : nx;
      const y = ny < 0 ? 0 : ny > 1 ? 1 : ny;
      advanced.pointsOfInterest = [{ x, y }];
    }
    if (Object.keys(advanced).length === 0) return false;
    try {
      await track.applyConstraints({ advanced: [advanced] });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply hardware exposure compensation (in EV stops) where supported.
   * Returns false on unsupported platforms so the caller can fall back to the
   * software exposure path.
   */
  async applyExposureCompensation(evStops: number): Promise<boolean> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track || !track.getCapabilities) return false;
    const caps = track.getCapabilities() as {
      exposureCompensation?: { min: number; max: number };
    };
    const cap = caps.exposureCompensation;
    if (!cap) return false;
    const lo = cap.min ?? -3;
    const hi = cap.max ?? 3;
    const v = evStops < lo ? lo : evStops > hi ? hi : evStops;
    const constraint = { exposureCompensation: v } as unknown as MediaTrackConstraintSet;
    try {
      await track.applyConstraints({ advanced: [constraint] });
      return true;
    } catch {
      return false;
    }
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
