import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildInquiryEmails, sendInquiryEmails, type MailClient, type MailPayload } from "./mail";

vi.mock("@/lib/log", () => ({ appendLog: vi.fn(async () => {}) }));
import { appendLog } from "@/lib/log";

const inq = { id: "inq_1", name: "Ada Lovelace", email: "ada@example.com", building: "An AI ops console", budget: "15to40k", timeline: "1to3m" };
const env = { from: "Purav S <hello@communications.rushy.dev>", notifyTo: "me@example.com" };

describe("buildInquiryEmails", () => {
  it("builds the owner notification with labels and reply-to the inquirer", () => {
    const [owner] = buildInquiryEmails(inq, env);
    expect(owner.to).toEqual(["me@example.com"]);
    expect(owner.replyTo).toBe("ada@example.com");
    expect(owner.subject).toBe("New inquiry — Ada Lovelace ($15k – $40k, 1–3 months)");
    expect(owner.text).toContain("Ada Lovelace <ada@example.com>");
    expect(owner.text).toContain("Budget: $15k – $40k · Timeline: 1–3 months");
    expect(owner.text).toContain("An AI ops console");
    expect(owner.text).toContain("/admin");
  });
  it("builds the auto-reply to the inquirer with first name and reply-to the owner", () => {
    const [, reply] = buildInquiryEmails(inq, env);
    expect(reply.to).toEqual(["ada@example.com"]);
    expect(reply.replyTo).toBe("me@example.com");
    expect(reply.subject).toBe("Got it — I'll reply within 24 hours");
    expect(reply.text.startsWith("Hi Ada,")).toBe(true);
    expect(reply.text).toContain("reply within 24 hours");
    expect(reply.text.trimEnd().endsWith("— Purav")).toBe(true);
  });
});

describe("sendInquiryEmails", () => {
  // Next.js augments NodeJS.ProcessEnv to require NODE_ENV, so a partial fake env needs the `unknown` bridge.
  const fullEnv = { RESEND_FROM: env.from, INQUIRY_NOTIFY_TO: env.notifyTo } as unknown as NodeJS.ProcessEnv;
  type SendResult = { error: { message: string } | null };

  beforeEach(() => vi.mocked(appendLog).mockClear());

  it("sends the owner notification first, then the auto-reply (sent:true, logged)", async () => {
    // Param typed explicitly so `send.mock.calls[0]` isn't inferred as an empty tuple under strict mode.
    const send = vi.fn(async (_payload: MailPayload): Promise<SendResult> => ({ error: null }));
    const client: MailClient = { emails: { send } };
    const r = await sendInquiryEmails(inq, { client, env: fullEnv });
    expect(r).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(2);
    // Owner first: a rejected inquirer address must never cost the owner their notification.
    expect(send.mock.calls[0][0].to).toEqual(["me@example.com"]);
    expect(send.mock.calls[1][0].to).toEqual(["ada@example.com"]);
    expect(appendLog).toHaveBeenCalledWith("inquiries", expect.objectContaining({ event: "notify.sent", id: "inq_1" }));
  });

  it("tolerates an auto-reply failure: owner was notified, so sent stays true", async () => {
    const send = vi
      .fn<(payload: MailPayload) => Promise<SendResult>>()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "recipient rejected" } });
    const r = await sendInquiryEmails(inq, { client: { emails: { send } }, env: fullEnv });
    expect(r).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(2);
    expect(appendLog).toHaveBeenCalledWith(
      "inquiries",
      expect.objectContaining({ event: "notify.autoreply_failed", id: "inq_1", message: "recipient rejected" })
    );
  });

  it("does not attempt the auto-reply when the owner notification fails", async () => {
    const send = vi.fn<(payload: MailPayload) => Promise<SendResult>>().mockResolvedValue({ error: { message: "boom" } });
    const r = await sendInquiryEmails(inq, { client: { emails: { send } }, env: fullEnv });
    expect(r).toEqual({ sent: false });
    expect(send).toHaveBeenCalledTimes(1);
    expect(appendLog).toHaveBeenCalledWith("inquiries", expect.objectContaining({ event: "notify.failed", id: "inq_1", message: "boom" }));
  });

  it("treats a thrown owner send as a failure and never throws", async () => {
    const send = vi.fn<(payload: MailPayload) => Promise<SendResult>>().mockRejectedValue(new Error("net"));
    expect(await sendInquiryEmails(inq, { client: { emails: { send } }, env: fullEnv })).toEqual({ sent: false });
    expect(appendLog).toHaveBeenCalledWith("inquiries", expect.objectContaining({ event: "notify.failed", message: "net" }));
  });

  it("tolerates a thrown auto-reply send", async () => {
    const send = vi
      .fn<(payload: MailPayload) => Promise<SendResult>>()
      .mockResolvedValueOnce({ error: null })
      .mockRejectedValueOnce(new Error("net"));
    expect(await sendInquiryEmails(inq, { client: { emails: { send } }, env: fullEnv })).toEqual({ sent: true });
    expect(appendLog).toHaveBeenCalledWith("inquiries", expect.objectContaining({ event: "notify.autoreply_failed", message: "net" }));
  });

  it("truncates a provider message so a bounced address cannot flood the log with PII", async () => {
    const long = "x".repeat(400);
    const send = vi.fn<(payload: MailPayload) => Promise<SendResult>>().mockResolvedValue({ error: { message: long } });
    await sendInquiryEmails(inq, { client: { emails: { send } }, env: fullEnv });
    const record = vi.mocked(appendLog).mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(String(record.message)).toHaveLength(200);
  });

  it("skips (sent:false) when env is missing and never throws", async () => {
    const send = vi.fn();
    const r = await sendInquiryEmails(inq, { client: { emails: { send } }, env: {} as NodeJS.ProcessEnv });
    expect(r).toEqual({ sent: false });
    expect(send).not.toHaveBeenCalled();
  });
});
