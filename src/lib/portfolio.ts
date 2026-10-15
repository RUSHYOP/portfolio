import fallbackProjects from "@/content/projects.json";
import { getProjects, type Project } from "@/lib/data";

export const identity = {
  name: "Purav S",
  email: "puravshrinavalan@gmail.com",
  github: "https://github.com/RUSHYOP",
  linkedin: "https://linkedin.com/in/purav-s",
};

export async function portfolioProjects(): Promise<Project[]> {
  if (!process.env.MONGODB_URI) return fallbackProjects;
  try {
    const projects = await getProjects();
    return projects.length ? projects : fallbackProjects;
  } catch {
    return fallbackProjects;
  }
}

export function externalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
