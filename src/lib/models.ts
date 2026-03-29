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
    projectId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    icon: { type: String, default: "" },
    technologies: { type: [String], default: [] },
    liveLink: { type: String, default: "" },
    liveLinkLabel: { type: String, default: "", trim: true },
    codeLink: { type: String, default: "" },
    showLiveLink: { type: Boolean, default: false },
    showCodeLink: { type: Boolean, default: true },
    order: { type: Number, default: 0, index: true },
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
    skillId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, default: "", trim: true },
    icon: { type: String, default: "" },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

// ── Settings ──
export interface ISettings extends Document {
  key: string;
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
  navLinks: { label: string; href: string }[];
  footerSections: { title: string; links: { label: string; href: string }[] }[];
}

const NavLinkSchema = new Schema(
  {
    label: { type: String, trim: true },
    href: { type: String, trim: true },
  },
  { _id: false }
);

const FooterLinkSchema = new Schema(
  {
    label: { type: String, trim: true },
    href: { type: String, trim: true },
  },
  { _id: false }
);

const FooterSectionSchema = new Schema(
  {
    title: { type: String, trim: true },
    links: { type: [FooterLinkSchema], default: [] },
  },
  { _id: false }
);

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: "main", trim: true },
    profileImage: { type: String, default: "/images/purav.jpg" },
    audioFile: { type: String, default: "/audio/space.mp3" },
    aboutHeading: { type: String, default: "Building Efficient Systems", trim: true },
    aboutText: { type: String, default: "I'm a Software Developer. Currently speed running through my final year in B.E Computer Science and Engineering.\nMy skills include literally anything full stack and machine learning integration, but that is not all. I enjoy writing code and building stuff that brings out the best in me.\nWhen I'm not coding, you can find me gaming, travelling, or just doing something dumb.", trim: true },
    quote1: { type: String, default: "" },
    quote2: { type: String, default: "" },
    projectsTitle: { type: String, default: "SOME OF THE THINGS I'VE BUILT", trim: true },
    contactHeading: { type: String, default: "Let's create something amazing together", trim: true },
    contactText: { type: String, default: "I'm always interested in new opportunities and exciting projects. Whether you have a question or just want to say hi, I'll try my best to get back to you!", trim: true },
    contactEmail: { type: String, default: "puravshrinavalan@gmail.com", trim: true },
    contactLocation: { type: String, default: "Bangalore, India", trim: true },
    showHeroButton: { type: Boolean, default: true },
    showNavbar: { type: Boolean, default: true },
    navLinks: {
      type: [NavLinkSchema],
      default: [
        { label: "About", href: "#about" },
        { label: "Projects", href: "#projects" },
        { label: "Contact", href: "#contact" },
      ],
    },
    footerSections: {
      type: [FooterSectionSchema],
      default: [
        { title: "Navigate", links: [{ label: "Projects", href: "/projects" }, { label: "About", href: "#about" }, { label: "Contact", href: "#contact" }] },
        { title: "Social", links: [{ label: "GitHub", href: "https://github.com/RUSHYOP" }, { label: "LinkedIn", href: "https://linkedin.com/in/purav-s" }, { label: "X", href: "https://x.com/rushyyyyyyyyyyy" }, { label: "Instagram", href: "https://instagram.com/_rushyyy" }] },
        { title: "Other", links: [{ label: "Resume", href: "" }] },
      ],
    },
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
