import { describe, it, expect } from "vitest";
import {
  CHAPTERS, CONTENT_CHAPTERS, chapterAt, getCameraPose, distanceAU, starScale,
  fovForVelocity, FOV_MIN, FOV_MAX, STAR_POSITION,
  CAMERA_WAYPOINTS, progressToCurveT,
} from "./flightPath";

const STEPS = 400;

describe("chapters", () => {
  it("cover [0,1] contiguously in order", () => {
    expect(CHAPTERS[0].start).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1].end).toBe(1);
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].start).toBeCloseTo(CHAPTERS[i - 1].end, 10);
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
    const mid = chapterAt(0.27);
    expect(mid.chapter.id).toBe("orbit");
    expect(mid.chapterProgress).toBeGreaterThan(0);
    expect(mid.chapterProgress).toBeLessThan(1);
  });
  it("clamps out-of-range progress", () => {
    expect(chapterAt(-1).chapter.id).toBe("launch");
    expect(chapterAt(2).chapter.id).toBe("surface");
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
  it("starts at the origin looking at the star", () => {
    const pose = getCameraPose(0);
    expect(pose.position.length()).toBeLessThan(1e-6);
    expect(pose.lookAt.distanceTo(STAR_POSITION)).toBeLessThan(1e-6);
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
    expect(starScale(1)).toBeCloseTo(6, 5);
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
