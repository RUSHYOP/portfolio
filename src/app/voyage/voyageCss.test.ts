import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// CSS has no other automated coverage. These pin the few declarations the Orbit behaviour depends on.
const css = readFileSync("src/app/voyage/voyage.css", "utf8");
const body = (selector: string) => {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `rule ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
};

describe("voyage.css — Orbit", () => {
  it("overlaps the step panels and drives each one's opacity from --solo", () => {
    const r = body(".process-panel");
    expect(r).toMatch(/position:\s*absolute/);
    expect(r).toMatch(/inset:\s*0/);
    expect(r).toMatch(/opacity:\s*var\(--solo\)/);
  });
  it("gates the blur and the pointer events on a panel that is not showing, prefixed property first", () => {
    const r = body('.process-panel[data-solo-off="true"]');
    const prefixed = r.indexOf("-webkit-backdrop-filter: none");
    const standard = r.search(/[^-]backdrop-filter: none/);
    expect(prefixed).toBeGreaterThan(-1);
    expect(standard).toBeGreaterThan(prefixed);
    expect(r).toMatch(/pointer-events:\s*none/);
  });
  it("gives the focusable panel a visible focus ring and stacks the still tier statically", () => {
    expect(body(".process-panel:focus-visible")).toMatch(/outline:\s*2px solid/);
    const still = body('.chapter--orbit[data-static="true"] .process-panel');
    expect(still).toMatch(/position:\s*static/);
    expect(still).toMatch(/opacity:\s*1/);
  });
});
