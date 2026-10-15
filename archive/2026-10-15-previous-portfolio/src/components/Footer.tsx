"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface FooterSection {
  title: string;
  links: { label: string; url: string }[];
}

interface FooterProps {
  footerSections: FooterSection[];
}

export default function Footer({ footerSections }: FooterProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });

  return (
    <motion.footer
      className="footer"
      role="contentinfo"
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <div className="footer-content">
        <div className="footer-sections">
          {footerSections.map((section, sIdx) => (
            <motion.div
              className="footer-section"
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.5, delay: 0.1 + sIdx * 0.08, ease: "easeOut" }}
            >
              <h4 className="footer-section-title">{section.title}</h4>
              <ul className="footer-section-links">
                {section.links.map((link, lIdx) => {
                  const url = link.url ?? "";
                  return (
                  <motion.li
                    key={link.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                    transition={{ duration: 0.4, delay: 0.25 + sIdx * 0.08 + lIdx * 0.04 }}
                  >
                    {url.startsWith("/") ? (
                      <Link href={url} className="footer-link" data-cursor="hover">
                        {link.label}
                      </Link>
                    ) : url.startsWith("#") ? (
                      <a href={url} className="footer-link" data-cursor="hover">
                        {link.label}
                      </a>
                    ) : url ? (
                      <a
                        href={url}
                        className="footer-link"
                        target="_blank"
                        rel="noopener noreferrer"
                        data-cursor="hover"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <span className="footer-link">{link.label}</span>
                    )}
                  </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.footer>
  );
}
