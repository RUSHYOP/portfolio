import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { externalUrl, portfolioProjects } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "Projects",
  alternates: { canonical: "/projects" },
  description:
    "Web applications, backend experiments and machine learning research by Purav S.",
};
export const revalidate = 300;
export default async function Projects() {
  const projects = await portfolioProjects();
  return (
    <>
      <SiteHeader />
      <main id="main" className="shell project-index">
        <div id="top" className="index-heading">
          <span className="eyebrow">THE PROJECT INDEX</span>
          <h1>
            Ideas, made <em>real.</em>
          </h1>
          <p className="muted">
            Applications, experiments, and things learned along the way.
          </p>
        </div>
        <div className="project-rows">
          {projects.map((project, index) => (
            <article key={project.id} className="project-row">
              <span className="eyebrow">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2>{project.title}</h2>
                <p>{project.description}</p>
                <div className="project-tags">
                  {project.technologies.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="project-row-links">
                {project.showLiveLink && externalUrl(project.liveLink) && (
                  <a
                    href={project.liveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {project.liveLinkLabel || "Visit project"} ↗
                  </a>
                )}
                {project.showCodeLink && externalUrl(project.codeLink) && (
                  <a
                    href={project.codeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Source code ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
        <Link href="/#contact" className="button button-light index-contact">
          Have something in mind? Let’s talk ↗
        </Link>
      </main>
      <Footer />
    </>
  );
}
