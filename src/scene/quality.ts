export type Tier = "high" | "mid" | "still";

export interface TierSettings {
  dpr: number;
  starCount: number;
  streakCount: number;
  bloom: boolean;
  animate: boolean;
}

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high:  { dpr: 1.5, starCount: 2400, streakCount: 260, bloom: true,  animate: true },
  mid:   { dpr: 1,   starCount: 1200, streakCount: 120, bloom: false, animate: true },
  still: { dpr: 1,   starCount: 0,    streakCount: 0,   bloom: false, animate: false },
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

export function probeDemote(tier: Tier, fps: number): Tier {
  if (fps >= PROBE_MIN_FPS) return tier;
  if (tier === "high") return "mid";
  return "still";
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Browser-only. */
export function detectEnv(): QualityEnv {
  return {
    isMobile: window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: hasWebGL(),
  };
}

/** Browser-only. Counts rAF ticks for `durationMs` and resolves the average fps. */
export function runFpsProbe(durationMs = 1000): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - start >= durationMs) {
        resolve((frames * 1000) / (now - start));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
