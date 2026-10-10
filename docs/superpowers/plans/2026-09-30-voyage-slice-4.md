# Voyage Redesign — Slice 4 Orbit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute sequentially after Slice 3 and its browser gate finish. Current Codex attribution applies; historical Claude model/trailer instructions do not apply.

**Goal:** Present the CMS process as an orbital ring whose luminous nodes rotate to the front alongside readable process panels, with every step accessible in the still tier.

**Architecture:** Keep the existing canonical chapter ranges and forward camera path. Measure physical section offsets locally in the scroll bridge and map them to/from canonical voyage progress, allowing Orbit alone to grow to one held viewport per process step plus one exit viewport. A pure phase function synchronizes the DOM and one vanilla Three.js set piece; no new renderer or server-mutated global configuration is introduced.

**Lint baseline:** Repository-wide lint currently reports 10 errors and 6 warnings. Until Slice 8 cleanup, require no new lint problems in touched files and report the baseline accurately; do not claim `npm run lint` is globally green.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Three.js 0.169, Lenis 1.3, Vitest 5, Testing Library; existing CMS `Item[]` and `getVoyageContent()`.

## Global Constraints

- “One persistent vanilla Three.js scene with scroll-driven camera”.
- “All 3D elements (starfield, warp streaks, nebula haze, topology lines, planets) render monochrome white-on-black.” Orbit has no amber material.
- “The camera never reverses direction”. Keep `CHAPTERS`, camera waypoints, star scale, and existing tuned constants unchanged.
- “DOM does small ones: fade-up 12px, 0.5s, ease [0.2, 0.7, 0.2, 1]. Nothing bounces.”
- “Glass panels”: 1px rgba(255,255,255,.08) border, rgba(10,10,10,.55) background, 18px backdrop blur, 20px radius, existing `.glass` top highlight.
- “prefers-reduced-motion”: particles freeze, SFX off, opacity-only DOM reveals, fixed FOV, no focus pulls. Orbit's still presentation is an ordinary ordered list with no pinned or hidden steps.
- “Server/client split unchanged.” Fetch through `getVoyageContent`; import `Item` using `import type` only in client modules. No client imports of collection implementations.
- “Each ends with a browser review before the next begins”: 1440×900 and 390×844, at least five positions, logged FPS, committed screenshots.
- Build on the completed Slice 3 registry and scroll-programmatic flag; preserve its Topology, Jump, audio, and focus-pull behavior. Do not replace entire shared files from this plan's pre-Slice-3 snapshot.
- No new package, WebGL context, canvas texture, postprocessing, audio beat, CMS schema, or Playwright test suite. Follow Slice 3's deferred-suite decision and browser review workflow.

---

## Geometry and adjudication notes

Existing Orbit is 150vh with a 100vh sticky child: only 50vh of hold. Four approximately viewport-long steps require **500vh section height = 400vh hold + 100vh exit**. Globally increasing `VOYAGE_SCROLL_VH` would also stretch Jump and Approach; changing normalized ranges would ripple through tuned camera and sound math. Neither is necessary.

New contract: `VoyageState.progress` is **canonical cinematic progress**, not raw `scrollY / maxScroll`. `CHAPTERS` still describes that canonical path. A measured layout converts document offsets to this progress, and the inverse converts rail/dock/store targets back to document offsets. Existing `sectionHeightVh` remains the default physical allocation for other chapters. Update `VoyageState.progress` documentation to read `Canonical cinematic progress (0..1), mapped from physical chapter offsets` in the same commit; do not alter its logic. The surface's extra 100vh remains a tail, excluded from its scroll interval. This slice measures all eleven positive-height sections; it does not claim support for zero-height/omitted chapters. A later chapter-skipping slice must define their canonical boundary policy and test both directions explicitly. Snapshot data lives inside one `VoyageScroll` effect; never mutate module-level chapter arrays or configuration from server content.

For N steps, Orbit local progress covers N+1 viewports; step phase uses `chapterProgress*(N+1)`, clamped to N. During each viewport, the first 20% rotates to the next node; the remaining 80% holds it at front-center. Last step remains visible through the exit viewport. At N=0 retain a 150vh empty Orbit section and no ring/panel; removing its waypoint and rail tick is a separate optional-empty-chapter concern, explicitly called out below.

**Settled controller decisions (2026-09-30):**

1. The controller approved replacing the old global denominator identity with measured per-chapter mapping. The old identity remains true only for default allocations; browser tests must now assert the measured inverse mapping. This is the smallest change that meets the approved Orbit dwell requirement without stretching Slice 3.
2. CMS process is uncapped. Render N nodes/steps, tuned for the four approved seed steps, rather than dropping additional records or inventing missing ones. The controller approved N steps. Empty Orbit temporarily retains its interval in Slice 4; Slice 6 must remove empty Orbit alongside Worlds/Belt using shared omitted-waypoint/rail support. This is not a permanent exception.
3. Reduced-motion micro-beat removal remains an existing Slice 3 deviation. This plan makes Orbit static and accessible, but does not silently revise the settled Jump behavior. Constellation's contradictory “camera retreats” versus “never reverses” remains outside Slice 4.
4. The ring below is an original geometric implementation inspired by the approved orbital-sphere description. Do not claim to have ported or licensed source that was not inspected. The controller approved original geometry; no literal source port is required.

## File map

| File | Responsibility |
|---|---|
| `src/scene/scroll/scrollGeometry.ts` + `.test.ts`, `scrollGeometry.dom.test.ts` | Physical/canonical mapping and measured DOM boundaries |
| `src/scene/scroll/VoyageScroll.tsx` | Root-local DOM measurement and bridge conversion |
| `src/components/voyage/orbitPhase.ts` + `.test.ts` | Count-safe shared step/angle/fade math |
| `src/components/voyage/Process.tsx` + `.test.tsx` | CMS narrowing, sticky animated panel / static ordered list |
| `src/scene/chapters/OrbitRing.ts` + `.test.ts` | Ring/node geometry, frame update, disposal |
| `src/components/voyage/VoyageRoot.tsx` | Thread process data and register chapter |
| `src/scene/SceneRoot.tsx` | Register set piece with process count; camera bank |
| `src/app/voyage/page.tsx` | Thread existing server response |
| `src/app/voyage/voyage.css` | Process layout, mobile readable panel |
| `worklog.md`, `insights.md`, `screenshots/voyage/slice-4/` | Validation evidence |

## Task 1: Preserve chapter alignment with variable physical lengths

