import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyRequest: vi.fn() }));
vi.mock("@/lib/data", () => ({
  getSettings: vi.fn(async () => ({ manifesto: "live" })),
  updateSettings: vi.fn(async (u: Record<string, unknown>) => ({ manifesto: "live", ...u })),
}));

import { revalidatePath } from "next/cache";
import { verifyRequest } from "@/lib/auth";
import { updateSettings } from "@/lib/data";
import { PUT } from "./route";

const put = (body: unknown) =>
  new NextRequest("http://localhost/api/settings", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.mocked(verifyRequest).mockReset().mockResolvedValue(true);
  vi.mocked(revalidatePath).mockReset();
  vi.mocked(updateSettings).mockClear();
});

describe("PUT /api/settings", () => {
  it("drops keys outside the editable whitelist", async () => {
    // `key` is a schema path: $set{key} would orphan the singleton.
    const res = await PUT(put({ key: "x", _id: "y", manifesto: "m" }));
    expect(res.status).toBe(200);
    expect(updateSettings).toHaveBeenCalledWith({ manifesto: "m" });
  });

  it("400s when nothing editable is left after filtering, and never writes", async () => {
    const res = await PUT(put({ key: "x" }));
    expect(res.status).toBe(400);
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("revalidates the pages that read settings", async () => {
    await PUT(put({ manifesto: "m" }));
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/voyage");
  });

  it("401s when unauthenticated and never writes or revalidates", async () => {
    vi.mocked(verifyRequest).mockResolvedValue(false);
    const res = await PUT(put({ manifesto: "m" }));
    expect(res.status).toBe(401);
    expect(updateSettings).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("400s on a non-object body", async () => {
    expect((await PUT(put(["a"]))).status).toBe(400);
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("keeps every editable field, including the booleans and arrays", async () => {
    await PUT(put({ showNavbar: false, navLinks: [], footerSections: [], heroHeadline: "h" }));
    expect(updateSettings).toHaveBeenCalledWith({ showNavbar: false, navLinks: [], footerSections: [], heroHeadline: "h" });
  });
});
