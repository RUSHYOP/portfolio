"use client";

import Link from "next/link";
import { useState } from "react";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header shell">
      <Link href="/" className="wordmark" aria-label="Purav S — home">
        purav<span className="accent">✳</span>
      </Link>
      <button
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="main-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? "Close −" : "Menu +"}
      </button>
      <nav
        id="main-navigation"
        className={open ? "main-nav is-open" : "main-nav"}
        aria-label="Main navigation"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
          }
        }}
      >
        <Link href="/#work" onClick={() => setOpen(false)}>
          Work <span>01</span>
        </Link>
        <Link href="/#about" onClick={() => setOpen(false)}>
          About <span>02</span>
        </Link>
        <Link
          href="/#contact"
          className="nav-contact"
          onClick={() => setOpen(false)}
        >
          Let’s talk <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    </header>
  );
}
