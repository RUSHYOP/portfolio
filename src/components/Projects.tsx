"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
}

export default function Projects({ projects }: ProjectsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const scrollSpeedRef = useRef(0.25);

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

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-scroll animation - uses ref for hover to avoid restarting RAF loop
  useEffect(() => {
    const tick = () => {
      const container = scrollRef.current;
      if (container && !isHoveredRef.current) {
        container.scrollLeft += scrollSpeedRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (container.scrollLeft >= maxScroll) {
          container.scrollLeft = 0;
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const scrollByCard = (dir: 1 | -1) => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = 480 + 32; // card width + gap
    const target = container.scrollLeft + dir * cardWidth;
    const start = container.scrollLeft;
    const distance = target - start;
    const duration = 400;
    let startTime: number | null = null;

    // Pause auto-scroll during manual animation
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
        isHoveredRef.current = false;
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <section className="section projects-section" id="projects" ref={sectionRef}>
      <div className="projects-header">
        <h2 className="section-title" data-title="PROJECTS">
          PROJECTS
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
          {projects.map((project, index) => (
            <div className="project-card" key={project.id}>
              <div className="project-card-inner">
                <div className="project-card-header">
                  <span className="project-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="project-tech">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <span className="tech-tag" key={tech}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="project-card-body">
                  <h3 className="project-title">{project.title}</h3>
                  <p className="project-desc">{project.description}</p>
                </div>

                <div className="project-card-footer">
                  <div className="project-links">
                    {project.showLiveLink && project.liveLink && (
                      <a
                        href={project.liveLink}
                        className="project-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {project.liveLinkLabel || "Live Demo"}
                      </a>
                    )}
                    {project.showCodeLink && project.codeLink && (
                      <a
                        href={project.codeLink}
                        className="project-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
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
