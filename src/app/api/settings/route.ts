import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/data";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings, { headers: CACHE_HEADERS });
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

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
    }

    const updated = await updateSettings(body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
