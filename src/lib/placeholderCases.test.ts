import { describe, it, expect } from "vitest";
import { caseStudies } from "./collections";
import type { Item } from "./collections/defineCollection";
import { PLANET_FEATURES } from "./collections/specs/caseStudies";
import { PLACEHOLDER_CASES, seedPlaceholderCases, seedPlaceholdersIfAllowed, type CaseStore } from "./placeholderCases";

/** An in-memory store: the REAL validator, a fake database. */
function fakeStore(preexisting: Record<string, Partial<Item>> = {}) {
  const docs = new Map<string, Record<string, unknown>>(
    Object.entries(preexisting).map(([slug, d]) => [slug, { id: `case_${slug}`, slug, ...d }]),
  );
  const calls = { create: [] as Record<string, unknown>[], update: [] as [string, Record<string, unknown>][], lookups: 0 };
  const store: CaseStore = {
    validate: (body, mode) => caseStudies.validate(body, mode),
    getBySlug: async (slug) => {
      calls.lookups++;
      return (docs.get(slug) as Item | undefined) ?? null;
    },
    create: async (value) => {
      calls.create.push(value);
      return { id: `case_${String(value.slug)}`, order: 0, createdAt: "", ...value } as Item;
    },
    update: async (id, value) => {
      calls.update.push([id, value]);
      return { id, order: 0, createdAt: "", ...value } as Item;
    },
  };
  return { store, calls };
}

describe("PLACEHOLDER_CASES", () => {
  it("are three published cases, one per planet feature, in ring / moon / storm order", () => {
    expect(PLACEHOLDER_CASES).toHaveLength(3);
    expect(PLACEHOLDER_CASES.map((c) => c.planetFeature)).toEqual(["ring", "moon", "storm"]);
    for (const c of PLACEHOLDER_CASES) {
      expect(c.published).toBe(true);
      expect(PLANET_FEATURES.map((o) => o.value)).toContain(c.planetFeature);
    }
  });

  it("are unmistakably placeholders: slug prefix, a title that says so, unique slugs", () => {
    for (const c of PLACEHOLDER_CASES) {
      expect(String(c.slug)).toMatch(/^placeholder-/);
      expect(String(c.title)).toMatch(/^Placeholder/);
    }
    expect(new Set(PLACEHOLDER_CASES.map((c) => c.slug)).size).toBe(3);
  });

  it("pass the real case-study validator in create mode (a drifting literal must fail here, not in the database)", () => {
    for (const c of PLACEHOLDER_CASES) {
      const v = caseStudies.validate(c, "create");
      expect(v.ok, `${String(c.slug)}: ${v.ok ? "" : v.error}`).toBe(true);
    }
  });

  it("carry 2-4 paragraphs per section and a first paragraph long enough to exercise the excerpt cut", () => {
    for (const c of PLACEHOLDER_CASES) {
      for (const section of ["problem", "architecture", "outcome"]) {
        const paragraphs = String(c[section]).split("\n\n");
        expect(paragraphs.length, `${String(c.slug)} ${section}`).toBeGreaterThanOrEqual(2);
        expect(paragraphs.length, `${String(c.slug)} ${section}`).toBeLessThanOrEqual(4);
        if (section !== "outcome") expect(paragraphs[0].length, `${String(c.slug)} ${section} first paragraph`).toBeGreaterThan(160);
      }
      expect((c.stack as string[]).length).toBeGreaterThanOrEqual(3);
      expect((c.metrics as string[]).length).toBeGreaterThanOrEqual(2);
    }
  });

  // `diagram` has no default in the case-study spec, so neither validation mode ever writes it:
  // leaving it out of the literals is what keeps an /admin upload safe from a reseed.
  it("do not carry a diagram key, so one uploaded through /admin is never touched", () => {
    for (const c of PLACEHOLDER_CASES) expect("diagram" in c).toBe(false);
  });
});

