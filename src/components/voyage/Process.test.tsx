// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import Process from "./Process";
import { voyageStore } from "@/scene/scroll/voyageStore";
import type { Item } from "@/lib/collections/defineCollection";

const steps: Item[] = [
  { id: "one", order: 0, createdAt: "2026-09-30T00:00:00Z", title: "Discover", what: "Find the constraints", deliverable: "A brief", duration: "One week" },
  { id: "two", order: 1, createdAt: "2026-09-30T00:00:00Z", title: "Build", what: "Ship the increment", deliverable: "", duration: "" },
];

afterEach(() => { cleanup(); voyageStore.reset(); });

it("renders all steps and optional fields in still mode", () => {
  render(<Process steps={steps} animated={false} />);
  expect(screen.getAllByRole("heading", { level: 3 }).map(x => x.textContent)).toEqual(["Discover", "Build"]);
  expect(screen.getByText("A brief")).toBeTruthy();
  expect(screen.getAllByText("How long")).toHaveLength(1);
  expect(document.querySelector(".process__reader")).toBeNull();
});

it("shows the second step during its held viewport", () => {
  voyageStore.setScroll(.22 + .12 * (1.5 / 3), 0);
  render(<Process steps={steps} animated />);
  expect(screen.getByRole("heading", { name: "Build" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Discover" })).toBeNull();
  expect(screen.getByRole("region", { name: "Process step details" }).tabIndex).toBe(0);
});

it("handles empty content without an empty heading", () => {
  render(<Process steps={[]} animated />);
  expect(screen.queryByRole("heading")).toBeNull();
});

it("keeps reader identity and focus while resetting its scroll on a step change", () => {
  voyageStore.setScroll(.22 + .12 * (.5 / 3), 0);
  render(<Process steps={steps} animated />);
  const reader = screen.getByRole("region", { name: "Process step details" });
  reader.focus(); reader.scrollTop = 120;
  act(() => voyageStore.setScroll(.22 + .12 * (1.5 / 3), 0));
  expect(screen.getByRole("region", { name: "Process step details" })).toBe(reader);
  expect(document.activeElement).toBe(reader);
  expect(reader.scrollTop).toBe(0);
  expect(screen.getByRole("heading", { name: "Build" })).toBeTruthy();
});

it("keeps disclosure keyboard order stable with no hidden reader focus stop", async () => {
  const user = userEvent.setup();
  render(<><Process steps={steps} animated /><button type="button">After Orbit</button></>);
  const toggle = screen.getByRole("button", { name: "Read all steps" });
  await user.click(toggle);
  expect(document.activeElement).toBe(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(screen.queryByRole("region", { name: "Process step details" })).toBeNull();
  const reader = document.querySelector<HTMLElement>(".process__reader")!;
  expect(reader.hidden).toBe(true); expect(reader.tabIndex).toBe(-1); expect(reader.hasAttribute("inert")).toBe(true);
  const all = screen.getByRole("region", { name: "All process steps" });
  expect(screen.getAllByRole("heading", { level: 3 }).map(x => x.textContent)).toEqual(["Discover", "Build"]);
  await user.tab(); expect(document.activeElement).toBe(all);
  await user.tab(); expect(document.activeElement).toBe(screen.getByRole("button", { name: "After Orbit" }));
  await user.tab({ shift: true }); expect(document.activeElement).toBe(all);
  await user.tab({ shift: true }); expect(document.activeElement).toBe(toggle);
  await user.keyboard("{Enter}");
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(toggle);
  expect(screen.queryByRole("region", { name: "All process steps" })).toBeNull();
  await user.tab(); expect(document.activeElement).toBe(reader);
});

it("renders the last maximum-length step in the all-steps region", async () => {
  const user = userEvent.setup();
  const longSteps = steps.map((step, index) => ({ ...step, what: `${index}:` + "w".repeat(598), deliverable: "d".repeat(400), duration: "t".repeat(40) }));
  render(<Process steps={longSteps} animated />);
  await user.click(screen.getByRole("button", { name: "Read all steps" }));
  const all = screen.getByRole("region", { name: "All process steps" });
  expect(all.textContent).toContain(longSteps[1].what);
  expect(all.querySelectorAll("article")).toHaveLength(2);
});

it("keeps one-step still content intrinsic and unpinned", () => {
  render(<Process steps={steps.slice(0, 1)} animated={false} />);
  const section = document.getElementById("orbit")!;
  expect(section.style.height).toBe("");
  expect(section.querySelector(".chapter__pin")).toBeNull();
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
});
