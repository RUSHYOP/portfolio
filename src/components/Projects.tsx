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
  const [isHovered, setIsHovered] = useState(false);
  const animFrameRef = useRef<number>(0);
  const scrollSpeedRef = useRef(0.5);

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

  // Auto-scroll animation
  const autoScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || isHovered) {
      animFrameRef.current = requestAnimationFrame(autoScroll);
      return;
    }

    container.scrollLeft += scrollSpeedRef.current;

    // Loop back when reaching the end
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (container.scrollLeft >= maxScroll) {
      container.scrollLeft = 0;
    }

    animFrameRef.current = requestAnimationFrame(autoScroll);
  }, [isHovered]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(autoScroll);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [autoScroll]);

  return (
    <section className="section" id="projects" ref={sectionRef}>
      <h2 className="section-title" data-title="PROJECTS">
        PROJECTS
      </h2>
      <div
        className="projects-scroll-container"
        ref={scrollRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="projects-scroll-track">
          {projects.map((project) => (
            <div className="project-card" key={project.id}>
              <div className="project-card-inner">
                <div className="project-card-header">
                  <span className="project-number">
                    {String(projects.indexOf(project) + 1).padStart(2, "0")}
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
