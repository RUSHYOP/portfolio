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

export interface NavLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: { label: string; url: string }[];
}

export interface Settings {
  profileImage: string;
  audioFile: string;
  aboutHeading: string;
  aboutText: string;
  quote1: string;
  quote2: string;
  projectsTitle: string;
  contactHeading: string;
  contactText: string;
  contactEmail: string;
  contactLocation: string;
  showHeroButton: boolean;
  showNavbar: boolean;
  navLinks: NavLink[];
  footerSections: FooterSection[];
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

const defaultNavLinks: NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
];

const defaultFooterSections: FooterSection[] = [
  { title: "Navigate", links: [{ label: "Projects", url: "/projects" }, { label: "About", url: "#about" }, { label: "Contact", url: "#contact" }] },
  { title: "Social", links: [{ label: "GitHub", url: "https://github.com/RUSHYOP" }, { label: "LinkedIn", url: "https://linkedin.com/in/purav-s" }, { label: "X", url: "https://x.com/rushyyyyyyyyyyy" }, { label: "Instagram", url: "https://instagram.com/_rushyyy" }] },
  { title: "Other", links: [{ label: "Resume", url: "" }] },
];

function docToSettings(doc: Record<string, unknown>): Settings {
  return {
    profileImage: (doc.profileImage as string) ?? "/images/purav.jpg",
    audioFile: (doc.audioFile as string) ?? "/audio/space.mp3",
    aboutHeading: (doc.aboutHeading as string) ?? "Building Efficient Systems",
    aboutText: (doc.aboutText as string) ?? "",
    quote1: (doc.quote1 as string) ?? "",
    quote2: (doc.quote2 as string) ?? "",
    projectsTitle: (doc.projectsTitle as string) ?? "SOME OF THE THINGS I'VE BUILT",
    contactHeading: (doc.contactHeading as string) ?? "Let's create something amazing together",
    contactText: (doc.contactText as string) ?? "I'm always interested in new opportunities and exciting projects.",
    contactEmail: (doc.contactEmail as string) ?? "puravshrinavalan@gmail.com",
    contactLocation: (doc.contactLocation as string) ?? "Bangalore, India",
    showHeroButton: (doc.showHeroButton as boolean) ?? true,
    showNavbar: (doc.showNavbar as boolean) ?? true,
    navLinks: (doc.navLinks as NavLink[]) ?? defaultNavLinks,
    footerSections: (doc.footerSections as FooterSection[]) ?? defaultFooterSections,
  };
}

export async function getSettings(): Promise<Settings> {
  await dbConnect();
  let doc = await SettingsModel.findOne({ key: "main" }).lean();
  if (!doc) {
    doc = await SettingsModel.create({ key: "main" });
  }
  return docToSettings(doc as unknown as Record<string, unknown>);
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  await dbConnect();
  const doc = await SettingsModel.findOneAndUpdate(
    { key: "main" },
    { $set: updates },
    { new: true, upsert: true, lean: true }
  );
  return docToSettings(doc as unknown as Record<string, unknown>);
}
