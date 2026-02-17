import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { getSkills, addSkill, type Skill } from "@/lib/data";

export async function GET() {
  try {
    const skills = await getSkills();
    return NextResponse.json(skills);
  } catch {
    return NextResponse.json({ error: "Failed to load skills" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const skills = await getSkills();
    const newSkill: Skill = {
      id: `skill_${Date.now()}`,
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