**Files:** Create `src/scene/scroll/scrollGeometry.ts`, `src/scene/scroll/scrollGeometry.test.ts`; create `src/scene/scroll/scrollGeometry.dom.test.ts`; modify `src/scene/scroll/VoyageScroll.tsx`, `src/components/voyage/VoyageRoot.tsx`, and allocation comments in `src/scene/camera/flightPath.ts` / `src/scene/scroll/voyageStore.ts`.

**Interfaces:** `ScrollSegment { startPx; endPx; start; end }`; `toVoyage(y, segments): number`; `toScroll(progress, segments): number`. DOM IDs remain chapter IDs. Store, camera, rail and dock keep their current public interfaces.

- [ ] Write the failing tests:

```ts
import { describe, expect, it } from "vitest";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { toScroll, toVoyage, type ScrollSegment } from "./scrollGeometry";

function fixture(orbitHeight: number): ScrollSegment[] {
  let y = 0;
  return CHAPTERS.map(c => {
    const height = c.id === "orbit" ? orbitHeight : sectionHeightVh(c);
    const segment = { startPx: y, endPx: y + height - (c.id === "surface" ? 100 : 0), start: c.start, end: c.end };
    y += height;
    return segment;
  });
}
describe("physical/canonical geometry", () => {
  it.each([150, 500, 875])("round trips a %ivh Orbit and lands every chapter", height => {
    const segments = fixture(height);
    for (const s of segments) {
      expect(toScroll(s.start, segments)).toBeCloseTo(s.startPx, 8);
      expect(toVoyage(s.startPx, segments)).toBeCloseTo(s.start, 8);
    }
    let previous = -1;
    for (let i = 0; i <= 1000; i++) {
      const p = i / 1000;
      const y = toScroll(p, segments);
      expect(y).toBeGreaterThanOrEqual(previous);
      expect(toVoyage(y, segments)).toBeCloseTo(p, 8);
      previous = y;
    }
    expect(toVoyage(999999, segments)).toBe(1);
    expect(toScroll(-1, segments)).toBe(0);
  });
  it("keeps Jump physically 25vh when Orbit grows", () => {
    const segments = fixture(500);
    expect(toScroll(.22, segments) - toScroll(.20, segments)).toBeCloseTo(25);
  });
  it("handles empty and nonfinite inputs", () => {
    expect(toVoyage(NaN, fixture(500))).toBe(0);
    expect(toScroll(Infinity, fixture(500))).toBe(fixture(500).at(-1)!.endPx);
    expect(toVoyage(5, [])).toBe(0);
  });
});
```

- [ ] Run `npx vitest run src/scene/scroll/scrollGeometry.test.ts`; expect missing-module failure. Implement the complete module:

