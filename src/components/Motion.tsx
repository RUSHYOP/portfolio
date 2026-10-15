"use client";

import { useEffect } from "react";

/** Content is visible in SSR. Only below-fold elements are enhanced after hydration. */
export default function Motion() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || !("IntersectionObserver" in window)) return;
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (isIntersecting) {
            target.classList.remove("reveal-waiting");
            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.08 },
    );
    elements.forEach((element) => {
      if (element.getBoundingClientRect().top > window.innerHeight)
        element.classList.add("reveal-waiting");
      observer.observe(element);
    });
    const showAll = () => {
      if (media.matches)
        elements.forEach((el) => el.classList.remove("reveal-waiting"));
    };
    media.addEventListener("change", showAll);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", showAll);
      elements.forEach((el) => el.classList.remove("reveal-waiting"));
    };
  }, []);
  return null;
}
