"use client";

import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
// Type-only: erased at compile time, so no mongoose reaches the client bundle.
import type { Item } from "@/lib/collections/defineCollection";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { panelPose, STATIC_POSE, type PanelPose } from "./servicesLayout";

interface ServicesProps {
  services: Item[];
  /** false in the `still` tier — panels render fully visible with no scroll-derived motion. */
  animated: boolean;
}

const chapter = CHAPTERS.find((c) => c.id === "approach")!;

/** CSS custom properties are not part of React's CSSProperties, so the pose is handed to
 *  CSS through this widened record. The media query — not JS — picks which of the four it
 *  uses, so there is no JS breakpoint (no matchMedia listener). Server/client parity is not
 *  guaranteed by that, though: useReducedMotion() can differ between them, and it holds only
 *  because VoyageRoot never server-renders Services (its `tier === null` boot gate). */
type PoseStyle = CSSProperties & Record<"--dock" | "--arc" | "--tilt" | "--solo" | "--dock-delay", number>;

const poseStyle = (p: PanelPose): PoseStyle => ({
  "--dock": p.dock,
  "--arc": p.arc,
  "--tilt": p.tilt,
  "--solo": p.solo,
  // Unitless ms; the CSS multiplies by 1ms. Desktop dock transition only.
  "--dock-delay": p.delay,
});

/** `Item` is untyped past its three base fields, so every read is narrowed here at the leaf.
 *  `outcomes` (0–4) and `engagement` are both optional in the schema (Q1). */
function readService(item: Item) {
  return {
    title: typeof item.title === "string" ? item.title : "",
    promise: typeof item.promise === "string" ? item.promise : "",
    outcomes: Array.isArray(item.outcomes)
      ? item.outcomes.filter((o): o is string => typeof o === "string")
      : [],
    engagement: typeof item.engagement === "string" ? item.engagement : "",
  };
}

/** Chapter 02. Glass panels dock in a shallow arc over the pinned frame (desktop) or
 *  replace one another inside a shorter pin (mobile). */
export default function Services({ services, animated }: ServicesProps) {
  const s = useVoyage();
  const reduce = useReducedMotion();
  const still = !animated || reduce === true;
  // Before the chapter the panels are dark; after it they are docked (and off-screen).
  const t =
    s.chapter.id === "approach" ? s.chapterProgress : s.progress < chapter.start ? 0 : 1;

  return (
    <section
      id="approach"
      className="chapter chapter--approach"
      style={{ height: `${sectionHeightVh(chapter)}vh` }}
      aria-label="Services"
      data-static={still ? "true" : undefined}
    >
      <div className="chapter__pin">
        <p className="chapter__label">
          {chapter.index} / {chapter.label}
        </p>
        <div className="services">
          {services.map((item, i) => {
            const { title, promise, outcomes, engagement } = readService(item);
            const pose = still ? STATIC_POSE : panelPose(i, services.length, t);
            return (
              <article
                key={item.id}
                className="glass service-panel"
                style={poseStyle(pose)}
                // Mobile only: the panels overlap at full size, and `opacity: 0` does not skip
                // a backdrop filter. This attribute is what the mobile CSS gates the 18px blur
                // on. `visibility: hidden` would do it too, but it would also pull the panel
                // out of the accessibility tree — the blur is what costs, so gate only that.
                data-solo-off={pose.solo < 0.005 ? "true" : undefined}
              >
                {/* Decorative ordinal: hidden so it is not read before every title. */}
                <p className="service-panel__index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</p>
                {/* No heading for a missing CMS title — an empty <h2> is an a11y violation. */}
                {title !== "" && <h2 className="service-panel__title">{title}</h2>}
                <p className="service-panel__promise">{promise}</p>
                {outcomes.length > 0 && (
                  // Explicit role: `list-style: none` drops list semantics in Safari/VoiceOver.
                  <ul className="service-panel__outcomes" role="list">
                    {/* Chips can repeat, so the index is part of the key. */}
                    {outcomes.map((o, oi) => (
                      <li key={`${o}-${oi}`}>{o}</li>
                    ))}
                  </ul>
                )}
                {engagement !== "" && (
                  <p className="service-panel__engagement">
                    <span>Typical engagement</span>
                    {engagement}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
