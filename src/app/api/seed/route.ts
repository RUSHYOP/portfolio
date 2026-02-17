import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Project, Skill, Settings } from "@/lib/models";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");

function readJSONFile<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

interface ProjectJSON {
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

interface SkillJSON {
  id: string;
  name: string;
  icon: string;
  order: number;
}

interface SettingsJSON {
  profileImage: string;
  audioFile: string;
}

export async function POST(request: NextRequest) {
  // Security: Only allow seeding with a secret key
  const authHeader = request.headers.get("authorization");
  const secretKey = process.env.SEED_SECRET_KEY;

  if (!secretKey || authHeader !== `Bearer ${secretKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    // Read JSON files
    const projectsData = readJSONFile<ProjectJSON[]>("projects.json");
    const skillsData = readJSONFile<SkillJSON[]>("skills.json");
    const settingsData = readJSONFile<SettingsJSON>("settings.json");

    // Clear existing data
    await Project.deleteMany({});
    await Skill.deleteMany({});
    await Settings.deleteMany({});

    // Seed projects
    const projects = projectsData.map((p: ProjectJSON) => ({
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

    // Seed skills
    const skills = skillsData.map((s: SkillJSON) => ({
      skillId: s.id,
      name: s.name,
      icon: s.icon,
      order: s.order ?? 0,
    }));
    await Skill.insertMany(skills);

    // Seed settings
    await Settings.create({
      key: "main",
      profileImage: settingsData.profileImage,
      audioFile: settingsData.audioFile,
    });

    return NextResponse.json({
      success: true,
      message: `Seeded ${projects.length} projects, ${skills.length} skills, and settings`,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 }
    );
  }
}
