"use client";

import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
// Type-only: erased at compile time, so no mongoose reaches the client bundle.
import type { Item } from "@/lib/collections/defineCollection";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { stepSolo, ORBIT_HOLD_MOBILE } from "@/scene/chapters/orbitSchedule";
import { useVoyage } from "@/scene/scroll/useVoyage";

interface ProcessProps {
  steps: Item[];
  /** false in the `still` tier — every step renders stacked and fully visible, no scroll-derived motion. */
  animated: boolean;
}

const chapter = CHAPTERS.find((c) => c.id === "orbit")!;

/** CSS custom properties are not part of React's CSSProperties, so the one value CSS needs
 *  (a panel's visibility, 0..1) is handed over through this widened record. */
type SoloStyle = CSSProperties & Record<"--solo", number>;

/** `Item` is untyped past its three base fields, so every read is narrowed here at the leaf.
 *  `title` and `what` are required in the schema and `deliverable` / `duration` optional, but
 *  the CMS is data-driven, so nothing here may assume a string. */
function readStep(item: Item) {
  return {
    title: typeof item.title === "string" ? item.title : "",
    what: typeof item.what === "string" ? item.what : "",
    deliverable: typeof item.deliverable === "string" ? item.deliverable : "",
    duration: typeof item.duration === "string" ? item.duration : "",
  };
}

/** One labelled field of a step. Rendered only when it has text (label and value go together). */
function Field({ label, value }: { label: string; value: string }) {
  if (value === "") return null;
  return (
    <p className="process-panel__field">
      <span>{label}</span>
      {value}
    </p>
  );
}

/** Chapter 04. One glass panel at a time, replaced in place as the ring turns the next node
 *  front-centre. The schedule (orbitSchedule.stepSolo) is shared with the ring, so panel and
 *  node always change together. Same panel on desktop and mobile; only the CSS box differs. */
export default function Process({ steps, animated }: ProcessProps) {
  const s = useVoyage();
  const reduce = useReducedMotion();
  const still = !animated || reduce === true;

  return (
    <section
      id="orbit"
      className="chapter chapter--orbit"
      style={{ height: `${sectionHeightVh(chapter)}vh` }}
      aria-label="Process"
      data-static={still ? "true" : undefined}
    >
      <div className="chapter__pin">
        <p className="chapter__label">
          {chapter.index} / {chapter.label}
        </p>
        {steps.length > 0 && (
          <div className="process">
            {steps.map((item, i) => {
              const { title, what, deliverable, duration } = readStep(item);
              // Outside Orbit nothing shows (stepSolo(last) is 1 at the chapter's end, and the
              // panels have no fade-out of their own: the pin's release is their exit).
              const solo = still ? 1 : s.chapter.id === "orbit" ? stepSolo(i, steps.length, s.chapterProgress) : 0;
              // `opacity: 0` does not skip a backdrop filter, so the CSS gates the blur and the
              // pointer events on this attribute (not on visibility, which would also pull the
              // panel out of the accessibility tree).
              const off = solo < 0.005;
              const style: SoloStyle = { "--solo": solo };
              return (
                <article
                  key={item.id}
                  className="glass process-panel"
                  style={style}
                  data-solo-off={off ? "true" : undefined}
                  // The panel scrolls (`overflow-y: auto`) when a long step does not fit the
                  // pin, and a scroll region needs a tab stop. Only the ACTIVE panel gets one
                  // (solo >= 0.5 — not every panel mid-cross-fade, and none once Orbit is over);
                  // the static tier does not scroll at all. Also none once the longest pin hold
                  // (mobile, cp 0.787) is over: on desktop the last panel stays at full solo while
                  // its pin scrolls off-screen, and an off-screen tab stop would pull the page back.
                  tabIndex={!still && solo >= 0.5 && s.chapterProgress < ORBIT_HOLD_MOBILE ? 0 : undefined}
                >
                  {/* Decorative ordinal: hidden so it is not read before every title. */}
                  <p className="process-panel__index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</p>
                  {/* No heading for a missing CMS title — an empty <h2> is an a11y violation. */}
                  {title !== "" && <h2 className="process-panel__title">{title}</h2>}
                  <Field label="What happens" value={what} />
                  <Field label="What you get" value={deliverable} />
                  <Field label="How long" value={duration} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
