export type Tier = "high" | "mid" | "still";

export interface TierSettings {
  dpr: number;
  starCount: number;
  streakCount: number;
}

// "still" never reaches the GL path at all — VoyageRoot renders StillSky instead of
// SceneRoot — so its zeroed counts are documentation, not a branch anything reads.
export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high:  { dpr: 1.5, starCount: 2400, streakCount: 260 },
  mid:   { dpr: 1,   starCount: 1200, streakCount: 120 },
  still: { dpr: 1,   starCount: 0,    streakCount: 0   },
};

export interface QualityEnv {
  isMobile: boolean;
  reducedMotion: boolean;
  webgl: boolean;
}

export function selectTier(env: QualityEnv): Tier {
  if (env.reducedMotion || !env.webgl) return "still";
  return env.isMobile ? "mid" : "high";
}

export const PROBE_MIN_FPS = 45;

/** `null`/non-finite fps means the probe was inconclusive — keep the tier as-is. */
export function probeDemote(tier: Tier, fps: number | null): Tier {
  if (fps === null || !Number.isFinite(fps)) return tier;
  if (fps >= PROBE_MIN_FPS) return tier;
  if (tier === "high") return "mid";
  return "still";
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    // Release the probe context immediately; browsers cap live WebGL contexts.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/** Browser-only; on the server it reports the most conservative env (→ "still"). */
export function detectEnv(): QualityEnv {
  if (typeof window === "undefined") {
    return { isMobile: false, reducedMotion: true, webgl: false };
  }
  return {
    isMobile: window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: hasWebGL(),
  };
}

/**
 * Browser-only. Counts rAF ticks for `durationMs` and resolves the average fps.
 *
 * Resolves `null` ("inconclusive", never demote) when there is no document, when the
 * tab is already hidden, or when the tab goes hidden mid-probe: rAF is throttled or
 * paused in background tabs, so those samples would report a bogus ~0 fps.
 */
export function runFpsProbe(durationMs = 1000): Promise<number | null> {
  if (typeof document === "undefined" || document.hidden) return Promise.resolve(null);
  return new Promise((resolve) => {
    let frames = 0;
    let done = false;
    const start = performance.now();
    // Guarded so a visibilitychange and a rAF tick can't both settle the promise.
    const finish = (fps: number | null) => {
      if (done) return;
      done = true;
      document.removeEventListener("visibilitychange", onVisibility);
      resolve(fps);
    };
    const onVisibility = () => {
      if (document.hidden) finish(null);
    };
    const tick = (now: number) => {
      if (done) return;
      frames++;
      if (now - start >= durationMs) {
        finish((frames * 1000) / (now - start));
        return;
      }
      requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVisibility);
    requestAnimationFrame(tick);
  });
}
