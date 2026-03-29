"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface Project {
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

export default function ProjectsClient({ projects }: { projects: Project[] }) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const allTechnologies = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of projects) {
      for (const tech of p.technologies) {
        const key = tech.toLowerCase();
        if (!seen.has(key)) seen.set(key, tech);
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [projects]);

  const filtered = useMemo(() => {
    if (!activeFilter) return projects;
    const key = activeFilter.toLowerCase();
    return projects.filter((p) =>
      p.technologies.some((t) => t.toLowerCase() === key)
    );
  }, [projects, activeFilter]);

  const toggle = (tech: string) => {
    setActiveFilter((prev) =>
      prev?.toLowerCase() === tech.toLowerCase() ? null : tech
    );
  };

  return (
    <>
      <div className="projects-filter-bar">
        <button
          className={`filter-chip${activeFilter === null ? " filter-chip-active" : ""}`}
          onClick={() => setActiveFilter(null)}
        >
          All
        </button>
        {allTechnologies.map((tech) => (
          <button
            key={tech}
            className={`filter-chip${activeFilter?.toLowerCase() === tech.toLowerCase() ? " filter-chip-active" : ""}`}
            onClick={() => toggle(tech)}
          >
            {tech}
          </button>
        ))}
      </div>

      <main className="projects-page-grid">
        {filtered.map((project) => (
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
      </main>
    </>
  );
}
