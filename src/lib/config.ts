import type { PipelineParams, SensorProfile } from "./image/types";

/**
 * Sensor profiles — the PixelLens equivalent of GCam `.xml` noise-model files.
 * Each profile biases the denoise stage toward how noisy a given sensor is.
 */
export const SENSOR_PROFILES: SensorProfile[] = [
  {
    id: "iphone13",
    name: "iPhone 13 · Main",
    readNoise: 1.0,
    shotNoise: 1.0,
    chromaNoise: 1.0,
    neutralGains: { r: 1.0, g: 1.0, b: 1.0 },
  },
  {
    id: "pixel",
    name: "Pixel-class · Wide",
    readNoise: 0.82,
    shotNoise: 0.9,
    chromaNoise: 0.78,
    neutralGains: { r: 1.02, g: 1.0, b: 0.97 },
  },
  {
    id: "lowlight",
    name: "Low-light · High ISO",
    readNoise: 1.8,
    shotNoise: 1.5,
    chromaNoise: 1.9,
    neutralGains: { r: 1.0, g: 1.0, b: 1.0 },
  },
];

export const DEFAULT_PROFILE_ID = "iphone13";

/** GCam-inspired defaults: natural, clean, punchy but restrained. */
export const DEFAULT_PARAMS: PipelineParams = {
  burstFrames: 6,
  lumaDenoise: 34,
  chromaDenoise: 52,
  exposure: 0,
  temperature: 6,
  tint: 0,
  shadows: 22,
  highlights: 30,
  contrast: 14,
  vibrance: 18,
  saturation: 0,
  sharpen: 28,
};

/** A flat list used to render the adjustment sliders in the UI. */
export interface ParamControl {
  key: keyof Omit<PipelineParams, "burstFrames">;
  label: string;
  min: number;
  max: number;
  step: number;
  group: "Detail" | "Light" | "Color";
  icon: string;
}

export const PARAM_CONTROLS: ParamControl[] = [
  { key: "exposure", label: "Exposure", min: -100, max: 100, step: 1, group: "Light", icon: "☀" },
  { key: "highlights", label: "Highlights", min: -100, max: 100, step: 1, group: "Light", icon: "▹" },
  { key: "shadows", label: "Shadows", min: -100, max: 100, step: 1, group: "Light", icon: "◃" },
  { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1, group: "Light", icon: "◐" },
  { key: "temperature", label: "Warmth", min: -100, max: 100, step: 1, group: "Color", icon: "🌡" },
  { key: "tint", label: "Tint", min: -100, max: 100, step: 1, group: "Color", icon: "✦" },
  { key: "vibrance", min: -100, max: 100, step: 1, label: "Vibrance", group: "Color", icon: "✺" },
  { key: "saturation", min: -100, max: 100, step: 1, label: "Saturation", group: "Color", icon: "◉" },
  { key: "lumaDenoise", min: 0, max: 100, step: 1, label: "Luma Denoise", group: "Detail", icon: "∿" },
  { key: "chromaDenoise", min: 0, max: 100, step: 1, label: "Color Denoise", group: "Detail", icon: "❂" },
  { key: "sharpen", min: 0, max: 100, step: 1, label: "Sharpen", group: "Detail", icon: "◈" },
];

/** Grouped, in display order. */
export const PARAM_GROUPS: Array<"Light" | "Color" | "Detail"> = ["Light", "Color", "Detail"];

/** Maximum long-edge resolution the pipeline works at (keeps it interactive). */
export const MAX_LONG_EDGE = 1440;
