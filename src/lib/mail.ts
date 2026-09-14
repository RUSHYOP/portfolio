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

export type MailClient = {
  batch: { send(payload: MailPayload[]): Promise<{ error: { message: string } | null }> };
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
  if (!defaultClient) defaultClient = new Resend(env.RESEND_API_KEY) as unknown as MailClient;
  return defaultClient;
}

/** Sends the owner notification + auto-reply. Never throws; false means "not sent" (skipped or failed), already logged. */
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
  try {
    const { error } = await client.batch.send(buildInquiryEmails(inq, { from, notifyTo }));
    if (error) {
      await appendLog("inquiries", { event: "notify.failed", id: inq.id, message: error.message });
      return { sent: false };
    }
    await appendLog("inquiries", { event: "notify.sent", id: inq.id });
    return { sent: true };
  } catch (e) {
    await appendLog("inquiries", { event: "notify.failed", id: inq.id, message: e instanceof Error ? e.message : "unknown" });
    return { sent: false };
  }
}
