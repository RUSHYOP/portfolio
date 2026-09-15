import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// No salt in the test env, so the once-per-process "salt missing" warning branch is live here.
delete process.env.INQUIRY_IP_SALT;

vi.mock("@/lib/log", () => ({ appendLog: vi.fn(async () => {}) }));
vi.mock("@/lib/mail", () => ({ sendInquiryEmails: vi.fn(async () => ({ sent: true })) }));
vi.mock("@/lib/collections", () => ({
  inquiries: {
    def: { name: "Inquiry", publicList: false, revalidate: [] },
    validate: vi.fn(),
    create: vi.fn(async (v: Record<string, unknown>, internal: Record<string, unknown>) => ({ id: "inq_1", createdAt: "", order: 0, ...v, ...internal })),
    update: vi.fn(async () => ({ id: "inq_1" })),
    list: vi.fn(async () => []),
  },
}));
vi.mock("@/lib/auth", () => ({ verifyRequest: vi.fn(async () => true) }));

import { inquiries } from "@/lib/collections";
import { sendInquiryEmails } from "@/lib/mail";
import { appendLog } from "@/lib/log";
import { validate } from "@/lib/collections/fieldSpec";
import { inquiriesDef } from "@/lib/collections/specs/inquiries";
import { POST } from "./route";
import { resetInquiryLimiter } from "@/lib/inquiryLimiter";

const good = { name: "Ada", email: "ada@example.com", building: "Console", budget: "lt5k", timeline: "asap" };
// Default headers carry x-forwarded-for; pass `headers` to override (e.g. an anonymous, header-less caller).
const post = (body: unknown, headers: Record<string, string> = { "x-forwarded-for": "1.2.3.4" }) =>
  POST(new NextRequest("http://localhost/api/inquiries", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }));

// Vitest clears mock call history between tests, so these counts are always per-test.
const logCalls = (event: string) => vi.mocked(appendLog).mock.calls.filter((c) => (c[1] as { event?: string }).event === event);

beforeEach(() => {
  resetInquiryLimiter();
  vi.mocked(inquiries.validate).mockImplementation((b, m) => validate(inquiriesDef.fields, b, m));
  vi.mocked(inquiries.create).mockClear().mockImplementation(async (v, internal) => ({ id: "inq_1", createdAt: "", order: 0, ...v, ...internal }));
  vi.mocked(inquiries.update).mockClear().mockResolvedValue({ id: "inq_1", createdAt: "", order: 0 });
  vi.mocked(sendInquiryEmails).mockClear().mockResolvedValue({ sent: true });
});

describe("POST /api/inquiries", () => {
  it("stores, emails, returns 201", async () => {
    const res = await post(good);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(inquiries.create).toHaveBeenCalledWith(expect.objectContaining({ name: "Ada" }), expect.objectContaining({ status: "new", ipHash: expect.any(String) }));
    expect(sendInquiryEmails).toHaveBeenCalledTimes(1);
  });
  it("honeypot: silent 201, nothing stored or sent", async () => {
    const res = await post({ ...good, website: "http://spam" });
    expect(res.status).toBe(201);
    expect(inquiries.create).not.toHaveBeenCalled();
    expect(sendInquiryEmails).not.toHaveBeenCalled();
  });
  it("honeypot runs before validation: bad email + honeypot still gives a silent 201", async () => {
    const res = await post({ ...good, email: "nope", website: "http://spam" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(inquiries.create).not.toHaveBeenCalled();
  });
  it("rejects oversize body, invalid JSON, invalid email, bad enum", async () => {
    expect((await post("x".repeat(4097))).status).toBe(413);
    expect((await post("{")).status).toBe(400);
    expect((await post({ ...good, email: "nope" })).status).toBe(400);
    expect((await post({ ...good, budget: "zillions" })).status).toBe(400);
  });
  it("rate limits the 6th request from one IP within the window", async () => {
    for (let i = 0; i < 5; i++) expect((await post(good)).status).toBe(201);
    const blocked = await post(good);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    // The blocked request must not reach the store.
    expect(inquiries.create).toHaveBeenCalledTimes(5);
    expect((await post(good, { "x-forwarded-for": "9.9.9.9" })).status).toBe(201);
  });
  it("prefers x-real-ip over x-forwarded-for when bucketing", async () => {
    // Five from one real-ip, all with differing forwarded-for values: the 6th must still be blocked.
    for (let i = 0; i < 5; i++) {
      expect((await post(good, { "x-real-ip": "7.7.7.7", "x-forwarded-for": `1.1.1.${i}` })).status).toBe(201);
    }
    expect((await post(good, { "x-real-ip": "7.7.7.7", "x-forwarded-for": "8.8.8.8" })).status).toBe(429);
    // A different real-ip is a different bucket even with a seen forwarded-for.
    expect((await post(good, { "x-real-ip": "7.7.7.8", "x-forwarded-for": "1.1.1.0" })).status).toBe(201);
  });
  it("header-less callers all share the 'unknown' bucket", async () => {
    for (let i = 0; i < 5; i++) expect((await post(good, {})).status).toBe(201);
    expect((await post(good, {})).status).toBe(429);
  });
  it("email failure still stores and returns 201, flags notifyFailed", async () => {
    vi.mocked(sendInquiryEmails).mockResolvedValue({ sent: false });
    const res = await post(good);
    expect(res.status).toBe(201);
    expect(inquiries.update).toHaveBeenCalledWith("inq_1", { notifyFailed: true });
  });
  it("a stored inquiry never surfaces as 500: post-create tail failure is logged, still 201", async () => {
    vi.mocked(sendInquiryEmails).mockResolvedValue({ sent: false });
    vi.mocked(inquiries.update).mockRejectedValue(new Error("db down"));
    const before = logCalls("notify_tail_failed").length;
    const res = await post(good);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(logCalls("notify_tail_failed").length).toBe(before + 1);
    expect(appendLog).toHaveBeenCalledWith("inquiries", expect.objectContaining({ level: "error", event: "notify_tail_failed", id: "inq_1" }));
  });
  it("500 only when the store itself fails", async () => {
    vi.mocked(inquiries.create).mockRejectedValue(new Error("db down"));
    expect((await post(good)).status).toBe(500);
  });
  // Keep this case last: it resets the module registry, so any dynamic import in a later
  // test would get a fresh, unconfigured set of mocks.
  it("logs the missing IP salt once per process, not per request", async () => {
    // Fresh module registry so the module-level "warned" guard starts unset regardless of
    // which tests ran before; every mock is re-read from the same fresh registry.
    vi.resetModules();
    const fresh = await import("./route");
    const freshLog = vi.mocked((await import("@/lib/log")).appendLog);
    const freshInquiries = vi.mocked((await import("@/lib/collections")).inquiries);
    freshInquiries.validate.mockImplementation((b, m) => validate(inquiriesDef.fields, b, m));
    freshInquiries.create.mockImplementation(async (v, internal) => ({ id: "inq_1", createdAt: "", order: 0, ...v, ...internal }));
    const freshPost = () =>
      fresh.POST(new NextRequest("http://localhost/api/inquiries", { method: "POST", body: JSON.stringify(good), headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" } }));

    expect((await freshPost()).status).toBe(201);
    expect((await freshPost()).status).toBe(201);
    expect(freshLog.mock.calls.filter((c) => (c[1] as { event?: string }).event === "ip_salt_missing")).toHaveLength(1);
  });
});
