import { getProjects, getSkills, getSettings } from "@/lib/data";
import PageClient from "@/components/PageClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await getProjects();
  const skills = await getSkills();
  const settings = await getSettings();

  return (
    <PageClient
      projects={projects}
      skills={skills}
      profileImage={settings.profileImage}
      audioFile={settings.audioFile}
      githubUrl={settings.githubUrl}
      linkedinUrl={settings.linkedinUrl}
      xUrl={settings.xUrl}
      instagramUrl={settings.instagramUrl}
      resumeUrl={settings.resumeUrl}
    />
  );
}
