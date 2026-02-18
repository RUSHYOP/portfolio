"use client";

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
        <p className="quote-text">
          <TypewriterText text={quote.endsWith(".") ? quote : quote + "."} speed={40} trigger={inView} />
        </p>
        <div className="quote-bottom">
          <span className="quote-dot">.</span>
          <span className="quote-close">&rdquo;</span>
        </div>
      </div>
    </div>
  );
}
