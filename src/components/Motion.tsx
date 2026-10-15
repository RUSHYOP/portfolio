"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Progressive enhancement: the server and no-JS versions always contain visible content. */
export default function Motion() {
  const pathname = usePathname();
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 960px) and (hover: hover)");
    const header = document.querySelector<HTMLElement>(".site-header");
    const article = main.querySelector<HTMLElement>(
      ".project-article > article",
    );
    const progress = header?.querySelector<HTMLElement>(
      "[data-reading-progress] i",
    );
    const images = Array.from(
      main.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    const elements = Array.from(
      main.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const sectionLinks = Array.from(
      main.querySelectorAll<HTMLAnchorElement>(".article-contents a"),
    );
    const sections = Array.from(
      main.querySelectorAll<HTMLElement>(".article-prose > section"),
    );
    let frame = 0;
    let revealObserver: IntersectionObserver | undefined;
    let contentsObserver: IntersectionObserver | undefined;
    const reveal = (element: Element) => {
      element.classList.remove("reveal-waiting");
      element.classList.add("is-revealed");
    };
    header?.classList.toggle("is-reading", Boolean(article));

    if (!reduced.matches && "IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(({ isIntersecting, target }) => {
            if (isIntersecting) {
              reveal(target);
              revealObserver?.unobserve(target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
      );
      elements.forEach((element) => {
        element.classList.add("motion-ready");
        if (element.getBoundingClientRect().top > window.innerHeight)
          element.classList.add("reveal-waiting");
        else reveal(element);
        revealObserver?.observe(element);
      });
    }

    // A narrow reading band marks the section currently passing through the viewport.
    if (sections.length && "IntersectionObserver" in window) {
      const visible = new Set<Element>();
      contentsObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting) visible.add(target);
            else visible.delete(target);
          });
          const current = [...sections]
            .reverse()
            .find((section) => visible.has(section));
          if (!current) return;
          sectionLinks.forEach((link) => {
            if (link.hash === `#${current.id}`)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        },
        { rootMargin: "-24% 0px -60% 0px", threshold: 0 },
      );
      sections.forEach((section) => contentsObserver?.observe(section));
    }

    const update = () => {
      frame = 0;
      // Batch geometry reads before style writes; never run a permanent animation loop.
      const articleRect = article?.getBoundingClientRect();
      const headerHeight = header?.offsetHeight ?? 0;
      const reading = articleRect
        ? clamp(
            (headerHeight - articleRect.top) /
              Math.max(
                1,
                articleRect.height - window.innerHeight + headerHeight,
              ),
            0,
            1,
          )
        : 0;
      const offsets = images.map((element) => {
        const rect =
          !reduced.matches && wide.matches
            ? element.getBoundingClientRect()
            : null;
        return {
          element,
          y: rect
            ? clamp(
                (window.innerHeight / 2 - rect.top - rect.height / 2) * 0.025,
                -10,
                10,
              )
            : 0,
        };
      });
      header?.classList.toggle("has-scrolled", window.scrollY > 24);
      if (progress) progress.style.transform = `scaleX(${reading})`;
      offsets.forEach(({ element, y }) =>
        element.style.setProperty("--parallax-y", `${y.toFixed(2)}px`),
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const preferencesChanged = () => {
      if (reduced.matches) {
        revealObserver?.disconnect();
        elements.forEach(reveal);
      }
      schedule();
    };
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest("[data-reveal]");
      if (element) reveal(element);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", focus);
    reduced.addEventListener("change", preferencesChanged);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      revealObserver?.disconnect();
      contentsObserver?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", focus);
      reduced.removeEventListener("change", preferencesChanged);
      elements.forEach((element) =>
        element.classList.remove(
          "reveal-waiting",
          "motion-ready",
          "is-revealed",
        ),
      );
      images.forEach((element) => element.style.removeProperty("--parallax-y"));
      sectionLinks.forEach((link) => link.removeAttribute("aria-current"));
      header?.classList.remove("is-reading", "has-scrolled");
      progress?.style.removeProperty("transform");
    };
  }, [pathname]);
  return null;
}
