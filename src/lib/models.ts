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
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    profileImage: { type: String, default: "/images/purav.jpg" },
    audioFile: { type: String, default: "/audio/space.mp3" },
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
