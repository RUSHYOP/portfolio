// @vitest-environment jsdom
// Hook-level tests for the Jump edge detector: the pure decision is covered in
// jumpBeat.test.ts; these pin the wiring — seeding, the animated gate, the store's
// programmatic flag, the side effects and the hold release on an idle tick.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { voyageStore, PROGRAMMATIC_TIMEOUT_MS } from "@/scene/scroll/voyageStore";
import { logClient } from "@/lib/clientLog";
import { JUMP_HOLD_MS } from "./jumpBeat";
import { useJumpBeat } from "./useJumpBeat";

// vi.mock is hoisted above the imports, so the spy has to be hoisted with it.
const { whoosh } = vi.hoisted(() => ({ whoosh: vi.fn() }));

// Factory form: the real engine (Web Audio) never loads.
vi.mock("@/lib/audio/AudioEngine", () => ({ getAudioEngine: () => ({ whoosh }) }));
// Automocked: no console line and no fetch to /api/logs.
vi.mock("@/lib/clientLog");

/** Monotonic clock the hook's hold deadline is computed from. */
let nowMs = 1000;

beforeEach(() => {
  voyageStore.reset();
  whoosh.mockClear();
  vi.mocked(logClient).mockClear();
  nowMs = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => nowMs);
});

// vitest.config.mts has no `globals: true`, so RTL's auto-cleanup hook never registers.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Store emits call setLetterbox outside React's event system, so each one goes in act(). */
const scroll = (p: number, v = 0.5) => act(() => voyageStore.setScroll(p, v));

describe("useJumpBeat", () => {
  it("drops the bars and fires the whoosh + log once on approach → jump", () => {
    const { result } = renderHook(() => useJumpBeat(true));
    scroll(0.15);                                    // approach
    expect(result.current).toBe(false);
    scroll(0.21);                                    // jump
    expect(result.current).toBe(true);
    expect(whoosh).toHaveBeenCalledTimes(1);
    expect(logClient).toHaveBeenCalledTimes(1);
    expect(logClient).toHaveBeenCalledWith("voyage.jump", { progress: 0.21 });
  });

  it("does nothing when not animated (still tier)", () => {
    const { result } = renderHook(() => useJumpBeat(false));
    scroll(0.15);
    scroll(0.21);
    expect(result.current).toBe(false);
    expect(whoosh).not.toHaveBeenCalled();
    expect(logClient).not.toHaveBeenCalled();
  });

  it("is suppressed while a programmatic scrollTo is in flight", () => {
    voyageStore.registerScroller(vi.fn());
    const { result } = renderHook(() => useJumpBeat(true));
    act(() => voyageStore.scrollTo(0.5));
    scroll(0.25, 0.8);                               // crosses into orbit, target not reached
    expect(voyageStore.getState().programmatic).toBe(true);
    expect(result.current).toBe(false);
    expect(whoosh).not.toHaveBeenCalled();
  });

  // Final-review regression (Important #1): after an interrupted scrollTo times out, the
  // idle tick must carry `false`, or prevProgrammatic stays true and the next genuine
  // one-emit flick across the band is suppressed.
  it("fires on a genuine crossing after an interrupted scrollTo has timed out", () => {
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(0);
    voyageStore.registerScroller(vi.fn());
    const { result } = renderHook(() => useJumpBeat(true));
    act(() => voyageStore.scrollTo(0.9));
    scroll(0.15, 0.6);                               // interrupted in approach
    dateNow.mockReturnValue(PROGRAMMATIC_TIMEOUT_MS + 1);
    act(() => voyageStore.tick(250));                // idle tick past the deadline
    scroll(0.25, 1);                                 // one-emit flick to orbit
    expect(result.current).toBe(true);
    expect(whoosh).toHaveBeenCalledTimes(1);
  });

  it("seeds from the store, so mounting past the band never fires", () => {
    voyageStore.setScroll(0.3, 0);                   // already in orbit before mount
    const { result } = renderHook(() => useJumpBeat(true));
    scroll(0.31, 0);                                 // next emit, still orbit
    expect(result.current).toBe(false);
    expect(whoosh).not.toHaveBeenCalled();
  });

  it("lifts the bars when the tier leaves animated mid-hold", () => {
    const { result, rerender } = renderHook(({ animated }) => useJumpBeat(animated), {
      initialProps: { animated: true },
    });
    scroll(0.15);
    scroll(0.21);
    expect(result.current).toBe(true);
    rerender({ animated: false });
    expect(result.current).toBe(false);
  });

  it("releases the hold on an idle tick once it lapses outside the band", () => {
    const { result } = renderHook(() => useJumpBeat(true));
    scroll(0.15);
    scroll(0.21);                                    // fires at 1000 → hold until 1900
    nowMs = 1100;
    scroll(0.25);                                    // left the band: deadline frozen
    expect(result.current).toBe(true);
    nowMs = 1000 + JUMP_HOLD_MS + 100;
    act(() => voyageStore.tick(250));
    expect(result.current).toBe(false);
  });
});
