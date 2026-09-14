"use client";

import { motion } from "framer-motion";
import { CHAPTERS, VOYAGE_SCROLL_VH } from "@/scene/camera/flightPath";
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
const approach = CHAPTERS.find((c) => c.id === "approach")!;

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Chapter 01. Hero over the parked camera; the distant star sits low-right in the scene. */
export default function Launch({ headline, subheadline, ready }: LaunchProps) {
  const s = useVoyage();
  const inChapter = s.chapter.id === "launch";
  // Hint fades out as the reader scrolls through launch; hidden entirely once past it.
  const hintOpacity = inChapter ? 0.4 * (1 - s.chapterProgress) : 0;

  const book = () => {
    getAudioEngine().whoosh({ volume: 0.08 });
    voyageStore.scrollTo(landing.start + 0.001);
  };
  const seeWork = () => {
    getAudioEngine().click({ volume: 0.05 });
    voyageStore.scrollTo(approach.start + 0.001);
  };

  return (
    <section
      id="launch"
      className="chapter chapter--launch"
      style={{ height: `${(chapter.end - chapter.start) * VOYAGE_SCROLL_VH}vh` }}
      aria-label="Launch"
    >
      <div className="chapter__pin">
        <motion.div
          className="launch"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        >
          <p className="chapter__label">
            {chapter.index} / {chapter.label}
          </p>
          <h1 className="launch__title">{headline}</h1>
          <p className="launch__sub">{subheadline}</p>
          <div className="launch__ctas">
            <CallToAction label="Book a call" onClick={book} />
            <CallToAction label="See the work" variant="ghost" onClick={seeWork} />
          </div>
        </motion.div>
        <p className="launch__hint" style={{ opacity: hintOpacity }} aria-hidden="true">
          SCROLL TO DEPART ↓
        </p>
      </div>
    </section>
  );
}
