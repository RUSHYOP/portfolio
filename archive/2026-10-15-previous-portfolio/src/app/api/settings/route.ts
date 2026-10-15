import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyRequest } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/data";
import type { Settings } from "@/lib/data";

// `key` is a schema path: $set{key} orphans the singleton and getSettings() silently
// recreates defaults. Whitelist the editable paths — every ISettings field except
// `key`, `_id` and the timestamps.
const SETTINGS_KEYS = [
  "profileImage", "audioFile", "heroHeadline", "heroSubheadline", "manifesto",
  "aboutHeading", "aboutText", "quote1", "quote2", "projectsTitle",
  "contactHeading", "contactText", "contactEmail", "contactLocation",
  "showHeroButton", "showNavbar", "navLinks", "footerSections",
] as const satisfies readonly (keyof Settings)[];

export async function GET() {
  try {
    const settings = await getSettings();
    // No Cache-Control here: next.config.js sets it for every /api/* response.
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

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
    }

    // Filter before writing: an unknown key would be $set as a new schema path.
    const src = body as Record<string, unknown>;
    const updates: Partial<Settings> = {};
    for (const k of SETTINGS_KEYS) {
      if (Object.prototype.hasOwnProperty.call(src, k)) {
        (updates as Record<string, unknown>)[k] = src[k];
      }
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No editable settings in request body" }, { status: 400 });
    }

    const updated = await updateSettings(updates);
    // `/` and `/voyage` read settings under `revalidate = 300`; without this an edit
    // waits out the ISR window before it is visible.
    revalidatePath("/");
    revalidatePath("/voyage");
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
