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
  secret: { type: "text", label: "Secret", internal: true, default: "s" },
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
    expect(validate(fields, { title: "t", slug: "a", tags: ["a", 1] }, "create")).toEqual({ ok: false, error: "tags must be an array of strings" });
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
    expect(validate(fields, { title: "t", slug: "a", count: "5" }, "create")).toEqual({ ok: false, error: "count must be a number" });
    expect(validate(fields, { title: "t", slug: "a", count: Number.POSITIVE_INFINITY }, "create")).toEqual({ ok: false, error: "count must be a number" });
  });
  it("rejects unknown, reserved and internal keys from a body", () => {
    expect(validate(fields, { title: "t", slug: "a", nope: 1 }, "create")).toEqual({ ok: false, error: "unknown field: nope" });
    expect(validate(fields, { title: "t", slug: "a", order: 3 }, "create")).toEqual({ ok: false, error: "order cannot be set" });
    expect(validate(fields, { title: "t", slug: "a", secret: "x" }, "create")).toEqual({ ok: false, error: "secret cannot be set" });
  });
  it("rejects prototype-chain keys as unknown fields", () => {
    // Must be built with JSON.parse: an object literal `{ __proto__: {} }` sets the prototype instead of an own key.
    const proto = JSON.parse('{"title":"t","slug":"a","__proto__":{}}');
    expect(validate(fields, proto, "create")).toEqual({ ok: false, error: "unknown field: __proto__" });
    expect(validate(fields, { title: "t", slug: "a", constructor: "x" }, "create")).toEqual({ ok: false, error: "unknown field: constructor" });
    expect(validate(fields, { title: "t", slug: "a", toString: "x" }, "create")).toEqual({ ok: false, error: "unknown field: toString" });
  });
  it("rejects non-object bodies", () => {
    expect(validate(fields, null, "create")).toEqual({ ok: false, error: "Body must be a JSON object" });
    expect(validate(fields, [], "create")).toEqual({ ok: false, error: "Body must be a JSON object" });
    expect(validate(fields, "str", "create")).toEqual({ ok: false, error: "Body must be a JSON object" });
    expect(validate(fields, 42, "create")).toEqual({ ok: false, error: "Body must be a JSON object" });
  });
  it("never applies the default of an internal field", () => {
    const r = validate(fields, { title: "t", slug: "a" }, "create");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).not.toHaveProperty("secret");
  });
  it("never satisfies a required field with its default", () => {
    const withDefault: FieldSpecs = { x: { type: "text", label: "X", required: true, default: "d" } };
    expect(validate(withDefault, {}, "create")).toEqual({ ok: false, error: "x is required" });
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

// Extra coverage: checkField branches the cases above do not reach
// (non-string string field, non-string select, required chips left empty,
//  accepted number, undefined-valued key treated as absent).
describe("validate type guards and remaining branches", () => {
  it("rejects non-string values for string and select fields", () => {
    expect(validate(fields, { title: 1, slug: "a" }, "create")).toEqual({ ok: false, error: "title must be a string" });
    expect(validate(fields, { title: "t", slug: "a", kind: 1 }, "create")).toEqual({ ok: false, error: "kind must be a string" });
  });
  it("rejects required chips whose items are all blank", () => {
    const required: FieldSpecs = { tags: { type: "chips", label: "Tags", required: true } };
    expect(validate(required, { tags: ["  ", ""] }, "create")).toEqual({ ok: false, error: "tags is required" });
    expect(validate(required, { tags: ["a"] }, "create")).toEqual({ ok: true, value: { tags: ["a"] } });
  });
  it("accepts an in-range number and treats an undefined value as absent", () => {
    expect(validate(fields, { title: "t", slug: "a", count: 5 }, "create")).toEqual({ ok: true, value: expect.objectContaining({ count: 5 }) });
    expect(validate(fields, { title: undefined, slug: "a" }, "create")).toEqual({ ok: false, error: "title is required" });
    expect(validate(fields, { body: undefined }, "update")).toEqual({ ok: true, value: {} });
  });
  it("rejects a select whose value is not in an empty option list", () => {
    const noOptions: FieldSpecs = { kind: { type: "select", label: "Kind" } };
    expect(validate(noOptions, { kind: "a" }, "create")).toEqual({ ok: false, error: "kind must be one of: " });
  });
});
