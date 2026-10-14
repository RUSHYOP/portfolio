// @vitest-environment jsdom
// Only this file needs a DOM; the rest of the voyage suite stays on the global `node` env.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useReducedMotion } from "framer-motion";
import type { Item } from "@/lib/collections/defineCollection";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
import { ORBIT_WINDOW, ORBIT_HOLD_MOBILE, ORBIT_HOLD_DESKTOP } from "@/scene/chapters/orbitSchedule";
import Process from "./Process";

// useReducedMotion is mocked (default: motion allowed) so one test can flip it to true.
vi.mock("framer-motion", async (orig) => ({
  ...(await orig<typeof import("framer-motion")>()),
  useReducedMotion: vi.fn(() => false),
}));

beforeEach(() => {
  voyageStore.reset();
});

// vitest.config.mts has no `globals: true`, so RTL's auto-cleanup hook never registers.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals(); // drops any matchMedia stub (jsdom has none by default)
  vi.mocked(useReducedMotion).mockReturnValue(false);
});

const step = (id: string, extra: Record<string, unknown> = {}): Item =>
  ({
    id, order: 0, createdAt: "2026-01-01T00:00:00.000Z",
    title: `Title ${id}`, what: `What ${id}`, deliverable: `Deliverable ${id}`, duration: `Duration ${id}`,
    ...extra,
  }) as Item;
const four = () => ["a", "b", "c", "d"].map((id) => step(id));

const panels = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".process-panel"));
const cssVar = (el: HTMLElement, name: string) => Number(el.style.getPropertyValue(name));
const solos = (c: HTMLElement) => panels(c).map((p) => cssVar(p, "--solo"));

/** Orbit chapterProgress at the middle of step `i`'s slot (N steps share ORBIT_WINDOW). */
const centre = (i: number, n: number) =>
  ORBIT_WINDOW[0] + ((i + 0.5) / n) * (ORBIT_WINDOW[1] - ORBIT_WINDOW[0]);
const scrollToOrbit = (cp: number) => voyageStore.setScroll(progressAt("orbit", cp), 0);
const tabindexes = (c: HTMLElement) => panels(c).map((p) => p.getAttribute("tabindex"));

