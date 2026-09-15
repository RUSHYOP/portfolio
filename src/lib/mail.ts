// Resend mail module for the inquiry flow: a pure email builder plus a sender
// that degrades to a no-op (never throws) when config or the client is unavailable.
import { Resend } from "resend";
import { appendLog } from "@/lib/log";
import { labelFor } from "@/lib/collections/fieldSpec";
import { BUDGET_OPTIONS, TIMELINE_OPTIONS } from "@/lib/collections/specs/inquiries";

export interface InquiryForMail {
  id: string;
  name: string;
  email: string;
  building: string;
  budget: string;
  timeline: string;
}

// `replyTo` matches the installed resend@6.28.0 typings (CreateEmailBaseOptions.replyTo?: string | string[])
// — confirmed in node_modules/resend/dist/index.d.cts; that package does not use `reply_to` on send options.
export interface MailPayload {
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  text: string;
}

// One send per email, not a batch: a batch is all-or-nothing, so a rejected inquirer
// address would also kill the owner notification. `resend.emails.send` resolves to
// `{ data, error }` — only `error` is read here.
export type MailClient = {
  emails: { send(payload: MailPayload): Promise<{ error: { message: string } | null }> };
};

/** Pure builder: owner notification (reply-to the inquirer) + auto-reply to the inquirer (reply-to the owner). */
export function buildInquiryEmails(inq: InquiryForMail, env: { from: string; notifyTo: string }): [MailPayload, MailPayload] {
  const budget = labelFor(BUDGET_OPTIONS, inq.budget);
  const timeline = labelFor(TIMELINE_OPTIONS, inq.timeline);
  const firstName = inq.name.trim().split(/\s+/)[0] || "there";

  const owner: MailPayload = {
    from: env.from,
    to: [env.notifyTo],
    replyTo: inq.email,
    subject: `New inquiry — ${inq.name} (${budget}, ${timeline})`,
    text: [
      `${inq.name} <${inq.email}>`,
      `Budget: ${budget} · Timeline: ${timeline}`,
      ``,
      inq.building,
      ``,
      `Reply directly to this email, or open /admin → Inbox.`,
    ].join("\n"),
  };

  const reply: MailPayload = {
    from: env.from,
    to: [inq.email],
    replyTo: env.notifyTo,
    subject: `Got it — I'll reply within 24 hours`,
    text: [
      `Hi ${firstName},`,
      ``,
      `Thanks for reaching out about what you're building. I read every inquiry personally and reply within 24 hours.`,
      ``,
      `— Purav`,
    ].join("\n"),
  };

  return [owner, reply];
}

// Lazily constructed, module-scoped singleton — avoids creating a Resend client per request
// when no explicit client is injected (production path); tests always inject their own.
let defaultClient: MailClient | null = null;
function clientFor(env: NodeJS.ProcessEnv): MailClient | null {
  if (!env.RESEND_API_KEY) return null;
  if (!defaultClient) {
    // Thin adapter, not a cast: Resend's send resolves to `{ data, error }` and we
    // narrow it to the `{ error }` shape MailClient promises.
    const resend = new Resend(env.RESEND_API_KEY);
    defaultClient = { emails: { send: async (payload: MailPayload) => ({ error: (await resend.emails.send(payload)).error }) } };
  }
  return defaultClient;
}

/** Provider messages can echo the inquirer's address — cap what reaches the log. */
const MAX_LOG_MESSAGE = 200;
const reason = (e: unknown): string =>
  (e instanceof Error ? e.message : typeof e === "string" ? e : "unknown").slice(0, MAX_LOG_MESSAGE);

/**
 * Sends the owner notification, then (only if that succeeded) the auto-reply.
 * `sent` means "the owner was notified": a failed auto-reply is logged but tolerated,
 * because the inquiry itself has still reached its destination. Never throws — every
 * failure path is logged via appendLog.
 */
export async function sendInquiryEmails(
  inq: InquiryForMail,
  deps: { client?: MailClient; env?: NodeJS.ProcessEnv } = {}
): Promise<{ sent: boolean }> {
  const env = deps.env ?? process.env;
  const from = env.RESEND_FROM;
  const notifyTo = env.INQUIRY_NOTIFY_TO;
  const client = deps.client ?? clientFor(env);
  // Missing config or client: skip quietly rather than throw — inquiry submission must still succeed.
  if (!from || !notifyTo || !client) {
    await appendLog("inquiries", { event: "notify.skipped", id: inq.id, reason: "missing env" });
    return { sent: false };
  }
  const [owner, reply] = buildInquiryEmails(inq, { from, notifyTo });
  // 1. Owner notification — the one send that decides `sent`.
  try {
    const { error } = await client.emails.send(owner);
    if (error) {
      await appendLog("inquiries", { event: "notify.failed", id: inq.id, message: reason(error.message) });
      return { sent: false };
    }
  } catch (e) {
    await appendLog("inquiries", { event: "notify.failed", id: inq.id, message: reason(e) });
    return { sent: false };
  }
  // 2. Auto-reply — best effort; a bad inquirer address must not undo step 1.
  try {
    const { error } = await client.emails.send(reply);
    if (error) {
      await appendLog("inquiries", { event: "notify.autoreply_failed", id: inq.id, message: reason(error.message) });
      return { sent: true };
    }
  } catch (e) {
    await appendLog("inquiries", { event: "notify.autoreply_failed", id: inq.id, message: reason(e) });
    return { sent: true };
  }
  await appendLog("inquiries", { event: "notify.sent", id: inq.id });
  return { sent: true };
}
