"use client";

import TypewriterText from "./TypewriterText";
import { useInView } from "@/hooks/useInView";

interface QuoteSectionProps {
  quote: string;
}

export default function QuoteSection({ quote }: QuoteSectionProps) {
  const { ref, inView } = useInView({ threshold: 0.5 });

  if (!quote) return null;

  const cleanQuote = quote.replace(/\.+$/, "");

  return (
    <div className="quote-section" ref={ref as React.RefObject<HTMLDivElement>}>
      <div className="quote-inner">
        <span className="quote-mark">&ldquo;</span>
        <p className="quote-text">
          <TypewriterText text={cleanQuote} speed={40} trigger={inView} />
          <span className="quote-dot">.</span>
        </p>
        <span className="quote-close">&rdquo;</span>
      </div>
    </div>
  );
}
