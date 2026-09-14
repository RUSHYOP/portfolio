# Consulting Content Model + CMS + Inquiries — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Services, Process steps, Case studies, Testimonials and Inquiries as admin-editable collections (one schema-driven factory, one generic admin tab), a public rate-limited inquiry endpoint with two minimal Resend emails, and the `/work/[slug]` reading page — so voyage slices 3–7 build on real content.

**Architecture:** `defineCollection(def)` turns one field spec into a Mongoose model, DTO mapper, validator and CRUD; `routeHandlers.ts` turns a collection into Next route handlers so each API file is two lines. The admin gets a generic `CollectionTab` rendering list/add/edit/reorder/delete from the same spec, plus a bespoke `InboxTab`. Inquiries add a custom public `POST` (honeypot → validate → rate limit → store → email, never failing on email). Markdown renders server-side only through `marked` + `sanitize-html`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Mongoose 9, vitest 5, `resend@^6`, `marked@^18`, `sanitize-html@^2.17` (+ `@types/sanitize-html`).

**Spec:** `docs/superpowers/specs/2026-09-14-consulting-content-model-design.md`.

## Global Constraints

- Every field limit lives **only** in the field spec (`src/lib/collections/specs/*.ts`); validators and admin `maxLength` are generated from it.
- External ids: `svc_`, `step_`, `case_`, `tst_`, `inq_` + `crypto.randomUUID()`, stored as `itemId` (unique). DTOs expose it as `id`.
- `slug` regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`, unique index; duplicate → `409 { error: "slug already exists" }`.
- `published` defaults `false` on Case studies and Testimonials; public reads return published only; `?all=1` requires admin auth.
- Public `GET` lists use `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`; all writes require `verifyRequest`; errors are `{ error }` with 400/401/404/409/429/500.
- Inquiry `POST`: body ≤ 4096 bytes → honeypot `website` non-empty ⇒ silent `201 { ok: true }` (not stored) → validate → **5 per hour per hashed IP** (`429` + `Retry-After`) → store `status: "new"` → email → `201 { ok: true }`. Email failure never fails the request; sets `notifyFailed: true` and logs `{ event: "notify.failed", id }` via `appendLog("inquiries", …)`. No PII in logs beyond the id.
- Budget options `lt5k | 5to15k | 15to40k | 40kplus | undecided`; timeline `asap | 1to3m | 3mplus | exploring`; status `new | replied | archived`.
- Email: `resend` SDK, `RESEND_API_KEY` (already set), `RESEND_FROM = "Purav S <hello@communications.rushy.dev>"`, `INQUIRY_NOTIFY_TO`, `INQUIRY_IP_SALT`. Two plain-text emails (bodies in §4 of the spec, reproduced in Task 7). Missing Resend env ⇒ skip + log, still `201`.
- Markdown → HTML server-side only, in `src/lib/markdown.ts`; raw HTML dropped; links `http(s)`/`mailto` only, `rel="noopener noreferrer" target="_blank"`; sanitiser failure ⇒ escaped plain text.
- Mutations call `revalidatePath` for every path in the collection's `revalidate` list (`/voyage`; case studies also `/work/[slug]`).
- Existing Projects/Skills/Settings routes and tabs keep their current behaviour; only `Settings` gains `manifesto` and the Content tab gains three inputs.
- No `#f2b35c`/theme/voyage-scene code is touched. New files lint-clean (`npm run lint` shows only the pre-existing errors in untouched files).
- Commit after every task; messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/lib/collections/fieldSpec.ts` | Field/collection spec types + `validate()` (pure) |
| `src/lib/collections/defineCollection.ts` | Spec → Mongoose model, `toDto`, CRUD, `reorder`, `DuplicateSlugError` |
| `src/lib/collections/routeHandlers.ts` | Collection → Next route handlers (`listAndCreate`, `byId`, `reorderRoute`) |
| `src/lib/collections/specs/{services,processSteps,caseStudies,testimonials,inquiries}.ts` | One spec each; option tables exported |
| `src/lib/collections/index.ts` | Instantiated collections (singletons) |
| `src/app/api/{services,process,case-studies,testimonials}/route.ts`, `[id]/route.ts`, `reorder/route.ts` | Two-line route files |
| `src/app/api/inquiries/route.ts`, `[id]/route.ts` | Custom public POST; admin GET/PUT/DELETE |
| `src/lib/rateLimit.ts` | Generic in-memory window limiter |
| `src/lib/mail.ts` | Resend wrapper: `sendInquiryEmails` |
| `src/lib/markdown.ts` | `renderMarkdown` (marked + sanitize-html) |
| `src/lib/data.ts`, `src/lib/models.ts` | `manifesto` on Settings; `getVoyageContent`, `getCaseStudyBySlug` |
| `src/app/api/upload/route.ts` | `diagram` upload type |
| `src/app/admin/components/{types.ts,FieldInput.tsx,CollectionTab.tsx,ConsultingTab.tsx,InboxTab.tsx,ContentTab.tsx}` , `src/app/admin/page.tsx` | Admin |
| `src/app/work/[slug]/page.tsx`, `src/app/work/work.css` | Reading page |
| `scripts/seed.ts`, `.env.example`, `worklog.md`, `insights.md` | Seed + docs |

---

### Task 1: Field spec types + pure validator

**Files:**
- Create: `src/lib/collections/fieldSpec.ts`
- Test: `src/lib/collections/fieldSpec.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type FieldType = "text"|"textarea"|"markdown"|"chips"|"image"|"toggle"|"select"|"slug"|"number";
  export interface SelectOption { value: string; label: string }
  export interface FieldSpec { type: FieldType; label: string; required?: boolean; max?: number; maxItems?: number; options?: readonly SelectOption[]; default?: FieldValue; help?: string; internal?: boolean; }
  export type FieldValue = string | number | boolean | string[];
  export type FieldSpecs = Record<string, FieldSpec>;
  export interface CollectionDef { name: string; collection: string; idPrefix: string; fields: FieldSpecs; orderable: boolean; publishable: boolean; publicList: boolean; searchable: string[]; revalidate: string[]; }
  export type ValidationResult = { ok: true; value: Record<string, FieldValue> } | { ok: false; error: string };
  export const SLUG_RE: RegExp;
  export const RESERVED_KEYS: readonly string[];            // ["id","itemId","order","createdAt","updatedAt","_id"]
  export function validate(fields: FieldSpecs, body: unknown, mode: "create"|"update"): ValidationResult;
  export function labelFor(options: readonly SelectOption[], value: string): string;
  ```

- [ ] **Step 1: Write the failing tests**

`src/lib/collections/fieldSpec.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validate, labelFor, SLUG_RE, type FieldSpecs } from "./fieldSpec";

const fields: FieldSpecs = {
  title: { type: "text", label: "Title", required: true, max: 10 },
  body: { type: "markdown", label: "Body", max: 20 },
  tags: { type: "chips", label: "Tags", maxItems: 2, max: 5 },
  slug: { type: "slug", label: "Slug", required: true, max: 20 },
  kind: { type: "select", label: "Kind", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }], default: "a" },
  live: { type: "toggle", label: "Live", default: false },
  count: { type: "number", label: "Count", max: 5 },
  secret: { type: "text", label: "Secret", internal: true },
};

describe("validate create", () => {
  it("accepts a valid body, trims strings, applies defaults", () => {
    const r = validate(fields, { title: "  Hi ", slug: "my-slug", tags: [" x ", "y"] }, "create");
    expect(r).toEqual({ ok: true, value: { title: "Hi", slug: "my-slug", tags: ["x", "y"], kind: "a", live: false } });
  });
  it("rejects missing required", () => {
    expect(validate(fields, { slug: "a" }, "create")).toEqual({ ok: false, error: "title is required" });
  });
  it("rejects over-length text and markdown", () => {
    expect(validate(fields, { title: "x".repeat(11), slug: "a" }, "create")).toEqual({ ok: false, error: "title must be at most 10 characters" });
    expect(validate(fields, { title: "t", slug: "a", body: "y".repeat(21) }, "create")).toEqual({ ok: false, error: "body must be at most 20 characters" });
  });
  it("validates chips count, item length, and type", () => {
    expect(validate(fields, { title: "t", slug: "a", tags: ["a", "b", "c"] }, "create")).toEqual({ ok: false, error: "tags must have at most 2 items" });
    expect(validate(fields, { title: "t", slug: "a", tags: ["toolong"] }, "create")).toEqual({ ok: false, error: "tags items must be at most 5 characters" });
    expect(validate(fields, { title: "t", slug: "a", tags: "x" }, "create")).toEqual({ ok: false, error: "tags must be an array of strings" });
    expect(validate(fields, { title: "t", slug: "a", tags: ["", "ok"] }, "create")).toEqual({ ok: true, value: expect.objectContaining({ tags: ["ok"] }) });
  });
  it("validates slug pattern", () => {
    expect(validate(fields, { title: "t", slug: "Bad Slug" }, "create")).toEqual({ ok: false, error: "slug must be lowercase letters, numbers and single hyphens" });
    expect(SLUG_RE.test("a-b-c1")).toBe(true);
    expect(SLUG_RE.test("-a")).toBe(false);
    expect(SLUG_RE.test("a--b")).toBe(false);
  });
  it("validates select options, toggle, number", () => {
    expect(validate(fields, { title: "t", slug: "a", kind: "z" }, "create")).toEqual({ ok: false, error: "kind must be one of: a, b" });
    expect(validate(fields, { title: "t", slug: "a", live: "yes" }, "create")).toEqual({ ok: false, error: "live must be a boolean" });
    expect(validate(fields, { title: "t", slug: "a", count: 9 }, "create")).toEqual({ ok: false, error: "count must be at most 5" });
    expect(validate(fields, { title: "t", slug: "a", count: Number.NaN }, "create")).toEqual({ ok: false, error: "count must be a number" });
  });
  it("rejects unknown, reserved and internal keys from a body", () => {
    expect(validate(fields, { title: "t", slug: "a", nope: 1 }, "create")).toEqual({ ok: false, error: "unknown field: nope" });
    expect(validate(fields, { title: "t", slug: "a", order: 3 }, "create")).toEqual({ ok: false, error: "order cannot be set" });
    expect(validate(fields, { title: "t", slug: "a", secret: "x" }, "create")).toEqual({ ok: false, error: "secret cannot be set" });
  });
  it("rejects non-object bodies", () => {
    expect(validate(fields, null, "create")).toEqual({ ok: false, error: "Body must be a JSON object" });
    expect(validate(fields, [], "create")).toEqual({ ok: false, error: "Body must be a JSON object" });
  });
});

describe("validate update", () => {
  it("validates only present keys and applies no defaults", () => {
    expect(validate(fields, { body: "ok" }, "update")).toEqual({ ok: true, value: { body: "ok" } });
    expect(validate(fields, { title: "" }, "update")).toEqual({ ok: false, error: "title is required" });
  });
});

