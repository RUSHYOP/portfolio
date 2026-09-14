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
