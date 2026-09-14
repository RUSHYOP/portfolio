export interface MediaFile { id: string; filename: string; size: number; uploadedAt: string; contentType: string; uploadType: string; url: string; }
export interface Project { id: string; title: string; description: string; icon: string; technologies: string[]; liveLink: string; liveLinkLabel: string; codeLink: string; showLiveLink: boolean; showCodeLink: boolean; order: number; }
export interface Skill { id: string; name: string; icon: string; order: number; }
export interface NavLink { label: string; href: string; }
export interface FooterSection { title: string; links: { label: string; url: string }[]; }
export interface Settings {
  profileImage: string; audioFile: string;
  // Hero copy (Task 11); editing inputs land in sub-project 2.
  heroHeadline: string; heroSubheadline: string;
  // Voyage manifesto line (sub-project 2).
  manifesto: string;
  aboutHeading: string; aboutText: string;
  quote1: string; quote2: string; projectsTitle: string;
  contactHeading: string; contactText: string; contactEmail: string; contactLocation: string;
  showHeroButton: boolean; showNavbar: boolean; navLinks: NavLink[]; footerSections: FooterSection[];
}

export type Tab = "content" | "projects" | "skills" | "navigation" | "media";

export const EMPTY_PROJECT: Omit<Project, "id" | "order"> = { title: "", description: "", icon: "", technologies: [], liveLink: "", liveLinkLabel: "", codeLink: "", showLiveLink: false, showCodeLink: true };

export const DEFAULT_SETTINGS: Settings = {
  profileImage: "", audioFile: "",
  // Same consulting defaults as the schema / DTO fallbacks.
  heroHeadline: "I build AI-powered products, end to end.",
  heroSubheadline: "Full-stack builds and system architecture for founders and teams who want it shipped, not just scoped.",
  // Same consulting default as the schema / DTO fallback.
  manifesto: "Most software fails at the seams. I design the seams.",
  aboutHeading: "", aboutText: "",
  quote1: "", quote2: "", projectsTitle: "SOME OF THE THINGS I'VE BUILT",
  contactHeading: "", contactText: "", contactEmail: "", contactLocation: "",
  showHeroButton: true, showNavbar: true, navLinks: [], footerSections: [],
};
