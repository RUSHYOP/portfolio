import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/log", () => ({ appendLog: vi.fn().mockResolvedValue(undefined) }));

import { appendLog } from "@/lib/log";
import { POST } from "./route";

function post(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/logs", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
}

beforeEach(() => {
  vi.mocked(appendLog).mockClear();
});

describe("POST /api/logs", () => {
  it("rejects a body over the cap with 413", async () => {
    const res = await POST(post(JSON.stringify({ event: "quality.tier", pad: "a".repeat(4000) })));
    expect(res.status).toBe(413);
    expect(appendLog).not.toHaveBeenCalled();
  });

  it("rejects a 3000-emoji body with 413", async () => {
    const res = await POST(post("\u{1F600}".repeat(3000)));
    expect(res.status).toBe(413);
    expect(appendLog).not.toHaveBeenCalled();
  });

  it("measures the cap in bytes, not UTF-16 code units", async () => {
    // 1000 emoji = 2000 UTF-16 code units (under the cap by length) but 4000 UTF-8 bytes.
    const res = await POST(post(JSON.stringify({ event: "quality.tier", pad: "\u{1F600}".repeat(1000) })));
    expect(res.status).toBe(413);
    expect(appendLog).not.toHaveBeenCalled();
  });

  it("rejects a declared content-length over the cap without reading the body", async () => {
    const res = await POST(post(JSON.stringify({ event: "quality.tier" }), { "content-length": "99999" }));
    expect(res.status).toBe(413);
    expect(appendLog).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(post("{"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
    expect(appendLog).not.toHaveBeenCalled();
  });

  it("rejects a bare null body with 400", async () => {
    const res = await POST(post("null"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Body must be a JSON object" });
    expect(appendLog).not.toHaveBeenCalled();
  });

  it("rejects an unknown event with 400", async () => {
    const res = await POST(post(JSON.stringify({ event: "nope" })));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Unknown event" });
    expect(appendLog).not.toHaveBeenCalled();
  });

  it("accepts an allow-listed event with 204 and appends it", async () => {
    const res = await POST(post(JSON.stringify({ event: "quality.tier", tier: "high" })));
    expect(res.status).toBe(204);
    expect(appendLog).toHaveBeenCalledTimes(1);
    expect(appendLog).toHaveBeenCalledWith("client", expect.objectContaining({ event: "quality.tier", tier: "high" }));
  });
});
