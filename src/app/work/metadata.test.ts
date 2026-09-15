import { describe, it, expect } from "vitest";
import type { Item } from "@/lib/collections/defineCollection";
import { buildCaseStudyMetadata } from "./metadata";

// Minimal Item factory — only the fields the builder reads matter.
const item = (extra: Record<string, unknown>): Item =>
  ({ id: "case_1", order: 0, createdAt: "2026-01-01T00:00:00.000Z", ...extra }) as Item;

// F5: /work/[slug] must stay out of the index while /voyage is noindex — both flip at launch.
const NOINDEX = { index: false, follow: false };

describe("buildCaseStudyMetadata", () => {
  it("falls back to a generic title when the study is missing", () => {
    expect(buildCaseStudyMetadata(null)).toEqual({ title: "Case study", robots: NOINDEX });
  });

  it("uses title and context", () => {
    expect(buildCaseStudyMetadata(item({ title: "Pricing Engine", context: "Rebuild" }))).toEqual({
      title: "Pricing Engine",
      description: "Rebuild",
      robots: NOINDEX,
      openGraph: { title: "Pricing Engine", description: "Rebuild" },
    });
  });

  it("falls back to client when context is absent", () => {
    expect(buildCaseStudyMetadata(item({ title: "Pricing Engine", client: "Fintech" }))).toEqual({
      title: "Pricing Engine",
      description: "Fintech",
      robots: NOINDEX,
      openGraph: { title: "Pricing Engine", description: "Fintech" },
    });
  });

  it("omits description entirely when neither context nor client is set", () => {
    expect(buildCaseStudyMetadata(item({ title: "Pricing Engine" }))).toEqual({
      title: "Pricing Engine",
      robots: NOINDEX,
      openGraph: { title: "Pricing Engine" },
    });
  });

  it("treats whitespace-only values as absent", () => {
    expect(buildCaseStudyMetadata(item({ title: "   ", context: "  " }))).toEqual({
      title: "Case study",
      robots: NOINDEX,
      openGraph: { title: "Case study" },
    });
  });

  it("mirrors the page title into openGraph", () => {
    const meta = buildCaseStudyMetadata(item({ title: "Pricing Engine" }));
    expect(meta.openGraph?.title).toBe(meta.title);
  });
});
