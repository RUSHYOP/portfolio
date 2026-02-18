import { getProjects } from "@/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="projects-page">
      <header className="projects-page-header">
        <Link href="/" className="projects-page-back">
          ← Back
        </Link>
        <h1 className="projects-page-title">Projects</h1>
        <p className="projects-page-subtitle">A collection of things I&apos;ve built</p>
      </header>

      <main className="projects-page-grid">
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
      </main>
    </div>
  );
}
