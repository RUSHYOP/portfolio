// @vitest-environment jsdom
// Only this file needs a DOM; the rest of the voyage suite stays on the global `node` env.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useReducedMotion } from "framer-motion";
import type { Item } from "@/lib/collections/defineCollection";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
import { ORBIT_WINDOW, ORBIT_HOLD_MOBILE } from "@/scene/chapters/orbitSchedule";
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

  it("cross-fades two neighbours through the middle of a step change", () => {
    scrollToOrbit(ORBIT_WINDOW[0] + (1 / 4) * (ORBIT_WINDOW[1] - ORBIT_WINDOW[0])); // boundary 0|1
    const { container } = render(<Process animated steps={four()} />);
    const s = solos(container);
    expect(s[0]).toBeCloseTo(0.5, 6);
    expect(s[1]).toBeCloseTo(0.5, 6);
    expect(s[2]).toBe(0);
    expect(s[3]).toBe(0);
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

  it("makes only the active panel keyboard-focusable (a scroll region needs a tab stop), and none outside Orbit", () => {
    scrollToOrbit(centre(2, 4));
    const first = render(<Process animated steps={four()} />);
    panels(first.container).forEach((p, j) => {
      expect(p.getAttribute("tabindex")).toBe(j === 2 ? "0" : null);
    });
    // Mid cross-fade (0.1 of a slot past boundary 0|1: panel 1 ≈ 93% up, panel 0 ≈ 7%): the
    // fading-out panel is not a second tab stop.
    scrollToOrbit(ORBIT_WINDOW[0] + (1.1 / 4) * (ORBIT_WINDOW[1] - ORBIT_WINDOW[0]));
    first.rerender(<Process animated steps={four()} />);
    expect(panels(first.container).map((p) => p.getAttribute("tabindex"))).toEqual([null, "0", null, null]);
    first.unmount();
    // Past the longest pin hold the last panel is still at full solo (it leaves with the pin),
    // but its pin has scrolled away, so it must not stay a tab stop.
    scrollToOrbit(ORBIT_HOLD_MOBILE + 0.05);
    const late = render(<Process animated steps={four()} />);
    expect(solos(late.container)).toEqual([0, 0, 0, 1]);
    for (const p of panels(late.container)) expect(p.getAttribute("tabindex")).toBeNull();
    late.unmount();
    // Before and after Orbit every panel is off, so none is a tab stop (and none is left
    // behind off-screen for the browser to scroll back to).
    for (const progress of [progressAt("approach", 0.5), progressAt("worlds", 0.5)]) {
      voyageStore.setScroll(progress, 0);
      const out = render(<Process animated steps={four()} />);
      for (const p of panels(out.container)) expect(p.getAttribute("tabindex")).toBeNull();
      out.unmount();
    }
  });

  // E4: the last step dwells through a phone's whole pin hold (to ORBIT_HOLD_MOBILE) — and once
  // Orbit is over nothing shows, even though stepSolo(last) is still 1 at the chapter's end.
  it("keeps the last step up through the mobile pin hold, and shows nothing once Orbit is over", () => {
    scrollToOrbit(ORBIT_HOLD_MOBILE - 0.01);
    const { container, unmount } = render(<Process animated steps={four()} />);
    expect(solos(container)).toEqual([0, 0, 0, 1]);
    expect(panels(container).map((p) => p.getAttribute("tabindex"))).toEqual([null, null, null, "0"]);
    unmount();
    voyageStore.setScroll(progressAt("worlds", 0.02), 0);
    const again = render(<Process animated steps={four()} />);
    expect(solos(again.container)).toEqual([0, 0, 0, 0]);
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
