import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/data", () => ({ getProjects: vi.fn() }));
import { getProjects } from "@/lib/data";
import { externalUrl, portfolioProjects } from "./portfolio";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe("portfolio content", () => {
  it("keeps the public site useful if the CMS cannot be reached", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://example.invalid");
    vi.mocked(getProjects).mockRejectedValue(new Error("offline"));
    const result = await portfolioProjects();
    expect(result).toHaveLength(10);
    expect(result[1].title).toContain("ProcSAGE");
  });
  it("renders authored CMS records when available", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://example.invalid");
    vi.mocked(getProjects).mockResolvedValue([{ id: "custom" }] as Awaited<
      ReturnType<typeof getProjects>
    >);
    expect((await portfolioProjects())[0].id).toBe("custom");
  });
  it("rejects executable or relative project URLs", () => {
    expect(externalUrl("javascript:alert(1)")).toBeUndefined();
    expect(externalUrl("/admin")).toBeUndefined();
    expect(externalUrl("https://github.com/RUSHYOP")).toBe(
      "https://github.com/RUSHYOP",
    );
  });
});
