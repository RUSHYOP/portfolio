import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  CHAPTERS, CONTENT_CHAPTERS, chapterAt, getCameraPose, distanceAU, starScale,
  fovForVelocity, FOV_MIN, FOV_MAX, STAR_POSITION, LAUNCH_LOOK_OFFSET,
  CAMERA_WAYPOINTS, progressToCurveT, sectionHeightVh, VOYAGE_SCROLL_VH, VOYAGE_TAIL_VH, type ChapterId,
  progressAt, bankForProgress, BANK_MAX, starClock,
} from "./flightPath";

const STEPS = 400;

// The one way tests (and the browser review) name a scroll position: a chapter plus a position
// inside it. Absolute progress literals silently change meaning whenever the chapter table moves.
describe("progressAt", () => {
  const ids = CHAPTERS.map((c) => c.id);

  it("is the chapter's start at t = 0 and its end at t = 1, exactly", () => {
    for (const c of CHAPTERS) {
      expect(progressAt(c.id, 0)).toBe(c.start);
      expect(progressAt(c.id, 1)).toBe(c.end);
    }
  });

  it("interpolates linearly and round-trips through chapterAt", () => {
    for (const id of ids) {
      for (const t of [0.05, 0.1, 0.25, 1 / 3, 0.5, 0.75, 0.9, 0.95]) {
        const hit = chapterAt(progressAt(id, t));
        expect(hit.chapter.id).toBe(id);
        expect(hit.chapterProgress).toBeCloseTo(t, 9);
      }
    }
  });

  it("clamps t to [0, 1] and treats NaN as 0", () => {
    const c = CHAPTERS.find((x) => x.id === "orbit")!;
    expect(progressAt("orbit", -3)).toBe(c.start);
    expect(progressAt("orbit", 7)).toBe(c.end);
    expect(progressAt("orbit", NaN)).toBe(c.start);
  });
});

describe("chapters", () => {
  it("cover [0,1] contiguously in order — bit-for-bit, not approximately", () => {
    expect(CHAPTERS[0].start).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1].end).toBe(1);
    // `toBe`, not `toBeCloseTo`: a 1-ulp gap between end_i and start_{i+1} is a hole that
    // chapterAt() falls through to its `?? last` fallback — a one-frame teleport to Surface.
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].start).toBe(CHAPTERS[i - 1].end);
    }
  });
  it("declares its spans in vh and derives every fraction from one cumulative sum", () => {
    expect(VOYAGE_SCROLL_VH).toBe(1625);
    // The user's pacing decisions, pinned: Orbit grew (150 → 300, slice 4) and Worlds grew (225 → 450, slice 5).
    expect(CHAPTERS.map((c) => [c.id, c.spanVh])).toEqual([
      ["launch", 100], ["approach", 150], ["jump", 25], ["orbit", 300], ["worlds", 450],
      ["belt", 100], ["passage", 37.5], ["constellation", 137.5], ["pilot", 125],
      ["landing", 137.5], ["surface", 62.5],
    ]);
    expect(CHAPTERS.reduce((sum, c) => sum + c.spanVh, 0)).toBe(VOYAGE_SCROLL_VH);
    let cumulative = 0;
    for (const c of CHAPTERS) {
      expect(c.start).toBe(cumulative / VOYAGE_SCROLL_VH);
      cumulative += c.spanVh;
    }
  });
  it("chapterAt never falls through to surface before surface starts", () => {
    const surface = CHAPTERS[CHAPTERS.length - 1];
    // A dense sweep (every 0.07vh) …
    for (let k = 0; k < 20000; k++) {
      const p = k / 20000;
      if (p >= surface.start) break;
      expect(chapterAt(p).chapter.id).not.toBe("surface");
    }
    // … and the exact boundaries: a boundary belongs to the chapter that starts there, and a
    // value just under it (x·(1−ε) is at least one ulp below x) to the chapter that ends there.
    for (let i = 1; i < CHAPTERS.length; i++) {
      const boundary = CHAPTERS[i].start;
      const below = boundary * (1 - Number.EPSILON);
      expect(below).toBeLessThan(boundary);
      expect(chapterAt(boundary).chapter.id).toBe(CHAPTERS[i].id);
      expect(chapterAt(below).chapter.id).toBe(CHAPTERS[i - 1].id);
    }
  });
  it("has 9 content chapters and 2 micro-beats", () => {
    expect(CONTENT_CHAPTERS).toHaveLength(9);
    expect(CHAPTERS.filter((c) => c.micro).map((c) => c.id)).toEqual(["jump", "passage"]);
  });
  it("chapterAt maps progress to the right chapter and local progress", () => {
    expect(chapterAt(0).chapter.id).toBe("launch");
    expect(chapterAt(0).chapterProgress).toBe(0);
    expect(chapterAt(1).chapter.id).toBe("surface");
    expect(chapterAt(1).chapterProgress).toBe(1);
    const mid = chapterAt(progressAt("orbit", 0.4));
    expect(mid.chapter.id).toBe("orbit");
    expect(mid.chapterProgress).toBeCloseTo(0.4, 9);
  });
  it("clamps out-of-range progress", () => {
    expect(chapterAt(-1).chapter.id).toBe("launch");
    expect(chapterAt(2).chapter.id).toBe("surface");
  });
  // An exact boundary belongs to the chapter that starts there, not the one that ends.
  it("treats an exact interior boundary as the start of the next chapter", () => {
    const approach = CHAPTERS.find((c) => c.id === "approach")!;
    expect(chapterAt(approach.start).chapter.id).toBe("approach");
    expect(chapterAt(approach.start).chapterProgress).toBe(0);
  });
});

