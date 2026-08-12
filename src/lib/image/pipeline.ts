import type { FloatImage, PipelineParams, PipelineProgress, SensorProfile } from "./types";
import { alignBurst } from "./alignment";
import { mergeFrames } from "./merge";
import { denoise } from "./denoise";
import { applyColorScience } from "./tonemap";
import { sharpen } from "./sharpen";

export interface PipelineInput {
  frames: FloatImage[];
  params: PipelineParams;
  profile: SensorProfile;
}

export interface PipelineResult {
  processed: FloatImage;
  raw: FloatImage;
  merged: FloatImage;
  framesMerged: number;
}

/** Yield to the event loop so the UI thread can paint progress between stages. */
const yield_ = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function emit(onProgress: ((p: PipelineProgress) => void) | undefined, p: PipelineProgress) {
  if (onProgress) onProgress(p);
}

/**
 * Fast finishing pass: denoise → color science → sharpen. Reused by the Adjust
 * panel so live edits never have to re-align / re-merge the burst.
 */
export async function finishFromMerged(
  merged: FloatImage,
  params: PipelineParams,
  profile: SensorProfile,
  onProgress?: (p: PipelineProgress) => void
): Promise<FloatImage> {
  emit(onProgress, { stage: "denoise", label: "Dual-domain denoise", progress: 0.2 });
  await yield_();
  const denoised = denoise(merged, params, profile);

  emit(onProgress, { stage: "tone", label: "Google color science", progress: 0.55 });
  await yield_();
  const toned = applyColorScience(denoised, params, profile);

  emit(onProgress, { stage: "sharpen", label: "Detail sharpening", progress: 0.85 });
  await yield_();
  const processed = sharpen(toned, params.sharpen);

  emit(onProgress, { stage: "done", label: "Finalizing", progress: 1 });
  return processed;
}

/**
 * Full HDR+ → denoise → color-science → sharpen pipeline. Each stage yields back
 * to the UI thread so progress can be reported and the interface never freezes.
 */
export async function runPipeline(
  input: PipelineInput,
  onProgress?: (p: PipelineProgress) => void
): Promise<PipelineResult> {
  const { frames, params, profile } = input;
  const raw = frames[0];

  emit(onProgress, { stage: "align", label: "Aligning burst", progress: 0.05 });
  await yield_();
  const offsets = alignBurst(frames, 4);

  emit(onProgress, { stage: "merge", label: `Merging ${frames.length} frames`, progress: 0.22 });
  await yield_();
  const merged = mergeFrames(frames, offsets);

  const processed = await finishFromMerged(merged, params, profile, (p) => {
    // remap the 0.2..1 finishing progress into the 0.4..1 overall band
    emit(onProgress, {
      stage: p.stage,
      label: p.label,
      progress: 0.4 + p.progress * 0.6,
    });
  });

  return { processed, raw, merged, framesMerged: frames.length };
}
