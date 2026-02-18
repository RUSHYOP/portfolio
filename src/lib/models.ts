import mongoose, { Schema, Document, Model } from "mongoose";

// ── Project ──
export interface IProject extends Document {
  projectId: string;
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

const ProjectSchema = new Schema<IProject>(
  {
    projectId: { type: String, required: true, unique: true },
    title: { type: String, required: true, default: "" },
    description: { type: String, default: "" },
    icon: { type: String, default: "" },
    technologies: { type: [String], default: [] },
    liveLink: { type: String, default: "" },
    liveLinkLabel: { type: String, default: "" },
    codeLink: { type: String, default: "" },
    showLiveLink: { type: Boolean, default: false },
    showCodeLink: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Skill ──
export interface ISkill extends Document {
  skillId: string;
  name: string;
  icon: string;
  order: number;
}

const SkillSchema = new Schema<ISkill>(
  {
    skillId: { type: String, required: true, unique: true },
    name: { type: String, required: true, default: "" },
    icon: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Settings ──
export interface ISettings extends Document {
  key: string;
  profileImage: string;
  audioFile: string;
  githubUrl: string;
  linkedinUrl: string;
  xUrl: string;
  instagramUrl: string;
  resumeUrl: string;
  aboutHeading: string;
  aboutText: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    profileImage: { type: String, default: "/images/purav.jpg" },
    audioFile: { type: String, default: "/audio/space.mp3" },
    githubUrl: { type: String, default: "https://github.com/RUSHYOP" },
    linkedinUrl: { type: String, default: "https://linkedin.com/in/purav-s" },
    xUrl: { type: String, default: "https://x.com/rushyyyyyyyyyyy" },
    instagramUrl: { type: String, default: "https://instagram.com/_rushyyy" },
    resumeUrl: { type: String, default: "https://github.com/RUSHYOP/certifications/blob/f2c6cb24e2517e922a0dd771114ce9000fff5086/purav-s-resume.pdf" },
    aboutHeading: { type: String, default: "Building Efficient Systems" },
    aboutText: { type: String, default: "I'm a Software Developer. Currently speed running through my final year in B.E Computer Science and Engineering.\nMy skills include literally anything full stack and machine learning integration, but that is not all. I enjoy writing code and building stuff that brings out the best in me.\nWhen I'm not coding, you can find me gaming, travelling, or just doing something dumb." },
  },
  { timestamps: true }
);

// Prevent model recompilation in dev (hot reload)
export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export const Skill: Model<ISkill> =
  mongoose.models.Skill || mongoose.model<ISkill>("Skill", SkillSchema);

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);
