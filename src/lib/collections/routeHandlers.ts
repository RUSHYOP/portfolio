import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyRequest } from "@/lib/auth";
import { appendLog } from "@/lib/log";
import { DuplicateSlugError, type Collection } from "./defineCollection";

// Cache-Control for every /api/* response is set once in next.config.js; route handlers
// must not set their own or they will be silently overridden on the wire.

type IdCtx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });
const notFound = (what: string) => NextResponse.json({ error: `${what} not found` }, { status: 404 });

async function readJson(request: NextRequest): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}

/** Revalidate every path the collection feeds. Dynamic segments (`[slug]`) revalidate the whole page type. */
export function revalidateAll(col: Collection): void {
  for (const p of col.def.revalidate) {
    if (p.includes("[")) revalidatePath(p, "page");
    else revalidatePath(p);
  }
}

/**
 * Fire-and-forget structured error log. Never records the request body (it may hold secrets),
 * and is deliberately not awaited so a logging failure can never change or delay the response.
 */
function logError(col: Collection, verb: string, err: unknown): void {
  void Promise.resolve(appendLog("api", { level: "error", collection: col.def.collection, verb, message: String(err) })).catch(() => {
    // logging must never fail a response
  });
}

/** Logged JSON 500 with a message built from the human-readable collection name. */
function serverError(e: unknown, verb: string, col: Collection) {
  logError(col, verb, e);
  return NextResponse.json({ error: `Failed to ${verb} ${col.def.name.toLowerCase()}` }, { status: 500 });
}

function mutationError(e: unknown, verb: string, col: Collection) {
  // a duplicate slug is a client error, not a server fault — not logged
  if (e instanceof DuplicateSlugError) return NextResponse.json({ error: e.message }, { status: 409 });
  return serverError(e, verb, col);
}

export function listAndCreate(col: Collection) {
  return {
    async GET(request: NextRequest) {
      // one error boundary for the whole body: both list branches — and verifyRequest itself — are covered
      try {
        const all = request.nextUrl.searchParams.get("all") === "1";
        if (all || !col.def.publicList) {
          if (!(await verifyRequest(request))) return unauthorized();
          return NextResponse.json(await col.list({ publishedOnly: false, includeInternal: true }), { headers: { "Cache-Control": "no-store" } });
        }
        return NextResponse.json(await col.list({ publishedOnly: true }));
      } catch (e) {
        return serverError(e, "load", col);
      }
    },

    async POST(request: NextRequest) {
      if (!(await verifyRequest(request))) return unauthorized();
      const parsed = await readJson(request);
      if (!parsed.ok) return badRequest("Invalid JSON");
      const v = col.validate(parsed.body, "create");
      if (!v.ok) return badRequest(v.error);
      try {
        const created = await col.create(v.value);
        revalidateAll(col);
        return NextResponse.json(created, { status: 201 });
      } catch (e) {
        return mutationError(e, "create", col);
      }
    },
  };
}

export function byId(col: Collection) {
  return {
    async GET(request: NextRequest, { params }: IdCtx) {
      if (!(await verifyRequest(request))) return unauthorized();
      const { id } = await params;
      // error boundary so a DB fault returns JSON 500 rather than an unhandled rejection
      try {
        const item = await col.getById(id, { includeInternal: true });
        return item ? NextResponse.json(item) : notFound(col.def.name);
      } catch (e) {
        return serverError(e, "load", col);
      }
    },

    async PUT(request: NextRequest, { params }: IdCtx) {
      if (!(await verifyRequest(request))) return unauthorized();
      const { id } = await params;
      const parsed = await readJson(request);
      if (!parsed.ok) return badRequest("Invalid JSON");
      const v = col.validate(parsed.body, "update");
      if (!v.ok) return badRequest(v.error);
      try {
        const updated = await col.update(id, v.value);
        if (!updated) return notFound(col.def.name);
        revalidateAll(col);
        return NextResponse.json(updated);
      } catch (e) {
        return mutationError(e, "update", col);
      }
    },

    async DELETE(request: NextRequest, { params }: IdCtx) {
      if (!(await verifyRequest(request))) return unauthorized();
      const { id } = await params;
      try {
        const removed = await col.remove(id);
        if (!removed) return notFound(col.def.name);
        revalidateAll(col);
        return NextResponse.json({ success: true });
      } catch (e) {
        return mutationError(e, "delete", col);
      }
    },
  };
}

export function reorderRoute(col: Collection) {
  return {
    async PUT(request: NextRequest) {
      if (!(await verifyRequest(request))) return unauthorized();
      const parsed = await readJson(request);
      if (!parsed.ok) return badRequest("Invalid JSON");
      const ids = (parsed.body as { ids?: unknown } | null)?.ids;
      if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string")) return badRequest("ids must be an array of strings");
      try {
        const ok = await col.reorder(ids as string[]);
        if (!ok) return badRequest("ids must contain every item exactly once");
        revalidateAll(col);
        return NextResponse.json({ success: true });
      } catch (e) {
        return mutationError(e, "reorder", col);
      }
    },
  };
}
