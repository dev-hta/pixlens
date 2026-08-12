import type { FloatImage } from "./types";
import { createFloatImage } from "./conversions";
import type { Offset } from "./alignment";

function clampi(v: number, max: number): number {
  return v < 0 ? 0 : v > max ? max : v;
}

/**
 * Robust temporal merge of N aligned frames.
 *
 * For every pixel we gather each frame's contribution at its aligned location,
 * then average with a 2.2σ outlier rejection so moving subjects (ghosts) and
 * transient highlights are rejected — the temporal Wiener spirit of HDR+. The
 * per-pixel averaging cuts sensor noise by ≈ √N while preserving texture.
 */
export function mergeFrames(frames: FloatImage[], offsets: Offset[]): FloatImage {
  const n = frames.length;
  const { width: w, height: h } = frames[0];
  const out = createFloatImage(w, h);

  if (n === 1) {
    out.data.set(frames[0].data);
    return out;
  }

  const buf = new Float32Array(n);
  const xoff = new Int32Array(n);
  const yoff = new Int32Array(n);

  for (let y = 0; y < h; y++) {
    // Precompute per-frame row bases for this y (offsets are constant per frame).
    for (let f = 0; f < n; f++) yoff[f] = clampi(y - offsets[f].dy, h - 1) * w;
    for (let x = 0; x < w; x++) {
      for (let f = 0; f < n; f++) xoff[f] = clampi(x - offsets[f].dx, w - 1);

      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let f = 0; f < n; f++) {
          const idx = (yoff[f] + xoff[f]) * 4 + c;
          const v = frames[f].data[idx];
          buf[f] = v;
          sum += v;
        }
        const mean = sum / n;
        let sum2 = 0;
        for (let f = 0; f < n; f++) {
          const d = buf[f] - mean;
          sum2 += d * d;
        }
        const std = Math.sqrt(sum2 / n);
        const tol = Math.max(0.02, 2.2 * std);
        let acc = 0;
        let cnt = 0;
        for (let f = 0; f < n; f++) {
          const d = buf[f] - mean;
          const ad = d < 0 ? -d : d;
          if (ad <= tol) {
            acc += buf[f];
            cnt++;
          }
        }
        const merged = cnt > 0 ? acc / cnt : mean;
        out.data[(y * w + x) * 4 + c] = merged;
      }
      out.data[(y * w + x) * 4 + 3] = 1;
    }
  }
  return out;
}
