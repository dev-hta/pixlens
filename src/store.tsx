import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CaptureMode,
  FloatImage,
  Photo,
  PipelineParams,
  PipelineProgress,
  SensorProfile,
} from "./lib/image/types";
import {
  DEFAULT_PARAMS,
  DEFAULT_PROFILE_ID,
  MAX_LONG_EDGE,
  SENSOR_PROFILES,
} from "./lib/config";
import { CameraManager, cameraSupported, type Facing } from "./lib/camera/cameraManager";
import { runPipeline, finishFromMerged } from "./lib/image/pipeline";
import { floatToDataUrl, imageToFloat } from "./lib/image/conversions";

export type Screen = "viewfinder" | "processing" | "review";
export type CameraStatus = "idle" | "starting" | "live" | "denied" | "unsupported" | "error";

export interface ReviewData {
  rawUrl: string;
  processedUrl: string;
  width: number;
  height: number;
  framesMerged: number;
  mode: CaptureMode;
}

interface AppContextValue {
  screen: Screen;
  mode: CaptureMode;
  facing: Facing;
  profileId: string;
  params: PipelineParams;
  cameraStatus: CameraStatus;
  cameraMessage: string;
  progress: PipelineProgress | null;
  review: ReviewData | null;
  gallery: Photo[];
  showAdjust: boolean;
  reprocessing: boolean;
  camera: CameraManager;
  profile: SensorProfile;

  setMode: (m: CaptureMode) => void;
  toggleFacing: () => void;
  setProfile: (id: string) => void;
  setParam: (key: keyof PipelineParams, value: number) => void;
  resetParams: () => void;

  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capture: () => Promise<void>;
  processSource: (src: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;

  openAdjust: () => void;
  closeAdjust: () => void;
  backToViewfinder: () => void;
  downloadCurrent: () => void;
  shareCurrent: () => Promise<void>;
  removePhoto: (id: string) => void;
  clearGallery: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function profileById(id: string): SensorProfile {
  return SENSOR_PROFILES.find((p) => p.id === id) ?? SENSOR_PROFILES[0];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const cameraRef = useRef<CameraManager | null>(null);
  if (!cameraRef.current) cameraRef.current = new CameraManager();
  const camera = cameraRef.current;

  const mergedRef = useRef<FloatImage | null>(null);
  const reprocessTimer = useRef<number | null>(null);
  const facingRef = useRef<Facing>("environment");
  const paramsRef = useRef<PipelineParams>(DEFAULT_PARAMS);
  const profileIdRef = useRef<string>(DEFAULT_PROFILE_ID);
  const reviewRef = useRef<ReviewData | null>(null);

  const [screen, setScreen] = useState<Screen>("viewfinder");
  const [mode, setMode] = useState<CaptureMode>("hdr");
  const [facing, setFacing] = useState<Facing>("environment");
  const [profileId, setProfileId] = useState<string>(DEFAULT_PROFILE_ID);
  const [params, setParams] = useState<PipelineParams>(DEFAULT_PARAMS);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameraMessage, setCameraMessage] = useState("");
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [gallery, setGallery] = useState<Photo[]>([]);
  const [showAdjust, setShowAdjust] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  facingRef.current = facing;
  paramsRef.current = params;
  profileIdRef.current = profileId;
  reviewRef.current = review;

  const profile = useMemo(() => profileById(profileId), [profileId]);

  const stopCamera = useCallback(() => {
    camera.stop();
    setCameraStatus("idle");
  }, [camera]);

  const startCamera = useCallback(async () => {
    if (!cameraSupported()) {
      setCameraStatus("unsupported");
      setCameraMessage("No camera on this device — upload a photo or try a sample instead.");
      return;
    }
    setCameraStatus("starting");
    setCameraMessage("");
    try {
      await camera.start(facingRef.current);
      setCameraStatus("live");
    } catch (e) {
      const err = e as DOMException;
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        setCameraStatus("denied");
        setCameraMessage("Camera access was blocked. Allow permission or upload a photo.");
      } else {
        setCameraStatus("error");
        setCameraMessage(err.message || "Could not start the camera.");
      }
    }
  }, [camera]);

  const toggleFacing = useCallback(() => {
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }, []);

  const commitPhoto = useCallback(
    (
      rawUrl: string,
      processed: FloatImage,
      width: number,
      height: number,
      framesMerged: number,
      usedMode: CaptureMode,
      usedParams: PipelineParams
    ) => {
      const processedUrl = floatToDataUrl(processed);
      const photo: Photo = {
        id: uid(),
        dataUrl: processedUrl,
        rawUrl,
        width,
        height,
        createdAt: Date.now(),
        mode: usedMode,
        params: { ...usedParams },
        framesMerged,
      };
      setReview({
        rawUrl,
        processedUrl,
        width,
        height,
        framesMerged,
        mode: usedMode,
      });
      setGallery((g) => [photo, ...g].slice(0, 30));
      setScreen("review");
    },
    []
  );

