import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { getProjects, addProject, type Project } from "@/lib/data";

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const projects = await getProjects();
    const newProject: Project = {
      id: `proj_${Date.now()}`,
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
