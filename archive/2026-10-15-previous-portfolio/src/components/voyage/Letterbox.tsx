"use client";

import { motion } from "framer-motion";

/** Cinematic bars (8vh each). Shown only during Ignition and the Jump. */
export default function Letterbox({ active }: { active: boolean }) {
  const t = { duration: 0.45, ease: [0.7, 0, 0.2, 1] as const };
  return (
    <div className="letterbox" aria-hidden="true">
      <motion.div className="letterbox__bar letterbox__bar--top" initial={false} animate={{ y: active ? 0 : "-100%" }} transition={t} />
      <motion.div className="letterbox__bar letterbox__bar--bottom" initial={false} animate={{ y: active ? 0 : "100%" }} transition={t} />
    </div>
  );
}
