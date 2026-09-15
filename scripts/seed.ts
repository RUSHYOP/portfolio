import mongoose from "mongoose";
import { Project, Skill, Settings } from "../src/lib/models";
// Consulting collections (sub-project 2): seeded alongside the portfolio content.
import { services, processSteps } from "../src/lib/collections";
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
  // Services and process steps are seeded defaults too, so they are cleared for a
  // deterministic result. Case studies, testimonials and inquiries are author/visitor
  // data and are deliberately left untouched.
  await services.model.deleteMany({});
  await processSteps.model.deleteMany({});
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
    // Voyage manifesto line; hero copy is left to the schema defaults.
    manifesto: "Most software fails at the seams. I design the seams.",
  });
  console.log("Seeded settings");

  // Seed consulting content. Insertion order becomes `order` 0..n (create uses max+1
  // and the collections were cleared above), so these read top-to-bottom on /voyage.
  for (const s of [
    {
      title: "AI-powered product builds",
      promise: "From idea to shipped product — model, backend, UI and deploy, owned end to end.",
      outcomes: [
        "A working product, not a prototype",
        "LLM/RAG features that hold up in production",
        "Clean handover with docs and tests",
      ],
      engagement: "6–12 weeks, fixed scope",
    },
    {
      title: "System architecture & design",
      promise: "The shape of the system decided before the first line: boundaries, data flow, failure modes.",
      outcomes: [
        "Architecture doc your team can build from",
        "Cost and scaling model",
        "Risk register with mitigations",
      ],
      engagement: "1–3 weeks",
    },
    {
      title: "Advisory / fractional engineering",
      promise: "A senior engineer in the room when it matters — reviews, hiring, hard calls.",
      outcomes: [
        "Weekly architecture and code reviews",
        "Interview loops and take-home design",
        "Incident and roadmap triage",
      ],
      engagement: "Retainer, 4–8 hours a week",
    },
  ]) {
    await services.create(s);
  }
  console.log("Seeded 3 services");

  for (const p of [
    {
      title: "Discover",
      what: "A focused week to understand the problem, the users and the constraints. We agree what 'done' means.",
      deliverable: "Scope, success metrics, risks",
      duration: "1 week",
    },
    {
      title: "Architect",
      what: "System boundaries, data model, integrations and failure modes designed before building.",
      deliverable: "Architecture doc + diagram",
      duration: "1–2 weeks",
    },
    {
      title: "Build",
      what: "Vertical slices shipped weekly, each reviewed in a browser, each behind tests.",
      deliverable: "Working software every week",
      duration: "4–10 weeks",
    },
    {
      title: "Ship & operate",
      what: "Production rollout, observability, runbooks and a clean handover.",
      deliverable: "Launched product + docs",
      duration: "1 week",
    },
  ]) {
    await processSteps.create(p);
  }
  console.log("Seeded 4 process steps");

  await mongoose.disconnect();
  console.log("Done! Disconnected from MongoDB");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
