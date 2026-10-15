import { getProjects } from "@/lib/data";
import type { Metadata } from "next";
import Link from "next/link";
import ProjectsClient from "./ProjectsClient";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Explore my projects — a collection of applications and tools I've built.",
};

export const revalidate = 3600;

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

      <ProjectsClient projects={projects} />
    </div>
  );
}
