import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { getSkills, addSkill, type Skill } from "@/lib/data";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET() {
  try {
    const skills = await getSkills();
    return NextResponse.json(skills, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Failed to load skills" }, { status: 500 });
  }
}

function validateSkillBody(body: Record<string, unknown>): string | null {
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return "name is required and must be a non-empty string";
  }
  if (body.name.length > 100) {
    return "name must be at most 100 characters";
  }
  if (body.icon !== undefined && typeof body.icon !== "string") {
    return "icon must be a string";
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const validationError = validateSkillBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const skills = await getSkills();
    const newSkill: Skill = {
      id: `skill_${globalThis.crypto.randomUUID()}`,
      name: body.name || "",
      icon: body.icon || "",
      order: skills.length,
    };

    await addSkill(newSkill);
    return NextResponse.json(newSkill, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create skill" }, { status: 500 });
  }
}
