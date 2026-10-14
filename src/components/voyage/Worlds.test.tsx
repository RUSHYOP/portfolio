// @vitest-environment jsdom
// Only this file needs a DOM; the rest of the voyage suite stays on the global `node` env.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useReducedMotion } from "framer-motion";
import type { WorldCase } from "@/lib/worldCase";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { CHAPTERS, progressAt } from "@/scene/camera/flightPath";
import { WORLDS_WINDOW, WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE, caseCentre } from "@/scene/chapters/worldsSchedule";
import Worlds from "./Worlds";

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

const world = (id: string, extra: Partial<WorldCase> = {}): WorldCase => ({
  id,
  slug: `slug-${id}`,
  title: `Title ${id}`,
  client: `Client ${id}`,
  context: `Context ${id}`,
  stack: ["Go", "Kafka"],
  diagram: "",
  planetFeature: "ring",
  excerpts: { problem: `Problem ${id}`, architecture: `Architecture ${id}`, outcome: `Outcome ${id}` },
  ...extra,
});
const three = () => ["a", "b", "c"].map((id) => world(id));

const panels = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".world-panel"));
const cssVar = (el: HTMLElement, name: string) => Number(el.style.getPropertyValue(name));
const solos = (c: HTMLElement) => panels(c).map((p) => cssVar(p, "--solo"));
const links = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLAnchorElement>(".world-panel__link"));
const tabindexes = (c: HTMLElement) => links(c).map((a) => a.getAttribute("tabindex"));
const scrollToWorlds = (cp: number) => voyageStore.setScroll(progressAt("worlds", cp), 0);
const [W0, W1] = WORLDS_WINDOW;

