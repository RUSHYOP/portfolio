import { describe, it, expect } from "vitest";
import { CHAPTERS, CONTENT_CHAPTERS, chapterAt } from "@/scene/camera/flightPath";
import { chapterForHash, hashArrivalProgress, HASH_ARRIVAL_EPS } from "./chapterHash";

describe("chapterForHash", () => {
  it("names every content chapter by its section id, with or without the leading #", () => {
    for (const c of CONTENT_CHAPTERS) {
      expect(chapterForHash(`#${c.id}`)).toBe(c.id);
      expect(chapterForHash(c.id)).toBe(c.id);
    }
    expect(chapterForHash("#worlds")).toBe("worlds");
  });

  it("is null for micro-beats (no pin, nothing to land on), unknown ids and empty hashes", () => {
    for (const hash of ["#jump", "#passage", "#nope", "#", "", "#worlds-extra", "#worlds?x=1", "#Worlds", "# worlds", "#worlds#again"]) {
      expect(chapterForHash(hash), hash).toBeNull();
    }
  });

  it("decodes a percent-encoded id and never throws on a malformed one", () => {
    expect(chapterForHash("#%77orlds")).toBe("worlds");
    expect(chapterForHash("#%E0%A4%A")).toBeNull();
    expect(chapterForHash("#%")).toBeNull();
  });

  it("is null for anything that is not a string", () => {
    expect(chapterForHash(undefined as unknown as string)).toBeNull();
    expect(chapterForHash(null as unknown as string)).toBeNull();
  });
});

describe("hashArrivalProgress", () => {
  it("is the chapter's start plus the same 0.001 every dock, rail and CTA arrival uses", () => {
    const worlds = CHAPTERS.find((c) => c.id === "worlds")!;
    expect(HASH_ARRIVAL_EPS).toBe(0.001);
    expect(hashArrivalProgress("#worlds")).toBe(worlds.start + 0.001);
  });

  it("lands inside the named chapter, for every content chapter", () => {
    for (const c of CONTENT_CHAPTERS) {
      const p = hashArrivalProgress(`#${c.id}`)!;
      expect(chapterAt(p).chapter.id).toBe(c.id);
    }
  });

  it("is null wherever chapterForHash is", () => {
    for (const hash of ["", "#", "#jump", "#nope"]) expect(hashArrivalProgress(hash)).toBeNull();
  });
});