/** Stubs window.matchMedia so `(max-width: 767px)` reports `phone`; every other query is false. */
function stubViewport(phone: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: phone && query === "(max-width: 767px)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("Process", () => {
  it("renders a panel per step with its title and all three labelled fields", () => {
    const { container } = render(<Process animated steps={[step("a")]} />);
    const [panel] = panels(container);
    expect(panel.querySelector("h2")?.textContent).toBe("Title a");
    const fields = Array.from(panel.querySelectorAll(".process-panel__field"));
    expect(fields.map((f) => f.querySelector("span")?.textContent)).toEqual(["What happens", "What you get", "How long"]);
    expect(fields.map((f) => f.textContent)).toEqual([
      "What happensWhat a", "What you getDeliverable a", "How longDuration a",
    ]);
  });

  it("is data-driven in the number of steps", () => {
    const five = ["a", "b", "c", "d", "e"].map((id) => step(id));
    const { container } = render(<Process animated steps={five} />);
    expect(panels(container)).toHaveLength(5);
  });

  it("omits an empty field together with its label", () => {
    const { container } = render(
      <Process animated steps={[step("a", { deliverable: "", duration: "" })]} />,
    );
    const [panel] = panels(container);
    const labels = Array.from(panel.querySelectorAll(".process-panel__field span")).map((s) => s.textContent);
    expect(labels).toEqual(["What happens"]);
  });

  it("narrows non-string CMS values and renders no heading for a missing title", () => {
    const { container } = render(
      <Process animated steps={[step("a", { title: 42, what: null, deliverable: ["x"], duration: 7 })]} />,
    );
    const [panel] = panels(container);
    // An empty <h2> is an a11y violation, so a missing title renders no heading at all.
    expect(panel.querySelector("h2")).toBeNull();
    expect(panel.querySelector(".process-panel__field")).toBeNull();
  });

  it("labels the section, numbers the chapter, and hides the decorative ordinal", () => {
    const { container } = render(<Process animated steps={four()} />);
    const section = container.querySelector<HTMLElement>("#orbit")!;
    expect(section.getAttribute("aria-label")).toBe("Process");
    expect(section.querySelector(".chapter__label")?.textContent).toBe("04 / ORBIT");
    const idx = panels(container).map((p) => p.querySelector(".process-panel__index"));
    expect(idx.map((e) => e?.textContent)).toEqual(["01", "02", "03", "04"]);
    for (const e of idx) expect(e?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Process — one panel at a time", () => {
  it("shows exactly the step whose node is front-centre, at four scroll points", () => {
    const { container, rerender } = render(<Process animated steps={four()} />);
    for (let i = 0; i < 4; i++) {
      scrollToOrbit(centre(i, 4));
      rerender(<Process animated steps={four()} />);
      expect(solos(container)).toEqual([0, 1, 2, 3].map((j) => (j === i ? 1 : 0)));
      // The blur and the pointer events are gated on every panel that is not showing.
      panels(container).forEach((p, j) => {
        expect(p.getAttribute("data-solo-off")).toBe(j === i ? null : "true");
      });
    }
  });

  // Slice 4 browser review: no rest frame may hold two half-faded panels. The panel takes a 0/1
  // target and the CSS transition (voyage.css) is the cross-fade.
  it("switches panels at the middle of a step change, never resting on a mix", () => {
    const slot = (ORBIT_WINDOW[1] - ORBIT_WINDOW[0]) / 4;
    scrollToOrbit(ORBIT_WINDOW[0] + slot - 0.01 * slot); // just before boundary 0|1
    const { container, rerender } = render(<Process animated steps={four()} />);
    expect(solos(container)).toEqual([1, 0, 0, 0]);
    scrollToOrbit(ORBIT_WINDOW[0] + slot + 0.01 * slot); // just after it
    rerender(<Process animated steps={four()} />);
    expect(solos(container)).toEqual([0, 1, 0, 0]);
  });

  it("lights the first step from the chapter's first pixel (nav arrival at start + 0.001)", () => {
    voyageStore.setScroll(progressAt("orbit", 0) + 0.001, 0);
    const { container } = render(<Process animated steps={four()} />);
    expect(solos(container)).toEqual([1, 0, 0, 0]);
  });

  it("is dark before the chapter and after it", () => {
    for (const progress of [progressAt("approach", 0.5), progressAt("worlds", 0.5)]) {
      voyageStore.setScroll(progress, 0);
      const { container, unmount } = render(<Process animated steps={four()} />);
      expect(solos(container)).toEqual([0, 0, 0, 0]);
      for (const p of panels(container)) expect(p.getAttribute("data-solo-off")).toBe("true");
      unmount();
    }
  });

  // Inactive animated panels get tabindex -1, never none: Chrome 130+ makes an overflowing scroll
  // container an implicit tab stop, and a hidden (opacity 0) one must not be reachable that way.
  it("makes only the active panel keyboard-focusable (a scroll region needs a tab stop), and none outside Orbit", () => {
    scrollToOrbit(centre(2, 4));
    const first = render(<Process animated steps={four()} />);
    panels(first.container).forEach((p, j) => {
      expect(p.getAttribute("tabindex")).toBe(j === 2 ? "0" : "-1");
    });
    // Just past boundary 0|1 (0.1 of a slot): the panel that is transitioning out is not a
    // second tab stop.
    scrollToOrbit(ORBIT_WINDOW[0] + (1.1 / 4) * (ORBIT_WINDOW[1] - ORBIT_WINDOW[0]));
    first.rerender(<Process animated steps={four()} />);
    expect(panels(first.container).map((p) => p.getAttribute("tabindex"))).toEqual(["-1", "0", "-1", "-1"]);
    first.unmount();
    // Past the longest pin hold the last panel is still at full solo (it leaves with the pin),
    // but its pin has scrolled away, so it must not stay a tab stop (on any viewport).
    scrollToOrbit(ORBIT_HOLD_MOBILE + 0.05);
    const late = render(<Process animated steps={four()} />);
    expect(solos(late.container)).toEqual([0, 0, 0, 1]);
    expect(tabindexes(late.container)).toEqual(["-1", "-1", "-1", "-1"]);
    late.unmount();
    // Before and after Orbit every panel is off, so none is a tab stop (and none is left
    // behind off-screen for the browser to scroll back to).
    for (const progress of [progressAt("approach", 0.5), progressAt("worlds", 0.5)]) {
      voyageStore.setScroll(progress, 0);
      const out = render(<Process animated steps={four()} />);
      expect(tabindexes(out.container)).toEqual(["-1", "-1", "-1", "-1"]);
      out.unmount();
    }
  });

  // E4: the last step dwells through a phone's whole pin hold (to ORBIT_HOLD_MOBILE) — and once
  // Orbit is over nothing shows, even though stepTarget(last) is still 1 at the chapter's end.
  it("keeps the last step up through the mobile pin hold, and shows nothing once Orbit is over", () => {
    stubViewport(true); // the tab stop follows the phone pin, which holds until ORBIT_HOLD_MOBILE
    scrollToOrbit(ORBIT_HOLD_MOBILE - 0.01);
    const { container, unmount } = render(<Process animated steps={four()} />);
    expect(solos(container)).toEqual([0, 0, 0, 1]);
    expect(panels(container).map((p) => p.getAttribute("tabindex"))).toEqual(["-1", "-1", "-1", "0"]);
    unmount();
    voyageStore.setScroll(progressAt("worlds", 0.02), 0);
    const again = render(<Process animated steps={four()} />);
    expect(solos(again.container)).toEqual([0, 0, 0, 0]);
  });

  // Final review, Important 2: the pin releases at ORBIT_HOLD_DESKTOP on desktop and at
  // ORBIT_HOLD_MOBILE on a phone, so the last panel's tab stop must end at the matching bound.
  it("ends the last panel's tab stop at the desktop pin release on desktop", () => {
    stubViewport(false);
    scrollToOrbit(ORBIT_HOLD_DESKTOP + 0.01);
    const { container } = render(<Process animated steps={four()} />);
    expect(solos(container)).toEqual([0, 0, 0, 1]);          // still the active panel...
    expect(tabindexes(container)[3]).not.toBe("0");          // ...but its pin is scrolling away
  });

  it("keeps the last panel's tab stop to the mobile pin release on a phone", () => {
    stubViewport(true);
    scrollToOrbit(ORBIT_HOLD_DESKTOP + 0.01);
    const { container } = render(<Process animated steps={four()} />);
    expect(solos(container)).toEqual([0, 0, 0, 1]);
    expect(tabindexes(container)[3]).toBe("0");
  });

  it("keeps the last panel tabbable just before the desktop release, on both viewports", () => {
    for (const phone of [false, true]) {
      stubViewport(phone);
      scrollToOrbit(ORBIT_HOLD_DESKTOP - 0.01);
      const { container, unmount } = render(<Process animated steps={four()} />);
      expect(tabindexes(container)[3]).toBe("0");
      unmount();
    }
  });

  it("re-gates the tab stop when the viewport crosses the phone breakpoint", () => {
    let phone = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() { return phone && query === "(max-width: 767px)"; },
      media: query,
      addEventListener: (_: string, l: () => void) => listeners.add(l),
      removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    }));
    scrollToOrbit(ORBIT_HOLD_DESKTOP + 0.01);
    const { container, unmount } = render(<Process animated steps={four()} />);
    expect(tabindexes(container)[3]).toBe("-1");
    act(() => { phone = true; listeners.forEach((l) => l()); });
    expect(tabindexes(container)[3]).toBe("0");
    unmount();
    expect(listeners.size).toBe(0); // unsubscribed on unmount
  });

  it("gives a lone step the whole window", () => {
    scrollToOrbit(0.3);
    const { container } = render(<Process animated steps={[step("a")]} />);
    expect(solos(container)).toEqual([1]);
  });
});

