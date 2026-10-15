import { describe, it, expect } from "vitest";
import { progressAt, chapterAt } from "@/scene/camera/flightPath";
import {
  ORBIT_WINDOW, ORBIT_EDGE_FADE, ORBIT_PRESENCE_END, ORBIT_HOLD_DESKTOP, ORBIT_HOLD_MOBILE,
  STEP_CROSSFADE, orbitPresence, orbitCursor, stepTarget,
} from "./orbitSchedule";

const [W0, W1] = ORBIT_WINDOW;
const COUNTS = [1, 2, 3, 4, 6, 12];
/** chapterProgress at the middle of step `i`'s slot (where it dwells front-centre). */
const centre = (i: number, n: number) => W0 + ((i + 0.5) / n) * (W1 - W0);
/** chapterProgress at the boundary between step `b - 1` and step `b`. */
const boundary = (b: number, n: number) => W0 + (b / n) * (W1 - W0);
const sweep = (from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, k) => from + ((to - from) * k) / steps);
/** Every step's target at `cp`, in order. */
const targets = (n: number, cp: number) => Array.from({ length: n }, (_, i) => stepTarget(i, n, cp));

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

describe("orbitCursor — dwell and travel", () => {
  // E4 "each step dwells front-centre": a hard cut (STEP_CROSSFADE → 0) or a cursor that never
  // rests (STEP_CROSSFADE → 1) would pass every other test here, so the plateau is pinned directly.
  it("rests on step i for at least ±0.25 of a slot around each centre, and travels over at least ±0.1 of a slot at each boundary", () => {
    const n = 4, slot = (W1 - W0) / n;
    for (let i = 0; i < n; i++) {
      for (const d of [-0.25, -0.1, 0, 0.1, 0.25]) expect(orbitCursor(centre(i, n) + d * slot, n)).toBeCloseTo(i, 9);
    }
    for (let b = 1; b < n; b++) {
      for (const d of [-0.1, 0.1]) {
        const c = orbitCursor(boundary(b, n) + d * slot, n);
        expect(c).toBeGreaterThan(b - 1);
        expect(c).toBeLessThan(b);
      }
    }
  });
});

// Slice 4 browser review: a scroll-scrubbed cross-fade can rest half-way (two ghosted panels),
// the same fault as the old Approach dock. The panels now take a 0/1 TARGET and the CSS
// transition on .process-panel supplies the cross-fade; the ring's cursor stays scrubbed.
describe("stepTarget", () => {
  it("is exactly 0 or 1, with exactly one step lit everywhere past the chapter start", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(0, 1, 1000).slice(1)) {
        const t = targets(n, cp);
        for (const v of t) expect([0, 1]).toContain(v);
        expect(t.reduce((a, b) => a + b, 0)).toBe(1);
      }
    }
  });

  it("is dark at the chapter start, for every step", () => {
    for (const n of COUNTS) expect(targets(n, 0)).toEqual(Array(n).fill(0));
  });

  it("lights the first step from the chapter's first pixel (no scrubbed fade-in)", () => {
    expect(targets(4, 0.001)).toEqual([1, 0, 0, 0]);
    expect(targets(4, W0 / 2)).toEqual([1, 0, 0, 0]);
  });

  it("lights step i at the centre of its slot", () => {
    for (const n of [1, 2, 4, 6]) {
      for (let i = 0; i < n; i++) expect(targets(n, centre(i, n))).toEqual([...Array(n)].map((_, j) => (j === i ? 1 : 0)));
    }
  });

  it("switches at the middle of the ring's travel: the lit step is the nearest whole cursor", () => {
    for (const n of [2, 4, 6]) {
      for (const cp of sweep(W0, W1, 400)) {
        const lit = targets(n, cp).indexOf(1);
        expect(Math.abs(lit - orbitCursor(cp, n))).toBeLessThanOrEqual(0.5);
      }
      const slot = (W1 - W0) / n;
      for (let b = 1; b < n; b++) {
        expect(targets(n, boundary(b, n) - 0.01 * slot).indexOf(1)).toBe(b - 1);
        expect(targets(n, boundary(b, n) + 0.01 * slot).indexOf(1)).toBe(b);
      }
    }
  });

  it("never moves backwards as the reader scrolls forward", () => {
    for (const n of COUNTS) {
      let prev = 0;
      for (const cp of sweep(0.0005, 1, 1000)) {
        const lit = targets(n, cp).indexOf(1);
        expect(lit).toBeGreaterThanOrEqual(prev);
        prev = lit;
      }
    }
  });

  // E4: ONE schedule for every device — on a phone (pin held to ORBIT_HOLD_MOBILE) the last
  // step simply dwells; on desktop it leaves with the pin.
  it("keeps the last step lit from the window end through the mobile pin release, and no other", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(W1, ORBIT_HOLD_MOBILE, 50)) {
        expect(targets(n, cp)).toEqual([...Array(n)].map((_, i) => (i === n - 1 ? 1 : 0)));
      }
    }
  });

  it("is 0 for no steps, an out-of-range index, or a non-integer index, and NaN progress is the start", () => {
    expect(stepTarget(0, 0, centre(0, 1))).toBe(0);
    expect(stepTarget(0, NaN, 0.3)).toBe(0);
    expect(stepTarget(-1, 4, 0.3)).toBe(0);
    expect(stepTarget(4, 4, 0.3)).toBe(0);
    expect(stepTarget(0.5, 4, 0.3)).toBe(0);
    expect(stepTarget(0, 4, NaN)).toBe(0);
  });

  it("gives a lone step the whole chapter past its start", () => {
    for (const cp of sweep(0.001, 1, 50)) expect(stepTarget(0, 1, cp)).toBe(1);
  });
});
