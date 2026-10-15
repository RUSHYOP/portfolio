"use client";

import MagneticButton from "@/components/motion/MagneticButton";

interface CallToActionProps {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  ariaLabel?: string;
  className?: string;
}

/** The one CTA component: amber primary or hairline ghost, mono label, sliding arrow, magnetic. */
export default function CallToAction({ label, onClick, variant = "primary", ariaLabel, className }: CallToActionProps) {
  return (
    <MagneticButton
      className={`cta cta--${variant}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      strength={0.3}
    >
      <span className="cta__label">{label}</span>
      <span className="cta__arrow" aria-hidden="true">→</span>
    </MagneticButton>
  );
}
