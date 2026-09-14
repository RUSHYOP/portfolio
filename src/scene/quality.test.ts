import { describe, it, expect } from "vitest";
import { selectTier, probeDemote, TIER_SETTINGS } from "./quality";

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
});

describe("TIER_SETTINGS", () => {
  it("respects the DPR caps and disables animation only for still", () => {
    expect(TIER_SETTINGS.high.dpr).toBe(1.5);
    expect(TIER_SETTINGS.mid.dpr).toBe(1);
    expect(TIER_SETTINGS.high.animate).toBe(true);
    expect(TIER_SETTINGS.mid.animate).toBe(true);
    expect(TIER_SETTINGS.still.animate).toBe(false);
    expect(TIER_SETTINGS.mid.starCount).toBeLessThan(TIER_SETTINGS.high.starCount);
  });
});
