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

  it.each([6, 10])("keeps %i animated records in a readable strip", count => {
    const records = Array.from({ length: count }, (_, i) => svc(String(i), {
      promise: "P".repeat(200), outcomes: Array(4).fill("O".repeat(80)), engagement: "E".repeat(120),
    }));
    const { container } = render(<Services animated services={records} />);
    expect(panels(container)).toHaveLength(count);
    expect(container.querySelector("#approach")?.getAttribute("data-static")).toBeNull();
    expect(container.querySelector("#approach")?.getAttribute("data-many")).toBe("true");
    expect(container.querySelector<HTMLElement>("#approach")?.style.height).toBe("150vh");
    expect(container.querySelector(".services")?.getAttribute("role")).toBe("region");
    expect(container.querySelector(".services")?.getAttribute("tabindex")).toBe("0");
    for (const [i, panel] of panels(container).entries()) {
      expect(panel.querySelector("h2")?.textContent).toBe(`Title ${i}`);
      expect(cssVar(panel, "--dock")).toBe(1);
      expect(panel.getAttribute("data-solo-off")).toBeNull();
      expect(panel.getAttribute("tabindex")).toBe("0");
    }
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
    expect(panel.querySelector("h2")).toBeNull();
    expect(panel.querySelector(".service-panel__outcomes")).toBeNull();
    expect(panel.querySelector(".service-panel__engagement")).toBeNull();
  });

  it("omits a heading when the CMS title contains only whitespace", () => {
    const { container } = render(<Services animated={false} services={[svc("a", { title: "  " })]} />);
    expect(panels(container)[0].querySelector("h2")).toBeNull();
  });

  it("still renders the section with no services at all", () => {
    const { container } = render(<Services animated services={[]} />);
    const section = container.querySelector<HTMLElement>("#approach");
    expect(section).not.toBeNull();
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
    expect(first.getAttribute("tabindex")).toBe("0");
    expect(middle.getAttribute("tabindex")).toBe("0");
  });

  it("keeps static panels reachable for keyboard scrolling", () => {
    const { container } = render(<Services animated={false} services={[svc("a"), svc("b")]} />);
    for (const panel of panels(container)) {
      expect(panel.getAttribute("tabindex")).toBe("0");
    }
    expect(container.querySelector(".chapter__pin")?.getAttribute("tabindex")).toBe("0");
  });

  it("renders all six maximum-length still records in intrinsic flow", () => {
    const long = Array.from({ length: 6 }, (_, i) => svc(String(i), {
      title: `Service ${i} ${"T".repeat(110)}`,
      promise: "P".repeat(200),
      outcomes: Array.from({ length: 4 }, (_, j) => `${j} ${"O".repeat(78)}`),
      engagement: "E".repeat(120),
    }));
    const { container } = render(<Services animated={false} services={long} />);
    const section = container.querySelector<HTMLElement>("#approach")!;
    expect(section.style.height).toBe("");
    expect(section.style.minHeight).toBe("");
    expect(section.getAttribute("data-static")).toBe("true");
    expect(panels(container)).toHaveLength(6);
    for (const [i, panel] of panels(container).entries()) {
      expect(panel.querySelector("h2")?.textContent).toBe(long[i].title);
      expect(panel.querySelectorAll(".service-panel__outcomes li")).toHaveLength(4);
      expect(panel.getAttribute("hidden")).toBeNull();
      expect(panel.getAttribute("inert")).toBeNull();
      expect(panel.getAttribute("data-solo-off")).toBeNull();
    }
  });
});
