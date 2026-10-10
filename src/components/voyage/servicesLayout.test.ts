import { describe, it, expect } from "vitest";
import { panelPose, STATIC_POSE } from "./servicesLayout";

describe("panelPose — desktop docking", () => {
  it("docks from nothing to fully docked", () => {
    expect(panelPose(0, 3, 0).dock).toBe(0);
    expect(panelPose(0, 3, 0.02).dock).toBe(0);
    expect(panelPose(0, 3, 1).dock).toBe(1);
  });

  it("staggers: the first panel leads the last", () => {
    const t = 0.15;
    expect(panelPose(0, 3, t).dock).toBeGreaterThan(panelPose(1, 3, t).dock);
    expect(panelPose(1, 3, t).dock).toBeGreaterThan(panelPose(2, 3, t).dock);
  });

  it("has every panel docked before the 100vh pin starts to leave (chapterProgress 1/3)", () => {
    // The pin is stationary only for chapterProgress 0..1/3; a panel still arriving after
    // that would dock while the whole block is sliding out of frame.
    for (let n = 1; n <= 6; n++) {
      for (let i = 0; i < n; i++) {
        expect(panelPose(i, n, 0.28).dock).toBeCloseTo(1, 10);
      }
    }
  });

  it("never leaves the 0..1 range", () => {
    for (let i = 0; i <= 100; i++) {
      const p = panelPose(1, 3, i / 100);
      expect(p.dock).toBeGreaterThanOrEqual(0);
      expect(p.dock).toBeLessThanOrEqual(1);
      expect(p.solo).toBeGreaterThanOrEqual(0);
      expect(p.solo).toBeLessThanOrEqual(1);
    }
  });
});

describe("panelPose — the arc", () => {
  it("lifts the middle panel and tilts the outer ones symmetrically", () => {
    expect(panelPose(0, 3, 1).arc).toBeCloseTo(0, 10);
    expect(panelPose(1, 3, 1).arc).toBeCloseTo(1, 10);
    expect(panelPose(2, 3, 1).arc).toBeCloseTo(0, 10);
    expect(panelPose(0, 3, 1).tilt).toBeCloseTo(-1, 10);
    expect(panelPose(1, 3, 1).tilt).toBeCloseTo(0, 10);
    expect(panelPose(2, 3, 1).tilt).toBeCloseTo(1, 10);
  });

  it("is flat for a single panel", () => {
    expect(panelPose(0, 1, 1).arc).toBe(0);
    expect(panelPose(0, 1, 1).tilt).toBe(0);
  });

  it("is flat for two panels", () => {
    // The degenerate even case: both panels are end panels, so a 2-service CMS is a
    // deliberate flat row rather than an accident.
    expect(panelPose(0, 2, 1).arc).toBe(0);
    expect(panelPose(1, 2, 1).arc).toBe(0);
  });

  it("stays symmetric for an even count", () => {
    expect(panelPose(0, 4, 1).tilt).toBeCloseTo(-panelPose(3, 4, 1).tilt, 10);
    expect(panelPose(1, 4, 1).arc).toBeCloseTo(panelPose(2, 4, 1).arc, 10);
  });
});

describe("panelPose — mobile replacement", () => {
  // The browser-review capture points: p10 / p12 / p14 are chapterProgress 1/6, 1/3, 1/2.
  it("shows exactly one panel at each capture point", () => {
    const solos = (t: number) => [0, 1, 2].map((i) => panelPose(i, 3, t).solo);
    expect(solos(1 / 6)).toEqual([1, 0, 0]);
    expect(solos(1 / 3)).toEqual([0, 1, 0]);
    expect(solos(1 / 2)).toEqual([0, 0, 1]);
  });

  it("crossfades rather than cutting between panels", () => {
    // Panel 2 fades up over the tail of panel 1's slot, then panel 1 fades out underneath
    // it (later in DOM order = on top), so there is never a frame with nothing on screen.
    expect(panelPose(0, 3, 0.2).solo).toBe(1);
    const rising = panelPose(1, 3, 0.2).solo;
    expect(rising).toBeGreaterThan(0);
    expect(rising).toBeLessThan(1);

    expect(panelPose(1, 3, 0.24).solo).toBe(1);
    const falling = panelPose(0, 3, 0.24).solo;
    expect(falling).toBeGreaterThan(0);
    expect(falling).toBeLessThan(1);
  });

  it("is dark before and after the replacement window", () => {
    expect([0, 1, 2].map((i) => panelPose(i, 3, 0).solo)).toEqual([0, 0, 0]);
    expect([0, 1, 2].map((i) => panelPose(i, 3, 0.9).solo)).toEqual([0, 0, 0]);
  });
});

describe("STATIC_POSE", () => {
  it("is the fully-visible, un-offset pose for reduced motion", () => {
    expect(STATIC_POSE).toEqual({ dock: 1, arc: 0, tilt: 0, solo: 1 });
  });
});
