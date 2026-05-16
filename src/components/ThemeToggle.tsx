"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAudio } from "@/hooks/useAudio";
import AudioVisualizer from "./AudioVisualizer";

type Theme = "dark" | "light";

const STORAGE_KEY = "theme-preference";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const VolumeOnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const VolumeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

interface FloatingControlsProps {
  muted: boolean;
  onToggleMute: () => void;
}

export function FloatingControls({ muted, onToggleMute }: FloatingControlsProps) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const [wipe, setWipe] = useState<{ x: number; y: number; color: string } | null>(null);
  const themeBtnRef = useRef<HTMLButtonElement>(null);
  const { engine } = useAudio();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored ?? getSystemTheme();
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    engine.setTheme(initial);
    setMounted(true);
  }, [engine]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const btn = themeBtnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      // Color of the *incoming* theme so it can blanket the viewport
      const incomingColor = next === "dark" ? "#000000" : "#f5f5f5";
      setWipe({ x: r.left + r.width / 2, y: r.top + r.height / 2, color: incomingColor });
    }
    // Slight delay so the wipe covers before the swap
    setTimeout(() => {
      setTheme(next);
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(STORAGE_KEY, next);
      engine.setTheme(next);
      engine.click({ volume: 0.06, pitch: next === "dark" ? 0.9 : 1.3 });
    }, 220);
    // Clear wipe after animation
    setTimeout(() => setWipe(null), 900);
  };

  const handleMute = () => {
    onToggleMute();
    engine.click({ volume: 0.06 });
  };

  if (!mounted) return null;

  return (
    <>
      <div className="floating-controls">
        <button
          onClick={handleMute}
          aria-label={muted ? "Unmute audio" : "Mute audio"}
          className="fc-btn"
          data-cursor="hover"
        >
          {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
        </button>
        <AudioVisualizer active={!muted} />
        <div className="fc-divider" />
        <button
          ref={themeBtnRef}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="fc-btn"
          data-cursor="hover"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <AnimatePresence>
        {wipe && (
          <motion.div
            key={`${wipe.x}-${wipe.y}`}
            className="theme-wipe"
            initial={{
              clipPath: `circle(0px at ${wipe.x}px ${wipe.y}px)`,
              opacity: 1,
            }}
            animate={{
              clipPath: `circle(150vmax at ${wipe.x}px ${wipe.y}px)`,
              opacity: 1,
            }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }}
            style={{ background: wipe.color }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
