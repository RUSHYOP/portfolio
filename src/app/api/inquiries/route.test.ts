import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
import { validate } from "@/lib/collections/fieldSpec";
import { inquiriesDef } from "@/lib/collections/specs/inquiries";
import { POST } from "./route";
import { resetInquiryLimiter } from "@/lib/inquiryLimiter";

const good = { name: "Ada", email: "ada@example.com", building: "Console", budget: "lt5k", timeline: "asap" };
const post = (body: unknown, ip = "1.2.3.4") =>
  POST(new NextRequest("http://localhost/api/inquiries", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": ip } }));

beforeEach(() => {
  resetInquiryLimiter();
  vi.mocked(inquiries.validate).mockImplementation((b, m) => validate(inquiriesDef.fields, b, m));
  vi.mocked(inquiries.create).mockClear();
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
    expect((await post(good, "9.9.9.9")).status).toBe(201);
  });
  it("email failure still stores and returns 201, flags notifyFailed", async () => {
    vi.mocked(sendInquiryEmails).mockResolvedValue({ sent: false });
    const res = await post(good);
    expect(res.status).toBe(201);
    expect(inquiries.update).toHaveBeenCalledWith("inq_1", { notifyFailed: true });
  });
});
