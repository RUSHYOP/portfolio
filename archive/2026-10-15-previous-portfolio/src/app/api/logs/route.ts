import { NextRequest, NextResponse } from "next/server";
import { appendLog } from "@/lib/log";
import { LOG_EVENTS } from "@/lib/clientLog";

// Single source of truth: the same list the client can emit.
const ALLOWED_EVENTS = new Set<string>(LOG_EVENTS);
const MAX_BODY_BYTES = 2048;

export async function POST(request: NextRequest) {
  // Cheap pre-check: reject an oversized declared length without reading the body.
  // A missing or malformed header just falls through to the measured check below.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const raw = await request.text();
  // Measure bytes, not UTF-16 code units, so the constant means what it says.
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // JSON.parse("null") yields null, which would throw on the property read below.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const event = record.event;
  if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }
  await appendLog("client", record);
  return new NextResponse(null, { status: 204 });
}
