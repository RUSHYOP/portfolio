import { describe, it, expect, vi, beforeEach } from "vitest";

// Characterisation test for getVoyageContent() (shipped in sub-project 2, untested until now).
// data.ts opens a Mongo connection at module scope through these three; without the mocks
// the test would try to reach a real database.
vi.mock("@/lib/mongodb", () => ({ default: vi.fn(async () => {}) }));
vi.mock("@/lib/models", () => ({
  Project: {},
  Skill: {},
  Settings: { findOne: () => ({ lean: async () => ({ heroHeadline: "From the CMS" }) }) },
}));
vi.mock("@/lib/collections", () => ({
  services: { list: vi.fn(async () => [{ id: "svc_1", order: 0, createdAt: "", title: "Builds" }]) },
  processSteps: { list: vi.fn(async () => [{ id: "prc_1", order: 0, createdAt: "" }]) },
  caseStudies: { list: vi.fn(async () => [{ id: "cs_1", order: 0, createdAt: "" }]) },
  testimonials: { list: vi.fn(async () => []) },
}));

import { services, processSteps, caseStudies, testimonials } from "@/lib/collections";
import { getVoyageContent } from "./data";

// Reset call history so each test asserts only on its own getVoyageContent() call.
beforeEach(() => {
  vi.mocked(services.list).mockClear();
  vi.mocked(processSteps.list).mockClear();
  vi.mocked(caseStudies.list).mockClear();
  vi.mocked(testimonials.list).mockClear();
});

describe("getVoyageContent", () => {
  it("reads published-only for the author-gated collections", async () => {
    await getVoyageContent();
    // services and process steps are not publishable — no filter to pass.
    expect(services.list).toHaveBeenCalledWith();
    expect(processSteps.list).toHaveBeenCalledWith();
    expect(caseStudies.list).toHaveBeenCalledWith({ publishedOnly: true });
    expect(testimonials.list).toHaveBeenCalledWith({ publishedOnly: true });
  });

  it("returns all five payloads in one call, settings included", async () => {
    const content = await getVoyageContent();
    expect(content.services).toHaveLength(1);
    expect(content.services[0].title).toBe("Builds");
    expect(content.process).toHaveLength(1);
    expect(content.caseStudies).toHaveLength(1);
    expect(content.testimonials).toEqual([]);
    expect(content.settings.heroHeadline).toBe("From the CMS");
    // Fields the stored doc never had still come back on their schema defaults.
    expect(content.settings.manifesto).toBe("Most software fails at the seams. I design the seams.");
  });
});
