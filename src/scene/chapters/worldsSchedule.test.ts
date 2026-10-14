import { describe, it, expect } from "vitest";
import { CHAPTERS, progressAt, chapterAt } from "@/scene/camera/flightPath";
import {
  WORLDS_WINDOW, WORLDS_EDGE_FADE, WORLDS_PRESENCE_END, WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE,
  CASE_TRAVEL, worldsPresence, worldsCursor, caseTarget, caseCentre,
} from "./worldsSchedule";

const [W0, W1] = WORLDS_WINDOW;
const COUNTS = [1, 2, 3, 4, 6, 12];
/** chapterProgress at the boundary between case `b - 1` and case `b`. */
const boundary = (b: number, n: number) => W0 + (b / n) * (W1 - W0);
const sweep = (from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, k) => from + ((to - from) * k) / steps);
/** Every case's target at `cp`, in order. */
const targets = (n: number, cp: number) => Array.from({ length: n }, (_, i) => caseTarget(i, n, cp));

describe("schedule constants", () => {
  it("derive the pin holds from Worlds' 450vh section", () => {
    expect(WORLDS_HOLD_DESKTOP).toBeCloseTo(350 / 450, 10);   // (450 - 100) / 450
    expect(WORLDS_HOLD_MOBILE).toBeCloseTo(386 / 450, 10);    // (450 - 64) / 450
  });

  it("keeps the window and both edge fades inside the desktop hold", () => {
    expect(W0).toBeGreaterThan(0);
    expect(W1).toBeGreaterThan(W0);
    expect(WORLDS_PRESENCE_END).toBeCloseTo(W1 + WORLDS_EDGE_FADE, 12);
    // 0.73 + 0.04 = 0.77 < 0.7778: the draft window [0.04, 0.74] would have put the fade past the pin release.
    expect(WORLDS_PRESENCE_END).toBeLessThanOrEqual(WORLDS_HOLD_DESKTOP);
    expect(WORLDS_PRESENCE_END).toBeLessThanOrEqual(WORLDS_HOLD_MOBILE);
    expect(WORLDS_EDGE_FADE).toBeLessThanOrEqual(W0);          // the fade-in fits before the window
    expect(CASE_TRAVEL).toBeGreaterThan(0);
    expect(CASE_TRAVEL).toBeLessThan(1);
  });
});

describe("caseCentre", () => {
  it("puts each case's dwell at the middle of its equal slot of the window", () => {
    expect(caseCentre(0, 3)).toBeCloseTo(0.155, 12);
    expect(caseCentre(1, 3)).toBeCloseTo(0.385, 12);
    expect(caseCentre(2, 3)).toBeCloseTo(0.615, 12);
    expect(caseCentre(0, 1)).toBeCloseTo((W0 + W1) / 2, 12);
  });

  it("is where the cursor rests exactly on that case", () => {
    for (const n of [2, 3, 4, 6]) {
      for (let i = 0; i < n; i++) expect(worldsCursor(caseCentre(i, n), n)).toBe(i);
    }
  });

  it("clamps an out-of-range index and a nonsense count to the window start, never NaN", () => {
    expect(caseCentre(-2, 3)).toBe(caseCentre(0, 3));
    expect(caseCentre(9, 3)).toBe(caseCentre(2, 3));
    for (const n of [0, -1, NaN, Infinity]) expect(caseCentre(0, n)).toBe(W0);
  });
});

