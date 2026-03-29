import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { updateProject, deleteProject } from "@/lib/data";

function validateProjectUpdate(body: Record<string, unknown>): string | null {
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return "title must be a non-empty string";
    }
    if (body.title.length > 200) return "title must be at most 200 characters";
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const validationError = validateProjectUpdate(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updated = await updateProject(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleted = await deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
