import { describe, it, expect } from "vitest";
import { progressAt, chapterAt } from "@/scene/camera/flightPath";
import {
  ORBIT_WINDOW, ORBIT_EDGE_FADE, ORBIT_PRESENCE_END, ORBIT_HOLD_DESKTOP, ORBIT_HOLD_MOBILE,
  STEP_CROSSFADE, orbitPresence, orbitCursor, stepSolo,
} from "./orbitSchedule";

const [W0, W1] = ORBIT_WINDOW;
const COUNTS = [1, 2, 3, 4, 6, 12];
/** chapterProgress at the middle of step `i`'s slot (where it dwells front-centre). */
const centre = (i: number, n: number) => W0 + ((i + 0.5) / n) * (W1 - W0);
/** chapterProgress at the boundary between step `b - 1` and step `b`. */
const boundary = (b: number, n: number) => W0 + (b / n) * (W1 - W0);
const sweep = (from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, k) => from + ((to - from) * k) / steps);
const sum = (n: number, cp: number) =>
  Array.from({ length: n }, (_, i) => stepSolo(i, n, cp)).reduce((a, b) => a + b, 0);

describe("schedule constants", () => {
  it("derive the pin holds from Orbit's 300vh section", () => {
    expect(ORBIT_HOLD_DESKTOP).toBeCloseTo(2 / 3, 10);      // (300 - 100) / 300
    expect(ORBIT_HOLD_MOBILE).toBeCloseTo(236 / 300, 10);   // (300 - 64) / 300
  });

  it("keeps the window and both edge fades inside the desktop hold", () => {
    expect(W0).toBeGreaterThan(0);
    expect(W1).toBeGreaterThan(W0);
    expect(ORBIT_PRESENCE_END).toBeCloseTo(W1 + ORBIT_EDGE_FADE, 12);
    expect(ORBIT_PRESENCE_END).toBeLessThanOrEqual(ORBIT_HOLD_DESKTOP);
    expect(ORBIT_PRESENCE_END).toBeLessThanOrEqual(ORBIT_HOLD_MOBILE);
    expect(ORBIT_EDGE_FADE).toBeLessThanOrEqual(W0);          // the fade-in fits before the window
    expect(STEP_CROSSFADE).toBeGreaterThan(0);
    expect(STEP_CROSSFADE).toBeLessThan(1);
  });
});

