// Separable 1D filters operating on single-channel Float32 planes.
// Separable bilateral = horizontal pass then vertical pass — a fast, well-known
// approximation of the O(n^2) joint filter that still preserves edges.

function clampi(v: number, max: number): number {
  return v < 0 ? 0 : v > max ? max : v;
}

function gaussianKernel(radius: number, sigma: number): Float32Array {
  const size = radius * 2 + 1;
  const k = new Float32Array(size);
  const s2 = 2 * sigma * sigma;
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const w = Math.exp(-(i * i) / s2);
    k[i + radius] = w;
    sum += w;
  }
  for (let i = 0; i < size; i++) k[i] /= sum;
  return k;
}

/** Separable Gaussian blur on a single channel plane. */
export function gaussianBlurPlane(
  src: Float32Array,
  w: number,
  h: number,
  radius: number,
  sigma: number
): Float32Array {
  if (radius <= 0) return Float32Array.from(src);
  const kernel = gaussianKernel(radius, sigma);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  // Horizontal
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        acc += src[row + clampi(x + k, w - 1)] * kernel[k + radius];
      }
      tmp[row + x] = acc;
    }
  }
  // Vertical
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        acc += tmp[clampi(y + k, h - 1) * w + x] * kernel[k + radius];
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

/**
 * Separable bilateral filter on a single channel plane.
 * sigmaS = spatial sigma, sigmaR = range (intensity) sigma.
 */
export function bilateralPlane(
  src: Float32Array,
  w: number,
  h: number,
  radius: number,
  sigmaS: number,
  sigmaR: number
): Float32Array {
  if (radius <= 0) return Float32Array.from(src);
  const sKernel = gaussianKernel(radius, sigmaS);
  const r2 = 2 * sigmaR * sigmaR;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const c = src[row + x];
      let acc = 0;
      let wsum = 0;
      for (let k = -radius; k <= radius; k++) {
        const xi = clampi(x + k, w - 1);
        const v = src[row + xi];
        const diff = v - c;
        const wt = sKernel[k + radius] * Math.exp(-(diff * diff) / r2);
        acc += v * wt;
        wsum += wt;
      }
      tmp[row + x] = acc / wsum;
    }
  }
  // Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const c = tmp[y * w + x];
      let acc = 0;
      let wsum = 0;
      for (let k = -radius; k <= radius; k++) {
        const yi = clampi(y + k, h - 1);
        const v = tmp[yi * w + x];
        const diff = v - c;
        const wt = sKernel[k + radius] * Math.exp(-(diff * diff) / r2);
        acc += v * wt;
        wsum += wt;
      }
      out[y * w + x] = acc / wsum;
    }
  }
  return out;
}

/** Build a single-channel plane from an interleaved RGBA float image. */
export function extractChannel(img: { data: Float32Array }, channel: number): Float32Array {
  const out = new Float32Array(img.data.length / 4);
  for (let i = 0, j = 0; i < img.data.length; i += 4, j++) {
    out[j] = img.data[i + channel];
  }
  return out;
}

/** Write a plane back into one channel of an interleaved RGBA float image. */
export function writeChannel(img: { data: Float32Array }, channel: number, plane: Float32Array): void {
  for (let i = 0, j = 0; i < img.data.length; i += 4, j++) {
    img.data[i + channel] = plane[j];
  }
}
