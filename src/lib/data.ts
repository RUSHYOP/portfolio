import dbConnect from "./mongodb";
import {
  Project as ProjectModel,
  Skill as SkillModel,
  Settings as SettingsModel,
} from "./models";

export interface Project {
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

export interface Skill {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface Settings {
  profileImage: string;
  audioFile: string;
  githubUrl: string;
  linkedinUrl: string;
  xUrl: string;
  instagramUrl: string;
  resumeUrl: string;
}

// ── Projects ──

export async function getProjects(): Promise<Project[]> {
  await dbConnect();
  const docs = await ProjectModel.find().sort({ order: 1 }).lean();
  return docs.map((d) => ({
    id: d.projectId,
    title: d.title,
    description: d.description,
    icon: d.icon,
    technologies: d.technologies,
    liveLink: d.liveLink,
    liveLinkLabel: d.liveLinkLabel,
    codeLink: d.codeLink,
    showLiveLink: d.showLiveLink,
    showCodeLink: d.showCodeLink,
    order: d.order,
  }));
}

export async function getProject(id: string): Promise<Project | null> {
  await dbConnect();
  const d = await ProjectModel.findOne({ projectId: id }).lean();
  if (!d) return null;
  return {
    id: d.projectId,
    title: d.title,
    description: d.description,
    icon: d.icon,
    technologies: d.technologies,
    liveLink: d.liveLink,
    liveLinkLabel: d.liveLinkLabel,
    codeLink: d.codeLink,
    showLiveLink: d.showLiveLink,
    showCodeLink: d.showCodeLink,
    order: d.order,
  };
}

export async function addProject(project: Project): Promise<Project> {
  await dbConnect();
  await ProjectModel.create({
    projectId: project.id,
    title: project.title,
    description: project.description,
    icon: project.icon,
    technologies: project.technologies,
    liveLink: project.liveLink,
    liveLinkLabel: project.liveLinkLabel,
    codeLink: project.codeLink,
    showLiveLink: project.showLiveLink,
    showCodeLink: project.showCodeLink,
    order: project.order,
  });
  return project;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  await dbConnect();
  // Map "id" field in updates to "projectId" for Mongo
  const mongoUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === "id") continue; // don't allow changing the projectId
    mongoUpdates[key] = value;
  }
  const d = await ProjectModel.findOneAndUpdate(
    { projectId: id },
    { $set: mongoUpdates },
    { new: true, lean: true }
  );
  if (!d) return null;
  return {
    id: d.projectId,
    title: d.title,
    description: d.description,
    icon: d.icon,
    technologies: d.technologies,
    liveLink: d.liveLink,
    liveLinkLabel: d.liveLinkLabel,
    codeLink: d.codeLink,
    showLiveLink: d.showLiveLink,
    showCodeLink: d.showCodeLink,
    order: d.order,
  };
}

export async function deleteProject(id: string): Promise<boolean> {
  await dbConnect();
  const result = await ProjectModel.deleteOne({ projectId: id });
  return result.deletedCount > 0;
}

// ── Skills ──

export async function getSkills(): Promise<Skill[]> {
  await dbConnect();
  const docs = await SkillModel.find().sort({ order: 1 }).lean();
  return docs.map((d) => ({
    id: d.skillId,
    name: d.name,
    icon: d.icon,
    order: d.order,
  }));
}

export async function getSkill(id: string): Promise<Skill | null> {
  await dbConnect();
  const d = await SkillModel.findOne({ skillId: id }).lean();
  if (!d) return null;
  return { id: d.skillId, name: d.name, icon: d.icon, order: d.order };
}

export async function addSkill(skill: Skill): Promise<Skill> {
  await dbConnect();
  await SkillModel.create({
    skillId: skill.id,
    name: skill.name,
    icon: skill.icon,
    order: skill.order,
  });
  return skill;
}

export async function updateSkill(id: string, updates: Partial<Skill>): Promise<Skill | null> {
  await dbConnect();
  const mongoUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === "id") continue;
    mongoUpdates[key] = value;
  }
  const d = await SkillModel.findOneAndUpdate(
    { skillId: id },
    { $set: mongoUpdates },
    { new: true, lean: true }
  );
  if (!d) return null;
  return { id: d.skillId, name: d.name, icon: d.icon, order: d.order };
}

export async function deleteSkill(id: string): Promise<boolean> {
  await dbConnect();
  const result = await SkillModel.deleteOne({ skillId: id });
  return result.deletedCount > 0;
}

// ── Settings ──

export async function getSettings(): Promise<Settings> {
  await dbConnect();
  let doc = await SettingsModel.findOne({ key: "main" }).lean();
  if (!doc) {
    doc = await SettingsModel.create({
      key: "main",
      profileImage: "/images/purav.jpg",
      audioFile: "/audio/space.mp3",
      githubUrl: "https://github.com/RUSHYOP",
      linkedinUrl: "https://linkedin.com/in/purav-s",
      xUrl: "https://x.com/rushyyyyyyyyyyy",
      instagramUrl: "https://instagram.com/_rushyyy",
      resumeUrl: "https://github.com/RUSHYOP/certifications/blob/f2c6cb24e2517e922a0dd771114ce9000fff5086/purav-s-resume.pdf",
    });
  }
  return {
    profileImage: doc.profileImage,
    audioFile: doc.audioFile,
    githubUrl: doc.githubUrl,
    linkedinUrl: doc.linkedinUrl,
    xUrl: doc.xUrl,
    instagramUrl: doc.instagramUrl,
    resumeUrl: doc.resumeUrl,
  };
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  await dbConnect();
  const doc = await SettingsModel.findOneAndUpdate(
    { key: "main" },
    { $set: updates },
    { new: true, upsert: true, lean: true }
  );
  return {
    profileImage: doc!.profileImage,
    audioFile: doc!.audioFile,
    githubUrl: doc!.githubUrl,
    linkedinUrl: doc!.linkedinUrl,
    xUrl: doc!.xUrl,
    instagramUrl: doc!.instagramUrl,
    resumeUrl: doc!.resumeUrl,
  };
}
