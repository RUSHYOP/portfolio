import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// CSS has no other automated coverage. These pin the few declarations the Orbit behaviour depends on.
const css = readFileSync("src/app/voyage/voyage.css", "utf8");
const body = (selector: string) => {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `rule ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
};

describe("voyage.css — Approach", () => {
  // The dock is a 0/1 trigger (servicesLayout.ts); this transition is the only thing that
  // animates it, staggered per panel by --dock-delay.
  it("animates the desktop dock with a transition delayed by --dock-delay", () => {
    const r = body(".service-panel");
    expect(r).toMatch(/transition:[^;]*opacity[^;]*var\(--dock-delay\b/);
    expect(r).toMatch(/transition:[^;]*transform[^;]*var\(--dock-delay\b/);
  });
  it("drops the transition where opacity is scrubbed or static (mobile --solo, still tier)", () => {
    const mobile = css.indexOf("\n  .service-panel {");
    expect(mobile, "mobile .service-panel rule").toBeGreaterThan(-1);
    expect(css.slice(mobile, css.indexOf("}", mobile))).toMatch(/transition:\s*none/);
    expect(body('.chapter--approach[data-static="true"] .service-panel')).toMatch(/transition:\s*none/);
  });
});

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
    // Still tier / reduced motion: no cross-fade animation either.
    expect(still).toMatch(/transition:\s*none/);
  });
  // --solo is a 0/1 target (orbitSchedule.stepTarget); this transition IS the cross-fade.
  it("cross-fades the step panels with a CSS transition on opacity and transform", () => {
    const r = body(".process-panel");
    expect(r).toMatch(/transition:[^;]*opacity/);
    expect(r).toMatch(/transition:[^;]*transform/);
  });
  // Late browser-review retunes: each one fixed a measured overflow, so they must not drift back.
  it("drops the last field's trailing margin (it alone pushed step 1 into a 5px internal scroll)", () => {
    expect(body(".process-panel__field:last-child")).toMatch(/margin-bottom:\s*0\s*;/);
  });
  it("caps the panel box at 23rem tall on desktop", () => {
    expect(body(".chapter--orbit")).toMatch(/--orbit-panel-h:\s*clamp\(\s*20rem,\s*48vh,\s*23rem\s*\)/);
  });
  it("caps the phone .process box at min(34vh, 18rem) so the star stays clear", () => {
    const mobile = css.indexOf("\n  .process {");
    expect(mobile, "mobile .process rule").toBeGreaterThan(-1);
    expect(css.slice(mobile, css.indexOf("}", mobile))).toMatch(/height:\s*min\(\s*34vh,\s*18rem\s*\)/);
  });
});

describe("voyage.css — Worlds", () => {
  // Desktop: the panels share ONE grid cell, so the box is as tall as the tallest panel and no
  // height has to be tuned; --solo (a 0/1 target, caseTarget) is each panel's opacity.
  it("stacks the case panels in one grid cell and drives each one's opacity from --solo", () => {
    expect(body(".worlds")).toMatch(/display:\s*grid/);
    const r = body(".world-panel");
    expect(r).toMatch(/grid-area:\s*1\s*\/\s*1/);
    expect(r).toMatch(/opacity:\s*var\(--solo\)/);
  });
  // --solo is a 0/1 target (worldsSchedule.caseTarget); this transition IS the cross-fade.
  it("cross-fades the panels with a CSS transition on opacity and transform", () => {
    const r = body(".world-panel");
    expect(r).toMatch(/transition:[^;]*opacity/);
    expect(r).toMatch(/transition:[^;]*transform/);
  });
  it("is not a scroll container: the panel clips (the excerpts are line-clamped), so the link is its only tab stop", () => {
    expect(body(".world-panel")).toMatch(/overflow:\s*hidden/);
    expect(body(".world-panel")).not.toMatch(/overflow(-y)?:\s*(auto|scroll)/);
    expect(body(".world-panel__col p")).toMatch(/-webkit-line-clamp:\s*\d+/);
  });
  it("gates the blur and the pointer events on a panel that is not showing, prefixed property first", () => {
    const r = body('.world-panel[data-solo-off="true"]');
    const prefixed = r.indexOf("-webkit-backdrop-filter: none");
    const standard = r.search(/[^-]backdrop-filter: none/);
    expect(prefixed).toBeGreaterThan(-1);
    expect(standard).toBeGreaterThan(prefixed);
    expect(r).toMatch(/pointer-events:\s*none/);
  });
  it("gives the link a visible focus ring", () => {
    expect(body(".world-panel__link:focus-visible")).toMatch(/outline:\s*2px solid/);
  });
  it("sizes the desktop panel to min(40rem, 44vw), so its right edge stays clear of the star at 1440 and 1024", () => {
    expect(body(".chapter--worlds")).toMatch(/--worlds-panel-w:\s*min\(\s*40rem,\s*44vw\s*\)/);
    expect(body(".worlds")).toMatch(/width:\s*var\(--worlds-panel-w\)/);
  });
  it("stacks every case statically in the still tier, with no transition", () => {
    const still = body('.chapter--worlds[data-static="true"] .world-panel');
    expect(still).toMatch(/position:\s*static/);
    expect(still).toMatch(/opacity:\s*1/);
    expect(still).toMatch(/transition:\s*none/);
    expect(body('.chapter--worlds[data-static="true"] .chapter__pin')).toMatch(/position:\s*static/);
  });
  // A4: a capped phone box like .process, so the star and the planet below it stay visible.
  it("caps the phone box at min(34vh, 18rem), clips it, clamps the excerpts to 2 lines and drops the chips and diagram", () => {
    // Every phone rule is read from the Worlds pin rule on, so the 768-1099px media block (which
    // also indents `.world-panel__col p`) cannot be mistaken for it.
    const pin = css.indexOf("\n  .chapter--worlds .chapter__pin {");
    expect(pin, "mobile Worlds pin rule").toBeGreaterThan(-1);
    expect(css.slice(pin, css.indexOf("}", pin))).toMatch(/height:\s*64vh/);
    const rule = (selector: string) => {
      const at = css.indexOf(`\n  ${selector} {`, pin);
      expect(at, `mobile ${selector} rule`).toBeGreaterThan(-1);
      return css.slice(at, css.indexOf("}", at));
    };
    expect(rule(".worlds")).toMatch(/height:\s*min\(\s*34vh,\s*18rem\s*\)/);
    expect(rule(".world-panel")).toMatch(/position:\s*absolute/);
    expect(rule(".world-panel__col p")).toMatch(/-webkit-line-clamp:\s*2\b/);
    expect(rule(".world-panel__foot")).toMatch(/display:\s*none/);
    // "Link kept" is DOM-covered (Worlds.test.tsx): the foot rule hides chips and diagram only.
  });

  // B-I1: on a short phone (the box is 34vh) the excerpt block must be what gives way, never the link.
  it("lets only the excerpt block shrink on a phone, so a short viewport clips text and never the case link", () => {
    const pin = css.indexOf("\n  .chapter--worlds .chapter__pin {");
    const rule = (selector: string) => {
      const at = css.indexOf(`\n  ${selector} {`, pin);
      expect(at, `mobile ${selector} rule`).toBeGreaterThan(-1);
      return css.slice(at, css.indexOf("}", at));
    };
    const cols = rule(".world-panel__cols");
    expect(cols).toMatch(/flex:\s*1 1 0/);
    expect(cols).toMatch(/min-height:\s*0/);
    expect(cols).toMatch(/overflow:\s*hidden/);
    expect(rule(".world-panel .world-panel__link")).not.toMatch(/flex-shrink:\s*[1-9]/);
    expect(rule(".world-panel__title")).toMatch(/-webkit-line-clamp:\s*2\b/);
  });
  it("keeps every panel child at its natural height (a flex column that overflows would shrink the clipped ones to nothing)", () => {
    expect(body(".world-panel > *")).toMatch(/flex-shrink:\s*0/);
  });
  it("keeps the phone context line to one row and the phone pin clear of the dock pill", () => {
    const pin = css.indexOf("\n  .chapter--worlds .chapter__pin {");
    expect(css.slice(pin, css.indexOf("}", pin))).toMatch(/padding-top:\s*4\.5rem/);
    const meta = css.indexOf("\n  .world-panel__meta {", pin);
    expect(meta, "mobile .world-panel__meta rule").toBeGreaterThan(-1);
    const rule = css.slice(meta, css.indexOf("}", meta));
    expect(rule).toMatch(/white-space:\s*nowrap/);
    expect(rule).toMatch(/overflow:\s*hidden/);
    expect(rule).toMatch(/text-overflow:\s*ellipsis/);
  });
  it("stacks the three excerpt columns between 768 and 1099px, where a 44vw panel is too narrow for three", () => {
    const at = css.indexOf("@media (min-width: 768px) and (max-width: 1099px) {");
    expect(at, "768-1099px block").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at));
    expect(block).toMatch(/\.world-panel__cols\s*{[^}]*grid-template-columns:\s*1fr/);
    expect(block).toMatch(/\.world-panel__col p\s*{[^}]*-webkit-line-clamp:\s*4/);
  });
  // B-M11: 12 chips x 40 characters would wrap to many rows and grow the panel past the 100vh pin.
  it("bounds the desktop stack chips to two rows, and lifts the bound in the still tier", () => {
    const r = body(".world-panel__stack");
    expect(r).toMatch(/max-height:\s*3\.6rem/);
    expect(r).toMatch(/overflow:\s*hidden/);
    expect(body('.chapter--worlds[data-static="true"] .world-panel__stack')).toMatch(/max-height:\s*none/);
  });
});
