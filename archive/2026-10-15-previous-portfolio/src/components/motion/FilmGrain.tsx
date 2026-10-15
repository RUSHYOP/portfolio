"use client";

import { useEffect, useState } from "react";

/**
 * Subtle animated film-grain overlay using SVG turbulence.
 * Disabled with prefers-reduced-motion.
 */
export default function FilmGrain() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setEnabled(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setEnabled(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!enabled) return null;

  return (
    <svg className="film-grain" aria-hidden="true" focusable="false">
      <filter id="film-grain-filter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
        >
          <animate
            attributeName="seed"
            from="0"
            to="100"
            dur="3s"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 1
                  0 0 0 0 1
                  0 0 0 0 1
                  0 0 0 0.6 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#film-grain-filter)" />
    </svg>
  );
}
