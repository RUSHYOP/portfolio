import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/log", () => ({ appendLog: vi.fn(async () => {}) }));
vi.mock("@/lib/collections", () => ({
  inquiries: {
    def: { name: "Inquiry", publicList: false, revalidate: [] },
    getById: vi.fn(async () => null),
    update: vi.fn(async () => ({ id: "inq_1", status: "replied" })),
    remove: vi.fn(async () => true),
  },
}));
vi.mock("@/lib/auth", () => ({ verifyRequest: vi.fn(async () => true) }));

import { inquiries } from "@/lib/collections";
import { verifyRequest } from "@/lib/auth";
import { PUT } from "./route";

const ctx = { params: Promise.resolve({ id: "inq_1" }) };
const put = (body: unknown) =>
  PUT(new NextRequest("http://localhost/api/inquiries/inq_1", { method: "PUT", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json" } }), ctx);

beforeEach(() => {
  vi.mocked(verifyRequest).mockClear().mockResolvedValue(true);
  vi.mocked(inquiries.update).mockClear().mockResolvedValue({ id: "inq_1", status: "replied", createdAt: "", order: 0 });
});

describe("PUT /api/inquiries/[id]", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(verifyRequest).mockResolvedValue(false);
    const res = await put({ status: "replied" });
    expect(res.status).toBe(401);
    expect(inquiries.update).not.toHaveBeenCalled();
  });

  it("400 on invalid JSON", async () => {
    const res = await put("{");
    expect(res.status).toBe(400);
  });

  it("400 on missing or bad status, message lists the allowed values", async () => {
    const res = await put({});
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("new");
    expect(json.error).toContain("replied");
    expect(json.error).toContain("archived");

    const res2 = await put({ status: "bogus" });
    expect(res2.status).toBe(400);
  });

  it("404 when the inquiry does not exist", async () => {
    vi.mocked(inquiries.update).mockResolvedValue(null);
    const res = await put({ status: "archived" });
    expect(res.status).toBe(404);
  });

  it("200 on success, updates only status", async () => {
    const res = await put({ status: "replied" });
    expect(res.status).toBe(200);
    expect(inquiries.update).toHaveBeenCalledWith("inq_1", { status: "replied" });
    expect(await res.json()).toEqual({ id: "inq_1", status: "replied", createdAt: "", order: 0 });
  });

  it("500 when update throws (error boundary)", async () => {
    vi.mocked(inquiries.update).mockRejectedValue(new Error("db down"));
    const res = await put({ status: "replied" });
    expect(res.status).toBe(500);
  });
});
