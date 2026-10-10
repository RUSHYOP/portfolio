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
    expect(panel.querySelector("h2")).toBeNull();
    expect(panel.querySelector(".service-panel__outcomes")).toBeNull();
    expect(panel.querySelector(".service-panel__engagement")).toBeNull();
  });

  it("omits a heading when the CMS title contains only whitespace", () => {
    const { container } = render(<Services animated={false} services={[svc("a", { title: "  " })]} />);
    expect(panels(container)[0].querySelector("h2")).toBeNull();
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

  it.each([1, 6, 10])("keeps %i long services in authored order and natural page flow in every tier", count => {
    const items = Array.from({ length: count }, (_, i) => svc(String(i), {
      promise: `Promise ${i} ${"Full length content. ".repeat(35)}`,
      outcomes: [`Outcome ${i}a`, `Outcome ${i}b`], engagement: `Engagement ${i}`,
    }));
    for (const animated of [false, true]) {
      const { container, unmount } = render(<Services animated={animated} services={items} />);
      expect(container.querySelector<HTMLElement>("#approach")!.style.height).toBe("");
      expect(panels(container).map(p => p.querySelector("h2")!.textContent)).toEqual(items.map(i => i.title));
      for (const [i, panel] of panels(container).entries()) {
        expect(panel.hidden).toBe(false);
        expect(panel.hasAttribute("inert")).toBe(false);
        expect(panel.hasAttribute("data-solo-off")).toBe(false);
        expect(panel.querySelectorAll(".service-panel__promise")).toHaveLength(1);
        expect(panel.querySelector(".service-panel__engagement")!.textContent).toContain(`Engagement ${i}`);
      }
      unmount();
    }
  });
});