describe("worldsPresence", () => {
  it("is 0 at the chapter start, 1 across the window, 0 from the presence end on", () => {
    expect(worldsPresence(0)).toBe(0);
    expect(worldsPresence(W0)).toBe(1);
    expect(worldsPresence((W0 + W1) / 2)).toBe(1);
    expect(worldsPresence(W1)).toBe(1);
    expect(worldsPresence(WORLDS_PRESENCE_END)).toBe(0);
    expect(worldsPresence(WORLDS_HOLD_DESKTOP)).toBe(0);
    expect(worldsPresence(1)).toBe(0);
  });

  it("ramps monotonically up before the window and down after it", () => {
    let prev = -1;
    for (const cp of sweep(0, W0, 40)) {
      const v = worldsPresence(cp);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    prev = 2;
    for (const cp of sweep(W1, WORLDS_PRESENCE_END, 40)) {
      const v = worldsPresence(cp);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it("clamps out-of-range input and treats NaN as the chapter start", () => {
    expect(worldsPresence(-5)).toBe(0);
    expect(worldsPresence(9)).toBe(0);
    expect(worldsPresence(NaN)).toBe(0);
  });
});

describe("worldsCursor", () => {
  it("is 0 for no cases, one case, and nonsense counts, at every progress", () => {
    for (const n of [0, 1, -3, NaN, Infinity, 0.9]) {
      for (const cp of sweep(0, 1, 20)) expect(worldsCursor(cp, n)).toBe(0);
    }
  });

  it("is halfway between two cases in the middle of their cross-fade", () => {
    for (const n of [2, 3, 4, 6]) {
      for (let b = 1; b < n; b++) expect(worldsCursor(boundary(b, n), n)).toBeCloseTo(b - 0.5, 10);
    }
  });

  it("holds case 0 before the window and the last case after it", () => {
    for (const n of [2, 3, 4, 6]) {
      expect(worldsCursor(0, n)).toBe(0);
      expect(worldsCursor(W0, n)).toBe(0);
      expect(worldsCursor(W1, n)).toBe(n - 1);
      expect(worldsCursor(1, n)).toBe(n - 1);
    }
  });

  it("never decreases and stays inside [0, n - 1]", () => {
    for (const n of [2, 3, 4, 6, 12]) {
      let prev = -1;
      for (const cp of sweep(0, 1, 2000)) {
        const c = worldsCursor(cp, n);
        expect(c).toBeGreaterThanOrEqual(prev);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(n - 1);
        prev = c;
      }
    }
  });

  it("treats NaN progress as the chapter start and fractional counts as their floor", () => {
    expect(worldsCursor(NaN, 4)).toBe(0);
    expect(worldsCursor(W1, 4.9)).toBe(3);
  });

  it("is driven by the real chapter: Worlds' own progress, never another chapter's", () => {
    const hit = chapterAt(progressAt("worlds", caseCentre(2, 3)));
    expect(hit.chapter.id).toBe("worlds");
    expect(worldsCursor(hit.chapterProgress, 3)).toBe(2);
  });

  // "Each case dwells": a hard cut (CASE_TRAVEL → 0) or a cursor that never rests
  // (CASE_TRAVEL → 1) would pass every other test here, so the plateau is pinned directly.
  it("rests on case i for at least ±0.25 of a slot around each centre, and travels over at least ±0.1 of a slot at each boundary", () => {
    const n = 3, slot = (W1 - W0) / n;
    for (let i = 0; i < n; i++) {
      for (const d of [-0.25, -0.1, 0, 0.1, 0.25]) expect(worldsCursor(caseCentre(i, n) + d * slot, n)).toBeCloseTo(i, 9);
    }
    for (let b = 1; b < n; b++) {
      for (const d of [-0.1, 0.1]) {
        const c = worldsCursor(boundary(b, n) + d * slot, n);
        expect(c).toBeGreaterThan(b - 1);
        expect(c).toBeLessThan(b);
      }
    }
  });
});

// Slice 4's standing rule: panels take a 0/1 TARGET and a CSS transition is the cross-fade, so
// no scroll position can rest on two half-faded panels. (The planets stay scroll-scrubbed.)
describe("caseTarget", () => {
  it("is exactly 0 or 1, with exactly one case lit everywhere past the chapter start", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(0, 1, 1000).slice(1)) {
        const t = targets(n, cp);
        for (const v of t) expect([0, 1]).toContain(v);
        expect(t.reduce((a, b) => a + b, 0)).toBe(1);
      }
    }
  });

  it("is dark at the chapter start, for every case", () => {
    for (const n of COUNTS) expect(targets(n, 0)).toEqual(Array(n).fill(0));
  });

  it("lights the first case from the chapter's first pixel, including a nav arrival at start + 0.001", () => {
    expect(targets(3, 0.001)).toEqual([1, 0, 0]);
    expect(targets(3, W0 / 2)).toEqual([1, 0, 0]);
    // Dock / rail / CTA arrivals land at the chapter's start + 0.001 of ABSOLUTE progress,
    // which is ~0.0036 of the way into Worlds at 1625vh.
    const worlds = CHAPTERS.find((c) => c.id === "worlds")!;
    const arrival = chapterAt(worlds.start + 0.001);
    expect(arrival.chapter.id).toBe("worlds");
    expect(arrival.chapterProgress).toBeGreaterThan(0);
    expect(targets(3, arrival.chapterProgress)).toEqual([1, 0, 0]);
  });

  it("lights case i at the centre of its slot", () => {
    for (const n of [1, 2, 3, 6]) {
      for (let i = 0; i < n; i++) {
        expect(targets(n, caseCentre(i, n))).toEqual([...Array(n)].map((_, j) => (j === i ? 1 : 0)));
      }
    }
  });

  it("switches at the middle of the planets' travel: the lit case is the nearest whole cursor", () => {
    for (const n of [2, 3, 6]) {
      for (const cp of sweep(W0, W1, 400)) {
        const lit = targets(n, cp).indexOf(1);
        expect(Math.abs(lit - worldsCursor(cp, n))).toBeLessThanOrEqual(0.5);
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

  // One schedule for every device: on a phone (pin held to WORLDS_HOLD_MOBILE) the last case
  // simply dwells; on desktop it leaves with the pin.
  it("keeps the last case lit from the window end through the mobile pin release, and no other", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(W1, WORLDS_HOLD_MOBILE, 50)) {
        expect(targets(n, cp)).toEqual([...Array(n)].map((_, i) => (i === n - 1 ? 1 : 0)));
      }
    }
  });

  it("is 0 for no cases, an out-of-range index, or a non-integer index, and NaN progress is the start", () => {
    expect(caseTarget(0, 0, caseCentre(0, 1))).toBe(0);
    expect(caseTarget(0, NaN, 0.3)).toBe(0);
    expect(caseTarget(-1, 3, 0.3)).toBe(0);
    expect(caseTarget(3, 3, 0.3)).toBe(0);
    expect(caseTarget(0.5, 3, 0.3)).toBe(0);
    expect(caseTarget(0, 3, NaN)).toBe(0);
  });

  it("gives a lone case the whole chapter past its start", () => {
    for (const cp of sweep(0.001, 1, 50)) expect(caseTarget(0, 1, cp)).toBe(1);
  });
});
