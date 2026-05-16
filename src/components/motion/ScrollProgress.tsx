"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** Thin progress hairline pinned to the top of the viewport. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}
