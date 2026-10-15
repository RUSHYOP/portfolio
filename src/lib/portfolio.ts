import fallbackProjects from "@/content/projects.json";
import { getProjects, type Project } from "@/lib/data";
import { cache } from "react";
import { projectStories, type ProjectStory } from "@/content/project-stories";

export const identity = {
  name: "Purav S",
  email: "puravshrinavalan@gmail.com",
  github: "https://github.com/RUSHYOP",
  linkedin: "https://linkedin.com/in/purav-s",
};

export type PortfolioProject = Project & { slug: string; story: ProjectStory };

const gharpay: Project = {
  id: "gharpay",
  title: "GharPay",
  description:
    "Apartment society accounting, from monthly dues and payment proofs to expenses and the closing ledger. Built in collaboration.",
  icon: "",
  technologies: [
    "Next.js",
    "TypeScript",
    "PostgreSQL",
    "Drizzle ORM",
    "Better Auth",
  ],
  liveLink: "https://gharpay.co/",
  liveLinkLabel: "Visit GharPay",
  codeLink: "",
  showLiveLink: true,
  showCodeLink: false,
  order: -1,
};

function curate(projects: Project[]): PortfolioProject[] {
  // Apply editorial removals to both CMS and fallback records. Keep the originals archived.
  return [
    gharpay,
    ...projects.filter((p) => !["gharpay", "proj_3", "proj_4"].includes(p.id)),
  ].map((project) => {
    const story = projectStories[project.id] ?? {
      slug: `project-${encodeURIComponent(project.id)}`,
      category: "Project notes",
      headline: project.title,
      intro: project.description,
      context: "Software project",
      sections: [{ title: "Overview", paragraphs: [project.description] }],
    };
    return {
      ...project,
      ...(project.id === "proj_2" ? { codeLink: "", showCodeLink: false } : {}),
      slug: story.slug,
      story,
    };
  });
}

export const portfolioProjects = cache(
  async (): Promise<PortfolioProject[]> => {
    if (!process.env.MONGODB_URI) return curate(fallbackProjects);
    try {
      const projects = await getProjects();
      return curate(projects.length ? projects : fallbackProjects);
    } catch {
      return curate(fallbackProjects);
    }
  },
);

export function externalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
