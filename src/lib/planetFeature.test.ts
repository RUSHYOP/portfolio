import { describe, it, expect } from "vitest";
import { PLANET_FEATURES } from "./collections/specs/caseStudies";
import { toPlanetFeature } from "./planetFeature";

describe("toPlanetFeature", () => {
  it("accepts every option the CMS select offers, so the type and the select cannot drift", () => {
    expect(PLANET_FEATURES.map((o) => o.value)).toEqual(["none", "ring", "moon", "storm"]);
    for (const o of PLANET_FEATURES) expect(toPlanetFeature(o.value)).toBe(o.value);
  });

  it("treats anything else as none: unknown strings, other types, nullish values", () => {
    for (const v of ["", "Ring", "rings", "comet", " ring", 3, null, undefined, {}, ["ring"], true]) {
      expect(toPlanetFeature(v)).toBe("none");
    }
  });
});