describe("labelFor", () => {
  it("maps a value to its label and falls back to the value", () => {
    expect(labelFor(fields.kind.options!, "b")).toBe("B");
    expect(labelFor(fields.kind.options!, "zz")).toBe("zz");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/collections/fieldSpec.test.ts`
Expected: FAIL — `Cannot find module './fieldSpec'`

- [ ] **Step 3: Implement `src/lib/collections/fieldSpec.ts`**

```ts
export type FieldType = "text" | "textarea" | "markdown" | "chips" | "image" | "toggle" | "select" | "slug" | "number";
export type FieldValue = string | number | boolean | string[];

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldSpec {
  type: FieldType;
  label: string;
  required?: boolean;
  /** Max string length (text/textarea/markdown/slug/chips items) or max numeric value. */
  max?: number;
  /** chips only */
  maxItems?: number;
  /** select only */
  options?: readonly SelectOption[];
  default?: FieldValue;
  help?: string;
  /** Server-managed: never accepted from a request body, stripped from public DTOs. */
  internal?: boolean;
}

export type FieldSpecs = Record<string, FieldSpec>;

export interface CollectionDef {
  /** Mongoose model name, e.g. "Service". */
  name: string;
  /** Mongo collection name, e.g. "services". */
  collection: string;
  idPrefix: string;
  fields: FieldSpecs;
  orderable: boolean;
  publishable: boolean;
  /** false → GET list requires admin auth (inquiries). */
  publicList: boolean;
  searchable: string[];
  revalidate: string[];
}

export type ValidationResult =
  | { ok: true; value: Record<string, FieldValue> }
  | { ok: false; error: string };

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED_KEYS = ["id", "itemId", "order", "createdAt", "updatedAt", "_id"] as const;

const isPlainObject = (b: unknown): b is Record<string, unknown> =>
  typeof b === "object" && b !== null && !Array.isArray(b);

function checkString(key: string, spec: FieldSpec, raw: unknown): { value?: string; error?: string } {
  if (typeof raw !== "string") return { error: `${key} must be a string` };
  const value = raw.trim();
  if (spec.required && value.length === 0) return { error: `${key} is required` };
  if (spec.max !== undefined && value.length > spec.max) return { error: `${key} must be at most ${spec.max} characters` };
  if (spec.type === "slug" && value.length > 0 && !SLUG_RE.test(value)) {
    return { error: `${key} must be lowercase letters, numbers and single hyphens` };
  }
  return { value };
}

function checkField(key: string, spec: FieldSpec, raw: unknown): { value?: FieldValue; error?: string } {
  switch (spec.type) {
    case "text":
    case "textarea":
    case "markdown":
    case "slug":
    case "image":
      return checkString(key, spec, raw);
    case "chips": {
      if (!Array.isArray(raw) || !raw.every((t) => typeof t === "string")) return { error: `${key} must be an array of strings` };
      const items = (raw as string[]).map((t) => t.trim()).filter((t) => t.length > 0);
      if (spec.maxItems !== undefined && items.length > spec.maxItems) return { error: `${key} must have at most ${spec.maxItems} items` };
      if (spec.max !== undefined && items.some((t) => t.length > spec.max!)) return { error: `${key} items must be at most ${spec.max} characters` };
      if (spec.required && items.length === 0) return { error: `${key} is required` };
      return { value: items };
    }
    case "toggle":
      if (typeof raw !== "boolean") return { error: `${key} must be a boolean` };
      return { value: raw };
    case "select": {
      if (typeof raw !== "string") return { error: `${key} must be a string` };
      const allowed = (spec.options ?? []).map((o) => o.value);
      if (!allowed.includes(raw)) return { error: `${key} must be one of: ${allowed.join(", ")}` };
      return { value: raw };
    }
    case "number":
      if (typeof raw !== "number" || !Number.isFinite(raw)) return { error: `${key} must be a number` };
      if (spec.max !== undefined && raw > spec.max) return { error: `${key} must be at most ${spec.max}` };
      return { value: raw };
  }
}

/**
 * Validates a request body against a field spec.
 * create: enforces required, applies defaults for absent fields.
 * update: validates only present keys.
 * Reserved and internal keys are always rejected.
 */
export function validate(fields: FieldSpecs, body: unknown, mode: "create" | "update"): ValidationResult {
  if (!isPlainObject(body)) return { ok: false, error: "Body must be a JSON object" };

  for (const key of Object.keys(body)) {
    if ((RESERVED_KEYS as readonly string[]).includes(key)) return { ok: false, error: `${key} cannot be set` };
    const spec = fields[key];
    if (!spec) return { ok: false, error: `unknown field: ${key}` };
    if (spec.internal) return { ok: false, error: `${key} cannot be set` };
  }

  const value: Record<string, FieldValue> = {};
  for (const [key, spec] of Object.entries(fields)) {
    if (spec.internal) continue;
    const present = Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;
    if (!present) {
      if (mode === "create") {
        if (spec.required) return { ok: false, error: `${key} is required` };
        if (spec.default !== undefined) value[key] = spec.default;
      }
      continue;
    }
    const checked = checkField(key, spec, body[key]);
    if (checked.error) return { ok: false, error: checked.error };
    if (checked.value !== undefined) value[key] = checked.value;
  }
  return { ok: true, value };
}

export function labelFor(options: readonly SelectOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/collections/fieldSpec.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/collections/fieldSpec.ts src/lib/collections/fieldSpec.test.ts
git commit -m "$(cat <<'EOF'
feat(cms): field spec types and pure validator for schema-driven collections

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `defineCollection` — model, DTO, CRUD

**Files:**
- Create: `src/lib/collections/defineCollection.ts`
- Test: `src/lib/collections/defineCollection.test.ts`

**Interfaces:**
- Consumes: Task 1 types, `validate`.
- Produces:
  ```ts
  export type Item = { id: string; order: number; createdAt: string } & Record<string, FieldValue>;
  export class DuplicateSlugError extends Error {}
  export interface Collection {
    def: CollectionDef;
    model: Model<any>;
    validate(body: unknown, mode: "create"|"update"): ValidationResult;
    toDto(doc: Record<string, unknown>, opts?: { includeInternal?: boolean }): Item;
    list(opts?: { publishedOnly?: boolean; includeInternal?: boolean; sort?: "order"|"newest" }): Promise<Item[]>;
    getById(id: string, opts?: { includeInternal?: boolean }): Promise<Item | null>;
    getBySlug(slug: string, opts?: { publishedOnly?: boolean }): Promise<Item | null>;   // throws if no slug field
    create(value: Record<string, FieldValue>, internal?: Record<string, FieldValue>): Promise<Item>;
    update(id: string, value: Record<string, FieldValue>): Promise<Item | null>;
    remove(id: string): Promise<boolean>;
    reorder(ids: string[]): Promise<boolean>;
  }
  export function defineCollection(def: CollectionDef): Collection;
  export function buildSchema(def: CollectionDef): Schema;    // exported for tests
  ```

- [ ] **Step 1: Write the failing tests**

`src/lib/collections/defineCollection.test.ts` (no DB: tests schema shape, `toDto`, validation wiring, and `getBySlug` guard):
```ts
import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { defineCollection, buildSchema } from "./defineCollection";
import type { CollectionDef } from "./fieldSpec";

const def: CollectionDef = {
  name: "TestThing", collection: "testthings", idPrefix: "tt",
  fields: {
    title: { type: "text", label: "Title", required: true, max: 50 },
    slug: { type: "slug", label: "Slug", required: true, max: 50 },
    tags: { type: "chips", label: "Tags", maxItems: 3, max: 10 },
    kind: { type: "select", label: "Kind", options: [{ value: "a", label: "A" }], default: "a" },
    hits: { type: "number", label: "Hits", default: 0 },
    secret: { type: "text", label: "Secret", internal: true },
  },
  orderable: true, publishable: true, publicList: true, searchable: ["title"], revalidate: ["/voyage"],
};

describe("buildSchema", () => {
  const schema = buildSchema(def);
  it("maps field types to Mongoose types and adds itemId/order/published", () => {
    expect(schema.path("itemId").options.unique).toBe(true);
    expect(schema.path("title").instance).toBe("String");
    expect(schema.path("slug").options.unique).toBe(true);
    expect(schema.path("tags").instance).toBe("Array");
    expect(schema.path("kind").options.enum).toEqual(["a"]);
    expect(schema.path("hits").instance).toBe("Number");
    expect(schema.path("order").instance).toBe("Number");
    expect(schema.path("published").instance).toBe("Boolean");
    expect(schema.path("published").options.default).toBe(false);
    expect(schema.path("createdAt")).toBeDefined();
  });
  it("omits order/published when the def says so", () => {
    const s = buildSchema({ ...def, orderable: false, publishable: false });
    expect(s.path("order")).toBeUndefined();
    expect(s.path("published")).toBeUndefined();
  });
});

describe("defineCollection", () => {
  const col = defineCollection(def);
  it("registers the model once and reuses it", () => {
    expect(col.model.modelName).toBe("TestThing");
    expect(defineCollection(def).model).toBe(col.model);
    expect(mongoose.models.TestThing).toBe(col.model);
  });
  it("toDto exposes itemId as id and strips internals unless asked", () => {
    const doc = { _id: "x", itemId: "tt_1", title: "T", slug: "t", tags: ["a"], kind: "a", hits: 2, secret: "s", published: true, order: 3, createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date(), __v: 0 };
    expect(col.toDto(doc)).toEqual({ id: "tt_1", title: "T", slug: "t", tags: ["a"], kind: "a", hits: 2, published: true, order: 3, createdAt: "2026-01-01T00:00:00.000Z" });
    expect(col.toDto(doc, { includeInternal: true }).secret).toBe("s");
  });
  it("toDto fills absent fields with defaults or empty values", () => {
    const dto = col.toDto({ itemId: "tt_2", title: "T", slug: "t", createdAt: new Date(0) });
    expect(dto.tags).toEqual([]);
    expect(dto.kind).toBe("a");
    expect(dto.hits).toBe(0);
    expect(dto.published).toBe(false);
    expect(dto.order).toBe(0);
  });
  it("validate delegates to the spec validator", () => {
    expect(col.validate({ title: "T", slug: "bad slug" }, "create")).toEqual({ ok: false, error: "slug must be lowercase letters, numbers and single hyphens" });
  });
  it("getBySlug rejects when the def has no slug field", async () => {
    const noSlug = defineCollection({ ...def, name: "NoSlug", collection: "noslugs", fields: { title: def.fields.title } });
    await expect(noSlug.getBySlug("x")).rejects.toThrow("NoSlug has no slug field");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/collections/defineCollection.test.ts`
Expected: FAIL — `Cannot find module './defineCollection'`

- [ ] **Step 3: Implement `src/lib/collections/defineCollection.ts`**

```ts
import mongoose, { Schema, type Model } from "mongoose";
import dbConnect from "@/lib/mongodb";
import { validate, type CollectionDef, type FieldSpec, type FieldValue, type ValidationResult } from "./fieldSpec";

export type Item = { id: string; order: number; createdAt: string } & Record<string, FieldValue>;

export class DuplicateSlugError extends Error {
  constructor() {
    super("slug already exists");
    this.name = "DuplicateSlugError";
  }
}

export interface Collection {
  def: CollectionDef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- documents are spec-shaped, typed at the DTO boundary
  model: Model<any>;
  validate(body: unknown, mode: "create" | "update"): ValidationResult;
  toDto(doc: Record<string, unknown>, opts?: { includeInternal?: boolean }): Item;
  list(opts?: { publishedOnly?: boolean; includeInternal?: boolean; sort?: "order" | "newest" }): Promise<Item[]>;
  getById(id: string, opts?: { includeInternal?: boolean }): Promise<Item | null>;
  getBySlug(slug: string, opts?: { publishedOnly?: boolean }): Promise<Item | null>;
  create(value: Record<string, FieldValue>, internal?: Record<string, FieldValue>): Promise<Item>;
  update(id: string, value: Record<string, FieldValue>): Promise<Item | null>;
  remove(id: string): Promise<boolean>;
  reorder(ids: string[]): Promise<boolean>;
}

function schemaTypeFor(spec: FieldSpec): Record<string, unknown> {
  switch (spec.type) {
    case "chips":
      return { type: [String], default: [] };
    case "toggle":
      return { type: Boolean, default: typeof spec.default === "boolean" ? spec.default : false };
    case "number":
      return { type: Number, default: typeof spec.default === "number" ? spec.default : 0 };
    case "select":
      return { type: String, enum: (spec.options ?? []).map((o) => o.value), default: typeof spec.default === "string" ? spec.default : undefined };
    case "slug":
      return { type: String, trim: true, unique: true, index: true };
    default:
      return { type: String, trim: true, default: typeof spec.default === "string" ? spec.default : "" };
  }
}

export function buildSchema(def: CollectionDef): Schema {
  const shape: Record<string, unknown> = { itemId: { type: String, required: true, unique: true, index: true } };
  for (const [key, spec] of Object.entries(def.fields)) shape[key] = schemaTypeFor(spec);
  if (def.orderable) shape.order = { type: Number, default: 0, index: true };
  if (def.publishable) shape.published = { type: Boolean, default: false, index: true };
  return new Schema(shape, { timestamps: true, collection: def.collection });
}

function emptyFor(spec: FieldSpec): FieldValue {
  if (spec.default !== undefined) return spec.default;
  switch (spec.type) {
    case "chips": return [];
    case "toggle": return false;
    case "number": return 0;
    default: return "";
  }
}

const isDuplicateKey = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

export function defineCollection(def: CollectionDef): Collection {
  const model: Model<unknown> = mongoose.models[def.name] ?? mongoose.model(def.name, buildSchema(def));
  const hasSlug = Object.values(def.fields).some((f) => f.type === "slug");
  const slugKey = Object.entries(def.fields).find(([, f]) => f.type === "slug")?.[0];

  const toDto: Collection["toDto"] = (doc, opts) => {
    const out: Record<string, FieldValue> = {};
    for (const [key, spec] of Object.entries(def.fields)) {
      if (spec.internal && !opts?.includeInternal) continue;
      const v = doc[key];
      out[key] = (v === undefined || v === null ? emptyFor(spec) : v) as FieldValue;
    }
    if (def.publishable) out.published = Boolean(doc.published);
    const createdAt = doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? "");
    return { ...out, id: String(doc.itemId), order: typeof doc.order === "number" ? doc.order : 0, createdAt } as Item;
  };

  const newId = () => `${def.idPrefix}_${globalThis.crypto.randomUUID()}`;

  return {
    def,
    model,
    validate: (body, mode) => validate(def.fields, body, mode),
    toDto,

    async list(opts) {
      await dbConnect();
      const filter: Record<string, unknown> = {};
      if (opts?.publishedOnly && def.publishable) filter.published = true;
      const sort: Record<string, 1 | -1> = opts?.sort === "newest" || !def.orderable ? { createdAt: -1 } : { order: 1 };
      const docs = await model.find(filter).sort(sort).lean<Record<string, unknown>[]>();
      return docs.map((d) => toDto(d, { includeInternal: opts?.includeInternal }));
    },

    async getById(id, opts) {
      await dbConnect();
      const d = await model.findOne({ itemId: id }).lean<Record<string, unknown> | null>();
      return d ? toDto(d, { includeInternal: opts?.includeInternal }) : null;
    },

    async getBySlug(slug, opts) {
      if (!hasSlug || !slugKey) throw new Error(`${def.name} has no slug field`);
      await dbConnect();
      const filter: Record<string, unknown> = { [slugKey]: slug };
      if (opts?.publishedOnly && def.publishable) filter.published = true;
      const d = await model.findOne(filter).lean<Record<string, unknown> | null>();
      return d ? toDto(d) : null;
    },

    async create(value, internal) {
      await dbConnect();
      const order = def.orderable ? await model.countDocuments() : 0;
      try {
        const doc = await model.create({ ...value, ...(internal ?? {}), itemId: newId(), ...(def.orderable ? { order } : {}) });
        return toDto((doc as { toObject: () => Record<string, unknown> }).toObject(), { includeInternal: true });
      } catch (e) {
        if (isDuplicateKey(e)) throw new DuplicateSlugError();
        throw e;
      }
    },

    async update(id, value) {
      await dbConnect();
      try {
        const d = await model
          .findOneAndUpdate({ itemId: id }, { $set: value }, { new: true, runValidators: true })
          .lean<Record<string, unknown> | null>();
        return d ? toDto(d, { includeInternal: true }) : null;
      } catch (e) {
        if (isDuplicateKey(e)) throw new DuplicateSlugError();
        throw e;
      }
    },

    async remove(id) {
      await dbConnect();
      const r = await model.deleteOne({ itemId: id });
      return r.deletedCount > 0;
    },

    async reorder(ids) {
      if (!def.orderable) return false;
      await dbConnect();
      const existing = (await model.find({}, { itemId: 1 }).lean<{ itemId: string }[]>()).map((d) => d.itemId).sort();
      const wanted = [...ids].sort();
      if (existing.length !== wanted.length || existing.some((v, i) => v !== wanted[i])) return false;
      await model.bulkWrite(ids.map((itemId, order) => ({ updateOne: { filter: { itemId }, update: { $set: { order } } } })));
      return true;
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/collections/defineCollection.test.ts`
Expected: PASS (7 tests). `npm run typecheck` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collections/defineCollection.ts src/lib/collections/defineCollection.test.ts
git commit -m "$(cat <<'EOF'
feat(cms): defineCollection — spec-driven Mongoose model, DTO mapper and CRUD with reorder

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Generic route handlers

**Files:**
- Create: `src/lib/collections/routeHandlers.ts`
- Test: `src/lib/collections/routeHandlers.test.ts`

**Interfaces:**
- Consumes: `Collection`, `DuplicateSlugError` (Task 2); existing `verifyRequest(request)` from `@/lib/auth`; `revalidatePath` from `next/cache`.
- Produces:
  ```ts
  export const PUBLIC_CACHE_HEADERS: Record<string, string>;
  export function listAndCreate(col: Collection): { GET(req: NextRequest): Promise<Response>; POST(req: NextRequest): Promise<Response> };
  export function byId(col: Collection): { GET(req, ctx): Promise<Response>; PUT(req, ctx): Promise<Response>; DELETE(req, ctx): Promise<Response> };  // ctx = { params: Promise<{ id: string }> }
  export function reorderRoute(col: Collection): { PUT(req: NextRequest): Promise<Response> };
  export function revalidateAll(col: Collection): void;
  ```

- [ ] **Step 1: Write the failing tests**

`src/lib/collections/routeHandlers.test.ts`:
```ts
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
    expect(col.list).toHaveBeenLastCalledWith({ publishedOnly: false });
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/collections/routeHandlers.test.ts`
Expected: FAIL — `Cannot find module './routeHandlers'`

- [ ] **Step 3: Implement `src/lib/collections/routeHandlers.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyRequest } from "@/lib/auth";
import { DuplicateSlugError, type Collection } from "./defineCollection";

export const PUBLIC_CACHE_HEADERS = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

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

function mutationError(e: unknown, verb: string, col: Collection) {
  if (e instanceof DuplicateSlugError) return NextResponse.json({ error: e.message }, { status: 409 });
  console.error(`${verb} ${col.def.name} failed:`, e);
  return NextResponse.json({ error: `Failed to ${verb} ${col.def.name.toLowerCase()}` }, { status: 500 });
}

export function listAndCreate(col: Collection) {
  return {
    async GET(request: NextRequest) {
      const all = request.nextUrl.searchParams.get("all") === "1";
      if (all || !col.def.publicList) {
        if (!(await verifyRequest(request))) return unauthorized();
        try {
          return NextResponse.json(await col.list({ publishedOnly: false }), { headers: { "Cache-Control": "no-store" } });
        } catch {
          return NextResponse.json({ error: `Failed to load ${col.def.collection}` }, { status: 500 });
        }
      }
      try {
        return NextResponse.json(await col.list({ publishedOnly: true }), { headers: PUBLIC_CACHE_HEADERS });
      } catch {
        return NextResponse.json({ error: `Failed to load ${col.def.collection}` }, { status: 500 });
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
      const item = await col.getById(id, { includeInternal: true });
      return item ? NextResponse.json(item) : notFound(col.def.name);
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/collections/routeHandlers.test.ts`
Expected: PASS (9 tests). `npm run typecheck` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collections/routeHandlers.ts src/lib/collections/routeHandlers.test.ts
git commit -m "$(cat <<'EOF'
feat(cms): generic Next route handlers for collections (list/create, byId, reorder) with revalidation

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: The five field specs + collection singletons

**Files:**
- Create: `src/lib/collections/specs/services.ts`, `processSteps.ts`, `caseStudies.ts`, `testimonials.ts`, `inquiries.ts`
- Create: `src/lib/collections/index.ts`
- Test: `src/lib/collections/specs/specs.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // each spec file
  export const servicesDef: CollectionDef;  export const processStepsDef; export const caseStudiesDef; export const testimonialsDef; export const inquiriesDef;
  // inquiries.ts
  export const BUDGET_OPTIONS: readonly SelectOption[]; export const TIMELINE_OPTIONS: readonly SelectOption[]; export const STATUS_OPTIONS: readonly SelectOption[];
  export const PLANET_FEATURES: readonly SelectOption[];   // caseStudies.ts
  // index.ts
  export const services: Collection; export const processSteps: Collection; export const caseStudies: Collection; export const testimonials: Collection; export const inquiries: Collection;
  export const ALL_DEFS: Record<"services"|"process"|"case-studies"|"testimonials"|"inquiries", CollectionDef>;
  ```

- [ ] **Step 1: Write the failing test**

`src/lib/collections/specs/specs.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { servicesDef } from "./services";
import { processStepsDef } from "./processSteps";
import { caseStudiesDef, PLANET_FEATURES } from "./caseStudies";
import { testimonialsDef } from "./testimonials";
import { inquiriesDef, BUDGET_OPTIONS, TIMELINE_OPTIONS, STATUS_OPTIONS } from "./inquiries";
import { validate } from "../fieldSpec";

describe("spec limits (single source of truth)", () => {
  it("services", () => {
    expect(servicesDef.fields.title).toMatchObject({ type: "text", required: true, max: 120 });
    expect(servicesDef.fields.promise).toMatchObject({ type: "text", required: true, max: 200 });
    expect(servicesDef.fields.outcomes).toMatchObject({ type: "chips", maxItems: 4, max: 80 });
    expect(servicesDef.fields.engagement).toMatchObject({ type: "text", max: 120 });
    expect(servicesDef).toMatchObject({ idPrefix: "svc", orderable: true, publishable: false, publicList: true, revalidate: ["/voyage"] });
  });
  it("process steps", () => {
    expect(processStepsDef.fields.title).toMatchObject({ type: "text", required: true, max: 60 });
    expect(processStepsDef.fields.what).toMatchObject({ type: "textarea", required: true, max: 600 });
    expect(processStepsDef.fields.deliverable).toMatchObject({ type: "textarea", max: 400 });
    expect(processStepsDef.fields.duration).toMatchObject({ type: "text", max: 40 });
    expect(processStepsDef).toMatchObject({ idPrefix: "step", orderable: true, publishable: false });
  });
  it("case studies", () => {
    expect(caseStudiesDef.fields.slug).toMatchObject({ type: "slug", required: true, max: 80 });
    expect(caseStudiesDef.fields.title).toMatchObject({ type: "text", required: true, max: 120 });
    for (const k of ["problem", "architecture", "outcome"]) expect(caseStudiesDef.fields[k]).toMatchObject({ type: "markdown", max: 6000 });
    expect(caseStudiesDef.fields.stack).toMatchObject({ type: "chips", maxItems: 12, max: 40 });
    expect(caseStudiesDef.fields.metrics).toMatchObject({ type: "chips", maxItems: 6, max: 60 });
    expect(caseStudiesDef.fields.diagram).toMatchObject({ type: "image" });
    expect(caseStudiesDef.fields.planetFeature).toMatchObject({ type: "select", default: "none" });
    expect(PLANET_FEATURES.map((o) => o.value)).toEqual(["none", "ring", "moon", "storm"]);
    expect(caseStudiesDef).toMatchObject({ idPrefix: "case", orderable: true, publishable: true, revalidate: ["/voyage", "/work/[slug]"] });
  });
  it("testimonials", () => {
    expect(testimonialsDef.fields.quote).toMatchObject({ type: "textarea", required: true, max: 400 });
    expect(testimonialsDef.fields.name).toMatchObject({ type: "text", required: true, max: 80 });
    expect(testimonialsDef).toMatchObject({ idPrefix: "tst", orderable: true, publishable: true });
  });
  it("inquiries", () => {
    expect(BUDGET_OPTIONS.map((o) => o.value)).toEqual(["lt5k", "5to15k", "15to40k", "40kplus", "undecided"]);
    expect(TIMELINE_OPTIONS.map((o) => o.value)).toEqual(["asap", "1to3m", "3mplus", "exploring"]);
    expect(STATUS_OPTIONS.map((o) => o.value)).toEqual(["new", "replied", "archived"]);
    expect(inquiriesDef.fields.building).toMatchObject({ type: "textarea", required: true, max: 2000 });
    expect(inquiriesDef.fields.status).toMatchObject({ type: "select", default: "new", internal: true });
    expect(inquiriesDef.fields.ipHash).toMatchObject({ internal: true });
    expect(inquiriesDef.fields.notifyFailed).toMatchObject({ type: "toggle", internal: true });
    expect(inquiriesDef).toMatchObject({ idPrefix: "inq", orderable: false, publishable: false, publicList: false });
  });
  it("a public inquiry body cannot set status or ipHash", () => {
    const r = validate(inquiriesDef.fields, { name: "A", email: "a@b.co", building: "x", budget: "lt5k", timeline: "asap", status: "replied" }, "create");
    expect(r).toEqual({ ok: false, error: "status cannot be set" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/collections/specs/specs.test.ts`
Expected: FAIL — `Cannot find module './services'`

- [ ] **Step 3: Create the spec files**

`src/lib/collections/specs/services.ts`:
```ts
import type { CollectionDef } from "../fieldSpec";

export const servicesDef: CollectionDef = {
  name: "Service",
  collection: "services",
  idPrefix: "svc",
  fields: {
    title: { type: "text", label: "Title", required: true, max: 120 },
    promise: { type: "text", label: "Promise (one line)", required: true, max: 200 },
    outcomes: { type: "chips", label: "Outcomes", maxItems: 4, max: 80, help: "1–4 short outcome bullets" },
    engagement: { type: "text", label: "Typical engagement", max: 120 },
  },
  orderable: true,
  publishable: false,
  publicList: true,
  searchable: ["title", "promise"],
  revalidate: ["/voyage"],
};
```

`src/lib/collections/specs/processSteps.ts`:
```ts
import type { CollectionDef } from "../fieldSpec";

export const processStepsDef: CollectionDef = {
  name: "ProcessStep",
  collection: "processsteps",
  idPrefix: "step",
  fields: {
    title: { type: "text", label: "Step title", required: true, max: 60 },
    what: { type: "textarea", label: "What happens", required: true, max: 600 },
    deliverable: { type: "textarea", label: "What you get", max: 400 },
    duration: { type: "text", label: "How long", max: 40 },
  },
  orderable: true,
  publishable: false,
  publicList: true,
  searchable: ["title", "what"],
  revalidate: ["/voyage"],
};
```

`src/lib/collections/specs/caseStudies.ts`:
```ts
import type { CollectionDef, SelectOption } from "../fieldSpec";

export const PLANET_FEATURES: readonly SelectOption[] = [
  { value: "none", label: "None" },
  { value: "ring", label: "Ring" },
  { value: "moon", label: "Moon" },
  { value: "storm", label: "Storm band" },
];

export const caseStudiesDef: CollectionDef = {
  name: "CaseStudy",
  collection: "casestudies",
  idPrefix: "case",
  fields: {
    slug: { type: "slug", label: "Slug", required: true, max: 80, help: "URL: /work/<slug>. Changing it breaks old links." },
    title: { type: "text", label: "Title", required: true, max: 120 },
    client: { type: "text", label: "Client", max: 80 },
    context: { type: "text", label: "Context (one line)", max: 200 },
    problem: { type: "markdown", label: "Problem", max: 6000 },
    architecture: { type: "markdown", label: "Architecture", max: 6000 },
    outcome: { type: "markdown", label: "Outcome", max: 6000 },
    stack: { type: "chips", label: "Stack", maxItems: 12, max: 40 },
    metrics: { type: "chips", label: "Metrics", maxItems: 6, max: 60, help: 'e.g. "p95 120ms", "3 → 0 incidents"' },
    diagram: { type: "image", label: "Architecture diagram" },
    planetFeature: { type: "select", label: "Planet feature", options: PLANET_FEATURES, default: "none" },
  },
  orderable: true,
  publishable: true,
  publicList: true,
  searchable: ["title", "client", "context"],
  revalidate: ["/voyage", "/work/[slug]"],
};
```

`src/lib/collections/specs/testimonials.ts`:
```ts
import type { CollectionDef } from "../fieldSpec";

export const testimonialsDef: CollectionDef = {
  name: "Testimonial",
  collection: "testimonials",
  idPrefix: "tst",
  fields: {
    quote: { type: "textarea", label: "Quote", required: true, max: 400 },
    name: { type: "text", label: "Name", required: true, max: 80 },
    role: { type: "text", label: "Role", max: 80 },
    company: { type: "text", label: "Company", max: 80 },
  },
  orderable: true,
  publishable: true,
  publicList: true,
  searchable: ["quote", "name", "company"],
  revalidate: ["/voyage"],
};
```

`src/lib/collections/specs/inquiries.ts`:
```ts
import type { CollectionDef, SelectOption } from "../fieldSpec";

export const BUDGET_OPTIONS: readonly SelectOption[] = [
  { value: "lt5k", label: "Under $5k" },
  { value: "5to15k", label: "$5k – $15k" },
  { value: "15to40k", label: "$15k – $40k" },
  { value: "40kplus", label: "$40k+" },
  { value: "undecided", label: "Undecided" },
];

export const TIMELINE_OPTIONS: readonly SelectOption[] = [
  { value: "asap", label: "ASAP" },
  { value: "1to3m", label: "1–3 months" },
  { value: "3mplus", label: "3+ months" },
  { value: "exploring", label: "Just exploring" },
];

export const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: "new", label: "New" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

export const inquiriesDef: CollectionDef = {
  name: "Inquiry",
  collection: "inquiries",
  idPrefix: "inq",
  fields: {
    name: { type: "text", label: "Name", required: true, max: 120 },
    email: { type: "text", label: "Email", required: true, max: 200 },
    building: { type: "textarea", label: "What are you building?", required: true, max: 2000 },
    budget: { type: "select", label: "Budget", required: true, options: BUDGET_OPTIONS },
    timeline: { type: "select", label: "Timeline", required: true, options: TIMELINE_OPTIONS },
    status: { type: "select", label: "Status", options: STATUS_OPTIONS, default: "new", internal: true },
    ipHash: { type: "text", label: "IP hash", max: 64, internal: true },
    notifyFailed: { type: "toggle", label: "Notification failed", default: false, internal: true },
  },
  orderable: false,
  publishable: false,
  publicList: false,
  searchable: ["name", "email", "building"],
  revalidate: [],
};
```

`src/lib/collections/index.ts`:
```ts
import { defineCollection } from "./defineCollection";
import { servicesDef } from "./specs/services";
import { processStepsDef } from "./specs/processSteps";
import { caseStudiesDef } from "./specs/caseStudies";
import { testimonialsDef } from "./specs/testimonials";
import { inquiriesDef } from "./specs/inquiries";

export const services = defineCollection(servicesDef);
export const processSteps = defineCollection(processStepsDef);
export const caseStudies = defineCollection(caseStudiesDef);
export const testimonials = defineCollection(testimonialsDef);
export const inquiries = defineCollection(inquiriesDef);

/** Keyed by API path segment — the admin uses this to build field forms and URLs. */
export const ALL_DEFS = {
  services: servicesDef,
  process: processStepsDef,
  "case-studies": caseStudiesDef,
  testimonials: testimonialsDef,
  inquiries: inquiriesDef,
} as const;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/collections/specs/specs.test.ts`
Expected: PASS (6 tests). `npm run typecheck` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collections/specs src/lib/collections/index.ts
git commit -m "$(cat <<'EOF'
feat(cms): field specs for services, process steps, case studies, testimonials, inquiries

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Route files, Settings.manifesto, voyage read API

**Files:**
- Create: `src/app/api/services/route.ts`, `src/app/api/services/[id]/route.ts`, `src/app/api/services/reorder/route.ts`; same three for `process`, `case-studies`, `testimonials`
- Modify: `src/lib/models.ts` (`ISettings` + `SettingsSchema`: `manifesto`)
- Modify: `src/lib/data.ts` (`Settings.manifesto`, `docToSettings`, `getVoyageContent`, `getCaseStudyBySlug`)
- Modify: `src/app/admin/components/types.ts` (`Settings.manifesto`, `DEFAULT_SETTINGS.manifesto`)

**Interfaces:**
- Consumes: `listAndCreate`, `byId`, `reorderRoute` (Task 3); collections from `@/lib/collections` (Task 4).
- Produces:
  ```ts
  // src/lib/data.ts
  export interface VoyageContent { services: Item[]; process: Item[]; caseStudies: Item[]; testimonials: Item[]; settings: Settings }
  export async function getVoyageContent(): Promise<VoyageContent>;
  export async function getCaseStudyBySlug(slug: string): Promise<Item | null>;   // published only
  export async function getPublishedCaseStudySlugs(): Promise<string[]>;
  ```

- [ ] **Step 1: Create the twelve route files**

Each `route.ts` (replace `services` with `process`/`case-studies`/`testimonials` and the import name accordingly — `processSteps`, `caseStudies`, `testimonials`):

`src/app/api/services/route.ts`:
```ts
import { services } from "@/lib/collections";
import { listAndCreate } from "@/lib/collections/routeHandlers";

export const { GET, POST } = listAndCreate(services);
```
`src/app/api/services/[id]/route.ts`:
```ts
import { services } from "@/lib/collections";
import { byId } from "@/lib/collections/routeHandlers";

export const { GET, PUT, DELETE } = byId(services);
```
`src/app/api/services/reorder/route.ts`:
```ts
import { services } from "@/lib/collections";
import { reorderRoute } from "@/lib/collections/routeHandlers";

export const { PUT } = reorderRoute(services);
```
Repeat for `src/app/api/process/*` (`processSteps`), `src/app/api/case-studies/*` (`caseStudies`), `src/app/api/testimonials/*` (`testimonials`). Do **not** create `inquiries` routes here (Task 8).

- [ ] **Step 2: Add `manifesto` to Settings**

`src/lib/models.ts` — in `ISettings` after `heroSubheadline: string;` add `manifesto: string;`; in `SettingsSchema` after the `heroSubheadline` line add:
```ts
    manifesto: { type: String, default: "Most software fails at the seams. I design the seams.", trim: true },
```
`src/lib/data.ts` — in `interface Settings` after `heroSubheadline` add `manifesto: string;`; in `docToSettings` after the `heroSubheadline` entry add:
```ts
    manifesto: (doc.manifesto as string) ?? "Most software fails at the seams. I design the seams.",
```
`src/app/admin/components/types.ts` — add `manifesto: string;` to `Settings` and `manifesto: "Most software fails at the seams. I design the seams.",` to `DEFAULT_SETTINGS`.

- [ ] **Step 3: Add the voyage read API to `src/lib/data.ts`**

Append at the end of the file:
```ts
// ── Voyage content (sub-project 2) ──

import { services, processSteps, caseStudies, testimonials } from "@/lib/collections";
import type { Item } from "@/lib/collections/defineCollection";

export interface VoyageContent {
  services: Item[];
  process: Item[];
  caseStudies: Item[];
  testimonials: Item[];
  settings: Settings;
}

/** Everything /voyage renders, published items only, one call. */
export async function getVoyageContent(): Promise<VoyageContent> {
  const [svc, steps, cases, quotes, settings] = await Promise.all([
    services.list(),
    processSteps.list(),
    caseStudies.list({ publishedOnly: true }),
    testimonials.list({ publishedOnly: true }),
    getSettings(),
  ]);
  return { services: svc, process: steps, caseStudies: cases, testimonials: quotes, settings };
}

/** Published case study by slug, or null (unpublished counts as missing). */
export function getCaseStudyBySlug(slug: string): Promise<Item | null> {
  return caseStudies.getBySlug(slug, { publishedOnly: true });
}

export async function getPublishedCaseStudySlugs(): Promise<string[]> {
  const items = await caseStudies.list({ publishedOnly: true });
  return items.map((c) => String(c.slug));
}
```
(Move the two new `import` lines to the top of the file with the other imports — ESLint's `import/first` will flag them otherwise.)

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → 0. `npm test` → all green (no new tests; the route files are two-liners over tested handlers). `npm run lint` → no new errors.
With the dev server running: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/services` → `200` and `curl -s http://localhost:3000/api/services` → `[]`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/services src/app/api/process src/app/api/case-studies src/app/api/testimonials src/lib/models.ts src/lib/data.ts src/app/admin/components/types.ts
git commit -m "$(cat <<'EOF'
feat(cms): collection API routes (services, process, case-studies, testimonials), Settings.manifesto, getVoyageContent

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Markdown rendering (server-only)

**Files:**
- Modify: `package.json` (add `marked`, `sanitize-html`, `@types/sanitize-html`)
- Create: `src/lib/markdown.ts`
- Test: `src/lib/markdown.test.ts`

**Interfaces:**
- Produces: `export function renderMarkdown(md: string): string` — sanitised HTML; never throws.

- [ ] **Step 1: Install**

Run: `npm install marked@^18 sanitize-html@^2.17 && npm install -D @types/sanitize-html@^2.16`

- [ ] **Step 2: Write the failing tests**

`src/lib/markdown.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders headings, lists, emphasis and code", () => {
    const html = renderMarkdown("## Title\n\n- one\n- **two**\n\n`x`");
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<strong>two</strong>");
    expect(html).toContain("<code>x</code>");
  });
  it("drops raw HTML and script", () => {
    const html = renderMarkdown('hello <script>alert(1)</script> <img src=x onerror=alert(1)> <div>d</div>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<div");
    expect(html).toContain("hello");
  });
  it("allows http(s)/mailto links with safe rel/target and strips javascript:", () => {
    const ok = renderMarkdown("[a](https://example.com) [m](mailto:x@y.z)");
    expect(ok).toContain('href="https://example.com"');
    expect(ok).toContain('rel="noopener noreferrer"');
    expect(ok).toContain('target="_blank"');
    const bad = renderMarkdown("[x](javascript:alert(1))");
    expect(bad).not.toContain("javascript:");
  });
  it("returns escaped text for empty or degenerate input and never throws", () => {
    expect(renderMarkdown("")).toBe("");
    expect(() => renderMarkdown("<" .repeat(5000))).not.toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/lib/markdown.test.ts`
Expected: FAIL — `Cannot find module './markdown'`

- [ ] **Step 4: Implement `src/lib/markdown.ts`**

```ts
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false, async: false });

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["h1", "h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "code", "pre", "a", "blockquote", "br", "hr"],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener noreferrer", target: "_blank" } }),
  },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Markdown → sanitised HTML. Raw HTML in the source is stripped. Never throws. */
export function renderMarkdown(md: string): string {
  if (!md || !md.trim()) return "";
  try {
    const raw = marked.parse(md) as string;
    return sanitizeHtml(raw, SANITIZE).trim();
  } catch {
    return `<p>${escapeHtml(md)}</p>`;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/lib/markdown.test.ts`
Expected: PASS (4 tests). If `marked.parse` returns a `Promise` type under your installed version, keep `async: false` in `setOptions` and cast as shown.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/markdown.ts src/lib/markdown.test.ts
git commit -m "$(cat <<'EOF'
feat(cms): server-side markdown rendering with allow-list sanitisation

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Rate limiter + Resend mail

**Files:**
- Modify: `package.json` (add `resend@^6`)
- Create: `src/lib/rateLimit.ts`, `src/lib/mail.ts`
- Modify: `.env.example` (four new vars)
- Test: `src/lib/rateLimit.test.ts`, `src/lib/mail.test.ts`

**Interfaces:**
- Consumes: `BUDGET_OPTIONS`, `TIMELINE_OPTIONS`, `labelFor` (Tasks 1, 4); `appendLog` (existing `@/lib/log`).
- Produces:
  ```ts
  export function createRateLimiter(opts: { max: number; windowMs: number; now?: () => number }): { check(key: string): { allowed: boolean; retryAfterSec: number } };
  export interface InquiryForMail { id: string; name: string; email: string; building: string; budget: string; timeline: string }
  export function sendInquiryEmails(inq: InquiryForMail, deps?: { client?: MailClient; env?: NodeJS.ProcessEnv }): Promise<{ sent: boolean }>;
  export type MailClient = { batch: { send(payload: MailPayload[]): Promise<{ error: { message: string } | null }> } };
  export interface MailPayload { from: string; to: string[]; replyTo?: string; subject: string; text: string }
  export function buildInquiryEmails(inq: InquiryForMail, env: { from: string; notifyTo: string }): [MailPayload, MailPayload];
  ```

- [ ] **Step 1: Install**

Run: `npm install resend@^6`

Then open `node_modules/resend/dist/index.d.ts` and confirm the batch API and the reply-to property name: search for `class Batch` / `send(` and for `replyTo` vs `reply_to` in the `CreateEmailOptions` type. **Use whichever name the installed typings declare** in `MailPayload` and in `buildInquiryEmails` (the code below assumes `replyTo`; adjust if the typings say `reply_to`, and note it in the report).

- [ ] **Step 2: Write the failing tests**

`src/lib/rateLimit.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows max hits per window, then blocks with retryAfter, then resets", () => {
    let t = 0;
    const rl = createRateLimiter({ max: 2, windowMs: 1000, now: () => t });
    expect(rl.check("k")).toEqual({ allowed: true, retryAfterSec: 0 });
    expect(rl.check("k")).toEqual({ allowed: true, retryAfterSec: 0 });
    const blocked = rl.check("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
    t = 1001;
    expect(rl.check("k").allowed).toBe(true);
  });
  it("keys are independent", () => {
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: () => 0 });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });
});
```

`src/lib/mail.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { buildInquiryEmails, sendInquiryEmails, type MailClient } from "./mail";

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
    const send = vi.fn(async () => ({ error: null }));
    const client: MailClient = { batch: { send } };
    const r = await sendInquiryEmails(inq, { client, env: { RESEND_FROM: env.from, INQUIRY_NOTIFY_TO: env.notifyTo } as NodeJS.ProcessEnv });
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
    const e = { RESEND_FROM: env.from, INQUIRY_NOTIFY_TO: env.notifyTo } as NodeJS.ProcessEnv;
    expect(await sendInquiryEmails(inq, { client: { batch: { send: async () => ({ error: { message: "boom" } }) } }, env: e })).toEqual({ sent: false });
    expect(await sendInquiryEmails(inq, { client: { batch: { send: async () => { throw new Error("net"); } } }, env: e })).toEqual({ sent: false });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/lib/rateLimit.test.ts src/lib/mail.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `src/lib/rateLimit.ts`**

```ts
interface Entry {
  count: number;
  resetAt: number;
}

/** Fixed-window in-memory limiter (per server instance — fine for a single-owner site). */
export function createRateLimiter(opts: { max: number; windowMs: number; now?: () => number }) {
  const now = opts.now ?? (() => Date.now());
  const hits = new Map<string, Entry>();
  return {
    check(key: string): { allowed: boolean; retryAfterSec: number } {
      const t = now();
      const e = hits.get(key);
      if (!e || t >= e.resetAt) {
        hits.set(key, { count: 1, resetAt: t + opts.windowMs });
        return { allowed: true, retryAfterSec: 0 };
      }
      if (e.count >= opts.max) return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((e.resetAt - t) / 1000)) };
      e.count++;
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}
```

- [ ] **Step 5: Implement `src/lib/mail.ts`**

```ts
import { Resend } from "resend";
import { appendLog } from "@/lib/log";
import { labelFor } from "@/lib/collections/fieldSpec";
import { BUDGET_OPTIONS, TIMELINE_OPTIONS } from "@/lib/collections/specs/inquiries";

export interface InquiryForMail {
  id: string;
  name: string;
  email: string;
  building: string;
  budget: string;
  timeline: string;
}

export interface MailPayload {
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  text: string;
}

export type MailClient = {
  batch: { send(payload: MailPayload[]): Promise<{ error: { message: string } | null }> };
};

export function buildInquiryEmails(inq: InquiryForMail, env: { from: string; notifyTo: string }): [MailPayload, MailPayload] {
  const budget = labelFor(BUDGET_OPTIONS, inq.budget);
  const timeline = labelFor(TIMELINE_OPTIONS, inq.timeline);
  const firstName = inq.name.trim().split(/\s+/)[0] || "there";

  const owner: MailPayload = {
    from: env.from,
    to: [env.notifyTo],
    replyTo: inq.email,
    subject: `New inquiry — ${inq.name} (${budget}, ${timeline})`,
    text: [
      `${inq.name} <${inq.email}>`,
      `Budget: ${budget} · Timeline: ${timeline}`,
      ``,
      inq.building,
      ``,
      `Reply directly to this email, or open /admin → Inbox.`,
    ].join("\n"),
  };

  const reply: MailPayload = {
    from: env.from,
    to: [inq.email],
    replyTo: env.notifyTo,
    subject: `Got it — I'll reply within 24 hours`,
    text: [
      `Hi ${firstName},`,
      ``,
      `Thanks for reaching out about what you're building. I read every inquiry personally and reply within 24 hours.`,
      ``,
      `— Purav`,
    ].join("\n"),
  };

  return [owner, reply];
}

let defaultClient: MailClient | null = null;
function clientFor(env: NodeJS.ProcessEnv): MailClient | null {
  if (!env.RESEND_API_KEY) return null;
  if (!defaultClient) defaultClient = new Resend(env.RESEND_API_KEY) as unknown as MailClient;
  return defaultClient;
}

/** Sends the owner notification + auto-reply. Never throws; false means "not sent" (skipped or failed), already logged. */
export async function sendInquiryEmails(
  inq: InquiryForMail,
  deps: { client?: MailClient; env?: NodeJS.ProcessEnv } = {}
): Promise<{ sent: boolean }> {
  const env = deps.env ?? process.env;
  const from = env.RESEND_FROM;
  const notifyTo = env.INQUIRY_NOTIFY_TO;
  const client = deps.client ?? clientFor(env);
  if (!from || !notifyTo || !client) {
    await appendLog("inquiries", { event: "notify.skipped", id: inq.id, reason: "missing env" });
    return { sent: false };
  }
  try {
    const { error } = await client.batch.send(buildInquiryEmails(inq, { from, notifyTo }));
    if (error) {
      await appendLog("inquiries", { event: "notify.failed", id: inq.id, message: error.message });
      return { sent: false };
    }
    await appendLog("inquiries", { event: "notify.sent", id: inq.id });
    return { sent: true };
  } catch (e) {
    await appendLog("inquiries", { event: "notify.failed", id: inq.id, message: e instanceof Error ? e.message : "unknown" });
    return { sent: false };
  }
}
```
If the Resend typings name the field `reply_to`, rename `replyTo` → `reply_to` in `MailPayload`, `buildInquiryEmails`, and the tests.

- [ ] **Step 6: Document env**

Append to `.env.example`:
```
# Resend (transactional email for inquiries) — key from resend.com; sending domain must be verified
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM="Purav S <hello@communications.rushy.dev>"
INQUIRY_NOTIFY_TO=your_email@example.com

# Salt for hashing inquiry IPs in the rate limiter (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
INQUIRY_IP_SALT=generate_64_char_hex_string_here
```
Also add `RESEND_FROM`, `INQUIRY_NOTIFY_TO`, `INQUIRY_IP_SALT` to `.env.local` (values: the `from` above, the owner's Gmail from `ADMIN_EMAIL`, a fresh random hex) and to Vercel production: `printf '%s' "<value>" | vercel env add <NAME> production` for each. Never echo values.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- src/lib/rateLimit.test.ts src/lib/mail.test.ts`
Expected: PASS (7 tests). `npm run typecheck` → 0.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/rateLimit.ts src/lib/rateLimit.test.ts src/lib/mail.ts src/lib/mail.test.ts .env.example
git commit -m "$(cat <<'EOF'
feat(inquiries): fixed-window rate limiter and minimal Resend mail (owner notification + auto-reply)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Inquiry routes (public POST, admin GET/PUT/DELETE)

**Files:**
- Create: `src/app/api/inquiries/route.ts`, `src/app/api/inquiries/[id]/route.ts`
- Test: `src/app/api/inquiries/route.test.ts`

**Interfaces:**
- Consumes: `inquiries` collection (Task 4), `listAndCreate`/`byId` (Task 3), `createRateLimiter` (Task 7), `sendInquiryEmails` (Task 7), `appendLog`.
- Produces: `POST /api/inquiries` public; `GET /api/inquiries` admin (newest first, includes internals); `GET/PUT/DELETE /api/inquiries/[id]` admin (PUT accepts only `{ status }`).

- [ ] **Step 1: Write the failing tests**

`src/app/api/inquiries/route.test.ts`:
```ts
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
import { POST, __resetRateLimiterForTests } from "./route";

const good = { name: "Ada", email: "ada@example.com", building: "Console", budget: "lt5k", timeline: "asap" };
const post = (body: unknown, ip = "1.2.3.4") =>
  POST(new NextRequest("http://localhost/api/inquiries", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": ip } }));

beforeEach(() => {
  __resetRateLimiterForTests();
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/inquiries/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Implement `src/app/api/inquiries/route.ts`**

```ts
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { inquiries } from "@/lib/collections";
import { listAndCreate } from "@/lib/collections/routeHandlers";
import { createRateLimiter } from "@/lib/rateLimit";
import { sendInquiryEmails } from "@/lib/mail";
import { appendLog } from "@/lib/log";

const MAX_BODY_BYTES = 4096;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let limiter = createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });
/** Test hook: fresh window per test. */
export function __resetRateLimiterForTests() {
  limiter = createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });
}

let saltWarned = false;
function ipHash(request: NextRequest): string {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const salt = process.env.INQUIRY_IP_SALT ?? "";
  if (!salt && !saltWarned) {
    saltWarned = true;
    console.warn("INQUIRY_IP_SALT is not set; inquiry IP hashes are unsalted");
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Admin list (newest first, includes status/ipHash/notifyFailed). */
const admin = listAndCreate(inquiries);
export async function GET(request: NextRequest) {
  const res = await admin.GET(request);
  return res;
}

/** Public submission from the Landing form. */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const { website, ...rest } = body as Record<string, unknown>;
  // Honeypot: bots fill the hidden field; humans never see it. Pretend success, store nothing.
  if (typeof website === "string" && website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const v = inquiries.validate(rest, "create");
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (!EMAIL_RE.test(String(v.value.email))) {
    return NextResponse.json({ error: "email must be a valid address" }, { status: 400 });
  }

  const hash = ipHash(request);
  const rl = limiter.check(hash);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many inquiries, please try again later" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  try {
    const created = await inquiries.create(v.value, { status: "new", ipHash: hash, notifyFailed: false });
    const { sent } = await sendInquiryEmails({
      id: created.id,
      name: String(created.name),
      email: String(created.email),
      building: String(created.building),
      budget: String(created.budget),
      timeline: String(created.timeline),
    });
    if (!sent) {
      await inquiries.update(created.id, { notifyFailed: true });
      await appendLog("inquiries", { event: "notify.failed", id: created.id });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("inquiry create failed:", e);
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}
```
Note: `inquiries.list` in the generic `GET` uses `sort: newest` automatically because the def is not orderable, and the admin path passes `includeInternal` — extend Task 3's `listAndCreate.GET` authenticated branch to call `col.list({ publishedOnly: false, includeInternal: true })` and update its test expectation accordingly (`toHaveBeenLastCalledWith({ publishedOnly: false, includeInternal: true })`).

`src/app/api/inquiries/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { inquiries } from "@/lib/collections";
import { byId } from "@/lib/collections/routeHandlers";
import { verifyRequest } from "@/lib/auth";
import { STATUS_OPTIONS } from "@/lib/collections/specs/inquiries";

const handlers = byId(inquiries);
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;

/** Admin may change only `status` (internal fields are otherwise unsettable). */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const allowed = STATUS_OPTIONS.map((o) => o.value);
  if (typeof body?.status !== "string" || !allowed.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${allowed.join(", ")}` }, { status: 400 });
  }
  const updated = await inquiries.update(id, { status: body.status });
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/inquiries/route.test.ts src/lib/collections/routeHandlers.test.ts`
Expected: PASS. Full `npm test` green; `npm run typecheck` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/inquiries src/lib/collections/routeHandlers.ts src/lib/collections/routeHandlers.test.ts
git commit -m "$(cat <<'EOF'
feat(inquiries): public POST with honeypot, validation, IP-hash rate limit and non-blocking email; admin routes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Admin field widgets (`FieldInput`)

**Files:**
- Create: `src/app/admin/components/FieldInput.tsx`
- Create: `src/app/admin/components/slugify.ts`
- Test: `src/app/admin/components/slugify.test.ts`

**Interfaces:**
- Consumes: `FieldSpec`, `FieldValue` (Task 1); `uploadFile` signature from `admin/page.tsx` (extended in Task 10 with `"diagram"`).
- Produces:
  ```tsx
  export function slugify(input: string): string;
  export default function FieldInput(props: { name: string; spec: FieldSpec; value: FieldValue; onChange: (v: FieldValue) => void; uploadFile?: (file: File, type: "diagram") => Promise<string | null>; uploading?: boolean; error?: string }): ReactNode;
  ```

- [ ] **Step 1: Write the failing test**

`src/app/admin/components/slugify.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";
import { SLUG_RE } from "@/lib/collections/fieldSpec";

describe("slugify", () => {
  it("lowercases, replaces separators, strips symbols and collapses hyphens", () => {
    expect(slugify("  PulseAI: Heart-Health  Monitor!! ")).toBe("pulseai-heart-health-monitor");
    expect(slugify("Ça va — très bien")).toBe("ca-va-tres-bien");
    expect(slugify("---a---")).toBe("a");
  });
  it("always yields a valid slug or empty string", () => {
    for (const s of ["Hello World", "x", "!!!", "A  B"]) {
      const out = slugify(s);
      expect(out === "" || SLUG_RE.test(out)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/components/slugify.test.ts`
Expected: FAIL — `Cannot find module './slugify'`

- [ ] **Step 3: Implement `slugify.ts`**

```ts
/** Title → URL slug matching SLUG_RE (lowercase, digits, single hyphens). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
```

- [ ] **Step 4: Implement `FieldInput.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { FieldSpec, FieldValue } from "@/lib/collections/fieldSpec";

interface FieldInputProps {
  name: string;
  spec: FieldSpec;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  uploadFile?: (file: File, type: "diagram") => Promise<string | null>;
  uploading?: boolean;
  error?: string;
}

/** Client-side preview only — the server render in src/lib/markdown.ts is authoritative. */
function previewMarkdown(md: string): string {
  const esc = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n{2,}/g, "<br/><br/>");
}

export default function FieldInput({ name, spec, value, onChange, uploadFile, uploading, error }: FieldInputProps) {
  const [chipDraft, setChipDraft] = useState("");
  const id = `field-${name}`;
  const str = typeof value === "string" ? value : "";
  const count = spec.max !== undefined && (spec.type === "text" || spec.type === "textarea" || spec.type === "markdown") ? (
    <div className="admin-char-count">{str.length} / {spec.max}</div>
  ) : null;
  const preview = useMemo(() => (spec.type === "markdown" ? previewMarkdown(str) : ""), [spec.type, str]);

  const label = (
    <label htmlFor={id}>
      {spec.label}
      {spec.required && <span className="admin-required">*</span>}
    </label>
  );

  let control: React.ReactNode;
  switch (spec.type) {
    case "text":
    case "slug":
      control = <input id={id} type="text" value={str} maxLength={spec.max} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "number":
      control = <input id={id} type="number" value={typeof value === "number" ? value : 0} max={spec.max} onChange={(e) => onChange(Number(e.target.value))} />;
      break;
    case "textarea":
      control = <textarea id={id} rows={4} value={str} maxLength={spec.max} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "markdown":
      control = (
        <div className="admin-field-row">
          <textarea id={id} rows={10} value={str} maxLength={spec.max} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }} />
          <div className="admin-preview" style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      );
      break;
    case "toggle":
      control = (
        <label className="admin-toggle-label">
          <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>{Boolean(value) ? "On" : "Off"}</span>
        </label>
      );
      break;
    case "select":
      control = (
        <select id={id} value={str} onChange={(e) => onChange(e.target.value)}>
          {(spec.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
      break;
    case "chips": {
      const items = Array.isArray(value) ? value : [];
      const add = () => {
        const t = chipDraft.trim();
        if (!t || (spec.maxItems !== undefined && items.length >= spec.maxItems)) return;
        onChange([...items, t.slice(0, spec.max ?? 200)]);
        setChipDraft("");
      };
      control = (
        <div className="admin-chips">
          {items.map((c, i) => (
            <span key={`${c}-${i}`} className="admin-chip">
              {c}
              <button type="button" className="admin-chip-remove" aria-label={`Remove ${c}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
            </span>
          ))}
          <input
            id={id}
            className="admin-chip-input"
            type="text"
            value={chipDraft}
            maxLength={spec.max}
            placeholder={spec.maxItems !== undefined && items.length >= spec.maxItems ? "Max reached" : "Type and press Enter"}
            disabled={spec.maxItems !== undefined && items.length >= spec.maxItems}
            onChange={(e) => setChipDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            onBlur={add}
          />
        </div>
      );
      break;
    }
    case "image":
      control = (
        <div className="admin-icon-upload">
          {str && <Image src={str} alt={spec.label} width={160} height={120} unoptimized style={{ objectFit: "contain" }} />}
          <input
            id={id}
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !uploadFile) return;
              const path = await uploadFile(file, "diagram");
              if (path) onChange(path);
            }}
          />
          {uploading && <span className="admin-uploading">Uploading...</span>}
          {str && <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => onChange("")}>Remove</button>}
        </div>
      );
      break;
  }

  return (
    <div className="admin-field">
      {label}
      {control}
      {spec.help && <div className="admin-field-hint">{spec.help}</div>}
      {count}
      {error && <div className="admin-field-error">{error}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm test -- src/app/admin/components/slugify.test.ts` → PASS (2). `npm run typecheck` → 0. `npm run lint` → no new errors (the `dangerouslySetInnerHTML` preview is on escaped text; if `react/no-danger` fires, add `// eslint-disable-next-line react/no-danger -- escaped client preview; server render is authoritative`).

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/components/FieldInput.tsx src/app/admin/components/slugify.ts src/app/admin/components/slugify.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): spec-driven FieldInput widgets (text, textarea, markdown preview, chips, image, toggle, select, slug, number)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Generic `CollectionTab`

**Files:**
- Create: `src/app/admin/components/CollectionTab.tsx`
- Modify: `src/app/admin/components/types.ts` (`Tab` union; `CollectionItem` type)
- Modify: `src/app/api/upload/route.ts:35-40` (`diagram` limit)

**Interfaces:**
- Consumes: `FieldInput`, `slugify` (Task 9); `CollectionDef`, `FieldValue` (Task 1); `Item` (Task 2).
- Produces:
  ```tsx
  // types.ts
  export type Tab = "content" | "projects" | "skills" | "navigation" | "media" | "consulting" | "caseStudies" | "testimonials" | "inbox";
  export type CollectionItem = Item;   // re-export from @/lib/collections/defineCollection
  export type UploadType = "profile" | "project_icon" | "skill_icon" | "audio" | "diagram";
  // CollectionTab.tsx
  export default function CollectionTab(props: { def: CollectionDef; apiBase: string; title: string; items: CollectionItem[]; toast: (msg: string, error?: boolean) => void; loadData: () => Promise<void>; uploadFile: (file: File, type: UploadType) => Promise<string | null>; uploading: boolean; onDirtyChange?: (dirty: boolean) => void }): ReactNode;
  ```

- [ ] **Step 1: Extend `types.ts` and the upload limits**

In `src/app/admin/components/types.ts` replace the `Tab` line with:
```ts
export type Tab = "content" | "projects" | "skills" | "navigation" | "media" | "consulting" | "caseStudies" | "testimonials" | "inbox";
export type UploadType = "profile" | "project_icon" | "skill_icon" | "audio" | "diagram";
export type { Item as CollectionItem } from "@/lib/collections/defineCollection";
```
In `src/app/api/upload/route.ts` add to `UPLOAD_LIMITS`:
```ts
  diagram: { maxBytes: 1024 * 1024, maxWidth: 1600, maxHeight: 1200, extensions: ["jpg", "jpeg", "png", "webp", "svg"] },
```

- [ ] **Step 2: Implement `CollectionTab.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CollectionDef, FieldValue } from "@/lib/collections/fieldSpec";
import type { CollectionItem, UploadType } from "./types";
import FieldInput from "./FieldInput";
import { slugify } from "./slugify";

interface CollectionTabProps {
  def: CollectionDef;
  /** e.g. "/api/services" */
  apiBase: string;
  title: string;
  items: CollectionItem[];
  toast: (msg: string, error?: boolean) => void;
  loadData: () => Promise<void>;
  uploadFile: (file: File, type: UploadType) => Promise<string | null>;
  uploading: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

type Form = Record<string, FieldValue>;

function emptyForm(def: CollectionDef): Form {
  const f: Form = {};
  for (const [k, s] of Object.entries(def.fields)) {
    if (s.internal) continue;
    f[k] = s.default ?? (s.type === "chips" ? [] : s.type === "toggle" ? false : s.type === "number" ? 0 : "");
  }
  return f;
}

function formFromItem(def: CollectionDef, item: CollectionItem): Form {
  const f = emptyForm(def);
  for (const k of Object.keys(f)) if (item[k] !== undefined) f[k] = item[k];
  return f;
}

const json = (method: string, body?: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export default function CollectionTab({ def, apiBase, title, items, toast, loadData, uploadFile, uploading, onDirtyChange }: CollectionTabProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(() => emptyForm(def));
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSlug = "slug" in def.fields;
  const editable = useMemo(() => Object.entries(def.fields).filter(([, s]) => !s.internal), [def]);
  const sorted = useMemo(() => [...items].sort((a, b) => (def.orderable ? a.order - b.order : b.createdAt.localeCompare(a.createdAt))), [items, def.orderable]);
  const filtered = search.trim()
    ? sorted.filter((it) => def.searchable.some((k) => String(it[k] ?? "").toLowerCase().includes(search.toLowerCase())))
    : sorted;

  useEffect(() => { onDirtyChange?.(adding || editingId !== null); }, [adding, editingId, onDirtyChange]);
  useEffect(() => {
    if (!confirmDeleteId) return;
    deleteTimer.current = setTimeout(() => setConfirmDeleteId(null), 5000);
    return () => { if (deleteTimer.current) clearTimeout(deleteTimer.current); };
  }, [confirmDeleteId]);

  const setField = (k: string, v: FieldValue) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (hasSlug && k === "title" && !slugTouched && !editingId) next.slug = slugify(String(v));
      if (k === "slug") setSlugTouched(true);
      return next;
    });
  };

  const startAdd = () => { setForm(emptyForm(def)); setSlugTouched(false); setEditingId(null); setAdding(true); };
  const startEdit = (it: CollectionItem) => { setForm(formFromItem(def, it)); setSlugTouched(true); setAdding(false); setEditingId(it.id); };
  const cancel = () => { setAdding(false); setEditingId(null); };

  const withSaving = async (fn: () => Promise<Response>, okMsg: string) => {
    setSaving(true);
    try {
      const res = await fn();
      if (res.ok) { toast(okMsg); cancel(); await loadData(); }
      else { const d = await res.json().catch(() => null); toast(d?.error || `Failed: ${res.status}`, true); }
    } finally { setSaving(false); }
  };

  const create = () => withSaving(() => fetch(apiBase, json("POST", form)), `${title} created`);
  const save = () => withSaving(() => fetch(`${apiBase}/${editingId}`, json("PUT", form)), `${title} saved`);
  const remove = async (id: string) => {
    setConfirmDeleteId(null);
    const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    if (res.ok) { toast(`${title} deleted`); await loadData(); } else toast(`Failed to delete`, true);
  };
  const togglePublished = async (it: CollectionItem) => {
    const res = await fetch(`${apiBase}/${it.id}`, json("PUT", { published: !it.published }));
    if (res.ok) { toast(it.published ? "Unpublished" : "Published"); await loadData(); } else toast("Failed to update", true);
  };
  const move = async (index: number, dir: -1 | 1) => {
    const ids = sorted.map((it) => it.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/reorder`, json("PUT", { ids }));
      if (res.ok) { toast("Order updated"); await loadData(); } else toast("Failed to reorder", true);
    } finally { setSaving(false); }
  };

  const primary = def.searchable[0] ?? Object.keys(def.fields)[0];
  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="admin-card admin-form-card" style={{ marginBottom: "1.5rem" }}>
      {editable.map(([k, s]) => (
        <FieldInput key={k} name={k} spec={s} value={form[k]} onChange={(v) => setField(k, v)} uploadFile={(f) => uploadFile(f, "diagram")} uploading={uploading} />
      ))}
      <div className="admin-form-actions">
        <button className="admin-btn admin-btn-primary" disabled={saving} onClick={onSubmit}>{saving ? "Saving..." : submitLabel}</button>
        <button className="admin-btn admin-btn-outline" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <section>
      <div className="admin-section-header">
        <h2>{title}</h2>
        <button className="admin-btn admin-btn-primary" onClick={startAdd}>+ Add</button>
      </div>
      {items.length > 0 && (
        <div className="admin-field" style={{ marginBottom: "1rem" }}>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} />
        </div>
      )}
      {adding && renderForm(create, "Create")}

      <div className="admin-skills-list">
        {items.length === 0 && !adding && <p className="admin-hint">No {title.toLowerCase()} yet. Click “+ Add” to create one.</p>}
        {filtered.map((it, index) =>
          editingId === it.id ? (
            <div key={it.id}>{renderForm(save, "Save")}</div>
          ) : (
            <div key={it.id} className="admin-skill-row">
              <div className="admin-skill-info">
                <span>{String(it[primary] ?? it.id)}</span>
                {def.publishable && (
                  <span className="admin-tag" style={{ marginLeft: "0.5rem" }}>{it.published ? "Live" : "Draft"}</span>
                )}
              </div>
              <div className="admin-skill-actions">
                {def.orderable && (
                  <>
                    <button className="admin-btn admin-btn-sm" disabled={saving || index === 0 || Boolean(search)} onClick={() => move(index, -1)} title="Move up">↑</button>
                    <button className="admin-btn admin-btn-sm" disabled={saving || index === filtered.length - 1 || Boolean(search)} onClick={() => move(index, 1)} title="Move down">↓</button>
                  </>
                )}
                {def.publishable && (
                  <button className="admin-btn admin-btn-sm" onClick={() => togglePublished(it)}>{it.published ? "Unpublish" : "Publish"}</button>
                )}
                <button className="admin-btn admin-btn-sm" onClick={() => startEdit(it)}>Edit</button>
                {confirmDeleteId === it.id ? (
                  <>
                    <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => remove(it.id)}>Confirm?</button>
                    <button className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                  </>
                ) : (
                  <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => setConfirmDeleteId(it.id)}>Delete</button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` → 0; `npm test` → green; `npm run lint` → no new errors. (`ProjectsTab`/`SkillsTab` pass `uploadFile` typed with the old union — widen their prop type to `UploadType` if typecheck complains at the call site in Task 11.)

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/components/CollectionTab.tsx src/app/admin/components/types.ts src/app/api/upload/route.ts
git commit -m "$(cat <<'EOF'
feat(admin): generic CollectionTab (search, add/edit, publish, reorder, delete) driven by field specs; diagram upload type

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Consulting / Case studies / Testimonials tabs + Inbox + page wiring

**Files:**
- Create: `src/app/admin/components/ConsultingTab.tsx`, `src/app/admin/components/InboxTab.tsx`
- Modify: `src/app/admin/page.tsx` (TABS, state, `loadData`, tab labels, panels, `uploadFile` type)

**Interfaces:**
- Consumes: `CollectionTab` (Task 10); `ALL_DEFS` (Task 4); `BUDGET_OPTIONS`, `TIMELINE_OPTIONS`, `STATUS_OPTIONS`, `labelFor`.
- Produces: admin tabs `consulting | caseStudies | testimonials | inbox`, keyboard ⌘1–9.

- [ ] **Step 1: `ConsultingTab.tsx`**

```tsx
"use client";

import { ALL_DEFS } from "@/lib/collections";
import CollectionTab from "./CollectionTab";
import type { CollectionItem, UploadType } from "./types";

interface Props {
  services: CollectionItem[];
  process: CollectionItem[];
  toast: (msg: string, error?: boolean) => void;
  loadData: () => Promise<void>;
  uploadFile: (file: File, type: UploadType) => Promise<string | null>;
  uploading: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Services above Process — both plain reorderable lists. */
export default function ConsultingTab({ services, process, toast, loadData, uploadFile, uploading, onDirtyChange }: Props) {
  return (
    <>
      <CollectionTab def={ALL_DEFS.services} apiBase="/api/services" title="Services" items={services} toast={toast} loadData={loadData} uploadFile={uploadFile} uploading={uploading} onDirtyChange={onDirtyChange} />
      <hr style={{ margin: "2rem 0", opacity: 0.2 }} />
      <CollectionTab def={ALL_DEFS.process} apiBase="/api/process" title="Process steps" items={process} toast={toast} loadData={loadData} uploadFile={uploadFile} uploading={uploading} onDirtyChange={onDirtyChange} />
    </>
  );
}
```

- [ ] **Step 2: `InboxTab.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { labelFor } from "@/lib/collections/fieldSpec";
import { BUDGET_OPTIONS, TIMELINE_OPTIONS, STATUS_OPTIONS } from "@/lib/collections/specs/inquiries";
import type { CollectionItem } from "./types";

interface Props {
  inquiries: CollectionItem[];
  toast: (msg: string, error?: boolean) => void;
  loadData: () => Promise<void>;
}

const NEXT_STATUS: Record<string, string> = { new: "replied", replied: "archived", archived: "new" };

export default function InboxTab({ inquiries, toast, loadData }: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!confirmDeleteId) return;
    timer.current = setTimeout(() => setConfirmDeleteId(null), 5000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [confirmDeleteId]);

  const rows = [...inquiries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((i) => filter === "all" || i.status === filter);

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/inquiries/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { toast(`Marked ${labelFor(STATUS_OPTIONS, status).toLowerCase()}`); await loadData(); } else toast("Failed to update", true);
  };
  const remove = async (id: string) => {
    setConfirmDeleteId(null);
    const res = await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
    if (res.ok) { toast("Inquiry deleted"); await loadData(); } else toast("Failed to delete", true);
  };
  const copy = async (email: string) => {
    try { await navigator.clipboard.writeText(email); toast("Email copied"); } catch { toast("Copy failed", true); }
  };

  return (
    <section>
      <div className="admin-section-header">
        <h2>Inbox</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
          <option value="all">All</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {rows.length === 0 && <p className="admin-hint">No inquiries{filter !== "all" ? ` with status ${filter}` : ""} yet.</p>}
      {rows.map((i) => (
        <div key={i.id} className="admin-card" style={{ marginBottom: "1rem" }}>
          <div className="admin-card-header">
            <strong>{String(i.name)}</strong>
            <span className="admin-tag">{labelFor(STATUS_OPTIONS, String(i.status))}</span>
            {Boolean(i.notifyFailed) && <span className="admin-tag" title="Email notification failed">notify failed</span>}
          </div>
          <div className="admin-card-meta">
            <span>{String(i.email)}</span> · <span>{labelFor(BUDGET_OPTIONS, String(i.budget))}</span> · <span>{labelFor(TIMELINE_OPTIONS, String(i.timeline))}</span> · <span>{new Date(i.createdAt).toLocaleString()}</span>
          </div>
          <p className="admin-card-desc" style={{ whiteSpace: "pre-wrap" }}>{String(i.building)}</p>
          <div className="admin-card-actions">
            <button className="admin-btn admin-btn-sm" onClick={() => copy(String(i.email))}>Copy email</button>
            <button className="admin-btn admin-btn-sm" onClick={() => setStatus(i.id, NEXT_STATUS[String(i.status)] ?? "new")}>
              Mark {labelFor(STATUS_OPTIONS, NEXT_STATUS[String(i.status)] ?? "new").toLowerCase()}
            </button>
            {confirmDeleteId === i.id ? (
              <>
                <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => remove(i.id)}>Confirm?</button>
                <button className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              </>
            ) : (
              <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => setConfirmDeleteId(i.id)}>Delete</button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Wire `src/app/admin/page.tsx`**

Read the file first. Apply these edits:
1. Imports: add `import ConsultingTab from "./components/ConsultingTab"; import InboxTab from "./components/InboxTab"; import CollectionTab from "./components/CollectionTab"; import { ALL_DEFS } from "@/lib/collections";` and `import type { CollectionItem, UploadType } from "./components/types";`.
2. `const TABS: Tab[] = ["content", "projects", "skills", "navigation", "media", "consulting", "caseStudies", "testimonials", "inbox"];` and a label map used in the tab strip instead of `charAt(0).toUpperCase()`:
   ```ts
   const TAB_LABELS: Record<Tab, string> = { content: "Content", projects: "Projects", skills: "Skills", navigation: "Navigation", media: "Media", consulting: "Consulting", caseStudies: "Case studies", testimonials: "Testimonials", inbox: "Inbox" };
   ```
   Change the shortcut hint text to `⌘1–9 to switch` (the existing handler already uses `TABS.length`).
3. State: `const [services, setServices] = useState<CollectionItem[]>([]);` and likewise `process`, `caseStudiesItems`, `testimonialsItems`, `inquiriesItems`.
4. `loadData`: extend the `Promise.all` with `fetch("/api/services")`, `fetch("/api/process")`, `fetch("/api/case-studies?all=1")`, `fetch("/api/testimonials?all=1")`, `fetch("/api/inquiries")`, and set the five states when `ok`.
5. `uploadFile`'s `type` parameter: `UploadType`.
6. Panels, after the `media` line:
   ```tsx
   {tab === "consulting" && <ConsultingTab services={services} process={process} toast={toast} loadData={loadData} uploadFile={uploadFile} uploading={uploading} onDirtyChange={(d) => setDirty("consulting", d)} />}
   {tab === "caseStudies" && <CollectionTab def={ALL_DEFS["case-studies"]} apiBase="/api/case-studies" title="Case studies" items={caseStudiesItems} toast={toast} loadData={loadData} uploadFile={uploadFile} uploading={uploading} onDirtyChange={(d) => setDirty("caseStudies", d)} />}
   {tab === "testimonials" && <CollectionTab def={ALL_DEFS.testimonials} apiBase="/api/testimonials" title="Testimonials" items={testimonialsItems} toast={toast} loadData={loadData} uploadFile={uploadFile} uploading={uploading} onDirtyChange={(d) => setDirty("testimonials", d)} />}
   {tab === "inbox" && <InboxTab inquiries={inquiriesItems} toast={toast} loadData={loadData} />}
   ```
7. Tab strip: replace `{t.charAt(0).toUpperCase() + t.slice(1)}` with `{TAB_LABELS[t]}`.
8. `ProjectsTab`/`SkillsTab` prop types: change their `uploadFile` parameter union to `UploadType` (import from `./types`) so the widened `uploadFile` typechecks.

- [ ] **Step 4: Verify in the browser**

`npm run typecheck` → 0; `npm test` → green; `npm run lint` → no new errors. With the dev server running, log in at `http://localhost:3000/admin` (credentials in `.env.local`), open **Consulting**: create a service ("AI-powered product builds", promise, 3 outcomes) → appears; reorder after adding a second → order persists on reload. Open **Case studies**: create a draft with slug auto-filled from the title, upload a PNG diagram, publish → badge flips to Live. Open **Inbox**: `curl -s -X POST localhost:3000/api/inquiries -H 'content-type: application/json' -d '{"name":"Test","email":"t@example.com","building":"x","budget":"lt5k","timeline":"asap"}'` → row appears; Mark replied → chip changes. Screenshot each tab to `screenshots/admin/sub-project-2/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin src/app/api/upload/route.ts screenshots/admin/sub-project-2
git commit -m "$(cat <<'EOF'
feat(admin): Consulting, Case studies, Testimonials and Inbox tabs wired into the dashboard (⌘1–9)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Content tab — hero + manifesto inputs

**Files:**
- Modify: `src/app/admin/components/ContentTab.tsx`

- [ ] **Step 1: Extend the form state**

In `ContentFormState` add `heroHeadline: string; heroSubheadline: string; manifesto: string;`. In `formFromSettings` add `heroHeadline: s.heroHeadline || "", heroSubheadline: s.heroSubheadline || "", manifesto: s.manifesto || "",`.

- [ ] **Step 2: Add inputs to the HERO SECTION**

Directly under the existing `"HIT IT" Button` checkbox block (inside the Hero section card), add:
```tsx
        <div className="admin-field">
          <label htmlFor="heroHeadline">Headline<span className="admin-required">*</span></label>
          <input id="heroHeadline" type="text" maxLength={120} value={contentForm.heroHeadline} onChange={(e) => updateForm({ heroHeadline: e.target.value })} />
          <div className="admin-char-count">{contentForm.heroHeadline.length} / 120</div>
        </div>
        <div className="admin-field">
          <label htmlFor="heroSubheadline">Subheadline</label>
          <textarea id="heroSubheadline" rows={2} maxLength={240} value={contentForm.heroSubheadline} onChange={(e) => updateForm({ heroSubheadline: e.target.value })} />
          <div className="admin-char-count">{contentForm.heroSubheadline.length} / 240</div>
        </div>
```
And a new card after the QUOTES section:
```tsx
        <h3>DARK PASSAGE</h3>
        <div className="admin-field">
          <label htmlFor="manifesto">Manifesto line</label>
          <input id="manifesto" type="text" maxLength={200} value={contentForm.manifesto} onChange={(e) => updateForm({ manifesto: e.target.value })} />
          <div className="admin-char-count">{contentForm.manifesto.length} / 200</div>
        </div>
```
The existing save path (`onSave(contentForm)`) already sends the whole form; `updateSettings` `$set`s the new keys.

- [ ] **Step 3: Verify**

`npm run typecheck` → 0. In the browser: Content tab shows the three inputs with the current values; edit the headline, Save → reload `/voyage` → H1 changed.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/components/ContentTab.tsx
git commit -m "$(cat <<'EOF'
feat(admin): edit hero headline/subheadline and the Dark Passage manifesto from the Content tab

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: `/work/[slug]` reading page

**Files:**
- Create: `src/app/work/[slug]/page.tsx`, `src/app/work/work.css`

**Interfaces:**
- Consumes: `getCaseStudyBySlug`, `getPublishedCaseStudySlugs` (Task 5); `renderMarkdown` (Task 6).

- [ ] **Step 1: Implement the page**

`src/app/work/[slug]/page.tsx`:
```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCaseStudyBySlug, getPublishedCaseStudySlugs } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import "../work.css";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedCaseStudySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cs = await getCaseStudyBySlug(slug);
  if (!cs) return { title: "Case study" };
  return { title: String(cs.title), description: String(cs.context || cs.client || "") };
}

const SECTIONS = [
  ["problem", "Problem"],
  ["architecture", "Architecture"],
  ["outcome", "Outcome"],
] as const;

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cs = await getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const stack = Array.isArray(cs.stack) ? cs.stack : [];
  const metrics = Array.isArray(cs.metrics) ? cs.metrics : [];

  return (
    <main className="work">
      <Link href="/voyage#worlds" className="work__back">← Back to the voyage</Link>
      <header className="work__header">
        <p className="work__eyebrow">Case study{cs.client ? ` · ${String(cs.client)}` : ""}</p>
        <h1 className="work__title">{String(cs.title)}</h1>
        {cs.context ? <p className="work__context">{String(cs.context)}</p> : null}
        {metrics.length > 0 && (
          <ul className="work__metrics" aria-label="Key metrics">
            {metrics.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}
        {stack.length > 0 && (
          <ul className="work__stack" aria-label="Stack">
            {stack.map((s) => <li key={s}>{s}</li>)}
          </ul>
        )}
      </header>
      {cs.diagram ? (
        <figure className="work__diagram">
          <Image src={String(cs.diagram)} alt={`${String(cs.title)} architecture diagram`} width={1600} height={1200} unoptimized />
        </figure>
      ) : null}
      {SECTIONS.map(([key, heading]) => {
        const html = renderMarkdown(String(cs[key] ?? ""));
        if (!html) return null;
        return (
          <section key={key} className="work__section">
            <h2 className="work__h2">{heading}</h2>
            <div className="work__prose" dangerouslySetInnerHTML={{ __html: html }} />
          </section>
        );
      })}
    </main>
  );
}
```
(`dangerouslySetInnerHTML` is fed only by `renderMarkdown`'s sanitised output — add `// eslint-disable-next-line react/no-danger -- sanitised by renderMarkdown` above it if lint requires.)

`src/app/work/work.css`:
```css
.work { --amber: #f2b35c; max-width: 72rem; margin: 0 auto; padding: 6rem clamp(1.5rem, 6vw, 4rem) 8rem; color: #e8e8e8; background: #0a0a0a; min-height: 100vh; }
.work__back { display: inline-block; margin-bottom: 3rem; font-family: var(--font-jetbrains-mono), monospace; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: #a3a3a3; text-decoration: none; }
.work__back:hover { color: #fff; }
.work__eyebrow { font-family: var(--font-jetbrains-mono), monospace; font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: #a3a3a3; margin: 0 0 1rem; }
.work__title { font-family: "Styrene A", var(--font-space-grotesk), sans-serif; font-size: clamp(2.2rem, 5vw, 4rem); font-weight: 500; letter-spacing: -0.02em; line-height: 1; margin: 0 0 1rem; text-wrap: balance; }
.work__context { font-size: 1.15rem; font-weight: 300; color: #d4d4d4; max-width: 62ch; margin: 0 0 1.5rem; }
.work__metrics, .work__stack { list-style: none; display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0; margin: 0 0 1rem; }
.work__metrics li { font-family: var(--font-jetbrains-mono), monospace; font-size: 0.8rem; color: var(--amber); border: 1px solid rgba(242, 179, 92, 0.35); border-radius: 999px; padding: 0.35rem 0.75rem; }
.work__stack li { font-family: var(--font-jetbrains-mono), monospace; font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: #a3a3a3; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 999px; padding: 0.3rem 0.65rem; }
.work__diagram { margin: 3rem 0; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; overflow: hidden; background: #111; }
.work__diagram img { width: 100%; height: auto; display: block; }
.work__section { margin-top: 3.5rem; }
.work__h2 { font-family: var(--font-jetbrains-mono), monospace; font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; color: #a3a3a3; margin: 0 0 1rem; }
.work__prose { max-width: 68ch; font-size: 1.05rem; line-height: 1.7; font-weight: 300; }
.work__prose h2, .work__prose h3 { font-weight: 500; margin: 2rem 0 0.75rem; letter-spacing: -0.01em; }
.work__prose p { margin: 0 0 1rem; }
.work__prose ul, .work__prose ol { padding-left: 1.25rem; margin: 0 0 1rem; }
.work__prose code { font-family: var(--font-jetbrains-mono), monospace; font-size: 0.9em; background: rgba(255, 255, 255, 0.06); padding: 0.1em 0.35em; border-radius: 4px; }
.work__prose pre { background: #111; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1rem; overflow: auto; }
.work__prose a { color: var(--amber); text-underline-offset: 3px; }
.work__prose blockquote { border-left: 2px solid var(--amber); margin: 1rem 0; padding-left: 1rem; color: #d4d4d4; }
```
`GlobalOverlays` already mounts grain/vignette/cursor on every non-admin route; the reading page keeps them (spec: no scene mounted — correct, `VoyageRoot` is not rendered here).

- [ ] **Step 2: Verify in the browser**

`npm run typecheck` → 0. Create and publish a case study in the admin (slug `demo-case`), with markdown in all three sections and a link. Visit `http://localhost:3000/work/demo-case` → title, chips, diagram, three sections; the link opens in a new tab with `rel="noopener noreferrer"`. Unpublish → reload → 404 page. Visit `/work/nope` → 404. Screenshot to `screenshots/admin/sub-project-2/work-demo-case.png`.

- [ ] **Step 3: Commit**

```bash
git add src/app/work screenshots/admin/sub-project-2
git commit -m "$(cat <<'EOF'
feat(work): /work/[slug] case-study reading page with sanitised markdown, metrics, stack and diagram

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Seed, docs, and closing review

**Files:**
- Modify: `scripts/seed.ts`
- Modify: `worklog.md`, `insights.md`, `design.md`

- [ ] **Step 1: Seed consulting defaults**

In `scripts/seed.ts` add imports `import { services, processSteps } from "../src/lib/collections";` and, after the settings seed, before `disconnect`:
```ts
  // Seed consulting content (idempotent: skip when already present)
  if ((await services.list()).length === 0) {
    for (const s of [
      { title: "AI-powered product builds", promise: "From idea to shipped product — model, backend, UI and deploy, owned end to end.", outcomes: ["A working product, not a prototype", "LLM/RAG features that hold up in production", "Clean handover with docs and tests"], engagement: "6–12 weeks, fixed scope" },
      { title: "System architecture & design", promise: "The shape of the system decided before the first line: boundaries, data flow, failure modes.", outcomes: ["Architecture doc your team can build from", "Cost and scaling model", "Risk register with mitigations"], engagement: "1–3 weeks" },
      { title: "Advisory / fractional engineering", promise: "A senior engineer in the room when it matters — reviews, hiring, hard calls.", outcomes: ["Weekly architecture and code reviews", "Interview loops and take-home design", "Incident and roadmap triage"], engagement: "Retainer, 4–8 hours a week" },
    ]) await services.create(s);
    console.log("Seeded 3 services");
  }
  if ((await processSteps.list()).length === 0) {
    for (const p of [
      { title: "Discover", what: "A focused week to understand the problem, the users and the constraints. We agree what 'done' means.", deliverable: "Scope, success metrics, risks", duration: "1 week" },
      { title: "Architect", what: "System boundaries, data model, integrations and failure modes designed before building.", deliverable: "Architecture doc + diagram", duration: "1–2 weeks" },
      { title: "Build", what: "Vertical slices shipped weekly, each reviewed in a browser, each behind tests.", deliverable: "Working software every week", duration: "4–10 weeks" },
      { title: "Ship & operate", what: "Production rollout, observability, runbooks and a clean handover.", deliverable: "Launched product + docs", duration: "1 week" },
    ]) await processSteps.create(p);
    console.log("Seeded 4 process steps");
  }
```
Also change the settings seed to `await Settings.create({ key: "main", profileImage: …, audioFile: …, manifesto: "Most software fails at the seams. I design the seams." });`.

Run: `MONGODB_URI="mongodb://localhost:27018/portfolio" npx tsx scripts/seed.ts` → prints the two new lines. `curl -s localhost:3000/api/services | python3 -c "import sys,json; print(len(json.load(sys.stdin)))"` → `3`.

- [ ] **Step 2: Docs**

- `worklog.md`: add a dated entry listing the 14 tasks' deliverables, the env vars added, and "pre-existing lint errors" untouched.
- `insights.md`: add lessons (e.g. Resend's API-keys CSV only stores a key preview; `Templates`/`Broadcasts` APIs empty — plain-text emails in code; schema-driven CMS replaced ~2k lines of would-be duplication; markdown sanitised server-side only).
- `design.md`: under Architecture add one paragraph on `src/lib/collections/*` and the admin `CollectionTab`, and add the new routes to the Routes table (`/api/{services,process,case-studies,testimonials}[/…]`, `/api/inquiries`, `/work/[slug]`).

- [ ] **Step 3: Closing verification**

`npm test` (all green), `npm run typecheck` (0), `npm run lint` (only the pre-existing errors in untouched files), `npm run build` (succeeds; `/work/[slug]` appears as ISR). Browser: all nine admin tabs load with no console errors; `/voyage` still renders (content wiring is slice 3+).

- [ ] **Step 4: Commit and push**

```bash
git add scripts/seed.ts worklog.md insights.md design.md
git commit -m "$(cat <<'EOF'
docs(cms): seed consulting defaults; worklog, insights and design notes for sub-project 2

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
git push origin <branch>
```

---

## Self-Review

**Spec coverage.** §2 model → Tasks 4–5 (specs, Settings.manifesto); slug rules/unique/409 → Tasks 1–3; markdown sanitisation → Task 6; public reads published-only → Tasks 2–3, 5. §3 factory/routes/getVoyageContent/inquiry POST ordering → Tasks 2, 3, 5, 8; seed → Task 14. §4 mail → Task 7 (bodies verbatim, env documented). §5 admin: CollectionTab/FieldInput → Tasks 9–10; tabs + Inbox + ⌘1–9 → Task 11; Content tab inputs → Task 12; `diagram` upload → Task 10. §6 `/work/[slug]` → Task 13; `revalidatePath` → Task 3. §7 error handling → Tasks 3, 6, 8, 13. §8 tests → each task's tests plus Task 11/13 browser checks. §9 criteria → Task 14 closing verification. Gap check: slice 3+ wiring of `getVoyageContent()` into `VoyageRoot` is deliberately **not** in this plan (it's the voyage plans' job); the `/voyage` page keeps reading `getSettings()` until then.

**Placeholder scan.** None; every code step is complete. Task 7 carries one verified-at-implementation branch (`replyTo` vs `reply_to`) with explicit instructions.

**Type consistency.** `validate(fields, body, mode)` (T1) ↔ `col.validate(body, mode)` (T2) ↔ handlers (T3, T8). `Item` (T2) re-exported as `CollectionItem` (T10) and used in T11. `Collection.list({ publishedOnly, includeInternal, sort })` used by T3/T5/T8 with the T8 note amending T3's authenticated branch to pass `includeInternal: true`. `UploadType` (T10) used by T9 (`"diagram"` literal), T10, T11. `ALL_DEFS` keys `services | process | case-studies | testimonials | inquiries` match the API path segments used in T11. `sendInquiryEmails(inq, deps)` (T7) called in T8 with the six-field `InquiryForMail`. `labelFor(options, value)` (T1) used in T7 and T11.