/** Stubs window.matchMedia so `(max-width: 767px)` reports `phone`; every other query is false. */
function stubViewport(phone: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: phone && query === "(max-width: 767px)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("Worlds", () => {
  it("renders a panel per case with its ordinal, title, meta line, three excerpt columns and stack", () => {
    const { container } = render(<Worlds animated cases={[world("a")]} />);
    const [panel] = panels(container);
    expect(panel.querySelector(".world-panel__index")?.textContent).toBe("CASE 01");
    expect(panel.querySelector("h2")?.textContent).toBe("Title a");
    expect(panel.querySelector(".world-panel__meta")?.textContent).toBe("Client a · Context a");
    const cols = Array.from(panel.querySelectorAll(".world-panel__col"));
    expect(cols.map((c) => c.querySelector("span")?.textContent)).toEqual(["Problem", "Architecture", "Outcome"]);
    expect(cols.map((c) => c.querySelector("p")?.textContent)).toEqual(["Problem a", "Architecture a", "Outcome a"]);
    expect(Array.from(panel.querySelectorAll(".world-panel__stack li")).map((li) => li.textContent)).toEqual(["Go", "Kafka"]);
  });

  it("is data-driven in the number of cases", () => {
    const five = ["a", "b", "c", "d", "e"].map((id) => world(id));
    const { container } = render(<Worlds animated cases={five} />);
    expect(panels(container)).toHaveLength(5);
    expect(panels(container).map((p) => p.querySelector(".world-panel__index")?.textContent)).toEqual([
      "CASE 01", "CASE 02", "CASE 03", "CASE 04", "CASE 05",
    ]);
  });

  it("labels the section, numbers the chapter, owns id=\"worlds\" and hides the decorative ordinal", () => {
    const { container } = render(<Worlds animated cases={three()} />);
    const section = container.querySelector<HTMLElement>("section#worlds")!;
    expect(section.getAttribute("aria-label")).toBe("Work");
    expect(section.querySelector(".chapter__label")?.textContent).toBe("05 / WORLDS");
    expect(section.style.height).toBe("450vh");
    for (const p of panels(container)) expect(p.querySelector(".world-panel__index")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("links each panel to /work/<slug>, with an accessible name that tells the three apart", () => {
    const { container } = render(<Worlds animated cases={three()} />);
    expect(links(container).map((a) => a.getAttribute("href"))).toEqual(["/work/slug-a", "/work/slug-b", "/work/slug-c"]);
    expect(links(container).map((a) => a.getAttribute("aria-label"))).toEqual([
      "Read the case study: Title a", "Read the case study: Title b", "Read the case study: Title c",
    ]);
    expect(links(container)[0].textContent).toContain("Read the case study");
  });

  it("omits an empty excerpt together with its label, and the whole row when all three are empty", () => {
    const { container, rerender } = render(
      <Worlds animated cases={[world("a", { excerpts: { problem: "", architecture: "Only this", outcome: "" } })]} />,
    );
    expect(Array.from(container.querySelectorAll(".world-panel__col span")).map((s) => s.textContent)).toEqual(["Architecture"]);
    rerender(<Worlds animated cases={[world("a", { excerpts: { problem: "", architecture: "", outcome: "" } })]} />);
    expect(container.querySelector(".world-panel__cols")).toBeNull();
  });

  it("narrows non-string CMS values: no heading for a missing title, no link without a slug, nothing thrown", () => {
    const bad = world("a", {
      title: 42 as unknown as string, slug: null as unknown as string, client: ["x"] as unknown as string,
      context: undefined as unknown as string, stack: ["Go", 3, null] as unknown as string[], diagram: false as unknown as string,
      excerpts: null as unknown as WorldCase["excerpts"],
    });
    const { container } = render(<Worlds animated cases={[bad]} />);
    const [panel] = panels(container);
    // An empty <h2> is an a11y violation, so a missing title renders no heading at all.
    expect(panel.querySelector("h2")).toBeNull();
    expect(panel.querySelector(".world-panel__meta")).toBeNull();
    expect(panel.querySelector(".world-panel__cols")).toBeNull();
    expect(panel.querySelector("a")).toBeNull();
    expect(Array.from(panel.querySelectorAll(".world-panel__stack li")).map((li) => li.textContent)).toEqual(["Go"]);
    expect(panel.querySelector("img")).toBeNull();
  });

  // M3 (final review): `title !== ""` rendered a blank <h2> for "   " (a direct DB write can skip the API's trim).
  it("treats a whitespace-only title, client and context as missing, and trims the ones it renders", () => {
    const blank = world("a", { title: "   ", client: " \t", context: "\n ", slug: "a" });
    const { container, rerender } = render(<Worlds animated cases={[blank]} />);
    const [panel] = panels(container);
    expect(panel.querySelector("h2")).toBeNull();
    expect(panel.querySelector(".world-panel__meta")).toBeNull();
    expect(panel.querySelector("a")?.getAttribute("aria-label")).toBeNull();      // no title, so no title in the label either
    rerender(<Worlds animated cases={[world("a", { title: "  Ledger  ", client: " Acme ", context: " Payments " })]} />);
    expect(container.querySelector("h2")?.textContent).toBe("Ledger");
    expect(container.querySelector(".world-panel__meta")?.textContent).toBe("Acme · Payments");
  });

  it("encodes the slug in the href so a hostile value cannot leave /work/", () => {
    const { container } = render(<Worlds animated cases={[world("a", { slug: "a/../b?x=1#h" })]} />);
    expect(links(container)[0].getAttribute("href")).toBe("/work/a%2F..%2Fb%3Fx%3D1%23h");
  });

  it("shows the diagram thumbnail only when the case has one, as a decorative image", () => {
    const { container } = render(<Worlds animated cases={[world("a", { diagram: "/api/media/abc" }), world("b")]} />);
    const [a, b] = panels(container);
    expect(a.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(a.querySelector("img")?.getAttribute("src")).toContain("/api/media/abc");
    expect(b.querySelector("img")).toBeNull();
  });
});

describe("Worlds — empty state (D4)", () => {
  it("keeps the section and its label, says one quiet line, and renders no panels", () => {
    const { container } = render(<Worlds animated cases={[]} />);
    const section = container.querySelector<HTMLElement>("section#worlds")!;
    expect(section.style.height).toBe("450vh");
    expect(section.querySelector(".chapter__label")?.textContent).toBe("05 / WORLDS");
    expect(section.querySelector(".worlds-empty")?.textContent).toBe("Case studies are being written up.");
    expect(panels(container)).toHaveLength(0);
  });
});

describe("Worlds — one panel at a time", () => {
  it("shows exactly the case whose planet is in frame, at each slot centre", () => {
    const { container, rerender } = render(<Worlds animated cases={three()} />);
    for (let i = 0; i < 3; i++) {
      scrollToWorlds(caseCentre(i, 3));
      rerender(<Worlds animated cases={three()} />);
      expect(solos(container)).toEqual([0, 1, 2].map((j) => (j === i ? 1 : 0)));
      // The blur and the pointer events are gated on every panel that is not showing.
      panels(container).forEach((p, j) => expect(p.getAttribute("data-solo-off")).toBe(j === i ? null : "true"));
    }
  });

  // The panel takes a 0/1 target and the CSS transition (voyage.css) is the cross-fade, so no
  // scroll position can rest on a mix of two panels.
  it("switches panels at the middle of a case change, never resting on a mix", () => {
    const slot = (W1 - W0) / 3;
    scrollToWorlds(W0 + slot - 0.01 * slot);
    const { container, rerender } = render(<Worlds animated cases={three()} />);
    expect(solos(container)).toEqual([1, 0, 0]);
    scrollToWorlds(W0 + slot + 0.01 * slot);
    rerender(<Worlds animated cases={three()} />);
    expect(solos(container)).toEqual([0, 1, 0]);
  });

  it("lights the first case from the chapter's first pixel (nav arrival at start + 0.001 of absolute progress)", () => {
    const worlds = CHAPTERS.find((c) => c.id === "worlds")!;
    voyageStore.setScroll(worlds.start + 0.001, 0);
    expect(voyageStore.getState().chapter.id).toBe("worlds");
    const { container } = render(<Worlds animated cases={three()} />);
    expect(solos(container)).toEqual([1, 0, 0]);
  });

  it("is dark before the chapter and after it", () => {
    for (const progress of [progressAt("orbit", 0.5), progressAt("belt", 0.5)]) {
      voyageStore.setScroll(progress, 0);
      const { container, unmount } = render(<Worlds animated cases={three()} />);
      expect(solos(container)).toEqual([0, 0, 0]);
      for (const p of panels(container)) expect(p.getAttribute("data-solo-off")).toBe("true");
      unmount();
    }
  });

  it("keeps the last case up through the mobile pin hold, and shows nothing once Worlds is over", () => {
    scrollToWorlds(WORLDS_HOLD_MOBILE - 0.01);
    const { container, unmount } = render(<Worlds animated cases={three()} />);
    expect(solos(container)).toEqual([0, 0, 1]);
    unmount();
    voyageStore.setScroll(progressAt("belt", 0.02), 0);
    const again = render(<Worlds animated cases={three()} />);
    expect(solos(again.container)).toEqual([0, 0, 0]);
  });
});

// The panels are not scroll containers (overflow hidden, line-clamped excerpts), so the link is
// each panel's ONLY tab stop. Inactive animated links get tabindex -1, never none.
describe("Worlds — tab stops", () => {
  it("makes only the active panel's link focusable, and none outside Worlds", () => {
    scrollToWorlds(caseCentre(2, 3));
    const first = render(<Worlds animated cases={three()} />);
    expect(tabindexes(first.container)).toEqual(["-1", "-1", "0"]);
    // Just past boundary 0|1 (0.1 of a slot): the panel transitioning out is not a second tab stop.
    scrollToWorlds(W0 + (1.1 / 3) * (W1 - W0));
    first.rerender(<Worlds animated cases={three()} />);
    expect(tabindexes(first.container)).toEqual(["-1", "0", "-1"]);
    first.unmount();
    for (const progress of [progressAt("orbit", 0.5), progressAt("belt", 0.5)]) {
      voyageStore.setScroll(progress, 0);
      const out = render(<Worlds animated cases={three()} />);
      expect(tabindexes(out.container)).toEqual(["-1", "-1", "-1"]);
      out.unmount();
    }
  });

  it("ends the last link's tab stop at the pin release that matches the viewport", () => {
    // Desktop: the pin releases at WORLDS_HOLD_DESKTOP — past it the page is scrolling the panel away.
    stubViewport(false);
    scrollToWorlds(WORLDS_HOLD_DESKTOP + 0.01);
    const desktop = render(<Worlds animated cases={three()} />);
    expect(solos(desktop.container)).toEqual([0, 0, 1]);          // still the active panel...
    expect(tabindexes(desktop.container)).toEqual(["-1", "-1", "-1"]); // ...but its pin is scrolling away
    desktop.unmount();
    // Phone: the pin holds longer, so the same position is still a live tab stop.
    stubViewport(true);
    const phone = render(<Worlds animated cases={three()} />);
    expect(tabindexes(phone.container)).toEqual(["-1", "-1", "0"]);
    phone.unmount();
    scrollToWorlds(WORLDS_HOLD_MOBILE + 0.01);
    const late = render(<Worlds animated cases={three()} />);
    expect(tabindexes(late.container)).toEqual(["-1", "-1", "-1"]);
  });
});

// A keyboard user can Tab onto the active link and then scroll (arrow keys, Space) on to the next
// case: that link turns tabindex -1 and its panel opacity 0 / pointer-events none, but it would
// stay focused — Enter would open a case that is not on screen. The panel that goes inactive
// gives its focus up.
describe("Worlds — focus follows the lit case", () => {
  it("blurs a focused link when its panel goes inactive, and leaves the new active panel's link alone", () => {
    scrollToWorlds(caseCentre(0, 3));
    const { container, rerender } = render(<Worlds animated cases={three()} />);
    const [first, second] = links(container);
    first.focus();
    expect(document.activeElement).toBe(first);
    scrollToWorlds(caseCentre(0, 3) + 0.01);                       // still case 1: focus stays
    rerender(<Worlds animated cases={three()} />);
    expect(document.activeElement).toBe(first);
    scrollToWorlds(caseCentre(1, 3));                              // case 2 takes over
    rerender(<Worlds animated cases={three()} />);
    expect(document.activeElement).not.toBe(first);
    expect(document.activeElement).toBe(document.body);
    second.focus();                                                // the now-active link can take focus again
    expect(document.activeElement).toBe(second);
    rerender(<Worlds animated cases={three()} />);
    expect(document.activeElement).toBe(second);
  });

  it("blurs a focused link when Worlds is left behind, and never steals focus from outside the panels", () => {
    scrollToWorlds(caseCentre(2, 3));
    const { container, rerender } = render(<Worlds animated cases={three()} />);
    links(container)[2].focus();
    voyageStore.setScroll(progressAt("belt", 0.5), 0);
    rerender(<Worlds animated cases={three()} />);
    expect(document.activeElement).toBe(document.body);
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    scrollToWorlds(caseCentre(1, 3));
    rerender(<Worlds animated cases={three()} />);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});

describe("Worlds — still tier", () => {
  it("stacks every case fully visible, with every link in the normal tab order, when not animated", () => {
    const { container } = render(<Worlds animated={false} cases={[world("a", { diagram: "/a.svg" }), world("b"), world("c")]} />);
    expect(container.querySelector("section#worlds")?.getAttribute("data-static")).toBe("true");
    expect(solos(container)).toEqual([1, 1, 1]);
    for (const p of panels(container)) expect(p.getAttribute("data-solo-off")).toBeNull();
    expect(links(container).map((a) => a.hasAttribute("tabindex"))).toEqual([false, false, false]);
    expect(container.querySelector(".world-panel img")).not.toBeNull();   // the diagram is shown
    expect(container.querySelector("section#worlds")?.getAttribute("style")).toContain("height: 450vh");
  });

  it("does the same for reduced motion, whatever the scroll position", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    scrollToWorlds(caseCentre(0, 3));
    const { container } = render(<Worlds animated cases={three()} />);
    expect(container.querySelector("section#worlds")?.getAttribute("data-static")).toBe("true");
    expect(solos(container)).toEqual([1, 1, 1]);
    expect(links(container).every((a) => !a.hasAttribute("tabindex"))).toBe(true);
  });
});
