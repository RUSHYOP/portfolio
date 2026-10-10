import { describe, expect, it } from "vitest";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { toScroll, toVoyage, type ScrollSegment } from "./scrollGeometry";

function fixture(orbitHeight: number, approachHeight = 150): ScrollSegment[] {
  let y = 0;
  return CHAPTERS.map(c => {
    const height = c.id === "orbit" ? orbitHeight : c.id === "approach" ? approachHeight : sectionHeightVh(c);
    const segment = { startPx: y, endPx: y + height - (c.id === "surface" ? 100 : 0), start: c.start, end: c.end };
    y += height;
    return segment;
  });
}
describe("physical/canonical geometry", () => {
  it.each([150, 500, 875])("round trips a %ivh Orbit and lands every chapter", height => {
    const segments = fixture(height, height * 1.7);
    for (const s of segments) {
      expect(toScroll(s.start, segments)).toBeCloseTo(s.startPx, 8);
      expect(toVoyage(s.startPx, segments)).toBeCloseTo(s.start, 8);
    }
    let previous = -1;
    for (let i = 0; i <= 1000; i++) {
      const p = i / 1000;
      const y = toScroll(p, segments);
      expect(y).toBeGreaterThanOrEqual(previous);
      expect(toVoyage(y, segments)).toBeCloseTo(p, 8);
      previous = y;
    }
    expect(toVoyage(999999, segments)).toBe(1);
    expect(toScroll(-1, segments)).toBe(0);
  });
  it("keeps Jump physically 25vh when Orbit grows", () => {
    const segments = fixture(500);
    expect(toScroll(.22, segments) - toScroll(.20, segments)).toBeCloseTo(25);
  });
  it("handles empty and nonfinite inputs", () => {
    expect(toVoyage(NaN, fixture(500))).toBe(0);
    expect(toScroll(Infinity, fixture(500))).toBe(fixture(500).at(-1)!.endPx);
    expect(toVoyage(5, [])).toBe(0);
  });
});
