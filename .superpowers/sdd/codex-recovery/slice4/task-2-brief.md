## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

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
