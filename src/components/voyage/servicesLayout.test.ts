import { describe, it, expect } from "vitest";
import { panelPose, STATIC_POSE } from "./servicesLayout";

describe("panelPose — desktop docking", () => {
  it("is undocked before the chapter and docked from its first pixel", () => {
    expect(panelPose(0, 3, 0).dock).toBe(0);
    // Dock / FlightRail / Launch CTA all land on approach.start + 0.001 (chapterProgress
    // ~0.009): the arrival frame must be the docked arc, not an empty chapter.
    expect(panelPose(0, 3, 0.009).dock).toBe(1);
    expect(panelPose(2, 3, 0.009).dock).toBe(1);
    expect(panelPose(0, 3, 1).dock).toBe(1);
  });

  // Browser review (slice 4): the scroll-scrubbed dock left a half-built arc — one panel up,
  // one ghosted, one missing — at every rest point inside chapterProgress 0.02..0.28. The
  // dock is a trigger now; the CSS transition supplies the motion, so scroll position alone
  // can never hold a partial frame.
  it("never yields a partial dock at any scroll position, for any panel count", () => {
    for (let n = 1; n <= 6; n++) {
      for (let i = 0; i < n; i++) {
        for (let k = 0; k <= 200; k++) {
          expect([0, 1]).toContain(panelPose(i, n, k / 200).dock);
        }
      }
    }
  });

  it("staggers by transition delay: the first panel leads, the last trails by the fixed total", () => {
    expect(panelPose(0, 3, 1).delay).toBe(0);
    expect(panelPose(1, 3, 1).delay).toBeGreaterThan(panelPose(0, 3, 1).delay);
    expect(panelPose(2, 3, 1).delay).toBeGreaterThan(panelPose(1, 3, 1).delay);
    // Data-driven N: more services narrow the step, never stretch the whole stagger.
    for (const n of [2, 3, 4, 6]) expect(panelPose(n - 1, n, 1).delay).toBe(panelPose(2, 3, 1).delay);
    expect(panelPose(0, 1, 1).delay).toBe(0);
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

  // Fix pass 1: a slot-relative crossfade is wider than SOLO_START once n < 3, so a lone
  // panel used to sit at 57% opacity while the section was still scrolling in.
  it("is dark before the chapter starts for one and two panels", () => {
    expect(panelPose(0, 1, 0).solo).toBe(0);
    expect(panelPose(0, 2, 0).solo).toBe(0);
  });

  it("holds a lone panel fully up across the middle of the window", () => {
    for (const t of [0.08, 0.3, 0.52]) expect(panelPose(0, 1, t).solo).toBe(1);
  });

  it("is fully faded out by SOLO_END + SOLO_START (0.60), the widest capped fade-out", () => {
    // Not the 0.573 pin release: the capped fade-out still overruns it by <= 0.027
    // (0.600 for n = 1, 2; 0.591 for n = 3) — a known, accepted tail.
    for (const n of [1, 2, 3]) {
      // toBeCloseTo: SOLO_END + fade is not exactly representable (≈2e-15 residue here).
      for (let i = 0; i < n; i++) expect(panelPose(i, n, 0.6).solo).toBeCloseTo(0, 10);
    }
  });
});

describe("STATIC_POSE", () => {
  it("is the fully-visible, un-offset pose for reduced motion", () => {
    expect(STATIC_POSE).toEqual({ dock: 1, arc: 0, tilt: 0, solo: 1, delay: 0 });
  });
});
