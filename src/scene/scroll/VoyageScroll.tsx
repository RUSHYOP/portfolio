"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { CHAPTERS } from "@/scene/camera/flightPath";
import { measureScrollSegments, toScroll, toVoyage, type ScrollSegment } from "./scrollGeometry";
import { voyageStore, normalizeVelocity, PROGRAMMATIC_TIMEOUT_MS } from "./voyageStore";

interface VoyageScrollProps {
  /** false → native scroll (reduced motion / still tier). */
  smooth: boolean;
}

/** T+ clock cadence, in ms. Shared by the interval delay and the tick delta so they cannot drift. */
const TICK_MS = 50;

/** Bridges page scroll (Lenis or native) into voyageStore. Renders nothing. */
export default function VoyageScroll({ smooth }: VoyageScrollProps) {
  useEffect(() => {
    const track = document.querySelector<HTMLElement>(".voyage-track");
    let segments: ScrollSegment[] = [];
    const measure = () => {
      segments = measureScrollSegments(track, CHAPTERS, window.scrollY, window.innerHeight);
      voyageStore.setScroll(toVoyage(window.scrollY, segments), 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (track) {
      observer.observe(track);
      track.querySelectorAll<HTMLElement>(":scope > section").forEach(section => observer.observe(section));
    }
    window.addEventListener("resize", measure);
    const cleanupGeometry = () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
    // Drives the T+ readout independently of scroll activity.
    const tick = setInterval(() => voyageStore.tick(TICK_MS), TICK_MS);

    if (smooth) {
      const lenis = new Lenis({ autoRaf: true, lerp: 0.1, smoothWheel: true });
      let navigationDeadline = 0;
      // Lenis emits nothing on construction; seed from the restored scroll position like the native branch does.
      voyageStore.setScroll(toVoyage(window.scrollY, segments), 0);
      // Lenis passes its own instance to the scroll callback (ScrollCallback = (lenis: Lenis) => void).
      lenis.on("scroll", (e) => {
        // An unscrollable page (limit 0, e.g. before layout) reports progress === 1, which would
        // snap the HUD to the final chapter. Skip those frames; the finiteness check is kept for
        // forward-compatibility in case the ratio ever becomes NaN/Infinity.
        if (e.limit <= 0) return;
        if (!Number.isFinite(e.progress)) return;
        voyageStore.setScroll(toVoyage(e.scroll, segments), Date.now() < navigationDeadline ? 0 : normalizeVelocity(e.velocity));
      });
      voyageStore.registerScroller((p) => {
        // Canonical epsilon can be reached before Lenis has finished its physical tail.
        // Keep velocity/audio quiet until its completion callback, with a bounded timeout
        // for interrupted animations. The store retains its existing public API.
        navigationDeadline = Date.now() + PROGRAMMATIC_TIMEOUT_MS;
        lenis.scrollTo(toScroll(p, segments), {
          duration: 1.4,
          onComplete: () => {
            navigationDeadline = 0;
            voyageStore.setScroll(toVoyage(window.scrollY, segments), 0);
          },
        });
      });
      return () => {
        cleanupGeometry();
        clearInterval(tick);
        voyageStore.unregisterScroller();
        lenis.destroy();
      };
    }

    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const progress = toVoyage(y, segments);
      // Preserve the velocity sample if a nonfinite frame is skipped.
      if (!Number.isFinite(progress)) return;
      const frames = Math.max(1, (now - lastT) / 16.67);
      const vel = normalizeVelocity((y - lastY) / frames);
      lastY = y;
      lastT = now;
      voyageStore.setScroll(progress, vel);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    voyageStore.registerScroller((p) => window.scrollTo({ top: toScroll(p, segments), behavior: "auto" }));
    onScroll();
    return () => {
      cleanupGeometry();
      clearInterval(tick);
      voyageStore.unregisterScroller();
      window.removeEventListener("scroll", onScroll);
    };
  }, [smooth]);

  return null;
}
