"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

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

  useEffect(() => {
    const cards = document.querySelectorAll(".project-card");

    const handleMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const card = mouseEvent.currentTarget as HTMLElement;
      const rect = card.getBoundingClientRect();
      const x = mouseEvent.clientX - rect.left;
      const y = mouseEvent.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    };

    const handleMouseLeave = (e: Event) => {
      const card = (e as MouseEvent).currentTarget as HTMLElement;
      card.style.transform = "";
    };

    cards.forEach((card) => {
      card.addEventListener("mousemove", handleMouseMove);
      card.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      cards.forEach((card) => {
        card.removeEventListener("mousemove", handleMouseMove);
        card.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, []);

  return (
    <section className="section" id="projects" ref={sectionRef}>
      <h2 className="section-title" data-title="PROJECTS">
        PROJECTS
      </h2>
      <div className="projects-grid">
        {projects.map((project) => (
          <div className="project-card" key={project.title}>
            <div className="project-visual">
              <Image
                src={project.icon}
                alt={project.title}
                width={64}
                height={64}
              />
            </div>
            <div className="project-info">
              <h3 className="project-title">{project.title}</h3>
              <p className="project-desc">{project.description}</p>
              <div className="project-tech">
                {project.technologies.map((tech) => (
                  <span className="tech-tag" key={tech}>
                    {tech}
                  </span>
                ))}
              </div>
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
        ))}
      </div>
    </section>
  );
}
