"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAudio } from "@/hooks/useAudio";

const NAME = "PURAV S";
const STORAGE_KEY = "intro-played";

interface CinematicIntroProps {
  /** Called once the intro completes (or is skipped). */
  onComplete?: () => void;
}

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const reduce = useReducedMotion();
  const { engine, state } = useAudio();
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"idle" | "bars" | "name" | "ignite" | "done">("idle");

  useEffect(() => {
    // Skip if already played this session, or if user prefers reduced motion
    let skip = false;
    try {
      skip = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (skip || reduce) {
      setVisible(false);
      onComplete?.();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("bars"), 300));
    timers.push(setTimeout(() => setPhase("name"), 900));
    // Bell tones per letter, only if user has previously unmuted (otherwise silent)
    NAME.split("").forEach((ch, i) => {
      if (ch === " ") return;
      timers.push(
        setTimeout(() => {
          if (!state.muted) {
            const freq = 320 + i * 55;
            engine.bell({ freq, volume: 0.06, detune: (Math.random() - 0.5) * 20 });
          }
        }, 1100 + i * 110)
      );
    });
    timers.push(setTimeout(() => setPhase("ignite"), 2200));
    timers.push(
      setTimeout(() => {
        setPhase("done");
        setVisible(false);
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* ignore */
        }
        onComplete?.();
      }, 2700)
    );

    return () => timers.forEach(clearTimeout);
  }, [reduce, onComplete, engine, state.muted]);

  const letterVariants = {
    hidden: { y: "110%", opacity: 0 },
    show: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.05 + i * 0.06,
        type: "spring" as const,
        stiffness: 220,
        damping: 22,
      },
    }),
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeInOut" } }}
          className="intro-root"
          aria-hidden="true"
        >
          {/* Letterbox bars */}
          <motion.div
            className="intro-bar intro-bar-top"
            initial={{ scaleY: 1 }}
            animate={{ scaleY: phase === "bars" || phase === "name" || phase === "ignite" ? 0.18 : 1 }}
            transition={{ duration: 0.55, ease: [0.7, 0, 0.2, 1] }}
          />
          <motion.div
            className="intro-bar intro-bar-bottom"
            initial={{ scaleY: 1 }}
            animate={{ scaleY: phase === "bars" || phase === "name" || phase === "ignite" ? 0.18 : 1 }}
            transition={{ duration: 0.55, ease: [0.7, 0, 0.2, 1] }}
          />

          {/* Name reveal */}
          <div className="intro-stage">
            <h1 className="intro-name" aria-label={NAME}>
              {NAME.split("").map((ch, i) => (
                <span key={i} className="intro-letter-mask">
                  <motion.span
                    custom={i}
                    variants={letterVariants}
                    initial="hidden"
                    animate={phase === "name" || phase === "ignite" ? "show" : "hidden"}
                    className="intro-letter"
                  >
                    {ch === " " ? "\u00A0" : ch}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.div
              className="intro-rule"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: phase === "ignite" ? 1 : 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
