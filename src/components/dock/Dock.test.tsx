// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import Dock from "./Dock";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {} unobserve() {} disconnect() {}
  });
  vi.stubGlobal("matchMedia", (media: string) => ({ matches: false, media,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("cycles modal keyboard focus and restores the trigger on Escape", async () => {
  const { getByRole } = render(<><Dock visible /><button>Outside action</button></>);
  const menu = getByRole("button", { name: "Open menu" });
  fireEvent.click(menu);
  const sheet = getByRole("dialog", { name: "Navigation" });
  const buttons = sheet.querySelectorAll("button");
  const first = buttons[0], last = buttons[buttons.length - 1];
  await waitFor(() => expect(document.activeElement).toBe(first));
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
  fireEvent.keyDown(last, { key: "Tab" });
  expect(document.activeElement).toBe(first);
  getByRole("button", { name: "Outside action" }).focus();
  fireEvent.keyDown(window, { key: "Tab" });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(window, { key: "Escape" });
  expect(document.activeElement).toBe(menu);
  expect(menu.getAttribute("aria-expanded")).toBe("false");
});
