import { NextRequest, NextResponse } from "next/server";
import { appendLog } from "@/lib/log";

const ALLOWED_EVENTS = new Set(["quality.tier", "quality.probe", "scene.context_lost"]);
const MAX_BODY_BYTES = 2048;

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // JSON.parse("null") yields null, which would throw on the property read below.
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const event = body.event;
  if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }
  await appendLog("client", body);
  return new NextResponse(null, { status: 204 });
}
