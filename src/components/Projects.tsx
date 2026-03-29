"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import TypewriterText from "./TypewriterText";
import { useInView } from "@/hooks/useInView";
import styles from "./Projects.module.css";

// Card dimensions — keep in sync with .project-card CSS (width + gap)
const CARD_WIDTH = 480;
const CARD_GAP = 32;

interface ProjectData {
  id: string;
  title: string;
  description: string;
  icon: string;
  technologies: string[];
  liveLink: string;
  liveLinkLabel: string;
  codeLink: string;
  showLiveLink: boolean;
  showCodeLink: boolean;
  order: number;
}

interface ProjectsProps {
  projects: ProjectData[];
  projectsTitle: string;
}

function ProjectCardTitle({ id, title, scrollContainer }: { id: string; title: string; scrollContainer: React.RefObject<HTMLDivElement | null> }) {
  const cardRef = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);
  const typedRef = useRef(false);

  useEffect(() => {
    const el = cardRef.current;
    const root = scrollContainer.current;
    if (!el || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !typedRef.current) {
          setVisible(true);
          typedRef.current = true;
          observer.disconnect();
        }
      },
      { root, threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollContainer]);

  if (typedRef.current && visible) {
    return <h3 className={styles.title} ref={cardRef}><TypewriterText text={title.toUpperCase()} speed={30} trigger={visible} /></h3>;
  }

  return <h3 className={styles.title} ref={cardRef}>{visible ? <TypewriterText text={title.toUpperCase()} speed={30} trigger={visible} /> : <div style={{ minHeight: "1em", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }} />}</h3>;
}

export default function Projects({ projects, projectsTitle }: ProjectsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const { ref: titleRef, inView: titleInView } = useInView({ threshold: 0.3 });

  // Section visibility observer
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

  // Auto-scroll animation with fractional accumulator
  const posRef = useRef(0);
  const halfWidthRef = useRef(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    // Calculate half the track (one full set of cards) for seamless reset
    const track = container.firstElementChild as HTMLElement;
    if (track) halfWidthRef.current = track.scrollWidth / 2;

    const tick = () => {
      const el = scrollRef.current;
      if (el && !isHoveredRef.current) {
        posRef.current += 0.5;
        // When we've scrolled past the first set, jump back seamlessly
        if (halfWidthRef.current > 0 && posRef.current >= halfWidthRef.current) {
          posRef.current -= halfWidthRef.current;
        }
        el.scrollLeft = Math.round(posRef.current);
      } else if (el) {
        posRef.current = el.scrollLeft;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [projects]);

  const scrollByCard = useCallback((dir: 1 | -1) => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = CARD_WIDTH + CARD_GAP;
    const target = container.scrollLeft + dir * cardWidth;
    const start = container.scrollLeft;
    const distance = target - start;
    const duration = 400;
    let startTime: number | null = null;

    isHoveredRef.current = true;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      container.scrollLeft = start + distance * ease;
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        posRef.current = container.scrollLeft;
        isHoveredRef.current = false;
      }
    };
    requestAnimationFrame(animate);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { scrollByCard(-1); }
    else if (e.key === "ArrowRight") { scrollByCard(1); }
  }, [scrollByCard]);

  return (
    <section className={`section ${styles.projectsSection}`} id="projects" ref={sectionRef}>
      <div className={styles.header} ref={titleRef as React.RefObject<HTMLDivElement>}>
        <h2 className={styles.titleTypewriter}>
          <TypewriterText text={projectsTitle} speed={30} trigger={titleInView} />
        </h2>
        <div className={styles.nav}>
          <button className={styles.navBtn} onClick={() => scrollByCard(-1)} aria-label="Previous project">
            ←
          </button>
          <button className={styles.navBtn} onClick={() => scrollByCard(1)} aria-label="Next project">
            →
          </button>
        </div>
      </div>
      <div
        className={styles.scrollContainer}
        ref={scrollRef}
        role="region"
        aria-label="Projects carousel"
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => { isHoveredRef.current = true; }}
        onMouseLeave={() => { isHoveredRef.current = false; }}
      >
        <div className={styles.scrollTrack}>
          {[...projects, ...projects].map((project, index) => (
            <div className={styles.card} key={`${project.id}-${index}`}>
              <div className={styles.cardInner}>
                <div className={styles.cardHeader}>
                  <div className={styles.tech}>
                    {project.technologies.slice(0, 3).map((tech) => (
                      <span className={styles.techTag} key={tech}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <ProjectCardTitle id={`${project.id}-${index}`} title={project.title} scrollContainer={scrollRef} />
                  <p className={styles.desc}>{project.description}</p>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.links}>
                    {project.showLiveLink && project.liveLink && (
                      <a href={project.liveLink} className={styles.link} target="_blank" rel="noopener noreferrer">
                        {project.liveLinkLabel || "Live Demo"}
                      </a>
                    )}
                    {project.showCodeLink && project.codeLink && (
                      <a href={project.codeLink} className={styles.link} target="_blank" rel="noopener noreferrer">
                        Github
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
