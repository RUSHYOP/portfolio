import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { voyageStore, normalizeVelocity, VELOCITY_NORMALIZER, PROGRAMMATIC_EPS, PROGRAMMATIC_TIMEOUT_MS } from "./voyageStore";

beforeEach(() => voyageStore.reset());
afterEach(() => vi.useRealTimers());

describe("voyageStore", () => {
  it("starts at launch with zero progress", () => {
    const s = voyageStore.getState();
    expect(s.progress).toBe(0);
    expect(s.velocity).toBe(0);
    expect(s.chapter.id).toBe("launch");
    expect(s.distanceAU).toBeCloseTo(9.4, 5);
    expect(s.elapsedMs).toBe(0);
  });

  it("setScroll clamps progress and velocity and derives chapter + distance", () => {
    voyageStore.setScroll(0.27, 0.4);
    let s = voyageStore.getState();
    expect(s.progress).toBe(0.27);
    expect(s.velocity).toBe(0.4);
    expect(s.chapter.id).toBe("orbit");
    expect(s.distanceAU).toBeLessThan(9.4);

    voyageStore.setScroll(1.7, 5);
    s = voyageStore.getState();
    expect(s.progress).toBe(1);
    expect(s.velocity).toBe(1);
    expect(s.chapter.id).toBe("surface");

    voyageStore.setScroll(-0.2, -1);
    s = voyageStore.getState();
    expect(s.progress).toBe(0);
    expect(s.velocity).toBe(0);
  });

  it("treats NaN as 0 and saturates ±Infinity", () => {
    voyageStore.setScroll(NaN, NaN);
    expect(voyageStore.getState().progress).toBe(0);
    expect(voyageStore.getState().velocity).toBe(0);
    expect(voyageStore.getState().chapter.id).toBe("launch");
    voyageStore.setScroll(Infinity, -Infinity);
    expect(voyageStore.getState().progress).toBe(1);
    expect(voyageStore.getState().velocity).toBe(0);
  });

  it("notifies subscribers once per change and supports unsubscribe", () => {
    const cb = vi.fn();
    const off = voyageStore.subscribe(cb);
    voyageStore.setScroll(0.1, 0);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].progress).toBe(0.1);
    off();
    voyageStore.setScroll(0.2, 0);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("does not notify when nothing changed", () => {
    const cb = vi.fn();
    voyageStore.subscribe(cb);
    voyageStore.setScroll(0, 0);
    expect(cb).not.toHaveBeenCalled();
  });

  it("tick accumulates elapsed time", () => {
    voyageStore.tick(250);
    voyageStore.tick(250);
    expect(voyageStore.getState().elapsedMs).toBe(500);
  });

  // Guards the elapsed clock against a non-advancing or non-finite dt (a stalled
  // interval or a NaN frame delta must not poison the T+ readout).
  it("tick ignores non-finite and non-positive deltas", () => {
    voyageStore.tick(250);
    voyageStore.tick(NaN);
    voyageStore.tick(-1);
    voyageStore.tick(0);
    expect(voyageStore.getState().elapsedMs).toBe(250);
  });

  it("scrollTo forwards to the registered scroller with clamped progress", () => {
    const scroller = vi.fn();
    voyageStore.registerScroller(scroller);
    voyageStore.scrollTo(0.5);
    voyageStore.scrollTo(3);
    expect(scroller).toHaveBeenNthCalledWith(1, 0.5);
    expect(scroller).toHaveBeenNthCalledWith(2, 1);
  });

  it("scrollTo is a no-op without a scroller", () => {
    expect(() => voyageStore.scrollTo(0.3)).not.toThrow();
  });

  // The bridge unregisters on unmount; a later scrollTo must not reach a destroyed
  // Lenis instance or a stale native handler.
  it("unregisterScroller detaches the scroller", () => {
    const scroller = vi.fn();
    voyageStore.registerScroller(scroller);
    voyageStore.unregisterScroller();
    voyageStore.scrollTo(0.5);
    expect(scroller).not.toHaveBeenCalled();
  });
});

describe("normalizeVelocity", () => {
  it("maps px/frame to 0..1 using the normalizer, ignoring sign", () => {
    expect(normalizeVelocity(0)).toBe(0);
    expect(normalizeVelocity(VELOCITY_NORMALIZER)).toBe(1);
    expect(normalizeVelocity(-VELOCITY_NORMALIZER / 2)).toBe(0.5);
    expect(normalizeVelocity(1000)).toBe(1);
    expect(normalizeVelocity(NaN)).toBe(0);
  });
});

