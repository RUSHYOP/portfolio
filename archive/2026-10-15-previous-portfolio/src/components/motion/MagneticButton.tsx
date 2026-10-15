"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /** Magnetic strength multiplier (0..1+). */
  strength?: number;
  onClick?: () => void;
  "aria-label"?: string;
  type?: "button" | "submit";
}

/**
 * Wraps a button so it gently translates toward the cursor when hovered.
 * No-ops on touch devices and with prefers-reduced-motion.
 */
export default function MagneticButton({
  children,
  className,
  strength = 0.35,
  onClick,
  type = "button",
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [{ x, y }, setOffset] = useState({ x: 0, y: 0 });
  const reduce = useReducedMotion();

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    setOffset({ x: dx * strength, y: dy * strength });
  };
  const onLeave = () => setOffset({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      type={type}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      animate={{ x, y }}
      transition={{ type: "spring", stiffness: 220, damping: 18, mass: 0.4 }}
      data-cursor="hover"
      aria-label={rest["aria-label"]}
    >
      <motion.span
        style={{ display: "inline-block" }}
        animate={{ x: x * 0.4, y: y * 0.4 }}
        transition={{ type: "spring", stiffness: 220, damping: 18, mass: 0.4 }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
}