// The DOM track and the scroll store must share one denominator, or `scrollTo(c.start)`
// lands somewhere other than the section it names.
describe("scroll geometry", () => {
  it("the sections sum to the full track height", () => {
    const total = CHAPTERS.reduce((sum, c) => sum + sectionHeightVh(c), 0);
    expect(total).toBeCloseTo(VOYAGE_SCROLL_VH + VOYAGE_TAIL_VH, 6);
  });

  // `.chapter__pin` is a 100vh sticky child; a section shorter than that never pins. The
  // smallest content chapters (Launch, Belt) are exactly 100vh — spans are declared in vh and
  // sectionHeightVh returns them verbatim, so there is no float error to excuse.
  it("every content chapter is at least one viewport tall", () => {
    for (const c of CONTENT_CHAPTERS) {
      expect(sectionHeightVh(c)).toBeGreaterThanOrEqual(100);
    }
  });

  it("sectionHeightVh is the declared span exactly, plus the tail on the last chapter", () => {
    for (const c of CHAPTERS) {
      expect(sectionHeightVh(c)).toBe(c.spanVh + (c.id === "surface" ? VOYAGE_TAIL_VH : 0));
    }
  });

  // The identity that makes progress `p` and document offset `p * VOYAGE_SCROLL_VH` the same place.
  it("each chapter's cumulative DOM offset equals start * VOYAGE_SCROLL_VH", () => {
    let offset = 0;
    for (const c of CHAPTERS) {
      expect(offset).toBeCloseTo(c.start * VOYAGE_SCROLL_VH, 6);
      offset += sectionHeightVh(c);
    }
  });
});

