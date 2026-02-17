import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/data";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = await updateSettings(body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
