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

  /**
   * Start the camera with a robust strategy that always selects the PRIMARY
   * (main / wide) sensor — never ultra-wide, telephoto, or macro — regardless
   * of phone model.
   *
   * Strategy for "environment" (rear) facing:
   *   1. Enumerate devices → pick the **first** rear-facing camera (OS always
   *      lists the primary sensor first) → request by exact `deviceId`.
   *   2. Fallback: `facingMode: { exact: "environment" }` — strict constraint.
   *   3. Fallback: `facingMode: "environment"` — soft preference.
   *
   * For "user" (front) facing, a soft preference is sufficient since phones
   * typically have only one front camera.
   */
  async start(facing: Facing): Promise<void> {
    this.stop();
    if (!cameraSupported()) {
      throw new Error("Camera API unavailable in this browser.");
    }

    const baseVideo: MediaTrackConstraints = {
      width: { ideal: 4032 },
      height: { ideal: 3024 },
    };

    if (facing === "environment") {
      // Try to get the primary rear camera by deviceId first
      const primaryId = await this.findPrimaryRearCamera();
      const attempts: MediaTrackConstraints[] = [];

      if (primaryId) {
        // Attempt 1: exact deviceId of the first rear camera (= main sensor)
        attempts.push({ ...baseVideo, deviceId: { exact: primaryId } });
      }
      // Attempt 2: strict rear constraint
      attempts.push({ ...baseVideo, facingMode: { exact: "environment" } });
      // Attempt 3: soft preference (last resort)
      attempts.push({ ...baseVideo, facingMode: "environment" });

      let stream: MediaStream | null = null;
      for (const videoConstraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
          break;
        } catch {
          // Try next constraint set
        }
      }
      if (!stream) {
        throw new Error("Could not access the rear camera.");
      }
      this.stream = stream;
    } else {
      // Front camera — soft preference is fine
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { ...baseVideo, facingMode: "user" },
        audio: false,
      });
      this.stream = stream;
    }

    this.video.srcObject = this.stream;
    await this.video.play();
  }

  /**
   * Enumerate video input devices and return the deviceId of the first
   * rear-facing ("environment") camera. The OS and browser consistently list
   * the primary / main sensor first, so the first match is always the one we
   * want. Returns `null` if enumeration is unavailable or no rear camera is
   * found.
   */
  private async findPrimaryRearCamera(): Promise<string | null> {
    try {
      // We need a temporary stream to get labelled device info on some browsers
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Stop the temp stream immediately
      tempStream.getTracks().forEach((t) => t.stop());

      const rearCameras = devices.filter(
        (d) =>
          d.kind === "videoinput" &&
          // Check label for rear/back/environment hints
          (/back|rear|environment/i.test(d.label) ||
            // On Android Chrome, the facing mode info may be in the label
            /camera\s*0/i.test(d.label) ||
            // Samsung labels like "Camera 1, facing back"
            /facing back/i.test(d.label))
      );

      if (rearCameras.length > 0) {
        return rearCameras[0].deviceId;
      }

      // If no label match, try to identify by getting capabilities
      // The first videoinput is almost always the primary camera
      const allVideoInputs = devices.filter((d) => d.kind === "videoinput");
      if (allVideoInputs.length > 0) {
        return allVideoInputs[0].deviceId;
      }
    } catch {
      // Enumeration failed — caller will fall back to facingMode constraints
    }
    return null;
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
