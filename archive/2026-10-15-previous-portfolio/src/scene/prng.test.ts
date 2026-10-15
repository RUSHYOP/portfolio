import { describe, it, expect } from "vitest";
import { mulberry32 } from "./prng";

describe("mulberry32", () => {
  it("produces an identical sequence for the same seed", () => {
    const a = mulberry32(1337);
    const b = mulberry32(1337);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces a different sequence for a different seed", () => {
    const a = mulberry32(1337);
    const b = mulberry32(4242);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).not.toEqual(seqB);
  });

  it("stays inside [0, 1) over a long run", () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
