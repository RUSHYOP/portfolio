"use client";

import { useEffect, useRef } from "react";
import type { Tier } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { hashArrivalProgress } from "./chapterHash";

/**
 * /voyage#<chapter> arrivals (the "Back to the voyage" link on /work/<slug> is /voyage#worlds).
 * The section ids only exist after VoyageRoot's `tier === null` boot gate, so neither the browser's
 * fragment jump nor Next's post-navigation scroll can find them: the reader would land at the top.
 * Once the tier resolves, jump to the named chapter ourselves. Child effects run before their
 * parent's in one commit, so VoyageScroll has registered its scroller by then; `immediate` skips
 * the 1.4s tween (and stays programmatic, so crossing the Jump band fires no beat).
 *
 * One-shot and ref-guarded: an FPS-probe demotion changes `tier` again and must not re-scroll a
 * reader who has since moved on. The shot is only consumed once the tier is resolved, so React
 * StrictMode's doubled effects on the (null-tier) first mount cannot spend it. The hash is read
 * when the tier resolves, not when the hook mounts.
 */
export function useHashArrival(tier: Tier | null): void {
  const handled = useRef(false);
  useEffect(() => {
    if (tier === null || handled.current) return;
    handled.current = true;
    const target = hashArrivalProgress(window.location.hash);
    if (target === null) return;
    voyageStore.scrollTo(target, { immediate: true });
    // Drop the fragment so a late browser fragment scroll (seen on a cold dev load: it landed on the
    // section top, 0.35385, not our 0.35484) has nothing left to re-apply. history.state passes through
    // unchanged: the Next app router keeps its own state there, and Next 16 syncs native replaceState.
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }, [tier]);
}
