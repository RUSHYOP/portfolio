"use client";

import { useState, useCallback } from "react";
import TypewriterText from "./TypewriterText";

interface HeroProps {
  glitchEffect: boolean;
  onExplore: () => void;
}

export default function Hero({ glitchEffect, onExplore }: HeroProps) {
  const [nameDone, setNameDone] = useState(false);
  const [subtitleDone, setSubtitleDone] = useState(false);

  const onNameComplete = useCallback(() => setNameDone(true), []);
  const onSubtitleComplete = useCallback(() => setSubtitleDone(true), []);

  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <div className="hero-content">
        <h1 className={`hero-title ${glitchEffect ? "glitch" : ""}`}>
          <TypewriterText text="PURAV S" speed={120} delay={500} onComplete={onNameComplete} />
        </h1>
        <p className="hero-subtitle">
          <TypewriterText text="Software Developer" speed={60} delay={200} trigger={nameDone} onComplete={onSubtitleComplete} />
        </p>
        <button
          className={`hero-cta ${subtitleDone ? "cta-visible" : ""}`}
          onClick={onExplore}
          aria-label="Explore my work"
        >
          HIT IT
        </button>
      </div>
    </section>
  );
}
