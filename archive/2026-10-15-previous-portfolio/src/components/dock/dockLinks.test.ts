import { describe, it, expect } from "vitest";
import { DOCK_LINKS, DOCK_COMPACT_PROGRESS } from "./Dock";
import { CHAPTERS, VOYAGE_SCROLL_VH } from "@/scene/camera/flightPath";

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

// The dock shrinks once the hero has mostly scrolled by. It used to be the absolute literal
// 0.05 (62.5% of Launch at the old 0.08 span); it is now derived, so a chapter-table change
// moves it with Launch instead of leaving it stranded.
describe("DOCK_COMPACT_PROGRESS", () => {
  it("is 62.5% of the way through Launch", () => {
    // Pins the intent (the dock compacts 62.5vh into the voyage), not the source expression.
    expect(DOCK_COMPACT_PROGRESS * VOYAGE_SCROLL_VH).toBeCloseTo(62.5, 9);
    const launch = CHAPTERS.find((c) => c.id === "launch")!;
    expect(DOCK_COMPACT_PROGRESS).toBeGreaterThan(launch.start);
    expect(DOCK_COMPACT_PROGRESS).toBeLessThan(launch.end);
  });
});
