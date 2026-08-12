import type { FloatImage } from "./types";

/** sRGB (0..1) → linear light. */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Linear light → sRGB (0..1). */
export function linearToSrgb(c: number): number {
  const x = c < 0 ? 0 : c > 1 ? 1 : c;
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

export function createFloatImage(width: number, height: number): FloatImage {
  return { width, height, data: new Float32Array(width * height * 4) };
}

/** Copy a FloatImage (shallow data clone). */
export function cloneFloatImage(img: FloatImage): FloatImage {
  return { width: img.width, height: img.height, data: Float32Array.from(img.data) };
}

/** ImageData (Uint8) → FloatImage in [0,1] gamma sRGB. */
export function imageDataToFloat(img: ImageData): FloatImage {
  const out = createFloatImage(img.width, img.height);
  const d = img.data;
  const o = out.data;
  for (let i = 0; i < d.length; i += 4) {
    o[i] = d[i] / 255;
    o[i + 1] = d[i + 1] / 255;
    o[i + 2] = d[i + 2] / 255;
    o[i + 3] = d[i + 3] / 255;
  }
  return out;
}

/** FloatImage [0,1] → ImageData (Uint8, clamped). */
export function floatToImageData(img: FloatImage): ImageData {
  const out = new Uint8ClampedArray(img.data.length);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    out[i] = clamp8(d[i] * 255);
    out[i + 1] = clamp8(d[i + 1] * 255);
    out[i + 2] = clamp8(d[i + 2] * 255);
    out[i + 3] = 255;
  }
  return new ImageData(out, img.width, img.height);
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Largest dimension scaled so the long edge equals `maxLong` (never upscales). */
export function fitDimensions(
  w: number,
  h: number,
  maxLong: number
): { width: number; height: number } {
  const long = Math.max(w, h);
  if (long <= maxLong) return { width: w, height: h };
  const s = maxLong / long;
  return { width: Math.round(w * s), height: Math.round(h * s) };
}

/** Load any image source into an <img>. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export interface LoadedImage {
  float: FloatImage;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Decode an image source into a FloatImage at a capped working resolution.
 * Returns the float buffer plus a data URL of that exact frame (the "raw").
 */
export function imageToFloat(src: string, maxLong: number): Promise<LoadedImage> {
  return loadImage(src).then((img) => {
    const { width, height } = fitDimensions(img.naturalWidth, img.naturalHeight, maxLong);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, width, height);
    const id = ctx.getImageData(0, 0, width, height);
    return {
      float: imageDataToFloat(id),
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      width,
      height,
    };
  });
}

/** Render a FloatImage to a JPEG data URL. */
export function floatToDataUrl(img: FloatImage, quality = 0.92): string {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(floatToImageData(img), 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Compute luma of an RGB triple (BT.601). */
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
