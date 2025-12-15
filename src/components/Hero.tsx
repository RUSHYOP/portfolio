"use client";

interface HeroProps {
  glitchEffect: boolean;
  onExplore: () => void;
}

export default function Hero({ glitchEffect, onExplore }: HeroProps) {
  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <div className="hero-content">
        <h1 className={`hero-title liquid-mirror ${glitchEffect ? "glitch" : ""}`}>
          PURAV S
        </h1>
        <p className="hero-subtitle floating">Software Developer</p>
        <button className="hero-cta" onClick={onExplore} aria-label="Explore my work">
          HIT IT
        </button>
      </div>
    </section>
  );
}
