// Core image-processing types shared across the PixelLens pipeline.

/** A planar-ish float image. RGBA channels interleaved in [0,1] (gamma sRGB). */
export interface FloatImage {
  width: number;
  height: number;
  data: Float32Array; // length = width * height * 4
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Catch mode of a capture. */
export type CaptureMode = "hdr" | "photo";

/** Sensor noise model — analogous to a GCam `.xml` calibration profile. */
export interface SensorProfile {
  id: string;
  name: string;
  /** Read noise baseline (higher = more luminance noise at base ISO). */
  readNoise: number;
  /** Shot-noise scaling factor. */
  shotNoise: number;
  /** Chroma noise floor (color speckle susceptibility). */
  chromaNoise: number;
  /** Per-channel gains to neutralise the sensor's native white balance. */
  neutralGains: RGB;
}

/** All user-adjustable parameters for the computational pipeline. */
export interface PipelineParams {
  // Burst / merge
  burstFrames: number; // N frames captured & merged
  // Denoise (dual-domain)
  lumaDenoise: number; // 0..100 — bilateral strength on luminance
  chromaDenoise: number; // 0..100 — chrominance blur strength
  // Color science
  exposure: number; // -100..100 (mapped to EV stops)
  temperature: number; // -100..100 (cool..warm)
  tint: number; // -100..100 (green..magenta)
  shadows: number; // -100..100
  highlights: number; // -100..100
  contrast: number; // -100..100
  vibrance: number; // -100..100
  saturation: number; // -100..100
  // Detail
  sharpen: number; // 0..100
}

/** Progress event emitted while the pipeline runs. */
export interface PipelineProgress {
  stage: string;
  label: string;
  progress: number; // 0..1 overall
}

/** A finished, processed photograph kept in the in-app gallery. */
export interface Photo {
  id: string;
  dataUrl: string; // processed result (full colour science)
  rawUrl: string; // single-frame original (before processing)
  width: number;
  height: number;
  createdAt: number;
  mode: CaptureMode;
  params: PipelineParams;
  framesMerged: number;
}
