import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/data", () => ({ getProjects: vi.fn() }));
import { getProjects } from "@/lib/data";
import { externalUrl, portfolioProjects } from "./portfolio";
import originalProjects from "@/content/projects.json";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe("portfolio content", () => {
  it("keeps the public site useful if the CMS cannot be reached", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://example.invalid");
    vi.mocked(getProjects).mockRejectedValue(new Error("offline"));
    const result = await portfolioProjects();
    expect(result).toHaveLength(11);
    expect(result[0].title).toBe("My work at Ramco Systems");
    expect(result.some((p) => p.title.includes("ProcSAGE"))).toBe(true);
  });
  it("renders authored CMS records when available", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://example.invalid");
    vi.mocked(getProjects).mockResolvedValue([{ id: "custom" }] as Awaited<
      ReturnType<typeof getProjects>
    >);
    expect((await portfolioProjects()).some((p) => p.id === "custom")).toBe(
      true,
    );
  });
  it("keeps removed projects and the ProcSAGE code link hidden even when the CMS returns old records", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://example.invalid");
    vi.mocked(getProjects).mockResolvedValue(originalProjects);
    const result = await portfolioProjects();
    expect(result.some((p) => ["proj_3", "proj_4"].includes(p.id))).toBe(false);
    expect(result.find((p) => p.id === "proj_2")).toMatchObject({
      codeLink: "",
      showCodeLink: false,
      showLiveLink: true,
    });
  });
  it("gives every public project a unique article URL and preserves collaboration credit", async () => {
    vi.stubEnv("MONGODB_URI", "");
    const result = await portfolioProjects();
    expect(new Set(result.map((p) => p.slug)).size).toBe(result.length);
    expect(
      result.every(
        (p) => /^[a-z0-9-]+$/.test(p.slug) && p.story.sections.length > 0,
      ),
    ).toBe(true);
    expect(result.find((p) => p.id === "gharpay")).toMatchObject({
      liveLink: "https://gharpay.co/",
      showCodeLink: false,
      story: { context: "Collaborative project" },
    });
  });
  it("rejects executable or relative project URLs", () => {
    expect(externalUrl("javascript:alert(1)")).toBeUndefined();
    expect(externalUrl("/admin")).toBeUndefined();
    expect(externalUrl("https://github.com/RUSHYOP")).toBe(
      "https://github.com/RUSHYOP",
    );
  });
});
