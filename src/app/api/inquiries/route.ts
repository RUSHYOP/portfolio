import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { inquiries } from "@/lib/collections";
import { listAndCreate } from "@/lib/collections/routeHandlers";
import { checkInquiryLimit } from "@/lib/inquiryLimiter";
import { clientIp } from "@/lib/clientIp";
import { sendInquiryEmails } from "@/lib/mail";
import { appendLog } from "@/lib/log";

/** Fire-and-forget structured error log, mirroring routeHandlers' logError — never blocks the response. */
function logError(verb: string, err: unknown): void {
  void Promise.resolve(appendLog("api", { level: "error", collection: "inquiries", verb, message: String(err) })).catch(() => {
    // logging must never fail a response
  });
}

// Hard cap on the raw request body before it is even parsed as JSON.
const MAX_BODY_BYTES = 4096;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Warn once per process, not once per request, if the salt env var is missing.
let saltWarned = false;
/** Salted SHA-256 of the client IP — never store or log the raw IP. */
function ipHash(request: NextRequest): string {
  // IP source and its trust boundary live in clientIp(); see the doc comment there.
  const ip = clientIp(request);
  const salt = process.env.INQUIRY_IP_SALT ?? "";
  if (!salt && !saltWarned) {
    saltWarned = true;
    // Structured (never console) and fire-and-forget, so a log fault can't fail a submission.
    void Promise.resolve(appendLog("inquiries", { level: "warn", event: "ip_salt_missing" })).catch(() => {
      // logging must never fail a response
    });
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Admin list (newest first, includes status/ipHash/notifyFailed). */
const admin = listAndCreate(inquiries);
export const GET = admin.GET;

/** Public submission from the Landing form. */
export async function POST(request: NextRequest) {
  // 1. Body-size guard — read as text first so an oversize payload is rejected before JSON.parse.
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  // 2. JSON parse.
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const { website, ...rest } = body as Record<string, unknown>;
  // 3. Honeypot: bots fill the hidden field; humans never see it. Pretend success, store nothing —
  // the response must never reveal that the honeypot tripped.
  if (typeof website === "string" && website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // 4. Field validation (required, types, enums, lengths) via the collection's shared validator.
  const v = inquiries.validate(rest, "create");
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  // 5. Email format, beyond the validator's plain-string check.
  if (!EMAIL_RE.test(String(v.value.email))) {
    return NextResponse.json({ error: "email must be a valid address" }, { status: 400 });
  }

  // 6. IP hash + rate limit — computed only once the body is known-good, so junk requests
  // don't consume a submitter's quota.
  const hash = ipHash(request);
  const rl = checkInquiryLimit(hash);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many inquiries, please try again later" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  // 7. Persist with server-set internal fields (status/ipHash/notifyFailed) — never client-settable.
  // Only the store itself may fail the submission: its try/catch is scoped to `create` alone.
  let created: Awaited<ReturnType<typeof inquiries.create>>;
  try {
    created = await inquiries.create(v.value, { status: "new", ipHash: hash, notifyFailed: false });
  } catch (e) {
    logError("create", e);
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }

  // 8. Post-create tail: best-effort notification and its bookkeeping. Once the inquiry is stored
  // the submitter is owed a 201, so every fault here (send, update, log) is swallowed and logged —
  // a stored inquiry must never surface as a 500 that invites a duplicate resubmission.
  try {
    const { sent } = await sendInquiryEmails({
      id: created.id,
      name: String(created.name),
      email: String(created.email),
      building: String(created.building),
      budget: String(created.budget),
      timeline: String(created.timeline),
    });
    // `sent` means "the owner was notified"; a failed auto-reply alone does not flag the
    // inquiry (it is logged as notify.autoreply_failed inside sendInquiryEmails).
    if (!sent) {
      // Mark for admin follow-up and log the failure — but the submitter still gets 201.
      await inquiries.update(created.id, { notifyFailed: true });
      await appendLog("inquiries", { event: "notify.failed", id: created.id });
    }
  } catch (e) {
    // Fire-and-forget like logError: even the failure log must not be able to throw here.
    void Promise.resolve(appendLog("inquiries", { level: "error", event: "notify_tail_failed", id: created.id, message: String(e) })).catch(() => {
      // logging must never fail a response
    });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
