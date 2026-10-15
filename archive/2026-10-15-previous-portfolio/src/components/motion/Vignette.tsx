"use client";

import { motion, useScroll, useTransform } from "framer-motion";

/** Radial vignette that intensifies very slightly with scroll progress. */
export default function Vignette() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 1], [0.55, 0.85]);
  return <motion.div className="vignette" style={{ opacity }} aria-hidden="true" />;
}
