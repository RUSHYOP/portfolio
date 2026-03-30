import { getProjects, getSkills, getSettings } from "@/lib/data";
import PageClient from "@/components/PageClient";

export const revalidate = 300;

export default async function Home() {
  const [projects, skills, settings] = await Promise.all([
    getProjects(),
    getSkills(),
    getSettings(),
  ]);

  return (
    <PageClient
      projects={projects}
      skills={skills}
      settings={settings}
    />
  );
}
