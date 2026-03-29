"use client";

import TypewriterText from "./TypewriterText";
import { useInView } from "@/hooks/useInView";
import { renderFormatted } from "@/lib/format";

interface ContactProps {
  contactHeading: string;
  contactText: string;
  contactEmail: string;
  contactLocation: string;
}

export default function Contact({ contactHeading, contactText, contactEmail, contactLocation }: ContactProps) {
  const { ref: sectionRef, inView: sectionVisible } = useInView({ threshold: 0.1, rootMargin: "0px 0px -100px 0px" });
  const { ref: twRef, inView } = useInView({ threshold: 0.3 });

  return (
    <section className={`section${sectionVisible ? " visible" : ""}`} id="contact" ref={sectionRef}>
      <div className="contact-content" ref={twRef as React.RefObject<HTMLDivElement>}>
        <div className="contact-info contact-info-centered">
          <h3 className="contact-heading">
            <TypewriterText text={contactHeading} speed={30} trigger={inView} />
          </h3>
          {contactText && contactText.split("\n").filter(Boolean).map((p, i) => (
            <p key={i}>{renderFormatted(p)}</p>
          ))}
          <address className="contact-details">
            <a href={`mailto:${contactEmail}`} className="contact-item contact-email-link">
              {contactEmail}
            </a>
            {contactLocation && <span className="contact-item">{contactLocation}</span>}
          </address>
        </div>
      </div>
    </section>
  );
}
