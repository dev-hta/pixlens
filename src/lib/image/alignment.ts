import type { FloatImage } from "./types";
import { luma } from "./conversions";

const ALIGN_TARGET = 128; // downsampled long edge for cheap global motion search

export interface Offset {
  dx: number;
  dy: number;
}

/** Luminance plane of an RGBA float image. */
function grayPlane(img: FloatImage): Float32Array {
  const out = new Float32Array(img.width * img.height);
  const d = img.data;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    out[j] = luma(d[i], d[i + 1], d[i + 2]);
  }
  return out;
}

/** Box-average downsample a plane to (sw × sh). */
function downsamplePlane(
  src: Float32Array,
  w: number,
  h: number,
  sw: number,
  sh: number
): Float32Array {
  const out = new Float32Array(sw * sh);
  const xstep = w / sw;
  const ystep = h / sh;
  for (let sy = 0; sy < sh; sy++) {
    const y0 = Math.floor(sy * ystep);
    const y1 = Math.min(h, Math.floor((sy + 1) * ystep));
    for (let sx = 0; sx < sw; sx++) {
      const x0 = Math.floor(sx * xstep);
      const x1 = Math.min(w, Math.floor((sx + 1) * xstep));
      let acc = 0;
      let cnt = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          acc += src[y * w + x];
          cnt++;
        }
      }
      out[sy * sw + sx] = cnt ? acc / cnt : 0;
    }
  }
  return out;
}

function mean(a: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
}

/**
 * Full-search global translation that minimises mean-absolute-difference between
 * a reference and an alternate plane. Returns the best (dx, dy) in plane pixels.
 */
function findTranslation(
  ref: Float32Array,
  alt: Float32Array,
  w: number,
  h: number,
  range: number
): Offset {
  const refMean = mean(ref);
  const altMean = mean(alt);
  let best = Infinity;
  let bx = 0;
  let by = 0;
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      let sad = 0;
      let count = 0;
      for (let y = 0; y < h; y++) {
        const ry = y - dy;
        if (ry < 0 || ry >= h) continue;
        for (let x = 0; x < w; x++) {
          const rx = x - dx;
          if (rx < 0 || rx >= w) continue;
          const diff = alt[y * w + x] - altMean - (ref[ry * w + rx] - refMean);
          sad += diff < 0 ? -diff : diff;
          count++;
        }
      }
      const score = count ? sad / count : Infinity;
      if (score < best) {
        best = score;
        bx = dx;
        by = dy;
      }
    }
  }
  return { dx: bx, dy: by };
}

/**
 * Estimate a per-frame global translation relative to the reference (frame 0).
 * Returns offsets in full-resolution integer pixels.
 */
export function alignBurst(frames: FloatImage[], range: number): Offset[] {
  if (frames.length <= 1) return [{ dx: 0, dy: 0 }];
  const w = frames[0].width;
  const h = frames[0].height;
  const factor = Math.max(w, h) / ALIGN_TARGET;
  const sw = Math.max(8, Math.round(w / factor));
  const sh = Math.max(8, Math.round(h / factor));

  const refDown = downsamplePlane(grayPlane(frames[0]), w, h, sw, sh);
  const offsets: Offset[] = [{ dx: 0, dy: 0 }];

  for (let i = 1; i < frames.length; i++) {
    const altDown = downsamplePlane(grayPlane(frames[i]), w, h, sw, sh);
    const o = findTranslation(refDown, altDown, sw, sh, range);
    offsets.push({ dx: Math.round(o.dx * factor), dy: Math.round(o.dy * factor) });
  }
  return offsets;
}
