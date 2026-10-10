// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { voyageStore } from "./voyageStore";
import { measureScrollSegments, toScroll } from "./scrollGeometry";
import VoyageScroll from "./VoyageScroll";

const mock = vi.hoisted(() => ({ scrollTo: vi.fn(), on: vi.fn(), destroy: vi.fn() }));
vi.mock("lenis", () => ({ default: class {
  scrollTo = mock.scrollTo; on = mock.on; destroy = mock.destroy;
} }));
let remeasure: ResizeObserverCallback;
let approachHeight: number;
let y: number;
let track: HTMLElement;
beforeEach(() => {
  vi.useFakeTimers(); voyageStore.reset(); vi.clearAllMocks();
  y = 0; approachHeight = 1500;
  vi.stubGlobal("ResizeObserver", class {
    constructor(cb: ResizeObserverCallback) { remeasure = cb; }
    observe() {} disconnect() {}
  });
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => y });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  vi.spyOn(window, "scrollTo").mockImplementation((options: ScrollToOptions | number) => {
    if (typeof options === "object") y = options.top ?? 0;
  });
  track = document.createElement("main"); track.className = "voyage-track";
  for (const chapter of CHAPTERS) {
    const section = document.createElement("section"); section.id = chapter.id;
    vi.spyOn(section, "getBoundingClientRect").mockImplementation(() => {
      let top = 0;
      for (const c of CHAPTERS) {
        const height = c.id === "approach" ? approachHeight : sectionHeightVh(c) * 9;
        if (c.id === chapter.id) return new DOMRect(0, top - y, 390, height);
        top += height;
      }
      throw new Error("Missing chapter");
    });
    track.append(section);
  }
  document.body.append(track);
});
afterEach(() => { cleanup(); track.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it.each([false, true])("maps navigation and reflow using the same measured geometry (smooth=%s)", smooth => {
  const { unmount } = render(<VoyageScroll smooth={smooth} />);
  const target = .221;
  const expected = () => toScroll(target, measureScrollSegments(track, CHAPTERS, y, 900));
  act(() => voyageStore.scrollTo(target));
  if (smooth) expect(mock.scrollTo).toHaveBeenLastCalledWith(expected(), { duration: 1.4, onComplete: expect.any(Function) });
  else expect(window.scrollTo).toHaveBeenLastCalledWith({ top: expected(), behavior: "auto" });
  approachHeight = 5700;
  act(() => remeasure([], {} as ResizeObserver));
  act(() => voyageStore.scrollTo(target));
  if (smooth) {
    expect(mock.scrollTo).toHaveBeenLastCalledWith(expected(), { duration: 1.4, onComplete: expect.any(Function) });
    const onScroll = mock.on.mock.calls[0][1];
    act(() => onScroll({ limit: 10000, progress: .5, scroll: expected(), velocity: 40 }));
  } else act(() => window.dispatchEvent(new Event("scroll")));
  expect(voyageStore.getState().progress).toBeCloseTo(target, 10);
  expect(voyageStore.getState().velocity).toBe(0);
  expect(voyageStore.getState().programmatic).toBe(false);
  unmount();
  mock.scrollTo.mockClear();
  voyageStore.scrollTo(.5);
  expect(mock.scrollTo).not.toHaveBeenCalled();
});

it("settles real native scroll without requiring a final scroll event", () => {
  render(<VoyageScroll smooth={false} />);
  y = 950;
  act(() => window.dispatchEvent(new Event("scroll")));
  expect(voyageStore.getState().velocity).toBeGreaterThan(0);
  act(() => vi.advanceTimersByTime(150));
  expect(voyageStore.getState().velocity).toBe(0);
});

it("suppresses the Lenis settling tail after canonical epsilon clears the store flag", () => {
  render(<VoyageScroll smooth />);
  act(() => voyageStore.scrollTo(.221));
  const emit = mock.on.mock.calls[0][1];
  const segments = measureScrollSegments(track, CHAPTERS, y, 900);
  act(() => emit({ limit: 10000, progress: .5, scroll: toScroll(.220, segments), velocity: 30 }));
  expect(voyageStore.getState().programmatic).toBe(false);
  act(() => emit({ limit: 10000, progress: .5, scroll: toScroll(.2208, segments), velocity: 10 }));
  expect(voyageStore.getState().velocity).toBe(0);
  y = toScroll(.221, segments);
  act(() => mock.scrollTo.mock.calls[0][1].onComplete());
  act(() => emit({ limit: 10000, progress: .5, scroll: toScroll(.24, segments), velocity: 20 }));
  expect(voyageStore.getState().velocity).toBeGreaterThan(0);
});
