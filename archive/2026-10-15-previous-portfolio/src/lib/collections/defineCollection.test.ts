import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { defineCollection, buildSchema, effectiveFields, DuplicateSlugError } from "./defineCollection";
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
  // published is now a real (synthesized) toggle field, so it must still carry its index.
  it("indexes the synthesized published toggle", () => {
    expect(schema.path("published").options.index).toBe(true);
  });
  it("binds the schema to the def's Mongo collection", () => {
    expect(schema.options.collection).toBe(def.collection);
  });
  it("trims string paths that need it", () => {
    expect(schema.path("title").options.trim).toBe(true);
    expect(schema.path("slug").options.trim).toBe(true);
  });
  it("gives chips an array default", () => {
    // SchemaType#getDefault() is untyped in Mongoose 9, so assert the declared option:
    // Mongoose keeps an array default as-is (it wraps only function defaults).
    const d = schema.path("tags").options.default;
    expect(typeof d === "function" || Array.isArray(d)).toBe(true);
  });
  it("sets unique only on itemId and slug", () => {
    for (const key of Object.keys(schema.paths)) {
      const unique = schema.path(key).options.unique;
      if (key === "itemId" || key === "slug") expect(unique).toBe(true);
      else expect(unique).toBeUndefined();
    }
  });
  // A select with no declared default must leave the schema default absent entirely.
  it("omits the schema default for a select with no declared default", () => {
    const s = buildSchema({
      ...def, name: "SelectNoDefault", collection: "selectnodefaults",
      fields: { kind: { type: "select", label: "Kind", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] } },
    });
    // `"default" in options` is always true (SchemaTypeOptions declares it on the
    // prototype), so assert the resolved default instead.
    expect(s.path("kind").options.default).toBeUndefined();
  });
  // A wrong-typed declared default must not reach the schema.
  it("falls back for wrong-typed toggle/number defaults", () => {
    const s = buildSchema({
      ...def, name: "BadDefaults", collection: "baddefaults", publishable: false, orderable: false,
      fields: {
        flag: { type: "toggle", label: "Flag", default: "yes" },
        n: { type: "number", label: "N", default: "3" },
      },
    });
    expect(s.path("flag").options.default).toBe(false);
    expect(s.path("n").options.default).toBe(0);
  });
});

describe("effectiveFields", () => {
  it("synthesizes a published toggle for a publishable def", () => {
    expect(effectiveFields(def).published).toEqual({ type: "toggle", label: "Published", default: false });
  });
  it("leaves a non-publishable def's fields untouched", () => {
    const nonPub = { ...def, publishable: false };
    expect(effectiveFields(nonPub)).toBe(nonPub.fields);
  });
  it("keeps an explicitly declared published toggle", () => {
    const declared = { ...def, fields: { ...def.fields, published: { type: "toggle" as const, label: "Live", default: true } } };
    expect(effectiveFields(declared).published.label).toBe("Live");
  });
  it("rejects reserved field names", () => {
    expect(() => effectiveFields({ ...def, fields: { ...def.fields, itemId: { type: "text", label: "x" } } })).toThrow(/reserved/);
    expect(() => effectiveFields({ ...def, fields: { ...def.fields, order: { type: "number", label: "x" } } })).toThrow(/reserved/);
  });
  it("rejects a published field that is not a toggle", () => {
    expect(() => effectiveFields({ ...def, fields: { ...def.fields, published: { type: "text", label: "x" } } })).toThrow(/must be a toggle/);
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
  it("toDto falls back to the epoch when createdAt is absent", () => {
    expect(col.toDto({ itemId: "tt_3", title: "T" }).createdAt).toBe(new Date(0).toISOString());
  });
  it("toDto emits the first option for a select with no declared default", () => {
    const c = defineCollection({
      ...def, name: "SelectDto", collection: "selectdtos", publishable: false, orderable: false,
      fields: { kind: { type: "select", label: "Kind", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] } },
    });
    expect(c.toDto({ itemId: "s_1", createdAt: new Date(0) }).kind).toBe("a");
  });
  it("toDto emits an empty string for a select with no options", () => {
    const c = defineCollection({
      ...def, name: "SelectEmpty", collection: "selectempties", publishable: false, orderable: false,
      fields: { kind: { type: "select", label: "Kind" } },
    });
    expect(c.toDto({ itemId: "s_1", createdAt: new Date(0) }).kind).toBe("");
  });
  // published must be settable through the validator, or nothing can ever be published.
  it("validate accepts published on a publishable def", () => {
    expect(col.validate({ published: true }, "update")).toEqual({ ok: true, value: { published: true } });
  });
  it("validate rejects published on a non-publishable def", () => {
    const nonPub = defineCollection({ ...def, name: "NonPub", collection: "nonpubs", publishable: false });
    expect(nonPub.validate({ published: true }, "update")).toEqual({ ok: false, error: "unknown field: published" });
  });
  it("rejects a def declaring a reserved field name", () => {
    expect(() => defineCollection({ ...def, fields: { ...def.fields, order: { type: "number", label: "x" } } })).toThrow(/reserved/);
  });
  it("DuplicateSlugError carries a stable message", () => {
    expect(new DuplicateSlugError().message).toBe("slug already exists");
  });
  it("getBySlug rejects when the def has no slug field", async () => {
    const noSlug = defineCollection({ ...def, name: "NoSlug", collection: "noslugs", fields: { title: def.fields.title } });
    await expect(noSlug.getBySlug("x")).rejects.toThrow("NoSlug has no slug field");
  });
});
