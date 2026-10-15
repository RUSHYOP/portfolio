import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";
import { SLUG_RE } from "@/lib/collections/fieldSpec";

describe("slugify", () => {
  it("lowercases, replaces separators, strips symbols and collapses hyphens", () => {
    expect(slugify("  PulseAI: Heart-Health  Monitor!! ")).toBe("pulseai-heart-health-monitor");
    expect(slugify("Ça va — très bien")).toBe("ca-va-tres-bien");
    expect(slugify("---a---")).toBe("a");
  });
  it("always yields a valid slug or empty string", () => {
    for (const s of ["Hello World", "x", "!!!", "A  B"]) {
      const out = slugify(s);
      expect(out === "" || SLUG_RE.test(out)).toBe(true);
    }
  });
  // Added beyond the brief: the 80-char cap must not leave a trailing hyphen at the boundary.
  it("caps length without producing a trailing hyphen", () => {
    const long = `${"a".repeat(79)} tail`; // char 80 becomes the separator hyphen
    const out = slugify(long);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(SLUG_RE.test(out)).toBe(true);
    expect(out).toBe("a".repeat(79));
  });
});
