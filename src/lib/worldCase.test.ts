import { describe, it, expect } from "vitest";
import type { Item } from "./collections/defineCollection";
import { toWorldCase } from "./worldCase";

const item = (extra: Record<string, unknown> = {}): Item =>
  ({
    id: "case_1", order: 3, createdAt: "2026-01-01T00:00:00.000Z",
    slug: "ledger", title: "Ledger migration", client: "Acme", context: "Moving a ledger off a monolith",
    problem: "## Problem\n\nThe ledger could not scale past **40 tps**.\n\nMore detail nobody needs here.",
    architecture: "An event-sourced core with `Kafka` and [Postgres](https://example.com).",
    outcome: "- p95 down to 120 ms\n- zero incidents",
    stack: ["Go", "Kafka", "Postgres"], metrics: ["p95 120ms"], diagram: "/api/media/abc123",
    planetFeature: "ring", published: true,
    ...extra,
  }) as Item;

describe("toWorldCase", () => {
  it("maps a published case study to the slim DTO, excerpts included", () => {
    expect(toWorldCase(item())).toEqual({
      id: "case_1", slug: "ledger", title: "Ledger migration", client: "Acme",
      context: "Moving a ledger off a monolith",
      stack: ["Go", "Kafka", "Postgres"], diagram: "/api/media/abc123", planetFeature: "ring",
      excerpts: {
        problem: "The ledger could not scale past 40 tps.",
        architecture: "An event-sourced core with Kafka and Postgres.",
        outcome: "p95 down to 120 ms",
      },
    });
  });

  it("carries no markdown body, metrics, order, timestamp or published flag to the client", () => {
    expect(Object.keys(toWorldCase(item())).sort()).toEqual(
      ["client", "context", "diagram", "excerpts", "id", "planetFeature", "slug", "stack", "title"],
    );
    expect(Object.keys(toWorldCase(item()).excerpts).sort()).toEqual(["architecture", "outcome", "problem"]);
  });

  it("narrows every field at the leaf: non-string CMS values become empty, a bad planet feature becomes none", () => {
    const w = toWorldCase(item({
      slug: 7, title: null, client: ["x"], context: 1, problem: 5, architecture: undefined, outcome: {},
      stack: ["Go", 3, null, "Kafka"], diagram: false, planetFeature: "comet",
    }));
    expect(w).toEqual({
      id: "case_1", slug: "", title: "", client: "", context: "",
      stack: ["Go", "Kafka"], diagram: "", planetFeature: "none",
      excerpts: { problem: "", architecture: "", outcome: "" },
    });
  });

  it("treats a missing stack as an empty one", () => {
    expect(toWorldCase(item({ stack: "Go" })).stack).toEqual([]);
    expect(toWorldCase(item({ stack: undefined })).stack).toEqual([]);
  });

  it("keeps the worst-case payload small: three 6000-char sections become three short excerpts", () => {
    const body = "word ".repeat(1200);                    // 6000 chars
    const w = toWorldCase(item({
      problem: body, architecture: body, outcome: body,
      title: "t".repeat(120), client: "c".repeat(80), context: "x".repeat(200), slug: "s".repeat(80),
      stack: Array.from({ length: 12 }, () => "k".repeat(40)), diagram: "/api/media/" + "a".repeat(60),
    }));
    for (const e of Object.values(w.excerpts)) expect(e.length).toBeLessThanOrEqual(161);
    expect(JSON.stringify(w).length).toBeLessThan(2000);
  });
});
