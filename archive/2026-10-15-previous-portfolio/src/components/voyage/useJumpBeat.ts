"use client";

import { useEffect, useState } from "react";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import { logClient } from "@/lib/clientLog";
import { chapterIndex, decideJumpBeat } from "./jumpBeat";

/**
 * Chapter 03's edge detector: returns whether the Jump letterbox should be down.
 *
 * Subscribes to the store rather than re-rendering per frame, and holds the only two
 * pieces of state the store cannot carry — the previous emit's chapter/flag, and the
 * current hold deadline. Every decision is made by the pure decideJumpBeat().
 *
 * The 250ms idle `tick` in VoyageScroll is load-bearing in both directions: inside the band
 * it is what *renews* the hold, so a slow or keyboard pass cannot lift the bars mid-burst;
 * outside it, it is what re-evaluates and releases the hold once the reader has stopped
 * scrolling. Without an emit the bars would simply stay down.
 */
export function useJumpBeat(animated: boolean): boolean {
  const [letterbox, setLetterbox] = useState(false);

  useEffect(() => {
    // `still` tier: the store still reports chapter "jump", so the gate lives here.
    if (!animated) return;
    // subscribe() does not invoke the listener immediately (voyageStore.ts:82-87), so the
    // previous-emit refs are seeded from the current state.
    const seed = voyageStore.getState();
    let prevIndex = chapterIndex(seed.chapter.id);
    let prevProgrammatic = seed.programmatic;
    let holdUntilMs = 0;

    const unsubscribe = voyageStore.subscribe((s) => {
      const nextIndex = chapterIndex(s.chapter.id);
      const result = decideJumpBeat({
        prevIndex,
        nextIndex,
        prevProgrammatic,
        nextProgrammatic: s.programmatic,
        // Monotonic clock: the hold deadline is only ever compared against values this
        // closure produced, so a wall-clock adjustment can never strand or skip the hold.
        nowMs: performance.now(),
        holdUntilMs,
      });
      prevIndex = nextIndex;
      prevProgrammatic = s.programmatic;
      holdUntilMs = result.holdUntilMs;
      if (result.fire) {
        // The engine self-guards on muted / uninitialised (AudioEngine.ts:205-208), and
        // playWhoosh({ direction: 1 }) is already the upward sweep spec §3:64 asks for.
        getAudioEngine().whoosh({ volume: 0.12, direction: 1 });
        logClient("voyage.jump", { progress: Number(s.progress.toFixed(4)) });
      }
      // React bails out when the value is unchanged, so the 4/s idle ticks cost nothing.
      setLetterbox(result.letterbox);
    });

    return () => {
      unsubscribe();
      // Leaving the animated tier (e.g. context loss → still) must not strand the bars down.
      setLetterbox(false);
    };
  }, [animated]);

  return letterbox;
}
