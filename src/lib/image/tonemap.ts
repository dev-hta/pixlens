import type { FloatImage, PipelineParams, SensorProfile } from "./types";
import { clamp01 } from "./conversions";

/**
 * PixelLens color science — a single-pass approximation of the GCam look:
 *
 *   1. White balance  (temperature + tint, biased by the sensor's neutral gains)
 *   2. Exposure       (gain in stops)
 *   3. Tone           (shadow lift, highlight recovery, S-curve contrast — all
 *                      applied on luminance and rescaled onto the channels so
 *                      hue/saturation are preserved)
 *   4. Vibrance       (selective saturation that boosts drab colours more than
 *                      already-saturated ones, with skin-tone protection)
 *   5. Saturation     (global colour intensity)
 */
export function applyColorScience(
  img: FloatImage,
  params: PipelineParams,
  profile: SensorProfile
): FloatImage {
  const d = img.data;
  const out = new Float32Array(d.length);

  // --- White balance ---------------------------------------------------------
  const tempT = params.temperature / 100; // -1..1 (cool..warm)
  const tintT = params.tint / 100; // -1..1 (green..magenta)
  let rGain = (1 + tempT * 0.16) * (1 + tintT * 0.06) * profile.neutralGains.r;
  let gGain = (1 - tintT * 0.10) * profile.neutralGains.g;
  let bGain = (1 - tempT * 0.16) * (1 + tintT * 0.06) * profile.neutralGains.b;
  // normalise so the green channel ≈ 1 keeps overall brightness stable
  const gn = Math.cbrt(rGain * gGain * bGain);
  rGain /= gn;
  gGain /= gn;
  bGain /= gn;

  // --- Exposure --------------------------------------------------------------
  const exposureFactor = Math.pow(2, (params.exposure / 100) * 2.0);
  rGain *= exposureFactor;
  gGain *= exposureFactor;
  bGain *= exposureFactor;

  // --- Tone ------------------------------------------------------------------
  const sh = params.shadows / 100; // -1..1
  const hi = params.highlights / 100; // -1..1 (positive = recover)
  const co = params.contrast / 100; // -1..1
  const contrastK = 1 + co * 0.9;

  // --- Colour ----------------------------------------------------------------
  const vibAmt = params.vibrance / 100; // -1..1
  const satAmt = params.saturation / 100; // -1..1
  const useVib = vibAmt !== 0;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * rGain;
    let g = d[i + 1] * gGain;
    let b = d[i + 2] * bGain;

    // Tone on luminance
    let y = 0.299 * r + 0.587 * g + 0.114 * b;
    const yc = y < 0 ? 0 : y > 1 ? 1 : y;
    let ny = yc + sh * 0.6 * (1 - yc) * (1 - yc) - hi * 0.6 * yc * yc;
    ny = 0.5 + (ny - 0.5) * contrastK;
    ny = ny < 0 ? 0 : ny > 1 ? 1 : ny;

    const s = y > 1e-4 ? ny / y : ny;
    r *= s;
    g *= s;
    b *= s;
    if (y <= 1e-4) {
      r = g = b = ny;
    }

    // Vibrance + saturation
    if (useVib || satAmt !== 0) {
      const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
      const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
      const sat = mx > 0 ? (mx - mn) / mx : 0;

      if (useVib) {
        let boost = vibAmt >= 0 ? vibAmt * (1 - sat) : vibAmt;
        // Skin-tone protection: back off the boost on warm, mid-saturation skin hues.
        if (boost > 0 && mn > 0.05) {
          const delta = mx - mn;
          if (delta > 1e-3) {
            let hue: number;
            if (mx === r) hue = 60 * (((g - b) / delta) % 6);
            else if (mx === g) hue = 60 * ((b - r) / delta + 2);
            else hue = 60 * ((r - g) / delta + 4);
            if (hue < 0) hue += 360;
            const val = mx;
            if (hue >= 5 && hue <= 60 && sat <= 0.7 && val >= 0.25 && val <= 1.0) {
              boost *= 0.45;
            }
          }
        }
        const center = 0.299 * r + 0.587 * g + 0.114 * b;
        r = center + (r - center) * (1 + boost);
        g = center + (g - center) * (1 + boost);
        b = center + (b - center) * (1 + boost);
      }

      if (satAmt !== 0) {
        const gray = (r + g + b) / 3;
        r = gray + (r - gray) * (1 + satAmt);
        g = gray + (g - gray) * (1 + satAmt);
        b = gray + (b - gray) * (1 + satAmt);
      }

      r = clamp01(r);
      g = clamp01(g);
      b = clamp01(b);
    }

    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = 1;
  }

  return { width: img.width, height: img.height, data: out };
}
