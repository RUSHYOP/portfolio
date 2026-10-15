import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Lenis needs a real DOM and rAF, so it is not unit-testable here. This pins the one option the
// Orbit/Approach panels depend on at source level (final review, Important 1).
const src = readFileSync("src/scene/scroll/VoyageScroll.tsx", "utf8");

describe("VoyageScroll — Lenis options", () => {
  // lenis 1.3.26 defaults allowNestedScroll to false and then preventDefault()s every wheel event,
  // so a scrollable .process-panel could never take the wheel.
  it("lets a nested scrollable element (a long .process-panel) take the wheel", () => {
    const options = src.match(/new Lenis\(\{([^}]*)\}\)/);
    expect(options, "new Lenis({...}) call").not.toBeNull();
    expect(options![1]).toMatch(/\ballowNestedScroll:\s*true\b/);
  });
});
