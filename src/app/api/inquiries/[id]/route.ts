import { NextRequest, NextResponse } from "next/server";
import { inquiries } from "@/lib/collections";
import { byId } from "@/lib/collections/routeHandlers";
import { verifyRequest } from "@/lib/auth";
import { appendLog } from "@/lib/log";
import { STATUS_OPTIONS } from "@/lib/collections/specs/inquiries";

/** Fire-and-forget structured error log, mirroring routeHandlers' logError — never blocks the response. */
function logError(verb: string, err: unknown): void {
  void Promise.resolve(appendLog("api", { level: "error", collection: "inquiries", verb, message: String(err) })).catch(() => {
    // logging must never fail a response
  });
}

// GET/DELETE reuse the generic admin handlers; PUT is custom below since inquiries
// only ever accept a status change (all other fields are write-once from the public form).
const handlers = byId(inquiries);
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;

/** Admin may change only `status` (internal fields are otherwise unsettable via validate()). */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const allowed = STATUS_OPTIONS.map((o) => o.value);
  if (typeof body?.status !== "string" || !allowed.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${allowed.join(", ")}` }, { status: 400 });
  }
  // Error boundary so a DB fault returns a logged JSON 500 rather than an unhandled rejection
  // (mirrors byId's PUT/DELETE in routeHandlers). No slug field on this collection, so no
  // DuplicateSlugError branch is possible here.
  try {
    const updated = await inquiries.update(id, { status: body.status });
    return updated ? NextResponse.json(updated) : NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  } catch (e) {
    logError("update", e);
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}
