import mongoose from "mongoose";
import { Project, Skill, Settings } from "../src/lib/models";
import projectsData from "../data/projects.json";
import skillsData from "../data/skills.json";
import settingsData from "../data/settings.json";

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI env variable is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Clear existing data
  await Project.deleteMany({});
  await Skill.deleteMany({});
  await Settings.deleteMany({});
  console.log("Cleared existing data");

  // Seed projects
  const projects = (projectsData as Array<Record<string, unknown>>).map((p) => ({
    projectId: p.id,
    title: p.title,
    description: p.description,
    icon: p.icon,
    technologies: p.technologies,
    liveLink: p.liveLink || "",
    liveLinkLabel: p.liveLinkLabel || "",
    codeLink: p.codeLink || "",
    showLiveLink: p.showLiveLink ?? false,
    showCodeLink: p.showCodeLink ?? true,
    order: p.order ?? 0,
  }));
  await Project.insertMany(projects);
  console.log(`Seeded ${projects.length} projects`);

  // Seed skills
  const skills = (skillsData as Array<Record<string, unknown>>).map((s) => ({
    skillId: s.id,
    name: s.name,
    icon: s.icon,
    order: s.order ?? 0,
  }));
  await Skill.insertMany(skills);
  console.log(`Seeded ${skills.length} skills`);

  // Seed settings
  await Settings.create({
    key: "main",
    profileImage: (settingsData as Record<string, string>).profileImage,
    audioFile: (settingsData as Record<string, string>).audioFile,
  });
  console.log("Seeded settings");

  await mongoose.disconnect();
  console.log("Done! Disconnected from MongoDB");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
