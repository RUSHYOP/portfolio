"use client";

interface HeroProps {
  glitchEffect: boolean;
  onExplore: () => void;
}

export default function Hero({ glitchEffect, onExplore }: HeroProps) {
  return (
    <section className="hero" id="hero">
      <div className="hero-content">
        <h1 className={`hero-title liquid-mirror ${glitchEffect ? "glitch" : ""}`}>
          PURAV S
        </h1>
        <p className="hero-subtitle floating">Backend Developer & System Architect</p>
        <button className="hero-cta" onClick={onExplore}>
          HIT IT
        </button>
      </div>
    </section>
  );
}
