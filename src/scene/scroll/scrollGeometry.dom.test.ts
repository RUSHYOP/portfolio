// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { measureScrollSegments, toScroll, toVoyage } from "./scrollGeometry";
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
it.each([900, 844])("measures boundaries and the Surface tail at viewport height %i", viewport => {
  for (const orbitPx of [150 * viewport / 100, 500 * viewport / 100, 180]) {
    for (const approachPx of [150 * viewport / 100, 75 * viewport / 100]) {
      const track = document.createElement("main");
      track.className = "voyage-track";
      document.body.replaceChildren(track);
      const restoredY = 333;
      let offset = 37;
      for (const chapter of CHAPTERS) {
        const section = document.createElement("section"); section.id = chapter.id;
        const height = chapter.id === "orbit" ? orbitPx
          : chapter.id === "approach" ? approachPx : sectionHeightVh(chapter) * viewport / 100;
        const documentTop = offset;
        vi.spyOn(section, "getBoundingClientRect").mockReturnValue(new DOMRect(0, documentTop - restoredY, 390, height));
        track.appendChild(section); offset += height;
      }
      const actualDocumentScrollLimit = offset - viewport;
      const segments = measureScrollSegments(track, CHAPTERS, restoredY, viewport);
      for (const segment of segments) {
        expect(toScroll(segment.start, segments)).toBeCloseTo(segment.startPx, 8);
        expect(toVoyage(segment.startPx, segments)).toBeCloseTo(segment.start, 8);
        const navTarget = toScroll(segment.start + .001, segments);
        expect(navTarget).toBeGreaterThan(segment.startPx);
        expect(navTarget).toBeLessThan(segment.endPx);
      }
      expect(segments.at(-1)!.endPx).toBeCloseTo(actualDocumentScrollLimit, 8);
      expect(toVoyage(actualDocumentScrollLimit, segments)).toBe(1);
      expect(toScroll(1, segments)).toBeCloseTo(actualDocumentScrollLimit, 8);
    }
  }
});
it("reclassifies an exact measured boundary as the next chapter", () => {
  const track = document.createElement("main");
  const orbit = document.createElement("section"); orbit.id = "orbit";
  const worlds = document.createElement("section"); worlds.id = "worlds";
  track.append(orbit, worlds);
  vi.spyOn(orbit, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 200, 390, 4220));
  vi.spyOn(worlds, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 4420, 390, 1899));
  const segments = measureScrollSegments(track, CHAPTERS.filter(c => c.id === "orbit" || c.id === "worlds"), 100, 844);
  expect(toVoyage(4520, segments)).toBe(.34);
  expect(toScroll(.34, segments)).toBe(4520);
  expect(toScroll(.221, segments)).toBeCloseTo(300 + 4220 * (.001 / .12), 8);
});
