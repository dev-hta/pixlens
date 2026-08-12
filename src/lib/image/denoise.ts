import type { FloatImage, PipelineParams, SensorProfile } from "./types";
import { bilateralPlane, gaussianBlurPlane } from "./filters";

/**
 * Dual-domain denoise.
 *
 *  • Luminance  — separable bilateral filter (edge-preserving): smooths sensor
 *    grain on flat regions while keeping real texture, avoiding the "oil
 *    painting" look of a flat Gaussian.
 *  • Chrominance — a stronger separable Gaussian on Cb/Cr. The eye is far more
 *    sensitive to luminance detail than colour detail, so colour noise can be
 *    aggressively removed without looking soft.
 *
 * The sensor profile scales the effective strength, mirroring GCam's per-sensor
 * `.xml` noise model.
 */
export function denoise(
  img: FloatImage,
  params: PipelineParams,
  profile: SensorProfile
): FloatImage {
  const lumaAmt = params.lumaDenoise / 100;
  const chromaAmt = params.chromaDenoise / 100;
  if (lumaAmt <= 0 && chromaAmt <= 0) return img;

  const w = img.width;
  const h = img.height;
  const n = w * h;
  const Y = new Float32Array(n);
  const Cb = new Float32Array(n);
  const Cr = new Float32Array(n);
  const d = img.data;

  // RGB → YCbCr (BT.601)
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    Y[j] = 0.299 * r + 0.587 * g + 0.114 * b;
    Cb[j] = -0.168736 * r - 0.331264 * g + 0.5 * b;
    Cr[j] = 0.5 * r - 0.418688 * g - 0.081312 * b;
  }

  let Yf: Float32Array = Y;
  if (lumaAmt > 0) {
    const radius = 1 + Math.round(2 * lumaAmt);
    const sigmaS = radius * 0.75;
    const sigmaR = 0.045 + 0.085 * lumaAmt * profile.readNoise;
    Yf = bilateralPlane(Y, w, h, radius, sigmaS, sigmaR);
  }

  let Cbf: Float32Array = Cb;
  let Crf: Float32Array = Cr;
  if (chromaAmt > 0) {
    const radius = 1 + Math.round(3 * chromaAmt);
    const sigma = radius * 0.85 * Math.max(0.6, profile.chromaNoise);
    Cbf = gaussianBlurPlane(Cb, w, h, radius, sigma);
    Crf = gaussianBlurPlane(Cr, w, h, radius, sigma);
  }

  // YCbCr → RGB
  const out = new Float32Array(d.length);
  for (let j = 0, i = 0; j < n; j++, i += 4) {
    const y = Yf[j];
    const cb = Cbf[j];
    const cr = Crf[j];
    let r = y + 1.402 * cr;
    let g = y - 0.344136 * cb - 0.714136 * cr;
    let b = y + 1.772 * cb;
    if (r < 0) r = 0; else if (r > 1) r = 1;
    if (g < 0) g = 0; else if (g > 1) g = 1;
    if (b < 0) b = 0; else if (b > 1) b = 1;
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = 1;
  }

  return { width: w, height: h, data: out };
}
