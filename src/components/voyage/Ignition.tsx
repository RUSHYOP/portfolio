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
  // Latest-ref: callbacks read through refs so an unstable parent cannot restart the sequence.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onLetterboxRef = useRef(onLetterbox);
  onLetterboxRef.current = onLetterbox;
  // Holds the live keydown handler so `finish` can detach it (the effect cleanup also does).
  const onKeyRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Idempotent: timers, keydown and click all race to end the sequence.
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    // Detach immediately so the listener never outlives the sequence.
    if (onKeyRef.current) window.removeEventListener("keydown", onKeyRef.current);
    try { sessionStorage.setItem(IGNITION_STORAGE_KEY, "1"); } catch { /* private mode */ }
    setPhase("done");
    setVisible(false);
    onLetterboxRef.current(false);
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    // Once finished, never re-arm: re-entry would re-raise the letterbox with no
    // `finish` left to lower it.
    if (doneRef.current) return;
    let played = false;
    try { played = sessionStorage.getItem(IGNITION_STORAGE_KEY) === "1"; } catch { /* ignore */ }
    if (!enabled || played) {
      finish();
      return;
    }
    onLetterboxRef.current(true);
    const timers = [
      setTimeout(() => setPhase("fill"), 500),
      setTimeout(() => setPhase("ignite"), 900),
      setTimeout(finish, 1200),
    ];
    const onKey = (e: KeyboardEvent) => {
      // Gated: once done a lingering listener must not swallow Space from the page.
      if (doneRef.current) return;
      if (e.key === " ") e.preventDefault();
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    onKeyRef.current = onKey;
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, finish]);

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
