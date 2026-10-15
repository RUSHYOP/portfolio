"use client";

import { useEffect, useRef } from "react";
import type { Tier } from "@/scene/quality";
import { voyageStore, PROGRAMMATIC_EPS } from "@/scene/scroll/voyageStore";
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
 *
 * Verified landing (final review M1): a cold load once ended at 0.2416 with the hash already cleared,
 * and nothing could recover it (a stale Lenis `limit` or a late native scroll are the suspects). So
 * the arrival is re-checked on the next frame and again after VERIFY_DELAY_MS, and if the store is
 * not within PROGRAMMATIC_EPS of the target, the immediate scroll is repeated (at most MAX_RETRIES
 * times in all). The checks are cancelled on unmount.
 */
const VERIFY_DELAY_MS = 300;
const MAX_RETRIES = 2;

export function useHashArrival(tier: Tier | null): void {
  const handled = useRef(false);
  // Survives StrictMode's simulated unmount (a ref), so the re-run effect re-arms the same checks
  // instead of re-scrolling; null once both checks have run (a later tier change then re-arms nothing).
  const pending = useRef<{ target: number; retries: number; frameDone: boolean; timerDone: boolean } | null>(null);
  useEffect(() => {
    if (tier === null) return;
    if (!handled.current) {
      handled.current = true;
      const target = hashArrivalProgress(window.location.hash);
      if (target === null) return;
      voyageStore.scrollTo(target, { immediate: true });
      pending.current = { target, retries: 0, frameDone: false, timerDone: false };
      // Drop the fragment so a late browser fragment scroll (seen on a cold dev load: it landed on the
      // section top, 0.35385, not our 0.35484) has nothing left to re-apply. history.state passes through
      // unchanged: the Next app router keeps its own state there, and Next 16 syncs native replaceState.
      // Cleared immediately, not after the final check: the retries below make the landing
      // recoverable, `scroll-margin-top` (voyage.css) already makes any late native fragment scroll
      // land on the same lit point, and a fragment left in the URL for 300 ms buys nothing.
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    const job = pending.current;
    if (job === null) return;
    // One verification: re-assert the target if the store is off it and retries remain.
    const verify = () => {
      if (Math.abs(voyageStore.getState().progress - job.target) < PROGRAMMATIC_EPS) return;
      if (job.retries >= MAX_RETRIES) return;
      job.retries += 1;
      voyageStore.scrollTo(job.target, { immediate: true });
    };
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!job.frameDone) {
      raf = requestAnimationFrame(() => {
        job.frameDone = true;
        verify();
      });
    }
    if (!job.timerDone) {
      timer = setTimeout(() => {
        job.timerDone = true;
        verify();
        pending.current = null;                                  // both checks have run
      }, VERIFY_DELAY_MS);
    }
    // Unmount (or a tier change, which re-arms only what has not run yet) cancels what is pending.
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [tier]);
}
