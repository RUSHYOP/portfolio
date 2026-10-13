import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  CHAPTERS, CONTENT_CHAPTERS, chapterAt, getCameraPose, distanceAU, starScale,
  fovForVelocity, FOV_MIN, FOV_MAX, STAR_POSITION, LAUNCH_LOOK_OFFSET,
  CAMERA_WAYPOINTS, progressToCurveT, sectionHeightVh, VOYAGE_SCROLL_VH, VOYAGE_TAIL_VH,
  progressAt,
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
    expect(VOYAGE_SCROLL_VH).toBe(1400);
    // The user's pacing decision, pinned: only Orbit grew (150 → 300).
    expect(CHAPTERS.map((c) => [c.id, c.spanVh])).toEqual([
      ["launch", 100], ["approach", 150], ["jump", 25], ["orbit", 300], ["worlds", 225],
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
    // PILOT_START is derived from the table, so the growth ends exactly where The Pilot starts.
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
