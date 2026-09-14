"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CHAPTERS, type ChapterId } from "@/scene/camera/flightPath";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import { createDockController } from "./dockController";
import CallToAction from "./CallToAction";

export const DOCK_LINKS: readonly { label: string; chapter: ChapterId }[] = [
  { label: "Services", chapter: "approach" },
  { label: "Process", chapter: "orbit" },
  { label: "Work", chapter: "worlds" },
  { label: "About", chapter: "pilot" },
];

const DOCK_OPTIONS = { proximity: 122, spring: 0.19, damping: 0.7, widthGrowth: 17, heightGrowth: 10, drop: 2.5 };

function startOf(id: ChapterId): number {
  return CHAPTERS.find((c) => c.id === id)!.start + 0.001;
}

interface DockProps {
  /** false until Ignition completes. */
  visible: boolean;
}

/** Floating glass capsule nav. Compacts after the hero; collapses to a sheet under 768px. */
export default function Dock({ visible }: DockProps) {
  const capsuleRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const s = useVoyage();
  const compact = s.progress > 0.05;

  useEffect(() => {
    const root = capsuleRef.current;
    if (!root || !visible) return;
    return createDockController(root, () => DOCK_OPTIONS);
  }, [visible]);

  const go = (id: ChapterId) => {
    getAudioEngine().click({ volume: 0.05 });
    voyageStore.scrollTo(startOf(id));
    setOpen(false);
  };
  const book = () => {
    getAudioEngine().whoosh({ volume: 0.08 });
    voyageStore.scrollTo(startOf("landing"));
    setOpen(false);
  };

  return (
    <motion.header
      className="dock"
      data-dock-frame
      data-compact={compact ? "true" : "false"}
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: visible ? 0 : -40, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div ref={capsuleRef} className="dock__capsule" data-dock-state="idle">
        <button type="button" className="dock__mono" data-dock-item onClick={() => go("launch")} aria-label="Back to launch" data-cursor="hover">
          P
        </button>
        <nav className="dock__links" aria-label="Primary">
          {DOCK_LINKS.map((l) => (
            <button
              key={l.chapter}
              type="button"
              className={`dock__link${s.chapter.id === l.chapter ? " is-active" : ""}`}
              data-dock-item
              onClick={() => go(l.chapter)}
              aria-current={s.chapter.id === l.chapter ? "page" : undefined}
              data-cursor="hover"
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="dock__cta">
          <CallToAction label="Book a call" onClick={book} />
        </div>
        <button type="button" className="dock__menu" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
          <span /><span />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="dock__sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {DOCK_LINKS.map((l) => (
              <button key={l.chapter} type="button" className="dock__sheet-link" onClick={() => go(l.chapter)}>
                {l.label}
              </button>
            ))}
            <CallToAction label="Book a call" onClick={book} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
