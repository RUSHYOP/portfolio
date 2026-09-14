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

/** Bridges page scroll (Lenis or native) into voyageStore. Renders nothing. */
export default function VoyageScroll({ smooth }: VoyageScrollProps) {
  useEffect(() => {
    // Drives the T+ readout independently of scroll activity.
    const tick = setInterval(() => voyageStore.tick(250), 250);

    if (smooth) {
      const lenis = new Lenis({ autoRaf: true, lerp: 0.1, smoothWheel: true });
      // Lenis passes its own instance to the scroll callback (ScrollCallback = (lenis: Lenis) => void).
      lenis.on("scroll", (e) => {
        // progress is scroll/limit — 0/0 = NaN before layout; the store maps NaN to 0,
        // which would snap the HUD back to "launch" mid-voyage. Skip the frame instead.
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
      const frames = Math.max(1, (now - lastT) / 16.67);
      const vel = normalizeVelocity((y - lastY) / frames);
      lastY = y;
      lastT = now;
      const progress = y / maxScroll();
      // Symmetric with the Lenis branch; maxScroll() floors at 1 so this is already safe.
      if (!Number.isFinite(progress)) return;
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
