import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyRequest: vi.fn() }));
// structured logger is mocked so 500 paths can assert on it without touching the filesystem
vi.mock("@/lib/log", () => ({ appendLog: vi.fn().mockResolvedValue(undefined) }));

import { revalidatePath } from "next/cache";
import { verifyRequest } from "@/lib/auth";
import { appendLog } from "@/lib/log";
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
/** Raw request with a deliberately malformed JSON body — used to prove auth is checked before the body is read. */
const badJsonReq = (method: string, url = "http://localhost/api/ts") =>
  new NextRequest(url, { method, body: "{", headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.mocked(verifyRequest).mockReset();
  vi.mocked(revalidatePath).mockReset();
  // mockClear, not mockReset: mockReset would drop the mockResolvedValue implementation
  vi.mocked(appendLog).mockClear();
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
  it("POST rejects unauthenticated malformed JSON with 401, not 400, and never creates", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(false);
    expect((await listAndCreate(col).POST(badJsonReq("POST"))).status).toBe(401);
    expect(col.create).not.toHaveBeenCalled();
  });
  it("POST does not revalidate when validation fails", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect((await listAndCreate(col).POST(req("POST", {}))).status).toBe(400);
    expect(col.create).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("GET returns a logged JSON 500 when list throws", async () => {
    const col = fakeCol({ list: vi.fn(async () => { throw new Error("db down"); }) });
    const res = await listAndCreate(col).GET(req("GET"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to load t" });
    expect(appendLog).toHaveBeenCalledWith("api", expect.objectContaining({ level: "error", collection: "ts", verb: "load" }));
  });
  it("GET ?all=1 returns a logged JSON 500 when the admin list throws", async () => {
    const col = fakeCol({ list: vi.fn(async () => { throw new Error("db down"); }) });
    vi.mocked(verifyRequest).mockResolvedValue(true);
    const res = await listAndCreate(col).GET(req("GET", undefined, "http://localhost/api/ts?all=1"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to load t" });
    expect(appendLog).toHaveBeenCalledTimes(1);
  });
});

describe("byId", () => {
  it("GET returns the item when authenticated and 404s when missing", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect((await byId(col).GET(req("GET"), ctx("t_1"))).status).toBe(200);
    expect((await byId(col).GET(req("GET"), ctx("nope"))).status).toBe(404);
  });
  it("GET 401s when unauthenticated and never reads the item", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(false);
    expect((await byId(col).GET(req("GET"), ctx("t_1"))).status).toBe(401);
    expect(col.getById).not.toHaveBeenCalled();
  });
  it("GET returns a logged JSON 500 when getById throws", async () => {
    const col = fakeCol({ getById: vi.fn(async () => { throw new Error("db down"); }) });
    vi.mocked(verifyRequest).mockResolvedValue(true);
    const res = await byId(col).GET(req("GET"), ctx("t_1"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to load t" });
    expect(appendLog).toHaveBeenCalledWith("api", expect.objectContaining({ level: "error", collection: "ts", verb: "load" }));
  });
  it("PUT validates in update mode, 404s, revalidates", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect((await byId(col).PUT(req("PUT", { title: "B" }), ctx("t_1"))).status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/voyage");
    expect((await byId(col).PUT(req("PUT", { title: "B" }), ctx("nope"))).status).toBe(404);
  });
  it("PUT 401s on malformed JSON when unauthenticated, and never updates", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(false);
    expect((await byId(col).PUT(badJsonReq("PUT"), ctx("t_1"))).status).toBe(401);
    expect(col.update).not.toHaveBeenCalled();
  });
  it("PUT 400s on malformed JSON when authenticated", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    const res = await byId(col).PUT(badJsonReq("PUT"), ctx("t_1"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
  });
  it("PUT maps DuplicateSlugError to 409", async () => {
    const col = fakeCol({ update: vi.fn(async () => { throw new DuplicateSlugError(); }) });
    vi.mocked(verifyRequest).mockResolvedValue(true);
    const res = await byId(col).PUT(req("PUT", { title: "B" }), ctx("t_1"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "slug already exists" });
    expect(appendLog).not.toHaveBeenCalled();
  });
  it("PUT does not revalidate when the item is missing", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect((await byId(col).PUT(req("PUT", { title: "B" }), ctx("nope"))).status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("DELETE 200s with success and 404s when missing", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect(await (await byId(col).DELETE(req("DELETE"), ctx("t_1"))).json()).toEqual({ success: true });
    expect((await byId(col).DELETE(req("DELETE"), ctx("nope"))).status).toBe(404);
  });
  it("DELETE 401s when unauthenticated and never removes", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(false);
    expect((await byId(col).DELETE(req("DELETE"), ctx("t_1"))).status).toBe(401);
    expect(col.remove).not.toHaveBeenCalled();
  });
});

describe("reorderRoute", () => {
  it("validates ids and 400s on mismatch", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    expect((await reorderRoute(col).PUT(req("PUT", { ids: "x" }))).status).toBe(400);
    expect((await reorderRoute(col).PUT(req("PUT", { ids: ["a"] }))).status).toBe(400);
    const ok = await reorderRoute(col).PUT(req("PUT", { ids: ["a", "b"] }));
    expect(ok.status).toBe(200);
    expect(col.reorder).toHaveBeenCalledWith(["a", "b"]);
  });
  it("PUT 401s on malformed JSON when unauthenticated, and never reorders", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(false);
    expect((await reorderRoute(col).PUT(badJsonReq("PUT"))).status).toBe(401);
    expect(col.reorder).not.toHaveBeenCalled();
  });
  it("PUT 400s on malformed JSON when authenticated", async () => {
    const col = fakeCol();
    vi.mocked(verifyRequest).mockResolvedValue(true);
    const res = await reorderRoute(col).PUT(badJsonReq("PUT"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
  });
  it("PUT returns a logged JSON 500 when reorder throws", async () => {
    const col = fakeCol({ reorder: vi.fn(async () => { throw new Error("db down"); }) });
    vi.mocked(verifyRequest).mockResolvedValue(true);
    const res = await reorderRoute(col).PUT(req("PUT", { ids: ["a", "b"] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to reorder t" });
    expect(appendLog).toHaveBeenCalledWith("api", expect.objectContaining({ level: "error", collection: "ts", verb: "reorder", message: "Error: db down" }));
  });
});
