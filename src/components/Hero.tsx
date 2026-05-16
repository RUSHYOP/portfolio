"use client";

import { useState, useCallback } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import TypewriterText from "./TypewriterText";
import MagneticButton from "./motion/MagneticButton";

interface HeroProps {
  onExplore: () => void;
  showButton?: boolean;
}

export default function Hero({ onExplore, showButton = true }: HeroProps) {
  const [nameDone, setNameDone] = useState(false);
  const [subtitleDone, setSubtitleDone] = useState(false);

  const onNameComplete = useCallback(() => setNameDone(true), []);
  const onSubtitleComplete = useCallback(() => setSubtitleDone(true), []);

  // Parallax: title drifts up + fades as user scrolls past hero
  const { scrollY } = useScroll();
  const titleY = useTransform(scrollY, [0, 600], [0, -120]);
  const titleOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const subY = useTransform(scrollY, [0, 600], [0, -60]);

  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1], delay: 0.15 }}
      >
        <motion.h1 className="hero-title" style={{ y: titleY, opacity: titleOpacity }}>
          <TypewriterText text="PURAV S" speed={120} delay={400} onComplete={onNameComplete} />
        </motion.h1>
        <motion.p className="hero-subtitle" style={{ y: subY }}>
          <TypewriterText text="Software Developer" speed={60} delay={200} trigger={nameDone} onComplete={onSubtitleComplete} />
        </motion.p>
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: subtitleDone ? 1 : 0, y: subtitleDone ? 0 : 12 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <MagneticButton
              className="hero-cta cta-visible"
              onClick={onExplore}
              aria-label="Begin exploring — HIT IT"
              strength={0.35}
            >
              HIT IT
            </MagneticButton>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
