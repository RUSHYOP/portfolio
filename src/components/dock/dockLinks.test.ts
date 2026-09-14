import { describe, it, expect } from "vitest";
import { DOCK_LINKS } from "./Dock";
import { CHAPTERS } from "@/scene/camera/flightPath";

describe("DOCK_LINKS", () => {
  it("only references real, non-micro chapters", () => {
    const ids = new Set(CHAPTERS.filter((c) => !c.micro).map((c) => c.id));
    for (const l of DOCK_LINKS) expect(ids.has(l.chapter)).toBe(true);
  });
  it("has unique labels and chapters", () => {
    expect(new Set(DOCK_LINKS.map((l) => l.label)).size).toBe(DOCK_LINKS.length);
    expect(new Set(DOCK_LINKS.map((l) => l.chapter)).size).toBe(DOCK_LINKS.length);
  });
});
