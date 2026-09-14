"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { voyageStore, normalizeVelocity } from "./voyageStore";

interface VoyageScrollProps {
  /** false → native scroll (reduced motion / still tier). */
  smooth: boolean;
}

function maxScroll(): number {
  return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
}

/** T+ clock cadence, in ms. Shared by the interval delay and the tick delta so they cannot drift. */
const TICK_MS = 250;

/** Bridges page scroll (Lenis or native) into voyageStore. Renders nothing. */
export default function VoyageScroll({ smooth }: VoyageScrollProps) {
  useEffect(() => {
    // Drives the T+ readout independently of scroll activity.
    const tick = setInterval(() => voyageStore.tick(TICK_MS), TICK_MS);

    if (smooth) {
      const lenis = new Lenis({ autoRaf: true, lerp: 0.1, smoothWheel: true });
      // Lenis emits nothing on construction; seed from the restored scroll position like the native branch does.
      voyageStore.setScroll(window.scrollY / maxScroll(), 0);
      // Lenis passes its own instance to the scroll callback (ScrollCallback = (lenis: Lenis) => void).
      lenis.on("scroll", (e) => {
        // An unscrollable page (limit 0, e.g. before layout) reports progress === 1, which would
        // snap the HUD to the final chapter. Skip those frames; the finiteness check is kept for
        // forward-compatibility in case the ratio ever becomes NaN/Infinity.
        if (e.limit <= 0) return;
        if (!Number.isFinite(e.progress)) return;
        voyageStore.setScroll(e.progress, normalizeVelocity(e.velocity));
      });
      voyageStore.registerScroller((p) => lenis.scrollTo(p * maxScroll(), { duration: 1.4 }));
      return () => {
        clearInterval(tick);
        lenis.destroy();
      };
    }

    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const progress = y / maxScroll();
      // Guard before mutating lastY/lastT, so a skipped frame does not swallow the delta it
      // carried. maxScroll() floors at 1, so this cannot fire today; kept for parity with the
      // Lenis branch's finiteness guard.
      if (!Number.isFinite(progress)) return;
      const frames = Math.max(1, (now - lastT) / 16.67);
      const vel = normalizeVelocity((y - lastY) / frames);
      lastY = y;
      lastT = now;
      voyageStore.setScroll(progress, vel);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    voyageStore.registerScroller((p) => window.scrollTo({ top: p * maxScroll(), behavior: "auto" }));
    onScroll();
    return () => {
      clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
    };
  }, [smooth]);

  return null;
}
