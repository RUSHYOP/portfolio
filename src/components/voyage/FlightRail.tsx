"use client";

import { CONTENT_CHAPTERS } from "@/scene/camera/flightPath";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { voyageStore } from "@/scene/scroll/voyageStore";

/** Right-edge 1px rail: a tick per content chapter, an amber progress dot. Hidden under 1024px via CSS. */
export default function FlightRail() {
  const s = useVoyage();
  return (
    <nav className="rail" aria-label="Voyage chapters">
      <div className="rail__line" />
      <div className="rail__dot" style={{ top: `${s.progress * 100}%` }} aria-hidden="true" />
      {CONTENT_CHAPTERS.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`rail__tick${s.chapter.id === c.id ? " is-active" : ""}`}
          style={{ top: `${c.start * 100}%` }}
          onClick={() => voyageStore.scrollTo(c.start + 0.001)}
          aria-label={`Go to chapter ${c.index} ${c.label}`}
          aria-current={s.chapter.id === c.id ? "step" : undefined}
          data-cursor="hover"
        >
          <span className="rail__label">
            {c.index} / {c.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
