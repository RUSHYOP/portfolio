"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import TypewriterText from "./TypewriterText";
import styles from "./Projects.module.css";
import { getAudioEngine } from "@/lib/audio/AudioEngine";

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

/** Single project card with pointer-driven 3D tilt. */
function ProjectCard({
  project,
  index,
  total,
  scrollContainer,
}: {
  project: ProjectData;
  index: number;
  total: number;
  scrollContainer: React.RefObject<HTMLDivElement | null>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [titleVisible, setTitleVisible] = useState(false);

  // Tilt motion values
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), { stiffness: 220, damping: 20 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-10, 10]), { stiffness: 220, damping: 20 });
  const lift = useSpring(0, { stiffness: 250, damping: 22 });

  // Detect when title scrolls into view (within the horizontal container)
  useEffect(() => {
    const el = headingRef.current;
    const root = scrollContainer.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !titleVisible) setTitleVisible(true);
      },
      { root, threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollContainer, titleVisible]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    px.set(x);
    py.set(y);
  };
  const handleLeave = () => {
    px.set(0);
    py.set(0);
    lift.set(0);
  };
  const handleEnter = () => {
    lift.set(-6);
    getAudioEngine().click({ volume: 0.04, pitch: 1 + (index % 5) * 0.06 });
  };

  return (
    <motion.div
      className={styles.card}
      ref={cardRef}
      style={{ rotateX, rotateY, y: lift, transformStyle: "preserve-3d" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onMouseEnter={handleEnter}
      data-cursor="hover"
    >
      <div className={styles.cardInner}>
        <div className={styles.cardHeader}>
          <div className={styles.tech}>
            {project.technologies.slice(0, 3).map((tech) => (
              <span className={styles.techTag} key={tech}>
                {tech}
              </span>
            ))}
          </div>
          <span className={styles.number}>
            {String((index % total) + 1).padStart(2, "0")}
          </span>
        </div>

        <div className={styles.cardBody}>
          <h3 className={styles.title} ref={headingRef}>
            {titleVisible ? (
              <TypewriterText text={project.title.toUpperCase()} speed={30} trigger={titleVisible} />
            ) : (
              <span style={{ visibility: "hidden" }}>{project.title.toUpperCase()}</span>
            )}
          </h3>
          <p className={styles.desc}>{project.description}</p>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.links}>
            {project.showLiveLink && project.liveLink && (
              <a
                href={project.liveLink}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="hover"
              >
                {project.liveLinkLabel || "Live Demo"}
              </a>
            )}
            {project.showCodeLink && project.codeLink && (
              <a
                href={project.codeLink}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="hover"
              >
                Github
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Projects({ projects, projectsTitle }: ProjectsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstHalfRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const titleRef = useRef<HTMLDivElement>(null);
  const titleInView = useInView(titleRef, { amount: 0.3, once: true });
  const sectionInView = useInView(sectionRef, { amount: 0.1, once: true });

  // Auto-scroll with seamless wrap. The track holds two identical halves with
  // a viewport-wide spacer between them so the loop seam is never visible
  // at the same time as the cards — the carousel reads as continuous, not duplicated.
  const posRef = useRef(0);
  const halfWidthRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    const firstHalf = firstHalfRef.current;
    if (!container || !firstHalf) return;

    // Wrap distance = width of one half + the spacer that follows it.
    const measure = () => {
      const spacer = firstHalf.nextElementSibling as HTMLElement | null;
      const spacerWidth = spacer ? spacer.getBoundingClientRect().width : 0;
      halfWidthRef.current = firstHalf.getBoundingClientRect().width + spacerWidth;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(firstHalf);
    window.addEventListener("resize", measure);

    const tick = () => {
      const el = scrollRef.current;
      if (el && !isInteractingRef.current) {
        posRef.current += 0.5;
        if (halfWidthRef.current > 0 && posRef.current >= halfWidthRef.current) {
          posRef.current -= halfWidthRef.current;
        }
        el.scrollLeft = Math.round(posRef.current);
      } else if (el) {
        // While user interacts, keep our virtual position in sync and wrap if needed.
        let next = el.scrollLeft;
        if (halfWidthRef.current > 0) {
          if (next >= halfWidthRef.current) {
            next -= halfWidthRef.current;
            el.scrollLeft = next;
          } else if (next < 0) {
            next += halfWidthRef.current;
            el.scrollLeft = next;
          }
        }
        posRef.current = next;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [projects]);

  const pauseInteract = useCallback(() => {
    isInteractingRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 3000);
  }, []);

  const scrollByCard = useCallback(
    (dir: 1 | -1) => {
      const container = scrollRef.current;
      if (!container) return;
      const cardWidth = CARD_WIDTH + CARD_GAP;
      const start = container.scrollLeft;
      const target = start + dir * cardWidth;
      const duration = 450;
      let startTime: number | null = null;

      pauseInteract();
      getAudioEngine().whoosh({ direction: dir, volume: 0.06 });

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        container.scrollLeft = start + (target - start) * ease;
        if (progress < 1) requestAnimationFrame(animate);
        else posRef.current = container.scrollLeft;
      };
      requestAnimationFrame(animate);
    },
    [pauseInteract]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") scrollByCard(-1);
      else if (e.key === "ArrowRight") scrollByCard(1);
    },
    [scrollByCard]
  );

  return (
    <section className={`section ${styles.projectsSection}${sectionInView ? " visible" : ""}`} id="projects" ref={sectionRef}>
      <div className={styles.header} ref={titleRef}>
        <h2 className={styles.titleTypewriter}>
          <TypewriterText text={projectsTitle} speed={30} trigger={titleInView} />
        </h2>
        <div className={styles.nav}>
          <motion.button
            className={styles.navBtn}
            onClick={() => scrollByCard(-1)}
            aria-label="Previous project"
            data-cursor="hover"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
          >
            ←
          </motion.button>
          <motion.button
            className={styles.navBtn}
            onClick={() => scrollByCard(1)}
            aria-label="Next project"
            data-cursor="hover"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
          >
            →
          </motion.button>
        </div>
      </div>
      <div
        className={`${styles.scrollContainer} projects-3d-track`}
        ref={scrollRef}
        role="region"
        aria-label="Projects carousel"
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={pauseInteract}
        onMouseLeave={() => {
          isInteractingRef.current = false;
        }}
        onTouchStart={pauseInteract}
        onWheel={pauseInteract}
      >
        <div className={styles.scrollTrack}>
          <div className={styles.trackHalf} ref={firstHalfRef}>
            {projects.map((project, index) => (
              <ProjectCard
                key={`a-${project.id}-${index}`}
                project={project}
                index={index}
                total={projects.length}
                scrollContainer={scrollRef}
              />
            ))}
          </div>
          <div className={styles.loopSpacer} aria-hidden="true" />
          <div className={styles.trackHalf} aria-hidden="true">
            {projects.map((project, index) => (
              <ProjectCard
                key={`b-${project.id}-${index}`}
                project={project}
                index={index}
                total={projects.length}
                scrollContainer={scrollRef}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
