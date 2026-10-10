"use client";

import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import CallToAction from "@/components/dock/CallToAction";

interface LaunchProps {
  headline: string;
  subheadline: string;
  /** true once Ignition has completed; content fades up then. */
  ready: boolean;
}

const chapter = CHAPTERS.find((c) => c.id === "launch")!;
const landing = CHAPTERS.find((c) => c.id === "landing")!;

// Module scope: stable onClick identities across the per-frame useVoyage() re-renders.
const book = () => {
  getAudioEngine().whoosh({ volume: 0.08 });
  voyageStore.scrollTo(landing.start + 0.001);
};
const seeWork = () => {
  getAudioEngine().click({ volume: 0.05 });
};

/** Chapter 01. Hero over the parked camera; the distant star sits low-right in the scene. */
export default function Launch({ headline, subheadline, ready }: LaunchProps) {
  const s = useVoyage();
  const inChapter = s.chapter.id === "launch";
  // Hint fades out as the reader scrolls through launch; hidden entirely once past it.
  const hintOpacity = inChapter ? 0.4 * (1 - s.chapterProgress) : 0;

  return (
    <section
      id="launch"
      className="chapter chapter--launch"
      style={{ minHeight: `${sectionHeightVh(chapter)}vh` }}
      aria-label="Launch"
    >
      <div className="chapter__pin">
        <div className="launch">
          <p className="chapter__label">
            {chapter.index} / {chapter.label}
          </p>
          <h1 className="launch__title">{headline}</h1>
          <p className="launch__sub">{subheadline}</p>
          <div className="launch__ctas">
            <CallToAction label="Book a call" onClick={book} />
            <CallToAction label="See the work" variant="ghost" href="/projects" onClick={seeWork} />
          </div>
        </div>
        {/* Gated on ready: the hint must not appear before the hero fades up. */}
        <p className="launch__hint" style={{ opacity: ready ? hintOpacity : 0 }} aria-hidden="true">
          SCROLL TO DEPART ↓
        </p>
      </div>
    </section>
  );
}