describe("Process — empty and still", () => {
  it("keeps the 300vh section and its label with no steps at all", () => {
    const { container } = render(<Process animated steps={[]} />);
    const section = container.querySelector<HTMLElement>("#orbit");
    expect(section).not.toBeNull();
    // The scroll budget is structural: the ring and the rest of the voyage still need it.
    expect(section!.style.height).toBe("300vh");
    expect(section!.getAttribute("aria-label")).toBe("Process");
    expect(section!.querySelector(".chapter__label")?.textContent).toBe("04 / ORBIT");
    expect(panels(container)).toHaveLength(0);
    expect(container.querySelector(".process")).toBeNull();
  });

  it("renders every step stacked and fully visible when animation is off", () => {
    scrollToOrbit(0.01);                              // would be dark if animated
    const { container } = render(<Process animated={false} steps={four()} />);
    expect(container.querySelector("#orbit")?.getAttribute("data-static")).toBe("true");
    expect(container.querySelector<HTMLElement>("#orbit")!.style.height).toBe("300vh");
    expect(solos(container)).toEqual([1, 1, 1, 1]);
    for (const p of panels(container)) {
      expect(p.getAttribute("data-solo-off")).toBeNull();
      expect(p.getAttribute("tabindex")).toBeNull();
    }
  });

  it("does the same when the reader prefers reduced motion", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    scrollToOrbit(centre(0, 4));
    const { container } = render(<Process animated steps={four()} />);
    expect(container.querySelector("#orbit")?.getAttribute("data-static")).toBe("true");
    expect(solos(container)).toEqual([1, 1, 1, 1]);
  });

  it("is not static when animation is on", () => {
    const { container } = render(<Process animated steps={four()} />);
    expect(container.querySelector("#orbit")?.getAttribute("data-static")).toBeNull();
  });
});
