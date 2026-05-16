"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAudioEngine } from "@/lib/audio/AudioEngine";

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  visible: boolean;
  showNavbar: boolean;
  scrollTo: (id: string) => void;
  navLinks: NavLink[];
}

export default function Navbar({ visible, showNavbar, scrollTo, navLinks }: NavbarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  if (!showNavbar) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          className="navbar visible"
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="nav-container">
            <a href="#main-content" className="logo" data-cursor="hover">
              PURAV S
            </a>
            <ul className="nav-menu" role="list" onMouseLeave={() => setHovered(null)}>
              {navLinks.map((link) => {
                const href = link.href ?? "#";
                const isHash = href.startsWith("#");
                const isExternal = href.startsWith("http");
                const linkContent = (
                  <>
                    <span>{link.label}</span>
                    {hovered === link.label && (
                      <motion.span
                        layoutId="nav-underline"
                        className="nav-underline"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                );
                return (
                  <li
                    key={link.label}
                    onMouseEnter={() => {
                      setHovered(link.label);
                      getAudioEngine().click({ volume: 0.03, pitch: 1.6 });
                    }}
                  >
                    {isHash ? (
                      <a
                        href={href}
                        className="nav-link"
                        data-cursor="hover"
                        onClick={(e) => {
                          e.preventDefault();
                          scrollTo(href.replace("#", ""));
                        }}
                      >
                        {linkContent}
                      </a>
                    ) : (
                      <a
                        href={href}
                        className="nav-link"
                        data-cursor="hover"
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                      >
                        {linkContent}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
