import { describe, it, expect, vi } from "vitest";
import { buildInquiryEmails, sendInquiryEmails, type MailClient, type MailPayload } from "./mail";

vi.mock("@/lib/log", () => ({ appendLog: vi.fn(async () => {}) }));

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
  it("sends both emails in one batch", async () => {
    // Param typed explicitly so `send.mock.calls[0]` isn't inferred as an empty tuple under strict mode.
    const send = vi.fn(async (_payload: MailPayload[]) => ({ error: null }));
    const client: MailClient = { batch: { send } };
    // Next.js augments NodeJS.ProcessEnv to require NODE_ENV, so a partial fake env needs the `unknown` bridge.
    const r = await sendInquiryEmails(inq, { client, env: { RESEND_FROM: env.from, INQUIRY_NOTIFY_TO: env.notifyTo } as unknown as NodeJS.ProcessEnv });
    expect(r).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toHaveLength(2);
  });
  it("skips (sent:false) when env is missing and never throws", async () => {
    const send = vi.fn();
    const r = await sendInquiryEmails(inq, { client: { batch: { send } }, env: {} as NodeJS.ProcessEnv });
    expect(r).toEqual({ sent: false });
    expect(send).not.toHaveBeenCalled();
  });
  it("returns sent:false on client error or throw", async () => {
    const e = { RESEND_FROM: env.from, INQUIRY_NOTIFY_TO: env.notifyTo } as unknown as NodeJS.ProcessEnv;
    expect(await sendInquiryEmails(inq, { client: { batch: { send: async () => ({ error: { message: "boom" } }) } }, env: e })).toEqual({ sent: false });
    expect(await sendInquiryEmails(inq, { client: { batch: { send: async () => { throw new Error("net"); } } }, env: e })).toEqual({ sent: false });
  });
});