describe("voyageStore.programmatic", () => {
  it("is false at rest", () => {
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("scrollTo arms the flag and setScroll clears it within EPS of the target", () => {
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.5);
    expect(voyageStore.getState().programmatic).toBe(true);

    voyageStore.setScroll(0.3, 0.6);
    expect(voyageStore.getState().programmatic).toBe(true);

    voyageStore.setScroll(0.5 - PROGRAMMATIC_EPS / 2, 0.1);
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("clears on the wall-clock timeout when the scroller never reaches the target", () => {
    vi.useFakeTimers();
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.9);
    voyageStore.setScroll(0.3, 0.6);
    expect(voyageStore.getState().programmatic).toBe(true);

    vi.advanceTimersByTime(PROGRAMMATIC_TIMEOUT_MS + 1);
    voyageStore.setScroll(0.31, 0.6);
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("tick clears an idle expired trip before the next organic Jump crossing", () => {
    vi.useFakeTimers();
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.9);
    voyageStore.setScroll(0.19, 0.1);
    const states: Array<{ progress: number; programmatic: boolean; elapsedMs: number }> = [];
    voyageStore.subscribe(({ progress, programmatic, elapsedMs }) => {
      states.push({ progress, programmatic, elapsedMs });
    });

    vi.advanceTimersByTime(PROGRAMMATIC_TIMEOUT_MS + 1);
    voyageStore.tick(50);
    expect(voyageStore.getState().programmatic).toBe(false);
    expect(voyageStore.getState().elapsedMs).toBe(50);
    expect(states).toEqual([{ progress: 0.19, programmatic: false, elapsedMs: 50 }]);

    voyageStore.setScroll(0.23, 0.2);
    expect(states[1]).toMatchObject({ progress: 0.23, programmatic: false });
  });

  it("a later scrollTo replaces the target", () => {
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.5);
    voyageStore.scrollTo(0.84);
    voyageStore.setScroll(0.5, 0.4);
    expect(voyageStore.getState().programmatic).toBe(true);
    voyageStore.setScroll(0.84, 0.05);
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("does not arm without a registered scroller (nothing will move)", () => {
    voyageStore.scrollTo(0.5);
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("does not arm when the reader is already at the target", () => {
    const scroller = vi.fn();
    const cb = vi.fn();
    voyageStore.registerScroller(scroller);
    voyageStore.subscribe(cb);
    voyageStore.scrollTo(voyageStore.getState().progress);
    expect(voyageStore.getState().programmatic).toBe(false);
    expect(scroller).toHaveBeenCalledTimes(1);
    expect(cb).not.toHaveBeenCalled();
  });

  it("a later scrollTo at the current position cancels travel before calling the scroller", () => {
    const order: string[] = [];
    voyageStore.registerScroller(() => order.push(`scroll:${voyageStore.getState().programmatic}`));
    voyageStore.scrollTo(0.9);
    voyageStore.setScroll(0.3, 0.1);
    voyageStore.subscribe((s) => order.push(`emit:${s.programmatic}`));
    order.length = 0;

    voyageStore.scrollTo(0.3);
    expect(voyageStore.getState().programmatic).toBe(false);
    expect(order).toEqual(["emit:false", "scroll:false"]);

    voyageStore.setScroll(0.31, 0.1);
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("emits the flag to subscribers", () => {
    const cb = vi.fn();
    voyageStore.registerScroller(vi.fn());
    voyageStore.subscribe(cb);
    voyageStore.scrollTo(0.5);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].programmatic).toBe(true);
    voyageStore.setScroll(0.5, 0);
    expect(cb.mock.calls[1][0].programmatic).toBe(false);
  });

  it("reset() disarms a scroll in flight", () => {
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.5);
    voyageStore.reset();
    expect(voyageStore.getState().programmatic).toBe(false);
    voyageStore.setScroll(0.3, 0.2);
    expect(voyageStore.getState().programmatic).toBe(false);
  });
});

// Native scrolling emits no final velocity=0 event. The clock must settle that sample.
it("clears native idle velocity and suppresses the programmatic arrival frame", () => {
  vi.useFakeTimers();
  try {
    voyageStore.reset();
    voyageStore.setScroll(.21, 1);
    vi.advanceTimersByTime(150);
    voyageStore.tick(50);
    expect(voyageStore.getState().velocity).toBe(0);
    voyageStore.registerScroller(() => {});
    voyageStore.scrollTo(.5);
    voyageStore.setScroll(.5, 1);
    expect(voyageStore.getState().programmatic).toBe(false);
    expect(voyageStore.getState().velocity).toBe(0);
  } finally { vi.useRealTimers(); voyageStore.reset(); }
});
