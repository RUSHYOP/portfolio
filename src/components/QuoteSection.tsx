"use client";

import { useRef } from "react";
import TypewriterText, { useInView } from "./TypewriterText";

interface QuoteSectionProps {
  quote: string;
}

export default function QuoteSection({ quote }: QuoteSectionProps) {
  const { ref, inView } = useInView(0.5);

  if (!quote) return null;

  return (
    <div className="quote-section" ref={ref as React.RefObject<HTMLDivElement>}>
      <div className="quote-inner">
        <span className="quote-mark">&ldquo;</span>
        <blockquote className="quote-text">
          <TypewriterText text={quote} speed={40} trigger={inView} />
        </blockquote>
        <span className="quote-dot">.</span>
      </div>
    </div>
  );
}
