import type { FloatImage } from "./types";
import { clamp01, luma } from "./conversions";
import { gaussianBlurPlane } from "./filters";

/**
 * Unsharp-mask detail enhancement on luminance.
 *
 * highpass = luma − gaussian(luma); the sharpened luma adds a scaled copy back,
 * but only where the detail exceeds a small threshold so sensor noise isn't
 * amplified. Channels are rescaled by the luma ratio to keep colours stable.
 */
export function sharpen(img: FloatImage, amount: number): FloatImage {
  const amt = amount / 100; // 0..1
  if (amt <= 0) return img;

  const w = img.width;
  const h = img.height;
  const n = w * h;
  const d = img.data;

  const Y = new Float32Array(n);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    Y[j] = luma(d[i], d[i + 1], d[i + 2]);
  }
  const Yb = gaussianBlurPlane(Y, w, h, 1, 1.0);

  const threshold = 0.012;
  const factor = 0.4 + amt * 1.7;

  const out = new Float32Array(d.length);
  for (let j = 0, i = 0; j < n; j++, i += 4) {
    const raw = Y[j] - Yb[j];
    const highpass = (raw < 0 ? -raw : raw) < threshold ? 0 : raw;
    const ys = Y[j] + factor * highpass;
    const s = Y[j] > 1e-4 ? ys / Y[j] : 1;
    out[i] = clamp01(d[i] * s);
    out[i + 1] = clamp01(d[i + 1] * s);
    out[i + 2] = clamp01(d[i + 2] * s);
    out[i + 3] = 1;
  }
  return { width: w, height: h, data: out };
}