```ts
import type { Chapter } from "@/scene/camera/flightPath";
export interface ScrollSegment { startPx: number; endPx: number; start: number; end: number }
function map(value: number, segments: readonly ScrollSegment[], inverse: boolean): number {
  if (!segments.length) return 0;
  const input = Number.isNaN(value) ? 0 : value;
  const from = (s: ScrollSegment) => inverse ? s.start : s.startPx;
  const to = (s: ScrollSegment) => inverse ? s.end : s.endPx;
  const outputFrom = (s: ScrollSegment) => inverse ? s.startPx : s.start;
  const outputTo = (s: ScrollSegment) => inverse ? s.endPx : s.end;
  const first = segments[0], last = segments[segments.length - 1];
  if (input <= from(first)) return outputFrom(first);
  if (input >= to(last)) return outputTo(last);
  const s = segments.find(s => input < to(s)) ?? last;
  const span = to(s) - from(s);
  const t = span > 0 ? Math.max(0, Math.min(1, (input - from(s)) / span)) : 1;
  return outputFrom(s) + t * (outputTo(s) - outputFrom(s));
}
export const toVoyage = (y: number, segments: readonly ScrollSegment[]) => map(y, segments, false);
export const toScroll = (p: number, segments: readonly ScrollSegment[]) => map(p, segments, true);
export function measureScrollSegments(track: HTMLElement | null, chapters: readonly Chapter[], scrollY: number, viewportHeight: number): ScrollSegment[] {
  return chapters.flatMap(c => {
    const element = track?.querySelector<HTMLElement>(`#${c.id}`);
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    const startPx = rect.top + scrollY;
    return [{ startPx, endPx: startPx + rect.height - (c.id === "surface" ? viewportHeight : 0), start: c.start, end: c.end }];
  });
}
```

- [ ] Add `src/scene/scroll/scrollGeometry.dom.test.ts`. This tests the actual measurement helper at two viewport heights, with a nonzero document origin and restored scroll, including an intrinsic one-step still section shorter than its old allocation:

```ts
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { measureScrollSegments, toScroll, toVoyage } from "./scrollGeometry";
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
it.each([900, 844])("measures boundaries and the Surface tail at viewport height %i", viewport => {
  for (const orbitPx of [150 * viewport / 100, 500 * viewport / 100, 180]) {
    const track = document.createElement("main");
    track.className = "voyage-track";
    document.body.replaceChildren(track);
    const restoredY = 333;
    let offset = 37;
    for (const chapter of CHAPTERS) {
      const section = document.createElement("section"); section.id = chapter.id;
      const height = chapter.id === "orbit" ? orbitPx : sectionHeightVh(chapter) * viewport / 100;
      const documentTop = offset;
      vi.spyOn(section, "getBoundingClientRect").mockReturnValue(new DOMRect(0, documentTop - restoredY, 390, height));
      track.appendChild(section); offset += height;
    }
    const actualDocumentScrollLimit = offset - viewport;
    const segments = measureScrollSegments(track, CHAPTERS, restoredY, viewport);
    for (const segment of segments) {
      expect(toScroll(segment.start, segments)).toBeCloseTo(segment.startPx, 8);
      expect(toVoyage(segment.startPx, segments)).toBeCloseTo(segment.start, 8);
      const navTarget = toScroll(segment.start + .001, segments);
      expect(navTarget).toBeGreaterThan(segment.startPx);
      expect(navTarget).toBeLessThan(segment.endPx);
    }
    expect(segments.at(-1)!.endPx).toBeCloseTo(actualDocumentScrollLimit, 8);
    expect(toVoyage(actualDocumentScrollLimit, segments)).toBe(1);
    expect(toScroll(1, segments)).toBeCloseTo(actualDocumentScrollLimit, 8);
  }
});
it("reclassifies an exact measured boundary as the next chapter", () => {
  const track = document.createElement("main");
  const orbit = document.createElement("section"); orbit.id = "orbit";
  const worlds = document.createElement("section"); worlds.id = "worlds";
  track.append(orbit, worlds);
  vi.spyOn(orbit, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 200, 390, 4220));
  vi.spyOn(worlds, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 4420, 390, 1899));
  const segments = measureScrollSegments(track, CHAPTERS.filter(c => c.id === "orbit" || c.id === "worlds"), 100, 844);
  expect(toVoyage(4520, segments)).toBe(.34);
  expect(toScroll(.34, segments)).toBe(4520);
  expect(toScroll(.221, segments)).toBeCloseTo(300 + 4220 * (.001 / .12), 8);
});
```

Run `npx vitest run src/scene/scroll/scrollGeometry.test.ts src/scene/scroll/scrollGeometry.dom.test.ts`; expect pass after implementation. The mocked DOM test verifies measurement math; Task 5 separately verifies the real browser document scroll limit so CSS trailing space cannot hide behind the fixture.

- [ ] Integrate into the existing bridge, preserving Slice 3's programmatic completion logic. Add imports for `CHAPTERS`, `toScroll`, `toVoyage`, `measureScrollSegments`, `ScrollSegment`. At the top of the existing effect, before Lenis/native branch selection, insert:

```ts
const track = document.querySelector<HTMLElement>(".voyage-track");
let segments: ScrollSegment[] = [];
const measure = () => {
  segments = measureScrollSegments(track, CHAPTERS, window.scrollY, window.innerHeight);
  voyageStore.setScroll(toVoyage(window.scrollY, segments), 0);
};
measure();
const observer = new ResizeObserver(measure);
if (track) {
  observer.observe(track);
  track.querySelectorAll<HTMLElement>(":scope > section").forEach(section => observer.observe(section));
}
window.addEventListener("resize", measure);
const cleanupGeometry = () => {
  observer.disconnect();
  window.removeEventListener("resize", measure);
};
```

Replace these expressions only (do not remove existing guards or onComplete handlers):

```ts
// Initial restoration:
voyageStore.setScroll(toVoyage(window.scrollY, segments), 0);
// Lenis callback, after the existing limit/finiteness guards:
voyageStore.setScroll(toVoyage(e.scroll, segments), normalizeVelocity(e.velocity));
// Native callback's progress calculation:
const progress = toVoyage(y, segments);
// Lenis scroll target (retain Slice 3 options):
lenis.scrollTo(toScroll(p, segments), { duration: 1.4 });
// Native scroll target:
window.scrollTo({ top: toScroll(p, segments), behavior: "auto" });
```

Call `cleanupGeometry()` in both existing branch cleanup functions. Remove `maxScroll()` if now unused. Keep actual physical velocity unchanged; only the timeline mapping changes. The measure callback reseeds canonical state on resize/content reflow. It must not call `scrollTo`, arm programmatic navigation, or restart Lenis.

- [ ] Now that measured mapping exists, remove Slice 3's deliberate fixed-height limitation for still Services. In `Services.tsx` use `style={still ? undefined : { height: `${sectionHeightVh(chapter)}vh` }}` on the Approach section. Keep the existing `data-static` selector's intrinsic `.chapter__pin` rules. Update its obsolete fixed-150vh comment to say the bridge measures intrinsic still content. Add `tabIndex={still ? 0 : undefined}` to its static reader wrapper when pending SSR bounds its overflow. Animated Approach geometry stays unchanged.

Add a Services DOM test with six real-shaped Item fixtures and maximum legal title/promise/outcomes/engagement: still Approach has `style.height === ""`, all six titles occur once, and none is hidden/inert. In the browser, with N=6 and long text at 390×844/200% zoom, compare `approach.getBoundingClientRect().bottom` with the next section top (within 2px); no overflow may cover Jump/Orbit. Also verify the **active animated mobile** service panel is focusable/scrollable for full long copy and every inactive overlapping panel uses the controller’s Slice 3 `visibility:hidden` gate, which removes it from keyboard/pointer access and the accessibility tree; inert is an alternative, not an additional requirement.

- [ ] Preserve readable desktop Services for legal large arrays. Keep the approved shallow arc when N≤3. For N>3 choose one bounded horizontal strip with readable-width cards on both screen sizes: add `const many = services.length > 3`, `data-many={many ? "true" : undefined}` to Approach, and use `STATIC_POSE` when `still || many`. The `.services` wrapper gets `role={many ? "region" : undefined}`, `aria-label={many ? "Services" : undefined}`, `tabIndex={many ? 0 : undefined}`. Preserve Slice 3’s existing `tabIndex={0}` on animated service cards for both N≤3 and many; static-card tabindex is optional; no solo visibility/pointer suppression applies in many mode. Ordinary N≤3 keeps the controller's active-mobile-panel gates. Add:

```css
.chapter--approach:not([data-static="true"])[data-many="true"] .services { display:flex; flex-wrap:nowrap; gap:1.25rem; overflow-x:auto; align-items:stretch; }
.chapter--approach:not([data-static="true"])[data-many="true"] .service-panel { position:relative; inset:auto; flex:0 0 min(80vw,380px); min-width:min(80vw,320px); max-height:52vh; overflow-y:auto; opacity:1; transform:none; pointer-events:auto; }
.chapter--approach[data-static="true"] .services { display:grid; grid-template-columns:1fr; }
.chapter--approach .services:focus-visible, .chapter--approach .service-panel:focus-visible { outline:2px solid white; outline-offset:3px; }
```

Add N=6 and N=10 long-copy browser cases at 1440×900 and 390×844: every title remains readable at ≥320px card width on desktop, horizontally offscreen cards scroll into view when tab-focused, long body text scrolls within the active card, and no record is dropped. N=3 retains the original arc and its browser baseline. Still N=6/N=10 remains a natural vertical list and downstream chapter bounds do not overlap.

- [ ] Remove the fixed minimum from the root track **in this task**, before any intrinsic-height Process is wired. Replace only its opening element:

```tsx
<main className="voyage-track">
```

Remove `VOYAGE_SCROLL_VH` and `VOYAGE_TAIL_VH` imports from VoyageRoot if no other references remain. Keep every default chapter allocation, including Surface's tail. Replace the old root track comment with `Measured child sections determine document travel; Surface includes one final viewport tail.` Do not add an equivalent CSS min-height: N=1 still content can be shorter than the former allocation and must not create blank travel after Surface.

Update the two allocation comments in `flightPath.ts` (constants/function bodies unchanged):

```ts
/** Default physical scroll allocation in vh. With only default section heights,
 *  the track is this allocation plus VOYAGE_TAIL_VH. Chapters with intrinsic or
 *  extended heights are mapped through measured scroll segments; voyage progress
 *  is canonical and is not generally scrollY / document scroll limit. */