describe("seedPlaceholderCases", () => {
  it("creates all three on an empty database, published", async () => {
    const { store, calls } = fakeStore();
    const result = await seedPlaceholderCases(store);
    expect(result).toEqual({ created: ["placeholder-ledger", "placeholder-routing", "placeholder-telemetry"], updated: [] });
    expect(calls.create).toHaveLength(3);
    expect(calls.update).toHaveLength(0);
    for (const value of calls.create) expect(value.published).toBe(true);
  });

  it("is re-runnable: existing slugs are updated in place, only missing ones are created", async () => {
    const { store, calls } = fakeStore({ "placeholder-routing": { title: "old" } });
    const result = await seedPlaceholderCases(store);
    expect(result).toEqual({
      created: ["placeholder-ledger", "placeholder-telemetry"],
      updated: ["placeholder-routing"],
    });
    expect(calls.update.map(([id]) => id)).toEqual(["case_placeholder-routing"]);
  });

  it("does not write a diagram key on an update, so an upload through /admin survives a reseed", async () => {
    const { store, calls } = fakeStore({ "placeholder-ledger": { diagram: "/api/media/uploaded" } });
    await seedPlaceholderCases(store);
    const [, value] = calls.update[0];
    expect("diagram" in value).toBe(false);
    expect(value.published).toBe(true);
  });

  // The discriminating case for "update" mode: it validates only the keys PRESENT, so a field the
  // literal omits but that has a spec default (planetFeature "none", published false) is never
  // rewritten on an existing case, while a brand-new case gets those defaults. Validating an
  // existing case in create mode would clobber a hand-edited planetFeature / published flag.
  it("validates an existing case in update mode: a defaulted field the literal omits is not rewritten, a new case gets its defaults", async () => {
    const minimal = [{ slug: "placeholder-minimal", title: "Placeholder minimal" }];
    const existing = fakeStore({ "placeholder-minimal": { planetFeature: "storm", published: true } });
    await seedPlaceholderCases(existing.store, minimal);
    const [, updateValue] = existing.calls.update[0];
    expect(updateValue).toEqual({ slug: "placeholder-minimal", title: "Placeholder minimal" });
    const fresh = fakeStore();
    await seedPlaceholderCases(fresh.store, minimal);
    expect(fresh.calls.create[0]).toMatchObject({ slug: "placeholder-minimal", planetFeature: "none", published: false });
  });

  it("validates everything before writing anything: one bad literal leaves the database untouched", async () => {
    const { store, calls } = fakeStore();
    const bad = [...PLACEHOLDER_CASES.slice(0, 2), { ...PLACEHOLDER_CASES[2], planetFeature: "comet" }];
    await expect(seedPlaceholderCases(store, bad)).rejects.toThrow(/placeholder-telemetry.*invalid/);
    expect(calls.create).toHaveLength(0);
    expect(calls.update).toHaveLength(0);
  });
});

// The branch that decides whether PUBLISHED placeholders reach a database used to live inline in
// scripts/seed.ts, where nothing tested it: inverting its condition passed every unit test. It is
// a function now; the script only maps `ran === false` to a non-zero exit code.
describe("seedPlaceholdersIfAllowed", () => {
  const logs = () => {
    const records: Record<string, unknown>[] = [];
    return { records, log: async (r: Record<string, unknown>) => void records.push(r) };
  };

  it("refuses a remote database: nothing is read or written, an error is logged, ran is false", async () => {
    const { store, calls } = fakeStore();
    const { records, log } = logs();
    for (const uri of ["mongodb+srv://cluster0.abcde.mongodb.net/portfolio", "mongodb://db.example.com:27017/portfolio", undefined]) {
      const outcome = await seedPlaceholdersIfAllowed({ uri, argv: ["node", "seed.ts"], store, log });
      expect(outcome).toEqual({ ran: false });
    }
    expect(calls.lookups).toBe(0);
    expect(calls.create).toHaveLength(0);
    expect(calls.update).toHaveLength(0);
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.level).toBe("error");
      expect(String(r.message)).toMatch(/refused/);
    }
  });

  it("seeds a local database, logs the result at info level, and reports ran", async () => {
    const { store, calls } = fakeStore();
    const { records, log } = logs();
    const outcome = await seedPlaceholdersIfAllowed({ uri: "mongodb://localhost:27018/portfolio", argv: [], store, log });
    expect(outcome.ran).toBe(true);
    expect(outcome.result?.created).toHaveLength(3);
    expect(calls.create).toHaveLength(3);
    expect(records).toEqual([expect.objectContaining({ level: "info", created: outcome.result!.created, updated: [] })]);
  });

  it("seeds a remote database only with exactly --placeholders", async () => {
    const uri = "mongodb+srv://cluster0.abcde.mongodb.net/portfolio";
    const refused = fakeStore();
    expect(await seedPlaceholdersIfAllowed({ uri, argv: ["--placeholder"], store: refused.store, log: logs().log })).toEqual({ ran: false });
    const allowed = fakeStore();
    const outcome = await seedPlaceholdersIfAllowed({ uri, argv: ["--placeholders"], store: allowed.store, log: logs().log });
    expect(outcome.ran).toBe(true);
    expect(allowed.calls.create).toHaveLength(3);
  });

  it("lets a store failure propagate (the script's own catch exits non-zero) instead of reporting ran", async () => {
    const { store } = fakeStore();
    store.getBySlug = async () => {
      throw new Error("db down");
    };
    await expect(
      seedPlaceholdersIfAllowed({ uri: "mongodb://127.0.0.1/portfolio", argv: [], store, log: logs().log }),
    ).rejects.toThrow("db down");
  });
});
