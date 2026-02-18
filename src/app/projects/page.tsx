import { getProjects } from "@/lib/data";
import Link from "next/link";
import Image from "next/image";

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
          <div className="projects-page-card" key={project.id}>
            <div className="projects-page-card-header">
              <span className="project-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="project-tech">
                {project.technologies.slice(0, 4).map((tech) => (
                  <span className="tech-tag" key={tech}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {project.icon && (
              <div className="projects-page-card-icon">
                <Image
                  src={project.icon}
                  alt={project.title}
                  width={48}
                  height={48}
                  unoptimized
                />
              </div>
            )}

            <h2 className="projects-page-card-title">{project.title}</h2>
            <p className="projects-page-card-desc">{project.description}</p>

            <div className="projects-page-card-footer">
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
        ))}
      </main>
    </div>
  );
}