export const VOYAGE_SCROLL_VH = 1250;

/** The final section includes one extra viewport so its measured end minus this
 *  tail equals the true document scroll limit. Default section offsets equal
 *  chapter.start * VOYAGE_SCROLL_VH only when all default allocations are used;
 *  measured geometry is authoritative once any section differs. */
export const VOYAGE_TAIL_VH = 100;
```

Also update the `sectionHeightVh` docstring to `Default DOM allocation in vh; variable chapters may use intrinsic/extended height. The final chapter carries the tail.` The existing default-allocation unit tests remain valid and should retain that explicit scope in their comments.

- [ ] Run `npx vitest run src/scene/scroll/scrollGeometry.test.ts src/scene/scroll/scrollGeometry.dom.test.ts src/scene/scroll/voyageStore.test.ts src/scene/camera/flightPath.test.ts` and `npm run typecheck`; expect pass. Record in the source comment that measured mapping supersedes raw normalized progress for non-default allocations. Commit only these files with `feat: map voyage progress to measured chapter layout`.

## Task 2: Data-driven process panels and shared orbital phase

**Files:** Create `orbitPhase.ts`, `orbitPhase.test.ts`, `Process.tsx`, `Process.test.tsx` under `src/components/voyage/`; modify `src/app/voyage/voyage.css`, `VoyageRoot.tsx`, `src/app/voyage/page.tsx`.

**Interfaces:** `Process({ steps: Item[], animated: boolean })`; `orbitPhase(progress: number, count: number): { index: number; angle: number; fade: number }`; `orbitHeightVh(count: number): number`. Count order is CMS list order; the existing list query already applies ordering.

- [ ] Add pure failing tests:

```ts
import { expect, it } from "vitest";
import { orbitHeightVh, orbitPhase } from "./orbitPhase";
it("allocates four viewport holds and one exit", () => {
  expect(orbitHeightVh(4)).toBe(500);
  for (let i = 0; i < 4; i++) {
    const phase = orbitPhase((i + .5) / 5, 4);
    expect(phase.index).toBe(i);
    expect(phase.angle).toBeCloseTo(-i * Math.PI / 2);
    expect(phase.fade).toBe(1);
  }
  expect(orbitPhase(1, 4).index).toBe(3);
});
it("is finite for no steps and saturates oversized progress", () => {
  expect(orbitPhase(0, 0)).toEqual({ index: -1, angle: 0, fade: 0 });
  expect(orbitHeightVh(0)).toBe(150);
  expect(orbitPhase(2, 1)).toEqual({ index: 0, angle: 0, fade: 1 });
});
```

- [ ] Run `npx vitest run src/components/voyage/orbitPhase.test.ts`; expect missing-module failure. Add:

```ts
export function orbitHeightVh(count: number): number { return count > 0 ? (count + 1) * 100 : 150; }
export function orbitPhase(progress: number, count: number) {
  if (count <= 0) return { index: -1, angle: 0, fade: 0 };
  const p = Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
  const units = Math.min(count, p * (count + 1));
  const index = Math.min(count - 1, Math.floor(units));
  const transition = Math.min(1, Math.max(0, (units - index) / .2));
  const eased = transition * transition * (3 - 2 * transition);
  const turn = index === 0 ? 0 : index - 1 + eased;
  return { index, angle: -turn * Math.PI * 2 / count, fade: index === 0 ? 1 : eased };
}
```

- [ ] Add DOM failing tests. Construct full `Item` fixtures using the existing declared `Item` shape (id plus fields), never `as any`:

```tsx
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

