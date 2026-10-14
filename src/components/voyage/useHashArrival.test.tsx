// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StrictMode } from "react";
import { renderHook, cleanup } from "@testing-library/react";
import { CHAPTERS } from "@/scene/camera/flightPath";
import { voyageStore, PROGRAMMATIC_EPS } from "@/scene/scroll/voyageStore";
import type { Tier } from "@/scene/quality";
import { useHashArrival } from "./useHashArrival";

const worlds = CHAPTERS.find((c) => c.id === "worlds")!;
const setHash = (hash: string) => window.history.replaceState(null, "", `/voyage${hash}`);

let scrollTo: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  voyageStore.reset();
  scrollTo = vi.spyOn(voyageStore, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setHash("");
});

describe("useHashArrival", () => {
  it("does nothing while the tier is unresolved (the sections it would land on are behind the boot gate)", () => {
    setHash("#worlds");
    renderHook(() => useHashArrival(null));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("jumps once, to the named chapter's start + 0.001, immediately, when the tier resolves", () => {
    setHash("#worlds");
    const { rerender } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
      initialProps: { tier: null as Tier | null },
    });
    expect(scrollTo).not.toHaveBeenCalled();
    rerender({ tier: "high" });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(worlds.start + 0.001, { immediate: true });
  });

  it("is one-shot: an FPS-probe demotion (a later tier change) must not re-scroll a reader who has moved on", () => {
    setHash("#worlds");
    const { rerender } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
      initialProps: { tier: null as Tier | null },
    });
    rerender({ tier: "high" });
    rerender({ tier: "mid" });
    rerender({ tier: "still" });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("never scrolls for an empty, unknown or micro-beat hash, and consumes its one shot doing nothing", () => {
    for (const hash of ["", "#", "#nope", "#jump", "#worlds-extra"]) {
      setHash(hash);
      const { rerender, unmount } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
        initialProps: { tier: null as Tier | null },
      });
      rerender({ tier: "high" });
      unmount();
    }
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("still calls once under React StrictMode's doubled effects", () => {
    setHash("#worlds");
    const { rerender } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
      wrapper: StrictMode,
      initialProps: { tier: null as Tier | null },
    });
    rerender({ tier: "high" });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("calls once even when StrictMode double-runs the effect on a mount that already has a tier", () => {
    setHash("#worlds");
    renderHook(() => useHashArrival("high"), { wrapper: StrictMode });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("clears the fragment after an arrival (so a late browser fragment scroll has nothing to re-apply), keeping path, query and history.state", () => {
    const sentinel = { __sentinel: "next-router-state" };
    window.history.replaceState(sentinel, "", "/voyage?ref=back#worlds");
    renderHook(() => useHashArrival("high"));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/voyage");
    expect(window.location.search).toBe("?ref=back");
    expect(window.history.state).toBe(sentinel);
  });

  it("leaves the URL and history.state untouched for an unknown or empty hash", () => {
    for (const hash of ["", "#nope", "#jump"]) {
      const sentinel = { __sentinel: hash };
      window.history.replaceState(sentinel, "", `/voyage?q=1${hash}`);
      const before = window.location.href;
      const { unmount } = renderHook(() => useHashArrival("high"));
      unmount();
      expect(window.location.href).toBe(before);
      expect(window.history.state).toBe(sentinel);
    }
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("reads the hash when the tier resolves, not when the hook mounts", () => {
    const { rerender } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
      initialProps: { tier: null as Tier | null },
    });
    setHash("#belt");                                              // a navigation landed while the voyage was booting
    rerender({ tier: "high" });
    expect(scrollTo).toHaveBeenCalledWith(CHAPTERS.find((c) => c.id === "belt")!.start + 0.001, { immediate: true });
  });

  // M1 (final review): one cold load once landed at 0.2416 with the hash already cleared and no way
  // back. The hook now verifies the landing on the next frame and after ~300 ms and re-asserts it.
  describe("landing verification", () => {
    const target = worlds.start + 0.001;
    let frames: Map<number, FrameRequestCallback>;
    let nextId: number;
    const flushFrame = () => {
      const due = [...frames.values()];
      frames.clear();
      due.forEach((cb) => cb(0));
    };
    beforeEach(() => {
      vi.useFakeTimers();
      frames = new Map();
      nextId = 1;
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
        frames.set(nextId, cb);
        return nextId++;
      });
      vi.stubGlobal("cancelAnimationFrame", (id: number) => void frames.delete(id));
      setHash("#worlds");
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it("re-asserts the target when the store has not reached it on the next frame, and again at ~300 ms", () => {
      renderHook(() => useHashArrival("high"));
      expect(scrollTo).toHaveBeenCalledTimes(1);
      flushFrame();
      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(scrollTo).toHaveBeenLastCalledWith(target, { immediate: true });
      vi.advanceTimersByTime(300);
      expect(scrollTo).toHaveBeenCalledTimes(3);
      expect(scrollTo).toHaveBeenLastCalledWith(target, { immediate: true });
    });

    it("does not retry when the store is within the programmatic epsilon of the target at both checks", () => {
      renderHook(() => useHashArrival("high"));
      voyageStore.setScroll(target + PROGRAMMATIC_EPS / 2, 0);
      flushFrame();
      vi.advanceTimersByTime(300);
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it("retries only the check that fails (frame ok, 300 ms late displacement)", () => {
      renderHook(() => useHashArrival("high"));
      voyageStore.setScroll(target, 0);
      flushFrame();
      expect(scrollTo).toHaveBeenCalledTimes(1);
      voyageStore.setScroll(0.2416, 0);                            // a late native scroll displaced it
      vi.advanceTimersByTime(300);
      expect(scrollTo).toHaveBeenCalledTimes(2);
    });

    it("caps the retries at two however long the store stays off target", () => {
      renderHook(() => useHashArrival("high"));
      flushFrame();
      vi.advanceTimersByTime(300);
      flushFrame();
      vi.advanceTimersByTime(5000);
      expect(scrollTo).toHaveBeenCalledTimes(3);                   // the arrival + at most two retries
      expect(frames.size).toBe(0);
    });

    it("cancels the pending checks on unmount (no retry after the hook is gone)", () => {
      const { unmount } = renderHook(() => useHashArrival("high"));
      unmount();
      expect(frames.size).toBe(0);
      flushFrame();
      vi.advanceTimersByTime(1000);
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it("keeps its checks alive through StrictMode's simulated unmount, still scrolling once", () => {
      renderHook(() => useHashArrival("high"), { wrapper: StrictMode });
      expect(scrollTo).toHaveBeenCalledTimes(1);
      flushFrame();
      expect(scrollTo).toHaveBeenCalledTimes(2);
    });

    it("does not re-arm the checks when a later tier change re-runs the effect", () => {
      const { rerender } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
        initialProps: { tier: "high" as Tier | null },
      });
      flushFrame();
      vi.advanceTimersByTime(300);
      expect(scrollTo).toHaveBeenCalledTimes(3);
      rerender({ tier: "mid" });
      expect(frames.size).toBe(0);
      vi.advanceTimersByTime(1000);
      expect(scrollTo).toHaveBeenCalledTimes(3);
    });

    it("schedules no checks for an unknown hash", () => {
      setHash("#nope");
      renderHook(() => useHashArrival("high"));
      expect(frames.size).toBe(0);
      vi.advanceTimersByTime(1000);
      expect(scrollTo).not.toHaveBeenCalled();
    });
  });
});
