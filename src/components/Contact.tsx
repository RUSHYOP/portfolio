"use client";

import { useEffect, useRef } from "react";
import TypewriterText, { useInView } from "./TypewriterText";
import { renderFormatted } from "@/lib/format";

interface ContactProps {
  contactHeading: string;
  contactText: string;
  contactEmail: string;
  contactLocation: string;
}

export default function Contact({ contactHeading, contactText, contactEmail, contactLocation }: ContactProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { ref: twRef, inView } = useInView(0.3);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="section" id="contact" ref={sectionRef}>
      <div className="contact-content" ref={twRef as React.RefObject<HTMLDivElement>}>
        <div className="contact-info contact-info-centered">
          <h3 className="contact-heading">
            <TypewriterText text={contactHeading} speed={30} trigger={inView} />
          </h3>
          {contactText && contactText.split("\n").filter(Boolean).map((p, i) => (
            <p key={i}>{renderFormatted(p)}</p>
          ))}
          <div className="contact-details">
            <a href={`mailto:${contactEmail}`} className="contact-item contact-email-link">
              {contactEmail}
            </a>
            {contactLocation && <div className="contact-item">{contactLocation}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
