## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

## Task 1: Integrate existing measured geometry and support all service counts

**Already implemented:** Measured geometry and root-minimum removal landed during the correction and remain valid. First inspect current `scrollGeometry`/`VoyageScroll` and existing tests; the reference implementation below describes the contract, not an instruction to recreate working modules or expect missing-module failures. Verify/extend it for variable Orbit, restored animated Approach and intrinsic still Services. Only missing coverage should start red. Do not replace working bridge cleanup, idle decay, native/Lenis suppression or resize handling with an older snippet. The service-count and still-layout work below remains an active obligation after Slice 3 restoration.

**Files:** Verify/extend `src/scene/scroll/scrollGeometry.ts`, `src/scene/scroll/scrollGeometry.test.ts`; create `src/scene/scroll/scrollGeometry.dom.test.ts`; modify `src/scene/scroll/VoyageScroll.tsx`, `src/components/voyage/VoyageRoot.tsx`, and allocation comments in `src/scene/camera/flightPath.ts` / `src/scene/scroll/voyageStore.ts`.

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

- [ ] Run `npx vitest run src/scene/scroll/scrollGeometry.test.ts src/scene/scroll/scrollGeometry.dom.test.ts src/scene/scroll/voyageStore.test.ts src/scene/camera/flightPath.test.ts` and `npm run typecheck`; expect pass. Record in the source comment that measured mapping supersedes raw normalized progress for non-default allocations. Commit only actual integration/count-support changes; do not claim existing mapping as newly implemented.
