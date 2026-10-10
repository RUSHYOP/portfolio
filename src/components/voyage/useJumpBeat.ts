"use client";

import { useEffect, useState } from "react";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import { logClient } from "@/lib/clientLog";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { chapterIndex, decideJumpBeat } from "./jumpBeat";

/**
 * Chapter 03's edge detector: returns whether the Jump letterbox should be down.
 *
 * Subscribes to the store rather than re-rendering per frame, and holds the only two
 * pieces of state the store cannot carry — the previous emit's chapter/flag, and the
 * current hold deadline. Every decision is made by the pure decideJumpBeat().
 *
 * The 250ms idle `tick` in VoyageScroll is load-bearing in both directions: inside the band
 * it is what renews the hold, so a slow or keyboard pass cannot lift the bars mid-burst;
 * outside it, it re-evaluates and releases the hold once the reader has stopped scrolling.
 */
export function useJumpBeat(animated: boolean): boolean {
  const [letterbox, setLetterbox] = useState(false);

  useEffect(() => {
    // In the `still` tier the store can still report chapter "jump", so gate the beat here.
    if (!animated) return;
    // subscribe() does not invoke the listener immediately, so seed from current state.
    const seed = voyageStore.getState();
    let prevIndex = chapterIndex(seed.chapter.id);
    let prevProgrammatic = seed.programmatic;
    let holdUntilMs = 0;

    return voyageStore.subscribe((s) => {
      const result = decideJumpBeat({
        prevIndex,
        nextIndex: chapterIndex(s.chapter.id),
        prevProgrammatic,
        nextProgrammatic: s.programmatic,
        nowMs: Date.now(),
        holdUntilMs,
      });
      prevIndex = chapterIndex(s.chapter.id);
      prevProgrammatic = s.programmatic;
      holdUntilMs = result.holdUntilMs;
      if (result.fire) {
        // AudioEngine self-guards while muted or uninitialised.
        getAudioEngine().whoosh({ volume: 0.12, direction: 1 });
        logClient("voyage.jump", { progress: Number(s.progress.toFixed(4)) });
      }
      // React bails out when unchanged, so idle ticks do not cause repeated renders.
      setLetterbox(result.letterbox);
    });
  }, [animated]);

  return letterbox;
}
