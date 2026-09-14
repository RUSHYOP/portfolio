import { describe, it, expect, beforeEach, vi } from "vitest";
import { voyageStore, normalizeVelocity, VELOCITY_NORMALIZER } from "./voyageStore";

beforeEach(() => voyageStore.reset());

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