  const capture = useCallback(async () => {
    if (cameraStatus !== "live") return;
    setScreen("processing");
    setProgress(null);
    try {
      const count = mode === "hdr" ? paramsRef.current.burstFrames : 1;
      const mirror = facingRef.current === "user";
      const { frames, dataUrl, width, height } = await camera.captureBurst(
        count,
        MAX_LONG_EDGE,
        mirror
      );
      const prof = profileById(profileIdRef.current);
      const res = await runPipeline({ frames, params: paramsRef.current, profile: prof }, (p) =>
        setProgress(p)
      );
      mergedRef.current = res.merged;
      stopCamera();
      commitPhoto(dataUrl, res.processed, width, height, res.framesMerged, mode, paramsRef.current);
    } catch (e) {
      console.error(e);
      setScreen("viewfinder");
      setCameraStatus("error");
      setCameraMessage((e as Error).message || "Capture failed.");
    }
  }, [camera, cameraStatus, mode, commitPhoto, stopCamera]);

  const processSource = useCallback(
    async (src: string) => {
      setScreen("processing");
      setProgress(null);
      try {
        const loaded = await imageToFloat(src, MAX_LONG_EDGE);
        const prof = profileById(profileIdRef.current);
        const res = await runPipeline(
          { frames: [loaded.float], params: paramsRef.current, profile: prof },
          (p) => setProgress(p)
        );
        mergedRef.current = res.merged;
        commitPhoto(loaded.dataUrl, res.processed, loaded.width, loaded.height, 1, "hdr", paramsRef.current);
      } catch (e) {
        console.error(e);
        setScreen("viewfinder");
        setCameraMessage((e as Error).message || "Could not load that image.");
      }
    },
    [commitPhoto]
  );

  const onUploadFile = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      try {
        await processSource(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [processSource]
  );

  // Live re-processing when an adjustment changes (debounced, merge cached).
  const scheduleReprocess = useCallback((nextParams: PipelineParams, pid: string) => {
    if (!mergedRef.current || reviewRef.current == null) return;
    if (reprocessTimer.current) window.clearTimeout(reprocessTimer.current);
    setReprocessing(true);
    reprocessTimer.current = window.setTimeout(async () => {
      const prof = profileById(pid);
      const processed = await finishFromMerged(mergedRef.current!, nextParams, prof);
      const url = floatToDataUrl(processed);
      setReview((r) => (r ? { ...r, processedUrl: url } : r));
      setGallery((g) =>
        g.length && g[0]
          ? [{ ...g[0], dataUrl: url, params: { ...nextParams } }, ...g.slice(1)]
          : g
      );
      setReprocessing(false);
    }, 200);
  }, []);

  const setParam = useCallback(
    (key: keyof PipelineParams, value: number) => {
      setParams((prev) => {
        const next = { ...prev, [key]: value };
        scheduleReprocess(next, profileIdRef.current);
        return next;
      });
    },
    [scheduleReprocess]
  );

  const setProfile = useCallback(
    (id: string) => {
      setProfileId(id);
      scheduleReprocess(paramsRef.current, id);
    },
    [scheduleReprocess]
  );

  const resetParams = useCallback(() => {
    setParams((prev) => {
      const next = { ...DEFAULT_PARAMS, burstFrames: prev.burstFrames };
      scheduleReprocess(next, profileIdRef.current);
      return next;
    });
  }, [scheduleReprocess]);

  const openAdjust = useCallback(() => setShowAdjust(true), []);
  const closeAdjust = useCallback(() => setShowAdjust(false), []);

  const backToViewfinder = useCallback(() => {
    if (reprocessTimer.current) window.clearTimeout(reprocessTimer.current);
    setReprocessing(false);
    setShowAdjust(false);
    mergedRef.current = null;
    setReview(null);
    setScreen("viewfinder");
  }, []);

  const removePhoto = useCallback(
    (id: string) => setGallery((g) => g.filter((p) => p.id !== id)),
    []
  );
  const clearGallery = useCallback(() => setGallery([]), []);

  const downloadCurrent = useCallback(() => {
    if (!review) return;
    const a = document.createElement("a");
    a.href = review.processedUrl;
    a.download = `pixellens-${uid()}.jpg`;
    a.click();
  }, [review]);

  const shareCurrent = useCallback(async () => {
    if (!review) return;
    try {
      const blob = await (await fetch(review.processedUrl)).blob();
      const file = new File([blob], "pixellens.jpg", { type: "image/jpeg" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files: File[]; title?: string }) => Promise<void>;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "PixelLens" });
        return;
      }
    } catch {
      /* fall through to download */
    }
    downloadCurrent();
  }, [review, downloadCurrent]);

  useEffect(() => {
    return () => {
      camera.stop();
      if (reprocessTimer.current) window.clearTimeout(reprocessTimer.current);
    };
  }, [camera]);

  const value: AppContextValue = {
    screen,
    mode,
    facing,
    profileId,
    params,
    cameraStatus,
    cameraMessage,
    progress,
    review,
    gallery,
    showAdjust,
    reprocessing,
    camera,
    profile,
    setMode,
    toggleFacing,
    setProfile,
    setParam,
    resetParams,
    startCamera,
    stopCamera,
    capture,
    processSource,
    onUploadFile,
    openAdjust,
    closeAdjust,
    backToViewfinder,
    downloadCurrent,
    shareCurrent,
    removePhoto,
    clearGallery,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