describe("orbitPresence", () => {
  it("is 0 at the chapter start, 1 across the window, 0 from the presence end on", () => {
    expect(orbitPresence(0)).toBe(0);
    expect(orbitPresence(W0)).toBe(1);
    expect(orbitPresence((W0 + W1) / 2)).toBe(1);
    expect(orbitPresence(W1)).toBe(1);
    expect(orbitPresence(ORBIT_PRESENCE_END)).toBe(0);
    expect(orbitPresence(ORBIT_HOLD_DESKTOP)).toBe(0);
    expect(orbitPresence(1)).toBe(0);
  });

  it("ramps monotonically up before the window and down after it", () => {
    let prev = -1;
    for (const cp of sweep(0, W0, 40)) {
      const v = orbitPresence(cp);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    prev = 2;
    for (const cp of sweep(W1, ORBIT_PRESENCE_END, 40)) {
      const v = orbitPresence(cp);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it("clamps out-of-range input and treats NaN as the chapter start", () => {
    expect(orbitPresence(-5)).toBe(0);
    expect(orbitPresence(9)).toBe(0);
    expect(orbitPresence(NaN)).toBe(0);
  });
});

describe("orbitCursor", () => {
  it("is 0 for no steps, one step, and nonsense counts, at every progress", () => {
    for (const n of [0, 1, -3, NaN, Infinity, 0.9]) {
      for (const cp of sweep(0, 1, 20)) expect(orbitCursor(cp, n)).toBe(0);
    }
  });

  it("rests exactly on step i while it dwells, for N = 2, 4 and 6", () => {
    for (const n of [2, 4, 6]) {
      for (let i = 0; i < n; i++) expect(orbitCursor(centre(i, n), n)).toBe(i);
    }
  });

  it("is halfway between two steps in the middle of their cross-fade", () => {
    for (const n of [2, 4, 6]) {
      for (let b = 1; b < n; b++) expect(orbitCursor(boundary(b, n), n)).toBeCloseTo(b - 0.5, 10);
    }
  });

  it("holds step 0 before the window and the last step after it", () => {
    for (const n of [2, 4, 6]) {
      expect(orbitCursor(0, n)).toBe(0);
      expect(orbitCursor(W0, n)).toBe(0);
      expect(orbitCursor(W1, n)).toBe(n - 1);
      expect(orbitCursor(1, n)).toBe(n - 1);
    }
  });

  it("never decreases and stays inside [0, n - 1]", () => {
    for (const n of [2, 3, 4, 6, 12]) {
      let prev = -1;
      for (const cp of sweep(0, 1, 2000)) {
        const c = orbitCursor(cp, n);
        expect(c).toBeGreaterThanOrEqual(prev);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(n - 1);
        prev = c;
      }
    }
  });

  it("treats NaN progress as the chapter start and fractional counts as their floor", () => {
    expect(orbitCursor(NaN, 4)).toBe(0);
    expect(orbitCursor(W1, 4.9)).toBe(3);
  });

  it("is driven by the real chapter: Orbit's own progress, never another chapter's", () => {
    const hit = chapterAt(progressAt("orbit", centre(2, 4)));
    expect(hit.chapter.id).toBe("orbit");
    expect(orbitCursor(hit.chapterProgress, 4)).toBe(2);
  });
});

describe("stepSolo", () => {
  // E4 "each step dwells front-centre": a hard cut (STEP_CROSSFADE → 0) or a schedule that never
  // rests (STEP_CROSSFADE → 1) would pass every other test here, so the plateau is pinned directly.
  it("dwells at least ±0.25 of a slot around each centre, and cross-fades over at least ±0.1 of a slot at each boundary", () => {
    const n = 4, slot = (W1 - W0) / n;
    for (let i = 0; i < n; i++) {
      for (const d of [-0.25, -0.1, 0, 0.1, 0.25]) {
        expect(orbitCursor(centre(i, n) + d * slot, n)).toBeCloseTo(i, 9);
        expect(stepSolo(i, n, centre(i, n) + d * slot)).toBeCloseTo(1, 9);
      }
    }
    for (let b = 1; b < n; b++) {
      for (const d of [-0.1, 0.1]) {
        const c = orbitCursor(boundary(b, n) + d * slot, n);
        expect(c).toBeGreaterThan(b - 1);
        expect(c).toBeLessThan(b);
      }
    }
  });

  it("shows exactly one step at the centre of each slot", () => {
    for (const n of [1, 2, 4, 6]) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) expect(stepSolo(j, n, centre(i, n))).toBe(i === j ? 1 : 0);
      }
    }
  });

  it("never lets the summed visibility drop below 1 inside the window (N >= 1)", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(W0, W1, 1000)) {
        expect(sum(n, cp)).toBeGreaterThanOrEqual(1 - 1e-9);
        expect(sum(n, cp)).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it("shows at most two steps at once, and only neighbours", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(0, 1, 1000)) {
        const lit = Array.from({ length: n }, (_, i) => i).filter((i) => stepSolo(i, n, cp) > 0);
        expect(lit.length).toBeLessThanOrEqual(2);
        if (lit.length === 2) expect(lit[1] - lit[0]).toBe(1);
      }
    }
  });

  it("keeps every cross-fade inside the window: only the first step before it, only the last after", () => {
    for (const n of [2, 4, 6]) {
      for (const cp of sweep(0, W0, 50)) {
        for (let i = 1; i < n; i++) expect(stepSolo(i, n, cp)).toBe(0);
      }
      for (const cp of sweep(W1, 1, 50)) {
        for (let i = 0; i < n - 1; i++) expect(stepSolo(i, n, cp)).toBe(0);
      }
    }
  });

  it("is dark at the chapter start, for every step", () => {
    for (const n of COUNTS) for (let i = 0; i < n; i++) expect(stepSolo(i, n, 0)).toBe(0);
  });

  it("fades the first step in across the leading margin", () => {
    expect(stepSolo(0, 4, W0 / 2)).toBeGreaterThan(0);
    expect(stepSolo(0, 4, W0 / 2)).toBeLessThan(1);
  });

  // E4: ONE schedule for every device — on a phone (pin held to ORBIT_HOLD_MOBILE) the last
  // step simply dwells; on desktop it leaves with the pin. The panels have no fade-out of
  // their own: the pin's release is their exit.
  it("keeps the last step up from the window end through the mobile pin release, and no other", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(W1, ORBIT_HOLD_MOBILE, 50)) {
        for (let i = 0; i < n; i++) expect(stepSolo(i, n, cp)).toBe(i === n - 1 ? 1 : 0);
      }
    }
  });

  it("agrees with the cursor: the visibility-weighted step index IS the cursor", () => {
    for (const n of [2, 4, 6]) {
      for (const cp of sweep(W0, W1, 400)) {
        let weighted = 0;
        for (let i = 0; i < n; i++) weighted += i * stepSolo(i, n, cp);
        expect(weighted).toBeCloseTo(orbitCursor(cp, n), 9);
      }
    }
  });

  it("is 0 for no steps, an out-of-range index, or a non-integer index", () => {
    expect(stepSolo(0, 0, centre(0, 1))).toBe(0);
    expect(stepSolo(0, NaN, 0.3)).toBe(0);
    expect(stepSolo(-1, 4, 0.3)).toBe(0);
    expect(stepSolo(4, 4, 0.3)).toBe(0);
    expect(stepSolo(0.5, 4, 0.3)).toBe(0);
  });

  it("gives a lone step the whole window (N = 1) and halves the window for N = 2", () => {
    for (const cp of sweep(W0, W1, 50)) expect(stepSolo(0, 1, cp)).toBe(1);
    expect(stepSolo(0, 2, centre(0, 2))).toBe(1);
    expect(stepSolo(1, 2, centre(1, 2))).toBe(1);
    expect(stepSolo(0, 2, boundary(1, 2))).toBeCloseTo(0.5, 10);
    expect(stepSolo(1, 2, boundary(1, 2))).toBeCloseTo(0.5, 10);
  });
});
