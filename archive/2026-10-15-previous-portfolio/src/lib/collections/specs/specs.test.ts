import { describe, it, expect } from "vitest";
import { servicesDef } from "./services";
import { processStepsDef } from "./processSteps";
import { caseStudiesDef, PLANET_FEATURES } from "./caseStudies";
import { testimonialsDef } from "./testimonials";
import { inquiriesDef, BUDGET_OPTIONS, TIMELINE_OPTIONS, STATUS_OPTIONS } from "./inquiries";
import { validate, RESERVED_KEYS } from "../fieldSpec";
import { ALL_DEFS } from "../index";

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
    const base = { name: "A", email: "a@b.co", building: "x", budget: "lt5k", timeline: "asap" };
    expect(validate(inquiriesDef.fields, { ...base, status: "replied" }, "create")).toEqual({ ok: false, error: "status cannot be set" });
    // Every internal field is rejected the same way — ipHash and notifyFailed included,
    // or a submitter could forge their own rate-limit bucket / clear the follow-up flag.
    expect(validate(inquiriesDef.fields, { ...base, ipHash: "deadbeef" }, "create")).toEqual({ ok: false, error: "ipHash cannot be set" });
    expect(validate(inquiriesDef.fields, { ...base, notifyFailed: true }, "create")).toEqual({ ok: false, error: "notifyFailed cannot be set" });
  });
});

// Carry-forward from the Task 1 review: the specs are the single source of truth for
// every downstream form and validator, so a malformed default or a reserved key here
// would surface as a runtime bug, not a type error. Swept across every declared def.
describe("ALL_DEFS invariants", () => {
  const entries = Object.entries(ALL_DEFS);

  it("exposes exactly the five collections keyed by API path segment", () => {
    expect(Object.keys(ALL_DEFS)).toEqual(["services", "process", "case-studies", "testimonials", "inquiries"]);
  });

  it("every declared default matches its field type", () => {
    for (const [key, def] of entries) {
      for (const [name, spec] of Object.entries(def.fields)) {
        if (spec.default === undefined) continue;
        const where = `${key}.${name}`;
        switch (spec.type) {
          case "chips":
            expect(Array.isArray(spec.default), where).toBe(true);
            expect((spec.default as string[]).every((v) => typeof v === "string"), where).toBe(true);
            break;
          case "toggle":
            expect(typeof spec.default, where).toBe("boolean");
            break;
          case "number":
            expect(typeof spec.default, where).toBe("number");
            break;
          case "select":
            expect(typeof spec.default, where).toBe("string");
            expect((spec.options ?? []).map((o) => o.value), where).toContain(spec.default);
            break;
          default:
            // text | textarea | markdown | slug | image
            expect(typeof spec.default, where).toBe("string");
        }
      }
    }
  });

  it("no field name collides with a reserved key", () => {
    for (const [key, def] of entries) {
      for (const name of Object.keys(def.fields)) {
        expect((RESERVED_KEYS as readonly string[]).includes(name), `${key}.${name}`).toBe(false);
      }
    }
  });

  it("no def declares `published` — defineCollection injects it", () => {
    for (const [key, def] of entries) {
      expect(Object.prototype.hasOwnProperty.call(def.fields, "published"), key).toBe(false);
    }
  });

  it("every select field declares at least one option", () => {
    for (const [key, def] of entries) {
      for (const [name, spec] of Object.entries(def.fields)) {
        if (spec.type !== "select") continue;
        expect(spec.options?.length ?? 0, `${key}.${name}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("idPrefix and collection are unique across defs", () => {
    const defs = entries.map(([, d]) => d);
    expect(new Set(defs.map((d) => d.idPrefix)).size).toBe(defs.length);
    expect(new Set(defs.map((d) => d.collection)).size).toBe(defs.length);
    expect(new Set(defs.map((d) => d.name)).size).toBe(defs.length);
  });

  it("every searchable key names a declared field", () => {
    for (const [key, def] of entries) {
      for (const name of def.searchable) {
        expect(Object.prototype.hasOwnProperty.call(def.fields, name), `${key}.${name}`).toBe(true);
      }
    }
  });
});
