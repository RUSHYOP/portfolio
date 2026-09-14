import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows max hits per window, then blocks with retryAfter, then resets", () => {
    let t = 0;
    const rl = createRateLimiter({ max: 2, windowMs: 1000, now: () => t });
    expect(rl.check("k")).toEqual({ allowed: true, retryAfterSec: 0 });
    expect(rl.check("k")).toEqual({ allowed: true, retryAfterSec: 0 });
    const blocked = rl.check("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
    t = 1001;
    expect(rl.check("k").allowed).toBe(true);
  });
  it("keys are independent", () => {
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: () => 0 });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });
});
