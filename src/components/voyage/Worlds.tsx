"use client";

import { useEffect, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
// Type-only: erased at compile time, so marked / sanitize-html never reach the client bundle.
import type { WorldCase } from "@/lib/worldCase";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { caseTarget, WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE } from "@/scene/chapters/worldsSchedule";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { useMediaQuery } from "./useMediaQuery";

interface WorldsProps {
  cases: WorldCase[];
  /** false in the `still` tier — every case renders stacked and fully visible, no scroll-derived motion. */
  animated: boolean;
}

const chapter = CHAPTERS.find((c) => c.id === "worlds")!;

/** The three excerpt columns, in reading order. */
const COLUMNS = [
  ["problem", "Problem"],
  ["architecture", "Architecture"],
  ["outcome", "Outcome"],
] as const;

/** CSS custom properties are not part of React's CSSProperties, so the one value CSS needs
 *  (a panel's target visibility, 0 or 1 — the CSS transition animates it) is handed over
 *  through this widened record. */
type SoloStyle = CSSProperties & Record<"--solo", number>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** The DTO is typed, but the CMS is data: every field is narrowed again here at the leaf, as
 *  Services and Process do, so a malformed case degrades to missing text and never throws. */
function readCase(c: WorldCase) {
  const excerpts: Record<string, unknown> =
    typeof c.excerpts === "object" && c.excerpts !== null ? (c.excerpts as unknown as Record<string, unknown>) : {};
  return {
    slug: str(c.slug),
    title: str(c.title),
    client: str(c.client),
    context: str(c.context),
    diagram: str(c.diagram),
    stack: Array.isArray(c.stack) ? c.stack.filter((s): s is string => typeof s === "string" && s !== "") : [],
    excerpts: COLUMNS.map(([key, label]) => ({ key, label, text: str(excerpts[key]) })).filter((e) => e.text !== ""),
  };
}

/** Chapter 05. One glass panel at a time on the left, replaced in place as the camera carries
 *  the next planet into frame. The schedule is shared with the planets (caseTarget switches at
 *  the middle of their travel), so panel and planet change together. */
export default function Worlds({ cases, animated }: WorldsProps) {
  const s = useVoyage();
  const reduce = useReducedMotion();
  // The same breakpoint voyage.css uses for the 64vh phone pin; false before hydration.
  const phone = useMediaQuery("(max-width: 767px)");
  const still = !animated || reduce === true;
  // The lit case's index (-1 when none is: outside Worlds, still tier, no cases).
  const lit = still || s.chapter.id !== "worlds" ? -1 : cases.findIndex((_, i) => caseTarget(i, cases.length, s.chapterProgress) === 1);
  // A keyboard user can Tab onto the active link and then scroll on: its panel goes opacity 0 and
  // pointer-events none, but the link would keep focus and Enter would open a case that is not on
  // screen. When the panel holding focus goes inactive (keyed on the lit index), it gives focus up.
  useEffect(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    const panel = active.closest(".world-panel");
    if (panel && panel.getAttribute("data-solo-off") === "true") active.blur();
  }, [lit]);

  return (
    <section
      id="worlds"
      className="chapter chapter--worlds"
      style={{ height: `${sectionHeightVh(chapter)}vh` }}
      aria-label="Work"
      data-static={still ? "true" : undefined}
    >
      <div className="chapter__pin">
        <p className="chapter__label">
          {chapter.index} / {chapter.label}
        </p>
        {cases.length === 0 && <p className="worlds-empty">Case studies are being written up.</p>}
        {cases.length > 0 && (
          <div className="worlds">
            {cases.map((item, i) => {
              const { slug, title, client, context, diagram, stack, excerpts } = readCase(item);
              // Outside Worlds nothing shows (caseTarget(last) is 1 at the chapter's end, and the
              // panels have no fade-out of their own: the pin's release is their exit).
              const solo = still ? 1 : s.chapter.id === "worlds" ? caseTarget(i, cases.length, s.chapterProgress) : 0;
              // `opacity: 0` does not skip a backdrop filter, so the CSS gates the blur and the
              // pointer events on this attribute (not on visibility, which would also pull the
              // panel out of the accessibility tree).
              const off = solo < 0.005;
              const style: SoloStyle = { "--solo": solo };
              const meta = [client, context].filter((t) => t !== "").join(" · ");
              return (
                <article key={item.id} className="glass world-panel" style={style} data-solo-off={off ? "true" : undefined}>
                  {/* Decorative ordinal: hidden so it is not read before every title. */}
                  <p className="world-panel__index" aria-hidden="true">CASE {String(i + 1).padStart(2, "0")}</p>
                  {/* No heading for a missing CMS title — an empty <h2> is an a11y violation. */}
                  {title !== "" && <h2 className="world-panel__title">{title}</h2>}
                  {meta !== "" && <p className="world-panel__meta">{meta}</p>}
                  {excerpts.length > 0 && (
                    <div className="world-panel__cols">
                      {excerpts.map((e) => (
                        <div key={e.key} className="world-panel__col">
                          <span>{e.label}</span>
                          <p>{e.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {(stack.length > 0 || diagram !== "") && (
                    <div className="world-panel__foot">
                      {stack.length > 0 && (
                        <ul className="world-panel__stack" aria-label="Stack">
                          {stack.map((t, j) => (
                            <li key={`${j}-${t}`}>{t}</li>
                          ))}
                        </ul>
                      )}
                      {diagram !== "" && (
                        // Decorative thumbnail of what /work/<slug> shows in full, so no alt text.
                        // Served by our own /api/media route or a static path: `unoptimized`.
                        <Image className="world-panel__diagram" src={diagram} alt="" width={160} height={100} unoptimized />
                      )}
                    </div>
                  )}
                  {slug !== "" && (
                    <Link
                      className="cta cta--ghost world-panel__link"
                      href={`/work/${encodeURIComponent(slug)}`}
                      aria-label={title !== "" ? `Read the case study: ${title}` : undefined}
                      // The panel is not a scroll container (overflow hidden, line-clamped), so this
                      // link is its ONLY tab stop. Only the ACTIVE panel's link is reachable, and only
                      // while its pin is on screen: the pin releases at WORLDS_HOLD_DESKTOP on desktop
                      // and WORLDS_HOLD_MOBILE on a phone, and past that the last panel is still at
                      // full solo while scrolling off, so an off-screen tab stop would pull the page
                      // back. Every other animated link is tabIndex -1 (it is also pointer-events:
                      // none while its panel is off). The still tier stacks everything visibly, so
                      // it takes the default tab order.
                      tabIndex={still ? undefined : solo >= 0.5 && s.chapterProgress < (phone ? WORLDS_HOLD_MOBILE : WORLDS_HOLD_DESKTOP) ? 0 : -1}
                    >
                      Read the case study <span className="cta__arrow" aria-hidden="true">{"→"}</span>
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
