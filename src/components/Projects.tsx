"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import TypewriterText, { useInView } from "./TypewriterText";

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
    return <h3 className="project-title" ref={cardRef}><TypewriterText text={title.toUpperCase()} speed={30} trigger={visible} /></h3>;
  }

  return <h3 className="project-title" ref={cardRef}>{visible ? <TypewriterText text={title.toUpperCase()} speed={30} trigger={visible} /> : "\u00A0"}</h3>;
}

export default function Projects({ projects, projectsTitle }: ProjectsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const { ref: titleRef, inView: titleInView } = useInView(0.3);

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

  useEffect(() => {
    const tick = () => {
      const container = scrollRef.current;
      if (container && !isHoveredRef.current) {
        posRef.current += 0.5;
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (posRef.current >= maxScroll) {
          posRef.current = 0;
        }
        container.scrollLeft = Math.round(posRef.current);
      } else if (container) {
        // Sync posRef when user hovers so it doesn't jump back
        posRef.current = container.scrollLeft;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const scrollByCard = useCallback((dir: 1 | -1) => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = 480 + 32;
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

  return (
    <section className="section projects-section" id="projects" ref={sectionRef}>
      <div className="projects-header" ref={titleRef as React.RefObject<HTMLDivElement>}>
        <h2 className="projects-title-tw">
          <TypewriterText text={projectsTitle} speed={30} trigger={titleInView} />
        </h2>
        <div className="projects-nav">
          <button className="projects-nav-btn" onClick={() => scrollByCard(-1)} aria-label="Previous project">
            ←
          </button>
          <button className="projects-nav-btn" onClick={() => scrollByCard(1)} aria-label="Next project">
            →
          </button>
        </div>
      </div>
      <div
        className="projects-scroll-container"
        ref={scrollRef}
        onMouseEnter={() => { isHoveredRef.current = true; }}
        onMouseLeave={() => { isHoveredRef.current = false; }}
      >
        <div className="projects-scroll-track">
          {projects.map((project) => (
            <div className="project-card" key={project.id}>
              <div className="project-card-inner">
                <div className="project-card-header">
                  <div className="project-tech">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <span className="tech-tag" key={tech}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="project-card-body">
                  <ProjectCardTitle id={project.id} title={project.title} scrollContainer={scrollRef} />
                  <p className="project-desc">{project.description}</p>
                </div>

                <div className="project-card-footer">
                  <div className="project-links">
                    {project.showLiveLink && project.liveLink && (
                      <a href={project.liveLink} className="project-link" target="_blank" rel="noopener noreferrer">
                        {project.liveLinkLabel || "Live Demo"}
                      </a>
                    )}
                    {project.showCodeLink && project.codeLink && (
                      <a href={project.codeLink} className="project-link" target="_blank" rel="noopener noreferrer">
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
