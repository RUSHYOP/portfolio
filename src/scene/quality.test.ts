import { describe, it, expect, vi, afterEach } from "vitest";
import { selectTier, probeDemote, detectEnv, runFpsProbe, TIER_SETTINGS } from "./quality";

// Every stub must be torn down: the server-branch detectEnv/runFpsProbe cases below
// assert that `window`/`document` are absent.
afterEach(() => vi.unstubAllGlobals());

describe("selectTier", () => {
  it("returns still when reduced motion is requested", () => {
    expect(selectTier({ isMobile: false, reducedMotion: true, webgl: true })).toBe("still");
    expect(selectTier({ isMobile: true, reducedMotion: true, webgl: true })).toBe("still");
  });
  it("returns still when WebGL is unavailable", () => {
    expect(selectTier({ isMobile: false, reducedMotion: false, webgl: false })).toBe("still");
  });
  it("returns mid on mobile and high on desktop", () => {
    expect(selectTier({ isMobile: true, reducedMotion: false, webgl: true })).toBe("mid");
    expect(selectTier({ isMobile: false, reducedMotion: false, webgl: true })).toBe("high");
  });
});

describe("probeDemote", () => {
  it("demotes exactly one tier below 45 fps", () => {
    expect(probeDemote("high", 44.9)).toBe("mid");
    expect(probeDemote("mid", 30)).toBe("still");
    expect(probeDemote("still", 10)).toBe("still");
  });
  it("keeps the tier at or above 45 fps", () => {
    expect(probeDemote("high", 45)).toBe("high");
    expect(probeDemote("mid", 60)).toBe("mid");
  });
  it("keeps the tier when the probe is inconclusive", () => {
    expect(probeDemote("high", null)).toBe("high");
    expect(probeDemote("mid", NaN)).toBe("mid");
  });
});

describe("detectEnv", () => {
  it("falls back to the still tier when there is no window (server)", () => {
    expect(detectEnv()).toEqual({ isMobile: false, reducedMotion: true, webgl: false });
    expect(selectTier(detectEnv())).toBe("still");
  });

  /** Stub the browser globals detectEnv reads. `reduce` drives prefers-reduced-motion;
   *  `webgl` false means getContext yields nothing for either context id. */
  const stubBrowser = (opts: { reduce: boolean; webgl: boolean }) => {
    vi.stubGlobal("window", {
      innerWidth: 500,
      matchMedia: (q: string) => ({ matches: q.includes("reduce") ? opts.reduce : q.includes("pointer: coarse") }),
    });
    vi.stubGlobal("document", {
      createElement: () => ({
        getContext: () => (opts.webgl ? { getExtension: () => null } : null),
      }),
    });
  };

  it("reads mobile width, motion preference and WebGL from the browser", () => {
    stubBrowser({ reduce: false, webgl: true });
    expect(detectEnv()).toEqual({ isMobile: true, reducedMotion: false, webgl: true });
    expect(selectTier(detectEnv())).toBe("mid");
  });

  it("reports reducedMotion when the reduce query matches", () => {
    stubBrowser({ reduce: true, webgl: true });
    expect(detectEnv()).toEqual({ isMobile: true, reducedMotion: true, webgl: true });
    expect(selectTier(detectEnv())).toBe("still");
  });

  // getContext returning null (blocklisted driver, context limit reached) must not throw.
  it("reports webgl false when no GL context can be created", () => {
    stubBrowser({ reduce: false, webgl: false });
    expect(detectEnv()).toEqual({ isMobile: true, reducedMotion: false, webgl: false });
    expect(selectTier(detectEnv())).toBe("still");
  });
});

describe("runFpsProbe", () => {
  it("resolves null when there is no document (server)", async () => {
    await expect(runFpsProbe()).resolves.toBeNull();
  });
});

describe("TIER_SETTINGS", () => {
  it("respects the DPR caps and scales the counts down by tier", () => {
    expect(TIER_SETTINGS.high.dpr).toBe(1.5);
    expect(TIER_SETTINGS.mid.dpr).toBe(1);
    expect(TIER_SETTINGS.mid.starCount).toBeLessThan(TIER_SETTINGS.high.starCount);
    expect(TIER_SETTINGS.mid.streakCount).toBeLessThan(TIER_SETTINGS.high.streakCount);
    expect(TIER_SETTINGS.still.starCount).toBe(0);
    expect(TIER_SETTINGS.still.streakCount).toBe(0);
  });
});
