import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyRequest: vi.fn() }));

import { revalidatePath } from "next/cache";
import { verifyRequest } from "@/lib/auth";
import { listAndCreate, byId, reorderRoute } from "./routeHandlers";
import { DuplicateSlugError, type Collection } from "./defineCollection";
import type { CollectionDef } from "./fieldSpec";

const def: CollectionDef = {
  name: "T", collection: "ts", idPrefix: "t",
  fields: { title: { type: "text", label: "Title", required: true, max: 20 } },
  orderable: true, publishable: true, publicList: true, searchable: ["title"], revalidate: ["/voyage", "/work/[slug]"],
};

function fakeCol(over: Partial<Collection> = {}): Collection {
  return {
    def, model: {} as Collection["model"],
    validate: (body, mode) => {
      const b = body as Record<string, unknown>;
      if (mode === "create" && typeof b.title !== "string") return { ok: false, error: "title is required" };
      return { ok: true, value: { ...(b as Record<string, string>) } };
    },
    toDto: (d) => d as never,
    list: vi.fn(async (o) => [{ id: "t_1", title: "A", order: 0, createdAt: "", published: !o?.publishedOnly ? false : true }]),
    getById: vi.fn(async (id) => (id === "t_1" ? { id: "t_1", title: "A", order: 0, createdAt: "" } : null)),
    getBySlug: vi.fn(),
    create: vi.fn(async (v) => ({ id: "t_new", order: 1, createdAt: "", ...v })),
    update: vi.fn(async (id, v) => (id === "t_1" ? { id, order: 0, createdAt: "", ...v } : null)),
    remove: vi.fn(async (id) => id === "t_1"),
    reorder: vi.fn(async (ids) => ids.length === 2),
    ...over,
  };
}

const req = (method: string, body?: unknown, url = "http://localhost/api/ts") =>
  new NextRequest(url, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.mocked(verifyRequest).mockReset();
  vi.mocked(revalidatePath).mockReset();
});

describe("listAndCreate", () => {
  it("GET is public, cached, and returns published only", async () => {
    const col = fakeCol();
    const res = await listAndCreate(col).GET(req("GET"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=3600");
    expect(col.list).toHaveBeenCalledWith({ publishedOnly: true });
  });
  it("GET ?all=1 requires auth and returns everything", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(false);
    expect((await listAndCreate(col).GET(req("GET", undefined, "http://localhost/api/ts?all=1"))).status).toBe(401);
    vi.mocked(verifyRequest).mockResolvedValue(true);
    const res = await listAndCreate(col).GET(req("GET", undefined, "http://localhost/api/ts?all=1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(col.list).toHaveBeenLastCalledWith({ publishedOnly: false, includeInternal: true });
  });
  it("GET requires auth when publicList is false", async () => {
    const col = fakeCol({ def: { ...def, publicList: false } });
    vi.mocked(verifyRequest).mockResolvedValue(false);
    expect((await listAndCreate(col).GET(req("GET"))).status).toBe(401);
  });
  it("POST requires auth, validates, creates, revalidates", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(false);
    expect((await listAndCreate(col).POST(req("POST", { title: "x" }))).status).toBe(401);
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect((await listAndCreate(col).POST(req("POST", {}))).status).toBe(400);
    const res = await listAndCreate(col).POST(req("POST", { title: "x" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(expect.objectContaining({ id: "t_new", title: "x" }));
    expect(revalidatePath).toHaveBeenCalledWith("/voyage");
    expect(revalidatePath).toHaveBeenCalledWith("/work/[slug]", "page");
  });
  it("POST maps DuplicateSlugError to 409 and bad JSON to 400", async () => {
    const col = fakeCol({ create: vi.fn(async () => { throw new DuplicateSlugError(); }) });
    vi.mocked(verifyRequest).mockResolvedValue(true);
    const res = await listAndCreate(col).POST(req("POST", { title: "x" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "slug already exists" });
    const bad = new NextRequest("http://localhost/api/ts", { method: "POST", body: "{", headers: { "content-type": "application/json" } });
    expect((await listAndCreate(col).POST(bad)).status).toBe(400);
  });
});

describe("byId", () => {
  it("GET requires auth; 404 when missing", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect((await byId(col).GET(req("GET"), ctx("t_1"))).status).toBe(200);
    expect((await byId(col).GET(req("GET"), ctx("nope"))).status).toBe(404);
  });
  it("PUT validates in update mode, 404s, revalidates", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect((await byId(col).PUT(req("PUT", { title: "B" }), ctx("t_1"))).status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/voyage");
    expect((await byId(col).PUT(req("PUT", { title: "B" }), ctx("nope"))).status).toBe(404);
  });
  it("DELETE 200s with success and 404s when missing", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect(await (await byId(col).DELETE(req("DELETE"), ctx("t_1"))).json()).toEqual({ success: true });
    expect((await byId(col).DELETE(req("DELETE"), ctx("nope"))).status).toBe(404);
  });
});

describe("reorderRoute", () => {
  it("requires auth, validates ids, 400s on mismatch", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect((await reorderRoute(col).PUT(req("PUT", { ids: "x" }))).status).toBe(400);
    expect((await reorderRoute(col).PUT(req("PUT", { ids: ["a"] }))).status).toBe(400);
    const ok = await reorderRoute(col).PUT(req("PUT", { ids: ["a", "b"] }));
    expect(ok.status).toBe(200);
    expect(col.reorder).toHaveBeenCalledWith(["a", "b"]);
  });
});
