// @vitest-environment jsdom
// Only this file needs a DOM; the rest of the voyage suite stays on the global `node` env.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import type { Item } from "@/lib/collections/defineCollection";
import { voyageStore } from "@/scene/scroll/voyageStore";
import Services from "./Services";

beforeEach(() => {
  // framer-motion's useReducedMotion reads window.matchMedia, which jsdom does not implement.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
  voyageStore.reset();
});

// vitest.config.mts has no `globals: true`, so RTL's auto-cleanup hook never registers.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const svc = (id: string, extra: Record<string, unknown> = {}): Item =>
  ({ id, order: 0, createdAt: "2026-01-01T00:00:00.000Z", title: `Title ${id}`, promise: `Promise ${id}`, ...extra }) as Item;

const panels = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".service-panel"));
const cssVar = (el: HTMLElement, name: string) => Number(el.style.getPropertyValue(name));

describe("Services", () => {
  it("renders one panel per service, with outcomes and the engagement line", () => {
    const { container } = render(
      <Services animated services={[svc("a", { outcomes: ["Ship it", "Own it"], engagement: "6–10 weeks" })]} />,
    );
    const [panel] = panels(container);
    expect(panel).toBeDefined();
    expect(panel.querySelector("h2")?.textContent).toBe("Title a");
    expect(panel.textContent).toContain("Promise a");
    expect(panel.querySelectorAll(".service-panel__outcomes li")).toHaveLength(2);
    expect(panel.textContent).toContain("6–10 weeks");
  });

  it("is data-driven in the number of services", () => {
    const five = ["a", "b", "c", "d", "e"].map((id) => svc(id));
    const { container } = render(<Services animated services={five} />);
    expect(panels(container)).toHaveLength(5);
  });

  it("renders the optional fields' empty states", () => {
    const { container } = render(
      <Services animated services={[svc("a", { outcomes: [], engagement: "" })]} />,
    );
    const [panel] = panels(container);
    expect(panel.querySelector(".service-panel__outcomes")).toBeNull();
    expect(panel.querySelector(".service-panel__engagement")).toBeNull();
  });

  it("narrows non-string and non-array values from the CMS", () => {
    const { container } = render(
      <Services animated services={[svc("a", { title: 42, promise: null, outcomes: "nope", engagement: 7 })]} />,
    );
    const [panel] = panels(container);
    expect(panel.querySelector("h2")?.textContent).toBe("");
    expect(panel.querySelector(".service-panel__outcomes")).toBeNull();
    expect(panel.querySelector(".service-panel__engagement")).toBeNull();
  });

  it("still renders the section at full height with no services at all", () => {
    const { container } = render(<Services animated services={[]} />);
    const section = container.querySelector<HTMLElement>("#approach");
    expect(section).not.toBeNull();
    // 150vh: the chapter's scroll budget is structural and must survive an empty CMS.
    expect(section!.style.height).toBe("150vh");
    expect(section!.getAttribute("aria-label")).toBe("Services");
    expect(panels(container)).toHaveLength(0);
  });

  it("renders every panel fully visible when animation is off", () => {
    const { container } = render(
      <Services animated={false} services={[svc("a"), svc("b"), svc("c")]} />,
    );
    expect(container.querySelector("#approach")?.getAttribute("data-static")).toBe("true");
    for (const panel of panels(container)) {
      expect(cssVar(panel, "--dock")).toBe(1);
      expect(cssVar(panel, "--solo")).toBe(1);
    }
  });

  it("drives the panels from scroll position when animation is on", () => {
    // chapterProgress 1/3 — the last frame the 100vh pin is stationary.
    voyageStore.setScroll(0.12, 0);
    const { container } = render(
      <Services animated services={[svc("a"), svc("b"), svc("c")]} />,
    );
    expect(container.querySelector("#approach")?.getAttribute("data-static")).toBeNull();
    for (const panel of panels(container)) expect(cssVar(panel, "--dock")).toBe(1);
    // Mobile: only the middle panel is up at this point.
    expect(panels(container).map((p) => cssVar(p, "--solo"))).toEqual([0, 1, 0]);
  });

  it("keeps the panels dark before the chapter is reached", () => {
    voyageStore.setScroll(0.01, 0);
    const { container } = render(<Services animated services={[svc("a")]} />);
    expect(cssVar(panels(container)[0], "--dock")).toBe(0);
    // Fix pass 1: the lone mobile panel is dark too (it used to sit at --solo 0.573 here),
    // and flagged off so the CSS drops its blur and pointer events.
    expect(cssVar(panels(container)[0], "--solo")).toBe(0);
    expect(panels(container)[0].getAttribute("data-solo-off")).toBe("true");
  });

  it("marks the panels the mobile replacement has faded out, so the CSS can drop their blur", () => {
    // opacity: 0 does not skip a backdrop-filter, so the invisible panels need their own
    // hook. Same scroll position as the --solo test above: solos are [0, 1, 0].
    voyageStore.setScroll(0.12, 0);
    const { container } = render(
      <Services animated services={[svc("a"), svc("b"), svc("c")]} />,
    );
    const [first, middle, last] = panels(container);
    expect(first.getAttribute("data-solo-off")).toBe("true");
    expect(middle.getAttribute("data-solo-off")).toBeNull();
    expect(last.getAttribute("data-solo-off")).toBe("true");
  });
});
