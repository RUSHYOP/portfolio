"use client";

import { useState, useEffect, useRef } from "react";

interface HeroProps {
  glitchEffect: boolean;
  onExplore: () => void;
}

export default function Hero({ glitchEffect, onExplore }: HeroProps) {
  const [nameText, setNameText] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState<"name" | "subtitle" | "done">("name");
  const nameRef = useRef("PURAV S");
  const subtitleRef = useRef("Software Developer");

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (phase === "name") {
      const fullName = nameRef.current;
      if (nameText.length < fullName.length) {
        timeout = setTimeout(() => {
          setNameText(fullName.slice(0, nameText.length + 1));
        }, 120);
      } else {
        timeout = setTimeout(() => setPhase("subtitle"), 400);
      }
    } else if (phase === "subtitle") {
      const fullSub = subtitleRef.current;
      if (subtitleText.length < fullSub.length) {
        timeout = setTimeout(() => {
          setSubtitleText(fullSub.slice(0, subtitleText.length + 1));
        }, 60);
      } else {
        timeout = setTimeout(() => setPhase("done"), 300);
      }
    } else if (phase === "done") {
      // Blink cursor a few times then hide
      let blinks = 0;
      const blinkInterval = setInterval(() => {
        setShowCursor((prev) => !prev);
        blinks++;
        if (blinks >= 6) {
          clearInterval(blinkInterval);
          setShowCursor(false);
        }
      }, 400);
      return () => clearInterval(blinkInterval);
    }

    return () => clearTimeout(timeout);
  }, [nameText, subtitleText, phase]);

  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <div className="hero-content">
        <h1 className={`hero-title ${glitchEffect ? "glitch" : ""}`}>
          <span className="typewriter-text">{nameText}</span>
          {phase === "name" && showCursor && <span className="typewriter-cursor">|</span>}
        </h1>
        <p className="hero-subtitle">
          <span className="typewriter-text">{subtitleText}</span>
          {(phase === "subtitle" || (phase === "done" && showCursor)) && (
            <span className="typewriter-cursor">|</span>
          )}
        </p>
        <button
          className={`hero-cta ${phase === "done" ? "cta-visible" : ""}`}
          onClick={onExplore}
          aria-label="Explore my work"
        >
          HIT IT
        </button>
      </div>
    </section>
  );
}