describe("camera path", () => {
  it("never reverses: z is non-increasing and the forward vector always points to -z", () => {
    let prevZ = Infinity;
    for (let i = 0; i <= STEPS; i++) {
      const p = i / STEPS;
      const pose = getCameraPose(p);
      expect(pose.position.z).toBeLessThanOrEqual(prevZ + 1e-6);
      prevZ = pose.position.z;
      const fz = pose.lookAt.z - pose.position.z;
      expect(fz).toBeLessThan(0);
    }
  });
  it("starts at the origin looking up-left of the star", () => {
    const pose = getCameraPose(0);
    expect(pose.position.length()).toBeLessThan(1e-6);
    expect(pose.lookAt.distanceTo(STAR_POSITION.clone().add(LAUNCH_LOOK_OFFSET))).toBeLessThan(1e-6);
  });
  // Per-frame path: the caller-supplied pose must be mutated in place, not replaced.
  it("reuses the caller's out object without allocating", () => {
    const out = { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
    const result = getCameraPose(progressAt("worlds", 0.5), out);
    expect(result).toBe(out);
    expect(result.position.z).toBeLessThan(0);
  });
});

describe("chapter alignment", () => {
  it("reaches each chapter's waypoint exactly at that chapter's start", () => {
    CHAPTERS.forEach((c, i) => {
      const pose = getCameraPose(c.start);
      expect(pose.position.distanceTo(CAMERA_WAYPOINTS[i])).toBeLessThan(1e-6);
    });
  });
  it("progressToCurveT is monotonic and hits i/11 at chapter starts", () => {
    let prev = -1;
    for (let k = 0; k <= 400; k++) {
      const t = progressToCurveT(k / 400);
      expect(t).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = t;
    }
    CHAPTERS.forEach((c, i) => expect(progressToCurveT(c.start)).toBeCloseTo(i / CHAPTERS.length, 10));
    expect(progressToCurveT(1)).toBeCloseTo(1, 10);
  });
});

// Slice 5 (A1). Worlds grew 225 → 450vh, which would have divided every pre-Worlds position by a
// longer "vh to The Pilot" and shrunk the star 10-21% at Approach / Orbit. starScale and distanceAU
// are therefore keyed by (chapter, chapterProgress) through starClock, with Worlds counted as its
// slice-4 225vh. These values were captured at 17 digits from the slice-4 tree (VOYAGE_SCROLL_VH
// 1400), i.e. they ARE the slice-3/4 baselines the screenshots were taken against.
const STAR_GOLDEN: readonly (readonly [ChapterId, number, number, number])[] = [
  // [chapter, chapterProgress, starScale, distanceAU]
  ["launch", 0, 0.25, 9.4],
  ["launch", 0.625, 0.2709572742022715, 8.853488372093023],
  ["approach", 1 / 3, 0.363899405083829, 8.088372093023256],
  ["approach", 0.96, 0.5320119537047051, 7.266418604651164],
  ["jump", 0.5, 0.571984856679286, 7.104651162790698],
  ["orbit", 0, 0.6001081665765278, 6.995348837209303],
  ["orbit", 0.11249999999999999, 0.6801810911303408, 6.700232558139535],
  ["orbit", 0.25749999999999995, 0.7912548145484044, 6.319860465116279],
  ["orbit", 0.40249999999999997, 0.9096085323418064, 5.939488372093024],
  ["orbit", 0.5475, 1.0335327721471064, 5.559116279069768],
  ["orbit", 0.999, 1.4364218146959438, 4.374716279069768],
  ["worlds", 0, 1.4373174689021091, 4.372093023255814],
  ["worlds", 0.5, 1.7633180097349916, 3.388372093023257],
  ["worlds", 0.999, 2.0493776878977283, 2.4066186046511637],
  ["belt", 0, 2.0498918334234717, 2.404651162790699],
  ["belt", 0.5, 2.1568685776095187, 1.9674418604651156],
  ["constellation", 0, 2.303474851270957, 1.20232558139535],
  ["constellation", 0.5, 2.374743949432125, 0.6011627906976744],
  ["pilot", 0, 2.4, 0],
  ["pilot", 0.5, 2.4, 0],
  ["landing", 0.5, 2.4, 0],
  ["surface", 0.5, 2.4, 0],
];

describe("star clock (slice 5, A1)", () => {
  it("keeps starScale and distanceAU at their slice-4 values at every capture point, whatever the table's length", () => {
    for (const [id, t, scale, au] of STAR_GOLDEN) {
      expect(starScale(progressAt(id, t)), `starScale ${id} ${t}`).toBeCloseTo(scale, 12);
      expect(distanceAU(progressAt(id, t)), `distanceAU ${id} ${t}`).toBeCloseTo(au, 12);
    }
  });

  it("counts Worlds as its old 225vh: Worlds' own growth is spread over its 450vh", () => {
    // cumulative star-clock vh before Worlds = 575, Worlds = 225, up to The Pilot = 1075.
    expect(starClock(progressAt("worlds", 0))).toBeCloseTo(575 / 1075, 12);
    expect(starClock(progressAt("worlds", 0.5))).toBeCloseTo(687.5 / 1075, 12);
    expect(starClock(progressAt("belt", 0))).toBeCloseTo(800 / 1075, 12);
    // Star-clock units gained per scroll-vh: 1/1075 in every chapter that keeps its length (Orbit
    // here), and half of that inside Worlds — the same star growth now takes twice the scroll.
    const perVh = (a: number, b: number) => (starClock(b) - starClock(a)) / ((b - a) * VOYAGE_SCROLL_VH);
    expect(perVh(progressAt("orbit", 0.25), progressAt("orbit", 0.75)) * 1075).toBeCloseTo(1, 9);
    expect(perVh(progressAt("worlds", 0.25), progressAt("worlds", 0.75)) * 1075).toBeCloseTo(0.5, 9);
  });

  it("is 0 at the start, exactly 1 from The Pilot on, and continuous across every chapter boundary", () => {
    const pilot = CHAPTERS.find((c) => c.id === "pilot")!;
    expect(starClock(0)).toBe(0);
    expect(starClock(pilot.start)).toBe(1);
    expect(starClock(1)).toBe(1);
    for (let i = 1; i < CHAPTERS.length; i++) {
      const b = CHAPTERS[i].start;
      expect(starClock(b * (1 - 1e-9))).toBeCloseTo(starClock(b), 6);
    }
  });

  it("never decreases along the whole voyage, and starScale / distanceAU follow it", () => {
    let prev = -Infinity;
    let prevScale = -Infinity;
    let prevAU = Infinity;
    for (let k = 0; k <= 20000; k++) {
      const p = k / 20000;
      const c = starClock(p);
      expect(c).toBeGreaterThanOrEqual(prev - 1e-12);
      expect(starScale(p)).toBeGreaterThanOrEqual(prevScale - 1e-12);
      expect(distanceAU(p)).toBeLessThanOrEqual(prevAU + 1e-12);
      prev = c;
      prevScale = starScale(p);
      prevAU = distanceAU(p);
    }
  });
});

describe("curves", () => {
  it("distanceAU is monotonically non-increasing and 0 from pilot onward", () => {
    let prev = Infinity;
    for (let i = 0; i <= STEPS; i++) {
      const d = distanceAU(i / STEPS);
      expect(d).toBeLessThanOrEqual(prev + 1e-9);
      prev = d;
    }
    expect(distanceAU(0)).toBeCloseTo(9.4, 5);
    const pilot = CHAPTERS.find((c) => c.id === "pilot")!;
    expect(distanceAU(pilot.start)).toBe(0);
    expect(distanceAU(1)).toBe(0);
  });
  it("starScale grows monotonically to pilot then holds", () => {
    let prev = -Infinity;
    for (let i = 0; i <= STEPS; i++) {
      const s = starScale(i / STEPS);
      expect(s).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = s;
    }
    expect(starScale(0)).toBeCloseTo(0.25, 5);
    expect(starScale(1)).toBeCloseTo(2.4, 5);
    // The star clock is derived from the table, so the growth ends exactly where The Pilot starts.
    const pilot = CHAPTERS.find((c) => c.id === "pilot")!;
    expect(starScale(pilot.start)).toBeCloseTo(2.4, 5);
    expect(starScale(pilot.start * 0.99)).toBeLessThan(2.4);
  });
  it("fov stays within 60–70 and rises with velocity", () => {
    expect(fovForVelocity(0)).toBe(FOV_MIN);
    expect(fovForVelocity(1)).toBe(FOV_MAX);
    expect(fovForVelocity(-3)).toBe(FOV_MIN);
    expect(fovForVelocity(9)).toBe(FOV_MAX);
    expect(fovForVelocity(0.5)).toBeGreaterThan(FOV_MIN);
    expect(fovForVelocity(0.5)).toBeLessThan(FOV_MAX);
  });
});

// Spec §3 row 04: "Camera banks ~30° and settles into orbit". Pure and orbit-scoped: SceneRoot
// applies it as a roll AFTER lookAt, so none of the position/lookAt invariants above can see it.
describe("bankForProgress", () => {
  const bank = (t: number) => bankForProgress(progressAt("orbit", t));

  it("is 30 degrees at most — the spec's figure", () => {
    expect(BANK_MAX).toBeCloseTo(Math.PI / 6, 12);
  });

  it("is exactly 0 in every chapter but Orbit, so Approach, Jump and Worlds stay level", () => {
    for (const c of CHAPTERS.filter((x) => x.id !== "orbit")) {
      for (const t of [0, 0.25, 0.5, 0.75, 0.999]) expect(bankForProgress(progressAt(c.id, t))).toBe(0);
    }
  });

  it("starts at 0 on Orbit's first frame and is back to ~0 on its last", () => {
    expect(bank(0)).toBe(0);
    expect(bank(0.999999)).toBeLessThan(1e-6);
    expect(bank(0.999999)).toBeGreaterThanOrEqual(0);
  });

  it("holds BANK_MAX across the middle of the chapter", () => {
    for (const t of [0.18, 0.3, 0.5, 0.7, 0.82]) expect(bank(t)).toBeCloseTo(BANK_MAX, 9);
  });

  it("eases in over the first 18% and out over the last 18%, monotonically", () => {
    let prev = -1;
    for (let k = 0; k <= 100; k++) {
      const v = bank((k / 100) * 0.18);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    prev = BANK_MAX + 1;
    for (let k = 0; k <= 100; k++) {
      const v = bank(Math.min(0.999999, 0.82 + (k / 100) * 0.18));
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
    // Smooth, not linear: the quarter point of the ramp is below a quarter of the way up.
    expect(bank(0.18 * 0.25)).toBeLessThan(BANK_MAX * 0.25);
  });

  it("is symmetric about the middle of the chapter", () => {
    for (const t of [0.03, 0.06, 0.1, 0.15]) expect(bank(t)).toBeCloseTo(bank(1 - t), 9);
  });

  it("is continuous across both chapter edges (no jump in the roll)", () => {
    const orbit = CHAPTERS.find((c) => c.id === "orbit")!;
    const justBefore = (x: number) => x * (1 - 1e-9);
    expect(Math.abs(bankForProgress(justBefore(orbit.start)) - bankForProgress(orbit.start))).toBeLessThan(1e-6);
    expect(Math.abs(bankForProgress(justBefore(orbit.end)) - bankForProgress(orbit.end))).toBeLessThan(1e-6);
  });

  it("stays inside [0, BANK_MAX] over the whole voyage and treats non-finite input as level", () => {
    for (let i = 0; i <= STEPS; i++) {
      const b = bankForProgress(i / STEPS);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(BANK_MAX);
    }
    expect(bankForProgress(NaN)).toBe(0);
    expect(bankForProgress(Infinity)).toBe(0);
    expect(bankForProgress(-Infinity)).toBe(0);
  });
});

// VoyageScroll guards Lenis's `limit <= 0` report at the source, but NaN can still reach
// these helpers from another caller — and getPoint throws on it, on the render path.
describe("non-finite input", () => {
  it("treats NaN as progress 0 everywhere and never throws", () => {
    expect(chapterAt(NaN).chapter.id).toBe("launch");
    expect(chapterAt(NaN).chapterProgress).toBe(0);
    expect(() => getCameraPose(NaN)).not.toThrow();
    expect(getCameraPose(NaN).position.length()).toBeLessThan(1e-6);
    expect(distanceAU(NaN)).toBeCloseTo(9.4, 5);
    expect(starScale(NaN)).toBeCloseTo(0.25, 5);
    expect(fovForVelocity(NaN)).toBe(FOV_MIN);
    expect(progressToCurveT(NaN)).toBe(0);
  });

  it("saturates +Infinity to the far end and -Infinity to the start", () => {
    expect(chapterAt(Infinity).chapter.id).toBe("surface");
    expect(fovForVelocity(Infinity)).toBe(FOV_MAX);
    expect(distanceAU(Infinity)).toBe(0);
    expect(chapterAt(-Infinity).chapter.id).toBe("launch");
  });
});
