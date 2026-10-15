import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { getProjects, addProject, type Project } from "@/lib/data";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json(projects, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

function validateProjectBody(body: Record<string, unknown>): string | null {
  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return "title is required and must be a non-empty string";
  }
  if (body.title.length > 200) {
    return "title must be at most 200 characters";
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string") return "description must be a string";
    if (body.description.length > 2000) return "description must be at most 2000 characters";
  }
  if (body.technologies !== undefined) {
    if (!Array.isArray(body.technologies) || !body.technologies.every((t: unknown) => typeof t === "string")) {
      return "technologies must be an array of strings";
    }
  }
  for (const field of ["liveLink", "codeLink", "icon"] as const) {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      return `${field} must be a string`;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const validationError = validateProjectBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const projects = await getProjects();
    const newProject: Project = {
      id: `proj_${globalThis.crypto.randomUUID()}`,
      title: body.title || "",
      description: body.description || "",
      icon: body.icon || "",
      technologies: body.technologies || [],
      liveLink: body.liveLink || "",
      liveLinkLabel: body.liveLinkLabel || "",
      codeLink: body.codeLink || "",
      showLiveLink: body.showLiveLink ?? false,
      showCodeLink: body.showCodeLink ?? true,
      order: projects.length,
    };

    await addProject(newProject);
    return NextResponse.json(newProject, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
