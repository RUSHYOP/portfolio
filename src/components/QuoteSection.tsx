"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import TypewriterText from "./TypewriterText";

interface QuoteSectionProps {
  quote: string;
}

export default function QuoteSection({ quote }: QuoteSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: true });

  // Quote-mark parallax (opposite directions)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const openY = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  const closeY = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const openX = useTransform(scrollYProgress, [0, 1], [-12, 12]);
  const closeX = useTransform(scrollYProgress, [0, 1], [12, -12]);

  if (!quote) return null;
  const cleanQuote = quote.replace(/\.+$/, "");

  return (
    <div className="quote-section" ref={ref}>
      <div className="quote-inner">
        <motion.span className="quote-mark" style={{ y: openY, x: openX }} aria-hidden="true">
          &ldquo;
        </motion.span>
        <p className="quote-text">
          <TypewriterText text={cleanQuote} speed={40} trigger={inView} />
          <span className="quote-dot">.</span>
        </p>
        <motion.span className="quote-close" style={{ y: closeY, x: closeX }} aria-hidden="true">
          &rdquo;
        </motion.span>
      </div>
    </div>
  );
}