```

- [ ] Run `npx vitest run src/components/voyage/Process.test.tsx`; expect missing-module failure. Add full component:

```tsx
"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { Item } from "@/lib/collections/defineCollection";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { orbitHeightVh, orbitPhase } from "./orbitPhase";
const text = (value: unknown) => typeof value === "string" ? value : "";
function Step({ step, index }: { step: Item; index: number }) {
  const title = text(step.title), what = text(step.what);
  const deliverable = text(step.deliverable), duration = text(step.duration);
  return <article className="glass process__panel">
    <p className="chapter__label">STEP {String(index + 1).padStart(2, "0")}</p>
    {title && <h3>{title}</h3>}
    <dl>
      {what && <><dt>What happens</dt><dd>{what}</dd></>}
      {deliverable && <><dt>What you get</dt><dd>{deliverable}</dd></>}
      {duration && <><dt>How long</dt><dd>{duration}</dd></>}
    </dl>
  </article>;
}
export default function Process({ steps, animated }: { steps: Item[]; animated: boolean }) {
  const voyage = useVoyage();
  const readerRef = useRef<HTMLDivElement>(null);
  const [allOpen, setAllOpen] = useState(false);
  const local = voyage.chapter.id === "orbit" ? voyage.chapterProgress : voyage.progress < .22 ? 0 : 1;
  const phase = orbitPhase(local, steps.length);
  useLayoutEffect(() => {
    if (readerRef.current) readerRef.current.scrollTop = 0;
  }, [phase.index]);
  if (!steps.length) return <section id="orbit" className="chapter" style={{ height: "150vh" }} />;
  return <section id="orbit" aria-labelledby="process-heading"
    className={`chapter process ${animated ? "process--animated" : "process--still"}`}
    style={animated ? { height: `${orbitHeightVh(steps.length)}vh` } : undefined}>
    {animated ? <div className="chapter__pin process__pin">
      <div className="process__content">
        <p className="chapter__label">04 / ORBIT</p>
        <h2 id="process-heading">How we get there</h2>
        <p className="process__count">{String(phase.index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</p>
        <button type="button" className="process__all-toggle" aria-expanded={allOpen}
          aria-controls="process-all-steps" onClick={() => setAllOpen(open => !open)}>
          {allOpen ? "Return to current step" : "Read all steps"}
        </button>
        <div ref={readerRef} className="process__reader" role="region" aria-label="Process step details"
          hidden={allOpen} inert={allOpen} tabIndex={allOpen ? -1 : 0}>
          <div style={{ opacity: phase.fade, transform: `translateY(${12 * (1 - phase.fade)}px)` }}>
            <Step step={steps[phase.index]} index={phase.index} />
          </div>
        </div>
        <div id="process-all-steps" className="process__all" role="region" aria-label="All process steps"
          hidden={!allOpen} inert={!allOpen} tabIndex={allOpen ? 0 : -1}>
          <ol>{steps.map((step, index) => <li key={step.id}><Step step={step} index={index} /></li>)}</ol>
        </div>
      </div>
    </div> : <div className="process__static">
      <p className="chapter__label">04 / ORBIT</p>
      <h2 id="process-heading">How we get there</h2>
      <ol>{steps.map((step, index) => <li key={step.id}><Step step={step} index={index} /></li>)}</ol>
    </div>}
  </section>;
}
```

The disclosure is inline, not an overlay. The stable toggle always precedes the one visible scroll region; the inactive region is hidden and inert. Opening/closing retains focus on the toggle, and Tab reaches the visible region then leaves the chapter normally. Both regions contain text, not synthetic tab stops per paragraph. The current reader is never keyed/remounted: an index-change layout effect resets its scrollTop while preserving focus and DOM identity. No live region announces continuous scroll changes. All steps remain in the disclosure for screen-reader browse mode and keyboard scrolling.
- [ ] Append CSS:

```css
.process h2 { font-family: "Styrene A", var(--font-space-grotesk), sans-serif; font-size: clamp(2rem,4vw,3.5rem); font-weight:500; line-height:1.08; }
.process h3 { font-size:clamp(1.35rem,2vw,2rem); font-weight:500; margin:0 0 1rem; }
.process__pin { padding-top:90px; padding-bottom:60px; }
.process__content { width:min(46%,580px); margin-left:auto; height:min(680px,calc(100dvh - 170px)); min-height:0; display:flex; flex-direction:column; }
.process__content > .chapter__label, .process__content > h2, .process__count, .process__all-toggle { flex-shrink:0; }
.process [hidden] { display:none!important; }
.process__count { font-family:var(--font-jetbrains-mono),monospace; color:#a3a3a3; font-size:.75rem; margin:1rem 0; }
.process__reader, .process__all { flex:1 1 0; min-height:0; overflow:auto; overscroll-behavior:contain; border-radius:20px; }
.process__reader:focus-visible, .process__all:focus-visible, .process__all-toggle:focus-visible { outline:2px solid white; outline-offset:3px; }
.process__panel { padding:clamp(1.25rem,2vw,2rem); }
.process__panel dt { font-family:var(--font-jetbrains-mono),monospace; text-transform:uppercase; letter-spacing:.12em; color:#a3a3a3; font-size:.7rem; margin-top:1rem; }
.process__panel dd { margin:.4rem 0 0; font-size:1.05rem; line-height:1.7; overflow-wrap:anywhere; white-space:pre-line; }
.process ol { list-style:none; margin:0; padding:0; }
.process__all-toggle { align-self:flex-start; margin:0 0 1rem; padding:.5rem 0; font-size:.85rem; cursor:pointer; background:none; border:0; color:white; }
.process__all li + li { margin-top:1rem; }
.process__static { padding:100px clamp(1.5rem,6vw,6rem); max-width:900px; margin:auto; }
.process__static li { padding:2rem 0; }
@media (max-width:767px) {
  .process__pin { justify-content:flex-end; padding:0 1.25rem 88px; }
  .process__content { width:100%; margin:0; height:min(620px,calc(100dvh - 188px)); }
  .process__content > .chapter__label { margin-bottom:.5rem; }
  .process__content h2 { font-size:2rem; }
  .process__panel { padding:1.15rem; }
  .process__count { margin:.65rem 0; }
}
```

- [ ] Wire data after Slice 3's existing services prop. In server page destructuring add `process`; pass `process={process}` to `VoyageRoot`. In `VoyageRootProps` add `process: Item[]` using its existing type-only Item import. Destructure `process` in the component parameters. Import `Process` and add this branch within the ordered chapter map, before the placeholder fallback:

```tsx
if (c.id === "orbit") return <Process key={c.id} steps={process} animated={animated} />;
```

Do not move Process outside ordered map or remove Approach/Jump branches. Task 1 already removes the track minimum: the actual children and final Surface tail alone determine the scroll range, including intrinsic-height still Process with N=1. Thread `processCount={process.length}` into SceneRoot in Task 4.

- [ ] Run both new tests, `npm run typecheck`, and lint the touched files; expect no new touched-file problems. Run `npm run lint` separately and compare against the recorded 10-error/6-warning baseline. Commit these files with `feat: add accessible data-driven Orbit process panels`.

## Task 3: Content-first server rendering with stable initial reservations

**Files:** Modify `src/components/voyage/VoyageRoot.tsx`, `Launch.tsx`, `Process.tsx`, the completed Services static wrapper, and `src/app/voyage/voyage.css`; create `src/components/voyage/serverContent.test.tsx`.

**Interfaces:** `data-tier="pending"` describes server/hydration markup. `animated` is false until a high/mid tier is resolved. Server emits the actual hero, services and all process text in one section tree. The pending CSS reserves the same physical chapter dimensions that enhancement will use; reduced-motion CSS renders intrinsic content from the first paint. SceneRoot only mounts for high/mid.

- [ ] Remove the `if (tier === null) return <div className="voyage-root voyage-root--booting" />;` branch. Move `const animated = tier !== null && tier !== "still";` before the existing hook consumers that need it, preserving unconditional hook order. Retain the mount environment detection; it changes the data-tier attribute after hydration. Add `type CSSProperties` to the React import and `orbitHeightVh` import. Compute these plain render values:

```ts
const reservations = Object.fromEntries(CHAPTERS.map(c => [`--reserve-${c.id}`, `${sectionHeightVh(c)}vh`])) as CSSProperties;
const trackStyle = { ...reservations, "--reserve-orbit": `${orbitHeightVh(process.length)}vh` } as CSSProperties;
```

Use these opening/scene elements and keep the existing children/order:

```tsx
<div className="voyage-root" data-tier={tier ?? "pending"}>
  <VoyageScroll smooth={animated} />
  {tier === "high" || tier === "mid" ? <SceneRoot tier={tier} ignite={ignited} onContextLost={onContextLost} /> : <StillSky />}
  {/* Existing HUD, dock, Ignition and ordered sections remain here. */}
  <main className="voyage-track" style={trackStyle}>
```

The excerpt is an insertion contract, not replacement of the full root: preserve Slice 3/4's actual SceneRoot props when editing the scene element. Track style contains reservation custom properties only, **no minHeight**. Do not mount Ignition while tier is null: wrap its existing element in `tier !== null && ...`, so the disabled-state completion effect cannot prematurely finish session ignition. Once tier resolves it may overlay content; it must never hide server text. In Launch invocation pass `ready={true}`. In `Launch.tsx` change the motion wrapper `initial` to `false` and keep `animate={{opacity:1,y:0}}`; remove the no-longer-used readiness prop if desired by updating its one caller in the same edit. Hint opacity still derives from chapter progress. No inline server opacity:0 or transform may hide the H1/body/CTAs.

- [ ] Add reservation CSS. It applies only before tier resolution; the actual enhanced section heights remain component-owned. Surface retains its final tail. Each pending static content wrapper gets a keyboard-focusable bounded reader (`tabIndex={0}` on Services' static wrapper and Process `.process__static`); all actual text is rendered, with no duplicated sections or headings:

```css
.voyage-root[data-tier="pending"] #launch { height:var(--reserve-launch)!important; }
.voyage-root[data-tier="pending"] #approach { height:var(--reserve-approach)!important; }
.voyage-root[data-tier="pending"] #jump { height:var(--reserve-jump)!important; }
.voyage-root[data-tier="pending"] #orbit { height:var(--reserve-orbit)!important; }
.voyage-root[data-tier="pending"] #worlds { height:var(--reserve-worlds)!important; }
.voyage-root[data-tier="pending"] #belt { height:var(--reserve-belt)!important; }
.voyage-root[data-tier="pending"] #passage { height:var(--reserve-passage)!important; }
.voyage-root[data-tier="pending"] #constellation { height:var(--reserve-constellation)!important; }
.voyage-root[data-tier="pending"] #pilot { height:var(--reserve-pilot)!important; }
.voyage-root[data-tier="pending"] #landing { height:var(--reserve-landing)!important; }
.voyage-root[data-tier="pending"] #surface { height:var(--reserve-surface)!important; }
.voyage-root[data-tier="pending"] .process__static,
.voyage-root[data-tier="pending"] .chapter--approach[data-static="true"] > .chapter__pin { max-height:100vh; overflow:auto; }
@media (prefers-reduced-motion:reduce) {
  .voyage-root[data-tier="pending"] .chapter:not(#surface) { height:auto!important; min-height:0!important; }
  .voyage-root[data-tier="pending"] #jump { display:none; }
  .voyage-root[data-tier="pending"] .process__static,
  .voyage-root[data-tier="pending"] .chapter--approach[data-static="true"] > .chapter__pin { max-height:none; overflow:visible; }
  .voyage-root[data-tier="pending"] .chapter__pin { position:relative; height:auto; min-height:100vh; }
}
```

The Services selectors match Slice 3’s `chapter--approach` / `data-static="true"` contract; do not introduce a duplicate Services tree. Future Slice 5–7 tasks must extend the reservation values to their real variable heights and render each newly added chapter/form in this same server tree.

- [ ] Add server rendering test using `react-dom/server` against Launch and Process (no browser/WebGL required):

```tsx
import {renderToString} from "react-dom/server";
import {expect,it} from "vitest";
import Launch from "./Launch";
import Process from "./Process";
it("includes visible real hero and every process step in server HTML",()=>{
 const hero=renderToString(<Launch headline="Actual CMS headline" subheadline="Actual CMS promise" ready />);
 expect(hero).toContain("Actual CMS headline");expect(hero).toContain("Actual CMS promise");
 expect(hero).not.toContain("opacity:0");
 const process=renderToString(<Process animated={false} steps={[
  {id:"a",order:0,createdAt:"",title:"Discover",what:"Understand constraints"},
  {id:"b",order:1,createdAt:"",title:"Ship",what:"Operate reliably"},
 ]}/>);
 expect(process).toContain("Understand constraints");expect(process).toContain("Operate reliably");
 expect(process.match(/id="orbit"/g)).toHaveLength(1);
 expect(process).not.toContain("chapter__pin");
});
```

Retain `ready` in Launch for this test/interface unless the deliberate same-task cleanup updates both. Run this test, all touched component tests, typecheck and touched lint. Browser gate must separately inspect actual `/voyage` response and a JavaScript-disabled browser: component render tests alone cannot prove the root is server-rendering content. Capture CLS from navigation through tier resolution at 1440×900 and 390×844 using buffered LayoutShift entries; require <0.05 before accepting the slice. If a reservation mismatch shifts downstream sections, fix the relevant reservation/body overflow rather than restoring the blank server root.

- [ ] Commit `feat: server-render voyage content before scene enhancement`.

## Task 4: One monochrome orbital ring in the existing scene

**Files:** Create `src/scene/chapters/OrbitRing.ts`, `OrbitRing.test.ts`; modify `src/scene/SceneRoot.tsx`, `src/components/voyage/VoyageRoot.tsx`.

**Interfaces:** `new OrbitRing(count: number)` implements existing `SetPiece`. Consumes existing `FrameContext.camera` and canonical `voyage`, plus `orbitPhase`. Ring is view-composed inside the one scene, with perspective depth around its node circle; no extra renderer. A subtle bank is applied to the real camera's local z axis before piece updates.

- [ ] Add failing geometry/lifecycle test:

```ts
import { expect, it } from "vitest";
import * as THREE from "three";
import { OrbitRing } from "./OrbitRing";
import { voyageStore } from "@/scene/scroll/voyageStore";
import type { FrameContext } from "./types";
it("brings each process node to the same front point and releases resources", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1440/900, .1, 400);
  const ring = new OrbitRing(4);
  const ctx: FrameContext = { camera, voyage: voyageStore.getState(), t:0, dt:1/60, audioEnergy:0, ignite:1 };
  ring.update(ctx); // legal before build
  ring.build(scene, "high");
  let front: THREE.Vector3 | undefined;
  for (let i=0; i<4; i++) {
    voyageStore.setScroll(.22 + .12*(i+.5)/5, 0);
    ctx.voyage=voyageStore.getState();
    ring.update(ctx);
    scene.updateMatrixWorld(true);
    const node=scene.getObjectByName(`orbit-node-${i}`)!;
    const position=node.getWorldPosition(new THREE.Vector3());
    if (!front) front=position;
    expect(position.distanceTo(front)).toBeLessThan(.0001);
  }
  ring.dispose(); ring.dispose();
  expect(scene.children).toHaveLength(0);
  voyageStore.reset();
});
it("builds nothing for still tier or empty process", () => {
  const scene=new THREE.Scene();
  new OrbitRing(4).build(scene,"still");
  new OrbitRing(0).build(scene,"high");
  expect(scene.children).toHaveLength(0);
});
```

- [ ] Run `npx vitest run src/scene/chapters/OrbitRing.test.ts`; expect missing-module failure. Implement:

```ts
// Original orbital geometry inspired by the approved orbital-sphere ring concept.
import * as THREE from "three";
import type { Tier } from "@/scene/quality";
import type { SetPiece, FrameContext } from "./types";
import { orbitPhase } from "@/components/voyage/orbitPhase";

export class OrbitRing implements SetPiece {
  private root: THREE.Group | null = null;
  private wheel: THREE.Group | null = null;
  private ringMaterial: THREE.MeshBasicMaterial | null = null;
  private nodeMaterial: THREE.MeshBasicMaterial | null = null;
  private glowMaterial: THREE.MeshBasicMaterial | null = null;
  private geometries: THREE.BufferGeometry[] = [];
  private offset = new THREE.Vector3();
  constructor(private readonly count: number) {}
  build(scene: THREE.Scene, tier: Tier) {
    this.dispose();
    if (tier === "still" || this.count <= 0) return;
    const root = new THREE.Group(); root.name="orbit-ring"; root.visible=false;
    const tilt = new THREE.Group(); tilt.rotation.x=-.65; tilt.rotation.z=.15;
    const wheel = new THREE.Group(); tilt.add(wheel); root.add(tilt);
    const segments = tier === "high" ? 128 : 64;
    const torus = new THREE.TorusGeometry(3, .012, 6, segments);
    const sphere = new THREE.SphereGeometry(.09, 12, 8);
    const halo = new THREE.SphereGeometry(.20, 12, 8);
    this.geometries=[torus,sphere,halo];
    const material = (opacity: number, glow=false) => new THREE.MeshBasicMaterial({
      color:0xffffff, transparent:true, opacity, depthWrite:false,
      blending:glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.ringMaterial=material(.3);
    this.nodeMaterial=material(1);
    this.glowMaterial=material(.15,true);
    wheel.add(new THREE.Mesh(torus,this.ringMaterial));
    for(let i=0;i<this.count;i++) {
      // Front-center is the lower, near edge of the tilted circle.
      const angle=-Math.PI/2 + i*Math.PI*2/this.count;
      const node=new THREE.Mesh(sphere,this.nodeMaterial);
      node.name=`orbit-node-${i}`;
      node.position.set(3*Math.cos(angle),3*Math.sin(angle),0);
      const glow=new THREE.Mesh(halo,this.glowMaterial);
      glow.position.copy(node.position);
      wheel.add(node,glow);
    }
    scene.add(root); this.root=root; this.wheel=wheel;
  }
  update({ voyage, camera, ignite }: FrameContext) {
    if(!this.root || !this.wheel) return;
    const visible=voyage.chapter.id === "orbit";
    this.root.visible=visible;
    if(!visible) return;
    const p=voyage.chapterProgress;
    const phase=orbitPhase(p,this.count);
    const opacity=Math.min(1,p*(this.count+1)/.15,(1-p)*(this.count+1)/.4)*ignite;
    this.ringMaterial!.opacity=.38*opacity;
    this.nodeMaterial!.opacity=opacity;
    this.glowMaterial!.opacity=.16*opacity;
    this.wheel.rotation.z=phase.angle;
    const mobile=camera.aspect<1;
    // Plane sits 15 units in front of the camera; left half on desktop, above copy on mobile.
    const halfHeight=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*15;
    this.offset.set(mobile ? 0 : -halfHeight*camera.aspect*.40, mobile ? halfHeight*.48 : 0, -15);
    this.offset.applyQuaternion(camera.quaternion);
    this.root.position.copy(camera.position).add(this.offset);
    this.root.quaternion.copy(camera.quaternion);
    this.root.scale.setScalar(mobile ? Math.min(.78,halfHeight*camera.aspect*.78/3.2) : 1.35);
  }
  dispose() {
    this.root?.removeFromParent();
    for(const geometry of this.geometries) geometry.dispose();
    this.ringMaterial?.dispose(); this.nodeMaterial?.dispose(); this.glowMaterial?.dispose();
    this.geometries=[]; this.root=null; this.wheel=null;
    this.ringMaterial=null; this.nodeMaterial=null; this.glowMaterial=null;
  }
}
```

No wall-clock drift: a node remains on its front marker while its words are being read. Count-based geometry is built once, not per frame. Browser review decides whether the camera-relative composition reads convincingly as an orbit; moving to a world anchor is a deliberate follow-up if it reads as a HUD. Do not fake an inspected source attribution.

- [ ] Integrate with the completed Slice 3 scene. Add `processCount: number` to `SceneRootProps`; destructure it; include it in scene effect dependencies. Import OrbitRing and insert `new OrbitRing(processCount)` into the existing pieces array without dropping Topology or changing their update order. Thread `processCount={process.length}` from VoyageRoot. After `camera.lookAt(smoothLook)` and before piece updates, insert:

```ts
// A single bank-and-settle; rotateZ resets from lookAt each frame, never accumulates.
if (voyage.chapter.id === "orbit") {
  const bank = Math.sin(Math.PI * Math.min(1, voyage.chapterProgress / .2));
  camera.rotateZ(-Math.PI / 6 * bank);
}
```

Bank changes camera up orientation, not position or forward direction. With count=4 the bank resolves during the first viewport; it does not repeat per step. Do not alter waypoints or POSE_LERP. In still tier SceneRoot is absent, so no camera bank runs.

- [ ] Run `npx vitest run src/scene/chapters/OrbitRing.test.ts src/components/voyage/orbitPhase.test.ts src/scene/camera/flightPath.test.ts`, then `npm run typecheck` and lint the touched files; expect no new touched-file problems. Run `npm run lint` separately and compare against the recorded 10-error/6-warning baseline. Commit with `feat: render the scroll-driven process orbit`.

## Task 5: Browser gate, regression checks, and evidence

**Files:** `worklog.md`, `insights.md`, `screenshots/voyage/slice-4/*`; only fix implementation files if review demonstrates a defect.

**Interfaces:** Existing dev server `/voyage`; browser automation and screenshot tools available to executing session; existing quality JSON logs.

- [ ] Verify actual `/voyage` response HTML contains the current CMS headline, service/process body text and exactly one of each chapter ID. Open with JavaScript disabled and confirm that text is visible/readable; no blank root and no hidden hero. Record buffered CLS during normal hydration at both target viewports and require <0.05. Then run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Record exact results, including any pre-existing failures separately. Do not invent FPS or claim a WebGL review from a still fallback screenshot.
- [ ] Start or reuse `npm run dev`. Read the browser automation tool documentation before driving it. Open `/voyage`; confirm actual process CMS data. At 1440×900 and 390×844 capture Orbit entry, each of the four held steps (or every returned step if count differs), Orbit exit, Approach, Jump, and Worlds entry. For each held step i use the measured Orbit element:

```js
const section = document.getElementById("orbit");
const top = section.getBoundingClientRect().top + window.scrollY;
const target = top + (i + 0.5) * window.innerHeight;
window.scrollTo({ top: target, behavior: "instant" });
```

Wait for the actual `window.scrollY` to settle within 2px of target before capturing. Do not assume old raw p=.27 reaches the middle of Orbit. Store screenshot names `desktop-orbit-step-01.png`, `mobile-orbit-step-01.png`, matching entry/exit and regression names under `screenshots/voyage/slice-4/`. Check ring front position and panel title match in each capture. Check 30° bank during first-viewport entry, smooth ring rotation between steps, bright white nodes, no amber ring, and no overlap with dock/controls.
- [ ] Click Process in dock and Orbit rail tick, then Work/Worlds and Landing. Preserve their existing `chapter.start + .001` targets. Verify actual scrollY is within 2px of the measured `toScroll(chapter.start + .001, segments)` target, separately verify that offset lies inside the named chapter and its rail label is active; repeat after a viewport resize and after opening/closing the inline Read all steps disclosure. Verify no Jump SFX on programmatic passage. Confirm raw native forward scroll retains Slice 3 Jump behavior. Confirm browser restoration into Orbit seeds correct step without a scroll event.
- [ ] Test maximum legal copy (600-character what, 400-character deliverable, 40-character duration) using temporary local test fixtures, reverted before commit. At 390×844 and 200% zoom: reader keyboard focus reachable, all words readable by scrolling, no horizontal overflow, disclosure toggle focus visible and all steps accessible, no keyboard trap. Verify stable reader DOM/focus with scrollTop reset when step index changes. Scroll past Orbit with disclosure closed and open; hidden region is inert and never consumes keyboard focus. Tab from the toggle through the visible region to the next page control; Shift+Tab returns. In the all-steps region press End and verify the final step is readable within the viewport bound. Retune CSS only with evidence.
- [ ] Emulate reduced motion and reload: confirm no voyage canvas, no Orbit sticky container, all N steps readable in order, no scroll-driven fades or transforms, and later chapter navigation remains aligned despite intrinsic Orbit height. Disable WebGL and reload for the same checks. Test zero, one, four and five process records with local fixtures and restore real data. Zero is the explicit empty-section deviation, not a broken render.
- [ ] At **both 900px and 844px viewport heights**, test local N=0 and N=1 fixtures in still mode and N=4 animated. Run this browser assertion using the live DOM (not a mocked scrollHeight):

```js
const table = [
  ["launch",0,.08],["approach",.08,.20],["jump",.20,.22],["orbit",.22,.34],
  ["worlds",.34,.52],["belt",.52,.60],["passage",.60,.63],["constellation",.63,.74],
  ["pilot",.74,.84],["landing",.84,.95],["surface",.95,1],
];
const track = document.querySelector(".voyage-track");
if (getComputedStyle(track).minHeight !== "0px" && getComputedStyle(track).minHeight !== "auto") throw new Error("Unexpected fixed track minimum");
const segments = table.map(([id,start,end]) => {
  const rect = document.getElementById(id).getBoundingClientRect();
  const top = rect.top + window.scrollY;
  return { id, start, end, top, bottom: top + rect.height - (id === "surface" ? innerHeight : 0) };
});
const scrollLimit = document.documentElement.scrollHeight - innerHeight;
if (Math.abs(segments.at(-1).bottom - scrollLimit) > 2) throw new Error("Surface does not end at true document scroll limit");
for (const s of segments) {
  const navTarget = s.top + .001 / (s.end - s.start) * (s.bottom - s.top);
  if (!(navTarget > s.top && navTarget < s.bottom)) throw new Error(`Navigation outside ${s.id}`);
}
window.scrollTo({ top: scrollLimit, behavior: "instant" });
```

After settling, verify actual scrollY equals the reported scrollLimit within 2px, Surface is the active rail chapter, and `surface` canonical progress is 1 (the pure measured-boundary test proves the mapping; inspect the store using the running app's dev debugger if needed). Scroll back to every measured section top and confirm its active chapter at the exact boundary; then click its actual dock/rail control and compare to the **+.001 mapped target**, not top. Repeat after resize without reload. There must be no extra trailing blank caused by the removed 1350vh minimum; Surface's intentional one-viewport tail is already accounted for and is not an extra chapter interval. Restore real data after fixtures.

- [ ] Inspect console errors and GPU context count; at most one live voyage canvas. Record actual quality tier and logged 1s FPS probe for both desktop and mobile. If software rendering forces still or demotion, record that limitation and obtain a real animated review before marking cinematic acceptance complete. Inspect ring disappearance on either side of Orbit and context-loss fallback. Review every screenshot visually, not just file existence.
- [ ] Append factual outcomes and deviations to `worklog.md` and `insights.md`, including actual step counts, mapping change, sampled FPS, desktop/mobile review findings, and any remaining controller decision. Commit screenshots and notes with `docs: record Orbit browser acceptance`. Only proceed to Slice 5 after this gate passes.

## Self-review of this plan

- Orbit step geometry, CMS fields, ring rotation, monochrome material, viewport dwell, static accessible content, camera bank, single scene, disposal, and browser gate each have an implementation task.
- The physical/canonical mapping has round-trip and boundary tests; existing camera forward/distance tests remain authoritative. Geometry is never persisted in server-global state.
- The general empty-chapter removal and reduced-motion micro-beat deletion are settled temporary/shared-scope deferrals to Slice 6, not silently claimed as complete.
- Actual Slice 3 file edits may land after this plan; all shared integration steps are surgical additions, not full-file replacements. Only this plan document was written during planning.
