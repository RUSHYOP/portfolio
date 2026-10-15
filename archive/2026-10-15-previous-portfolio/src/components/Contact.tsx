"use client";

import { useRef, useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import TypewriterText from "./TypewriterText";
import { renderFormatted } from "@/lib/format";
import { getAudioEngine } from "@/lib/audio/AudioEngine";

interface ContactProps {
  contactHeading: string;
  contactText: string;
  contactEmail: string;
  contactLocation: string;
}

export default function Contact({ contactHeading, contactText, contactEmail, contactLocation }: ContactProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const twRef = useRef<HTMLDivElement>(null);
  const sectionInView = useInView(sectionRef, { amount: 0.1, once: true });
  const headingInView = useInView(twRef, { amount: 0.3, once: true });
  const [copied, setCopied] = useState(false);

  const onEmailClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Allow default mailto: but also copy + sfx feedback
      if (contactEmail) {
        try {
          navigator.clipboard?.writeText(contactEmail);
          setCopied(true);
          getAudioEngine().click({ volume: 0.08, pitch: 1.2 });
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* ignore */
        }
      }
      // Don't prevent default — mailto: still opens
      void e;
    },
    [contactEmail]
  );

  return (
    <section className={`section${sectionInView ? " visible" : ""}`} id="contact" ref={sectionRef}>
      <div className="contact-content" ref={twRef}>
        <div className="contact-info contact-info-centered">
          <h3 className="contact-heading">
            <TypewriterText text={contactHeading} speed={30} trigger={headingInView} />
          </h3>
          {contactText && contactText.split("\n").filter(Boolean).map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={headingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 + i * 0.1 }}
            >
              {renderFormatted(p)}
            </motion.p>
          ))}
          <address className="contact-details">
            <motion.a
              href={`mailto:${contactEmail}`}
              className="contact-item contact-email-link"
              onClick={onEmailClick}
              data-cursor="hover"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {copied ? "Copied to clipboard ✓" : contactEmail}
            </motion.a>
            {contactLocation && <span className="contact-item">{contactLocation}</span>}
          </address>
        </div>
      </div>
    </section>
  );
}
