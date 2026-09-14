"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const IGNITION_STORAGE_KEY = "voyage-ignition-played";

interface IgnitionProps {
  /** false → skip immediately (still tier / reduced motion). */
  enabled: boolean;
  onComplete: () => void;
  onLetterbox: (active: boolean) => void;
}

type Phase = "resolve" | "fill" | "ignite" | "done";

/**
 * Chapter 00. ≤1.2s: title resolves blur→sharp, hairline fills, then hands off to the scene's ignite fade.
 * Plays once per session; click / Escape / Enter / Space skips.
 */
export default function Ignition({ enabled, onComplete, onLetterbox }: IgnitionProps) {
  const [phase, setPhase] = useState<Phase>("resolve");
  const [visible, setVisible] = useState(true);
  const doneRef = useRef(false);

  // Idempotent: timers, keydown and click all race to end the sequence.
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    try { sessionStorage.setItem(IGNITION_STORAGE_KEY, "1"); } catch { /* private mode */ }
    setPhase("done");
    setVisible(false);
    onLetterbox(false);
    onComplete();
  }, [onComplete, onLetterbox]);

  useEffect(() => {
    // Once finished, never re-arm. Unstable parent callbacks (or a sessionStorage
    // write that threw in private mode) would otherwise re-enter and re-raise the
    // letterbox with no `finish` left to lower it.
    if (doneRef.current) return;
    let played = false;
    try { played = sessionStorage.getItem(IGNITION_STORAGE_KEY) === "1"; } catch { /* ignore */ }
    if (!enabled || played) {
      finish();
      return;
    }
    onLetterbox(true);
    const timers = [
      setTimeout(() => setPhase("fill"), 500),
      setTimeout(() => setPhase("ignite"), 900),
      setTimeout(finish, 1200),
    ];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, finish, onLetterbox]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="ignition"
          role="presentation"
          onClick={finish}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
        >
          <motion.p
            className="ignition__title"
            initial={{ opacity: 0, filter: "blur(14px)", letterSpacing: "0.3em" }}
            animate={{ opacity: 1, filter: "blur(0px)", letterSpacing: "0.12em" }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          >
            DESTINATION · PURAV S
          </motion.p>
          <motion.p
            className="ignition__sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "resolve" ? 0 : 0.7 }}
            transition={{ duration: 0.3 }}
          >
            SYSTEMS · AI · PRODUCT
          </motion.p>
          <div className="ignition__rule">
            <motion.div
              className="ignition__rule-fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: phase === "resolve" ? 0 : 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="ignition__skip">CLICK TO SKIP</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
