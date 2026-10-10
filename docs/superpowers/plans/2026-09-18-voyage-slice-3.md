# Voyage Redesign — Slice 3 (Approach Vector + Jump) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution is **sequential**: one Opus implementer at a time, an independent task review after each task, and the controller personally runs Task 10 and looks at every screenshot. The tasks are not independent — Task 9 deletes a line Task 7 adds, Task 8 consumes Task 7's prop, and Task 6 changes a shared `TierSettings` interface — so they must never be dispatched in parallel.

**Goal:** Ship chapter 02 "Approach Vector" (data-driven service panels docking in a shallow arc, a topology graph assembling behind them, a starfield focus pull) and chapter 03 "Jump" (letterbox + hyperspace tunnel + star flare + whoosh, edge-triggered, never on a backward or programmatic pass).

**Architecture:** Every continuous visual beat is driven by `ctx.voyage.chapter.id` + `ctx.voyage.chapterProgress` inside the set piece that owns it — `WarpStreaks` gains a hyperspace mode, `EnergyOrb` gains a Jump flare, `Starfield` gains the Approach focus pull, and a new `Topology` set piece joins the `SceneRoot` registry. The two discrete beats hang off an edge detector: a pure `decideJumpBeat()` function driven by a `voyageStore.subscribe` wrapper in `VoyageRoot`, with a new `programmatic` flag on the store so a `scrollTo()` that transits the Jump band does not fire it. Only one of those two is purely wall-clock: the **whoosh** is a one-shot 0.4s SFX fired once on the crossing edge, while the **letterbox** holds for `max(900 ms, the rest of the band)` — a clock floor renewed by every in-band emit, so a slow or keyboard pass cannot lift the bars mid-burst. DOM content comes from `getVoyageContent()` through one new `services` prop, narrowed at the leaf.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 strict, three@0.169, framer-motion 12, lenis 1.3, vitest 5 (+ jsdom / @testing-library/react, already installed), MongoDB/Mongoose 9.

**Spec:** `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md` §3 (rows 02/03 + cinematic direction), §5, §7, §8.
**Codebase map (authoritative over the spec's code blocks):** `.superpowers/sdd/slice3-map.md`.
**Decisions:** `.superpowers/sdd/slice3-decisions.md`.

## Global Constraints

*(copied verbatim from `docs/superpowers/plans/2026-09-14-voyage-slices-1-2.md`, with one annotation added to the commit-trailer bullet — the constraint itself is unchanged)*

- Exactly **one** WebGL context for the scene. `@designcodeio/threeui` is **not** a dependency (its dock is ported, see Task 10).
- Device pixel ratio capped at **1.5** (`high`), **1** (`mid`). Tiers: `high | mid | still`. A 1s FPS probe **demotes one tier if < 45 fps**.
- Amber accent **`#f2b35c`** appears only as: the star, primary CTA fill, flight-rail progress dot, cursor ring over CTA. All 3D geometry other than the star is **monochrome white on black**.
- Typography: display **Styrene A** (existing self-hosted) with `var(--font-space-grotesk)` fallback; instrument text **JetBrains Mono** via `var(--font-jetbrains-mono)`. Hero H1 `clamp(3.5rem, 8vw, 8rem)`, weight 500, letter-spacing −0.02em, line-height 0.95.
- Glass panel: border `1px solid rgba(255,255,255,.08)`, `backdrop-filter: blur(18px)`, background `rgba(10,10,10,.55)`, inner top highlight `rgba(255,255,255,.06)`, radius 20px.
- DOM motion: fade-up 12px, 0.5s, ease `[0.2, 0.7, 0.2, 1]`. Nothing bounces.
- FOV **60° → 70°** with scroll velocity. Camera **never reverses**: position `z` is non-increasing along the path and the forward vector always has negative `z`.
- `distanceAU` is monotonically non-increasing with progress and is `0` from chapter `pilot` onward.
- Scroll geometry: `VOYAGE_SCROLL_VH = 1250` is the scrollable range, and the final section carries an extra `VOYAGE_TAIL_VH = 100` so the track is 1350vh and `scrollHeight - innerHeight === VOYAGE_SCROLL_VH`. That identity is required: the store's progress is `scrollY / (scrollHeight - innerHeight)`, so sharing one denominator with the section offsets is what makes chapter `c` begin at document offset `c.start * VOYAGE_SCROLL_VH` and `scrollTo(c.start)` land on the section it names. 1250 is the minimum that still lets the smallest content span (0.08) clear the 100vh `.chapter__pin`, which cannot stick inside a shorter parent — total travel is 12.5 viewports + 1 tail. Section heights come from `sectionHeightVh(chapter)`, never from an inline `(end - start) * VOYAGE_SCROLL_VH`.
- `prefers-reduced-motion`: tier `still`, no Lenis, no camera motion, Ignition skipped, Letterbox never shown.
- Ignition ≤ 1.2s, skippable (click / Escape / Enter / Space), plays once per session (`sessionStorage["voyage-ignition-played"]`).
- No `TypewriterText`, no keystroke sounds anywhere in new code.
- `/admin` and `/work/*` never mount the scene. `GlobalOverlays` already excludes `/admin`.
- Copy is data-driven: hero headline/subheadline come from `Settings` (new fields with defaults). Admin inputs for them are sub-project 2.
- Structured logs: client events POST to `/api/logs`, appended as JSON lines to `logs/<name>.jsonl` when the filesystem is writable.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. This trailer is the executing session's attribution and is settled by the controller; implementers use it verbatim even if their own harness reminder names a different model.

### Global Constraints additions for slice 3

- Client/server boundary: no `"use client"` file imports `@/lib/collections` (index) or `defineCollection.ts`/`markdown.ts`/`mail.ts` **as values**. A type-only `import type { Item } from "@/lib/collections/defineCollection"` is erased at compile time and is the established pattern (`src/app/admin/components/types.ts:23`, and `VoyageRoot.tsx:5` already type-imports `Settings` from the mongoose-importing `@/lib/data`). Client code narrows `Item` at the leaf (`Array.isArray(...) ? ... : []`, `typeof x === "string" ? x : ""`).
- Structured logging only: server `appendLog`, client `logClient` with events added to `LOG_EVENTS` in `src/lib/clientLog.ts` (`/api/logs/route.ts` imports that same array, so there is nothing to mirror by hand). No `console.*` in app code. Slice 3 adds `voyage.jump`.
- `/voyage` stays `noindex`; `/work/[slug]` stays `noindex`; flip together at launch.
- New set pieces: own `mulberry32(seed)` (never share Starfield's 1337 sequence), `update()` is a no-op before `build()`, `dispose()` idempotent, tier counts live in `TierSettings` with a matching `quality.test.ts` assertion.
- New voyage DOM: `useVoyage()` for reveals; continuous scroll-derived motion via inline `style`, framer `animate` only for boolean-gated reveals; module-scope handlers; `sectionHeightVh(chapter)` for heights; `.chapter__pin` only on content chapters.
- Never mutate `streakLength`/`streakOpacity`/`CHAPTERS`/`POSITION_POINTS`/`LOOKAT_POINTS`/`VOYAGE_SCROLL_VH`/tuned constants (`STAR_SCALE_MAX`, `LAUNCH_LOOK_OFFSET`, `GLOW_MIN`) in slice 3.

---

## Decisions and spec deviations

These are binding. Do not reopen them; if execution surfaces a contradiction, stop and report it rather than re-deciding.

1. **Q1 — Services panels are data-driven N, tuned for 3.** The CMS collection has no count cap, so the arc geometry is computed from `services.length`. The panel renders whatever the CMS returns: **0–4 outcomes** and a **blank engagement line** are both legal and must render correctly. No schema change in slice 3.
2. **Q2 — The Jump beat fires on forward organic crossings, every time.** Forward crossing is `prevIndex < jumpIndex && nextIndex >= jumpIndex` (NOT `next.id === "jump"` — one native-scroll emit can carry approach → orbit and the store never reports `"jump"`). It **never** fires backward, and it is **suppressed while a programmatic `scrollTo` is in flight**.
3. **Q3 — Polish is additive sprites + the existing whoosh only.** No `EffectComposer`/bloom (would be the first post-processing in the repo and touches DPR capping, resize and dispose). No second ambient filter sweep — `playWhoosh({ direction: 1 })` is already an upward 400→3200 Hz sweep (`synths.ts:92-94`), and a scripted ramp on `scrollFilter.frequency` would be clobbered by `setScrollEnergy` on the next scroll emit.
4. **Q4 — Playwright integration tests are DEFERRED to slice 8.** This is a recorded deviation from spec §7 ("Integration (Playwright): scroll to each chapter → its panel is visible…"). Slice 3 is verified by unit tests + chrome-devtools browser review. Playwright *as a screenshot driver* in Task 10 is fine; a Playwright *test suite* is out of scope.
5. **Jump stays 25vh** (`0.20–0.22`). Spec §3's "~0.4s of scroll" is feel language for that span. `CHAPTERS` is not touched — `flightPath.test.ts:63-69` pins `offset === start * VOYAGE_SCROLL_VH` for every chapter, so zeroing or removing Jump breaks every chapter after it.
6. **No camera snap.** Spec §3's "cut to Orbit" is delivered by the curve (Jump's z-slope is ~5× Approach's) plus the letterbox. `SceneRoot`'s `POSE_LERP = 0.08` is untouched. Whether the (28, −18, −10) lookAt swing reads as a cut or a smear is a **browser-review item** (Task 10); only if the review says "smear" does a one-frame `smoothPos.copy(pose.position)` become a task.
7. **Glare is combined via `max`.** `uGlare = max(this.glare, jumpGlare(chapterProgress))`. `setGlare` keeps its meaning for The Pilot (slice 7) and `EnergyOrb.test.ts:37-47` stays green. The same `max` pattern is used for `Starfield`'s soften.
8. **`animated` prop.** Every new DOM component takes `animated: boolean` from `VoyageRoot` (`tier !== "still"`). `voyageStore` is tier-agnostic and *does* report `chapter.id === "jump"` in `still`, so the new DOM/audio must gate itself.
9. **The Jump `<section>` gets NO `aria-label`.** It is an empty region; a labelled empty landmark is a screen-reader dead end (commit 4341620).
10. **Commit trailer** on every commit in this plan, verbatim: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. This line overrides any attribution the executing agent's own harness supplies — the slice must land with one consistent trailer.
11. **Recorded deviation — `Starfield`'s chapter soften is a second field, not a `setSoften` call.** `slice3-decisions.md:17` says the focus pull is "driven from inside `Starfield.update()`"; this plan instead adds a separate `chapterSoften` field combined with `soften` by `max` inside `applyControls` (Task 5). A literal `setSoften()` call from `update()` would clobber The Pilot's control every frame and redden `Starfield.test.ts:30-48`, which calls `setSoften` + `applyControls` directly.
12. **Recorded deviation — the Jump edge detector is extracted to `useJumpBeat.ts`.** `slice3-decisions.md:12` puts it in `VoyageRoot` as a `useEffect` with one `programmaticInFlight`; this plan puts the subscription in `src/components/voyage/useJumpBeat.ts` (Task 9) and splits the flag into `prevProgrammatic`/`nextProgrammatic` (Task 2), because the emit that clears the flag can be the same emit that carries the crossing.

Items 11 and 12 record deviations already justified inside their tasks; they are not new tunables and add nothing to re-decide.

### ⚠ FLAGGED — pin geometry vs. "dock over the first ~50%"

`sectionHeightVh(approach) = (0.20 − 0.08) × 1250 = 150vh`, and `.chapter__pin` is `position: sticky; top: 0; height: 100vh` (`voyage.css:57-61`). A sticky child sticks until its bottom reaches its container's bottom, i.e. for `150 − 100 = 50vh` of scroll. Approach's `chapterProgress` runs 0 → 1 over the full 150vh, so:

> **the pin is stationary only for `chapterProgress ∈ [0, 1/3]` (progress 0.08 → 0.12). From `chapterProgress = 1/3` on, the panel block scrolls up out of frame and is fully gone by `chapterProgress = 1`.**

The decisions file says "desktop: all panels dock over the first ~50% of chapterProgress" and "mobile: panel i active for `[i/N, (i+1)/N)`". Taken literally, the last desktop panel would dock while the block is already leaving, and mobile panels 2 and 3 would play 50–100vh above the viewport. This plan therefore implements:

- **Desktop:** docking completes by `chapterProgress = 0.28` (inside the hold), staggered; `chapterProgress 0.28 → 1/3` is the held, fully-docked frame; past `1/3` the block exits naturally.
- **Mobile (<768px):** a **64vh pin** for the Approach chapter only (`150 − 64 = 86vh` of hold → `chapterProgress ∈ [0, 0.573]`), with the replacement windows spanning `chapterProgress ∈ [0.04, 0.56]`. `sectionHeightVh` is untouched, so the offset identity and `flightPath.test.ts` are unaffected — only the pin's CSS height changes, and a *shorter* pin needs *less* scroll to clear, so the `VOYAGE_SCROLL_VH = 1250` minimum still holds.
- **GAP-6 mobile consequence:** the decisions file's mobile panel captures (p10 / p14 / **p18**) are re-derived as **p10 / p12 / p14** — approach `chapterProgress = (P − 0.08) / 0.12`, so those three are 1/6, 1/3 and 1/2, one panel each. p18 is `chapterProgress 0.833`, past `SOLO_END = 0.56`, and would photograph an empty pin. The other GAP-6 points (p08, p16, p195, p23) are captured on mobile **unchanged** — mobile is the only capture set at tier `mid`, so dropping them would leave that tier with no baseline for chapter entry, pin release, pre-jump or post-jump. Task 11 Step 5 amends `slice3-decisions.md:18` and `:31` to match.

Every number in Tasks 5, 6, 8 and 10 is derived from this. **The controller reviews this at Task 10 and may retune the constants; the structure does not change.**

---

## Execution amendments (2026-10-10, recorded after the browser review)

- **Task 3:** `converge` is an eased private field (`dt*6`, `max` with `hyperConverge` inside the band), not a per-frame local — the brief's local snapped from ≈0.55 to 0 on the first frame after Jump while streaks were still ≈60 units long. Same-instance exit test added.
- **Task 4:** burst opacity is `jump * ctx.ignite` (the brief's design note), not the snippet's `jump`.
- **Task 8:** the mobile crossfade width is capped at `SOLO_START` in absolute terms (a lone or paired panel otherwise faded in before the chapter started); faded-out panels get `pointer-events: none`; the fade-out now ends at cp 0.60 (0.027 past the pin release — accepted).
- **Task 9:** the hook uses `performance.now()`; its effect cleanup also resets the Jump letterbox.
- **Task 10 retunes:** `voyage.css` declares `-webkit-backdrop-filter` before `backdrop-filter` at all four sites (lightningcss dropped the standard property — no glass had blurred since slice 1); Topology `OFFSET_Z −34→−24`, `OFFSET_X −2.6→−0.9`; mobile Approach pin `padding-top: 4.5rem`; still-tier mobile panels `flex: 0 0 auto; overflow: visible`. Baselines: `screenshots/voyage/slice-3/` (16 files).
- **Execution shape:** Tasks 2–8 ran in parallel git worktrees (user directive), each independently reviewed; Task 9 sequential; Task 10 run by the controller.

## Deferred to execution review (from plan review)

The plan review (`.superpowers/sdd/slice3-plan-review.md`) left seven Minor findings unfixed on purpose: each is either a judgement call the controller makes with the live page in hand, or a change better made once the code exists. Recorded here so they survive into execution rather than being rediscovered.

1. **Task 8 is above the reviewable size ceiling** — roughly 440 lines of diff in 11 steps, bundling three independently rejectable deliverables. Steps 1–4 already form a complete red→green cycle on the pure math, so that is the split point. Splitting renumbers Tasks 9–11 and two cross-references, so it is a decision to take **before Task 1** or not at all.
2. **Confirm the captures land where the table says.** Task 10 Step 2 drives native `window.scrollTo` while Lenis owns the position (`VoyageScroll.tsx:27`, `autoRaf: true`). Have the same `evaluate_script` return `document.documentElement.scrollTop / (scrollHeight − innerHeight)` and require it within ~0.002 of `P` before screenshotting. Confirm at capture time, not now.
3. **The render-order comment in Task 6 Step 7 is factually wrong.** "the orb stays last so the star draws over the graph" — `EnergyOrb`'s `ShaderMaterial` sets no `transparent` flag, so three renders it in the **opaque** pass, before every transparent piece; the array order only sets `update()` order. The outcome is still correct (Topology is transparent, `depthWrite: false` and nearer the camera), so this is a comment to correct when the file is written, not a behaviour change.
4. **Topology has zero parallax.** It is rigidly parented to the camera while `SceneRoot.tsx:150` folds mouse parallax into `camera.position`, so it may read as a flat HUD overlay against a scene where everything else moves. A damped `lerp` toward the camera-relative target, seeded on the first frame where `fade > 0.001`, is still zero-allocation. Browser-review call (Task 10 Step 5 item 3).
5. **The star flare has no relaxation tail.** On a fast flick `jump` can step from ~0.95 to 0 in a single frame, popping a ~200px sprite off while the bars are still down. A `jumpEnv = Math.max(jump, jumpEnv - dt / 0.45)` field would keep every existing single-frame test green. Browser-review call (Task 10 Step 5 item 10), and related to the letterbox hold.
6. **Two small a11y items in Task 8's shipped DOM.** `<h2>` renders unconditionally while `readService` narrows a missing CMS title to `""` — an `empty-heading` violation, and the plan's own test pins that empty string; and the mobile panel's `overflow-y: auto` creates a scroll region with no `tabIndex`, so it cannot be reached from the keyboard. The heading half is a two-line edit (`{title !== "" && <h2 …>}` plus `expect(panel.querySelector("h2")).toBeNull()`) if the controller wants it now. Neither is measured before slice 8's Lighthouse run.
7. **Two of the six Global Constraints additions are reworded rather than copied** from `slice3-decisions.md:37-38` (the client/server boundary bullet and the structured-logging bullet). Both rewrites are factually correct against source and the other four bullets are verbatim, so this is marked rather than changed — the drift is deliberate, not accidental.

---

## File Structure

| Path | Responsibility | New / Modified |
|---|---|---|
| `src/scene/scroll/voyageStore.ts` | Adds a `programmatic` flag to `VoyageState`, set by `scrollTo` and cleared three ways | Modified |
| `src/scene/scroll/voyageStore.test.ts` | Tests for the three programmatic exits | Modified |
| `src/components/voyage/jumpBeat.ts` | Pure decision function for the chapter-03 edge detector — no React, no store | **New** |
| `src/components/voyage/jumpBeat.test.ts` | Full crossing/suppression/hold matrix | **New** |
| `src/scene/chapters/WarpStreaks.ts` | Adds `hyperLength`/`hyperOpacity`/`hyperConverge` + a chapter-gated hyperspace branch | Modified |
| `src/scene/chapters/WarpStreaks.test.ts` | Hyperspace curves + zero-velocity reaction + approach-range regression | Modified |
| `src/scene/chapters/EnergyOrb.ts` | Adds `jumpGlare` + the additive burst sprite | Modified |
| `src/scene/chapters/EnergyOrb.test.ts` | Glare curve + `max` combination | Modified |
| `src/scene/chapters/Starfield.ts` | Adds `approachSoften` + a chapter-driven soften channel | Modified |
| `src/scene/chapters/Starfield.test.ts` | Soften window + eased drive + release | Modified |
| `src/scene/chapters/Topology.ts` | Chapter-02 set piece: seeded node/edge graph that assembles by draw range | **New** |
| `src/scene/chapters/Topology.test.ts` | Tier counts, determinism, assembly, lifecycle | **New** |
| `src/scene/quality.ts` | `TierSettings.topologyNodes` | Modified |
| `src/scene/quality.test.ts` | Assertion for the new tier field | Modified |
| `src/scene/SceneRoot.tsx` | Registers `Topology` in the set-piece array | Modified |
| `src/app/voyage/page.tsx` | `getSettings()` → `getVoyageContent()` | Modified |
| `src/lib/data.voyage.test.ts` | Thin `getVoyageContent` test with mocked collections | **New** |
| `src/components/voyage/servicesLayout.ts` | Pure panel-pose math (dock / arc / tilt / solo) | **New** |
| `src/components/voyage/servicesLayout.test.ts` | Pose math under node env | **New** |
| `src/components/voyage/Services.tsx` | Chapter 02 DOM: glass panels, leaf narrowing, empty states | **New** |
| `src/components/voyage/Services.test.tsx` | jsdom RTL render test | **New** |
| `src/components/voyage/useJumpBeat.ts` | Thin store-subscription wrapper around `decideJumpBeat` | **New** |
| `src/components/voyage/VoyageRoot.tsx` | Threads `services`, renders `<Services>` + the bare Jump section, ORs the letterbox | Modified |
| `src/lib/clientLog.ts` | Adds `voyage.jump` to `LOG_EVENTS` | Modified |
| `src/app/api/logs/route.test.ts` | Pins that `LOG_EVENTS` and the route stay in step for `voyage.jump` | Modified |
| `src/app/voyage/voyage.css` | Service panel styles, mobile pin override, `.chapter--micro` | Modified |
| `worklog.md` / `insights.md` / `design.md` | Slice-3 record | Modified |

---

### Task 1: `voyageStore` — the `programmatic` flag

**Files:**
- Modify: `src/scene/scroll/voyageStore.ts`
- Test: `src/scene/scroll/voyageStore.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  ```ts
  export interface VoyageState { /* …existing fields… */ programmatic: boolean }
  export const PROGRAMMATIC_EPS = 0.002;
  export const PROGRAMMATIC_TIMEOUT_MS = 2000;
  ```
  `voyageStore.scrollTo(progress)` now arms the flag; `voyageStore.setScroll(progress, velocity)` clears it.

**Why:** Launch's `Book a call` CTA (`Launch.tsx:24-27`) scrolls from ~0 to 0.841, and the dock's Process link scrolls to 0.22 — both sweep the 0.20–0.22 Jump band. Decision 2 says those must not fire the beat.

- [ ] **Step 1: Write the failing tests**

Append to `src/scene/scroll/voyageStore.test.ts` (keep the existing `import` line and add `afterEach`; the new import list is `{ describe, it, expect, beforeEach, afterEach, vi }`):

```ts
// Fake timers mock Date by default in vitest, which is why the store reads Date.now()
// and not performance.now() — the timeout exit has to be drivable from a test.
afterEach(() => vi.useRealTimers());

describe("voyageStore.programmatic", () => {
  it("is false at rest", () => {
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("scrollTo arms the flag and setScroll clears it within EPS of the target", () => {
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.5);
    expect(voyageStore.getState().programmatic).toBe(true);

    // Still travelling: nowhere near the target.
    voyageStore.setScroll(0.3, 0.6);
    expect(voyageStore.getState().programmatic).toBe(true);

    // Landed (within PROGRAMMATIC_EPS).
    voyageStore.setScroll(0.5 - PROGRAMMATIC_EPS / 2, 0.1);
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("clears on the wall-clock timeout when the scroller never reaches the target", () => {
    vi.useFakeTimers();
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.9);
    voyageStore.setScroll(0.3, 0.6);
    expect(voyageStore.getState().programmatic).toBe(true);

    vi.advanceTimersByTime(PROGRAMMATIC_TIMEOUT_MS + 1);
    voyageStore.setScroll(0.31, 0.6);
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("a later scrollTo replaces the target", () => {
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.5);
    voyageStore.scrollTo(0.84);
    // The first target is reached, but it is no longer the target.
    voyageStore.setScroll(0.5, 0.4);
    expect(voyageStore.getState().programmatic).toBe(true);
    voyageStore.setScroll(0.84, 0.05);
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("does not arm without a registered scroller (nothing will move)", () => {
    voyageStore.scrollTo(0.5);
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("does not arm when the reader is already at the target", () => {
    // The dock's Process link clicked while already in Approach: no movement means no scroll
    // event, which means no setScroll, which means nothing could ever clear the flag — and a
    // genuine organic flick through the Jump band would be suppressed for the full 2s.
    const scroller = vi.fn();
    voyageStore.registerScroller(scroller);
    voyageStore.scrollTo(voyageStore.getState().progress);
    expect(voyageStore.getState().programmatic).toBe(false);
    // The scroller is still called — the position is re-asserted, it is only the flag that
    // is skipped.
    expect(scroller).toHaveBeenCalledTimes(1);
  });

  it("emits the flag to subscribers", () => {
    const cb = vi.fn();
    voyageStore.registerScroller(vi.fn());
    voyageStore.subscribe(cb);
    voyageStore.scrollTo(0.5);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].programmatic).toBe(true);
    voyageStore.setScroll(0.5, 0);
    expect(cb.mock.calls[1][0].programmatic).toBe(false);
  });

  it("reset() disarms a scroll in flight", () => {
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.5);
    voyageStore.reset();
    expect(voyageStore.getState().programmatic).toBe(false);
    voyageStore.setScroll(0.3, 0.2);
    expect(voyageStore.getState().programmatic).toBe(false);
  });
});
```

Extend the top import to:
```ts
import { voyageStore, normalizeVelocity, VELOCITY_NORMALIZER, PROGRAMMATIC_EPS, PROGRAMMATIC_TIMEOUT_MS } from "./voyageStore";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scene/scroll/voyageStore.test.ts`
Expected: FAIL — all **8** new tests in `describe("voyageStore.programmatic")` fail. Seven fail on `AssertionError: expected undefined to be false` / `…to be true`, because `VoyageState` has no `programmatic` field yet; `emits the flag to subscribers` fails on `AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times`, because today's `scrollTo` does not emit. The two missing constants do not error on their own: under vitest 5 a not-yet-exported name imports as `undefined` and the file still collects, so the two tests that read `PROGRAMMATIC_EPS` / `PROGRAMMATIC_TIMEOUT_MS` fail on an earlier assertion first. All **11** pre-existing tests in the file still pass.

- [ ] **Step 3: Implement the flag in `src/scene/scroll/voyageStore.ts`**

Add `programmatic` to the interface (after `elapsedMs`):
```ts
  /** Wall-clock ms since the voyage mounted (drives the T+ readout). */
  elapsedMs: number;
  /** True while a voyageStore.scrollTo() is still travelling to its target. Chapter-edge
   *  detectors read it so a CTA that scrolls *through* a micro-beat does not fire it. */
  programmatic: boolean;
```

Add the constants and module state after `normalizeVelocity` (around `:30`):
```ts
/** How close a settled scroll must land to the programmatic target before the flag clears. */
export const PROGRAMMATIC_EPS = 0.002;

/** Hard ceiling on one programmatic scroll. Lenis animates for 1.4s (VoyageScroll.tsx:39)
 *  and its lerp tail can stall short of the target; without this exit an interrupted
 *  scrollTo would suppress the Jump beat for the rest of the session. */
export const PROGRAMMATIC_TIMEOUT_MS = 2000;

let programmaticTarget: number | null = null;
let programmaticDeadlineMs = 0;

/** Three exits: within EPS of the target, past the deadline, or replaced by a later
 *  scrollTo (which simply overwrites the target and the deadline). */
function resolveProgrammatic(p: number): boolean {
  if (programmaticTarget === null) return false;
  if (Math.abs(p - programmaticTarget) < PROGRAMMATIC_EPS || Date.now() >= programmaticDeadlineMs) {
    programmaticTarget = null;
    return false;
  }
  return true;
}
```

Add `programmatic: false,` to `initialState()` (after `elapsedMs: 0,`).

Replace `setScroll` with:
```ts
  setScroll(progress: number, velocity01: number): void {
    const p = clamp01(progress);
    const v = clamp01(velocity01);
    // Resolved before the no-change guard: the emit that lands on the target is often
    // bit-identical to the previous one, and the flag still has to clear on it.
    const prog = resolveProgrammatic(p);
    if (p === state.progress && v === state.velocity && prog === state.programmatic) return;
    const { chapter, chapterProgress } = chapterAt(p);
    state = { ...state, progress: p, velocity: v, chapter, chapterProgress, distanceAU: distanceAU(p), programmatic: prog };
    emit();
  },
```

Replace `scrollTo` with:
```ts
  scrollTo(progress: number): void {
    // No scroller means nothing will move, so there is no programmatic travel to suppress.
    if (!scroller) return;
    const p = clamp01(progress);
    // Already there: no scroll event will fire, so nothing would ever clear the flag.
    if (Math.abs(p - state.progress) < PROGRAMMATIC_EPS) { scroller(p); return; }
    programmaticTarget = p;
    programmaticDeadlineMs = Date.now() + PROGRAMMATIC_TIMEOUT_MS;
    if (!state.programmatic) {
      state = { ...state, programmatic: true };
      emit();
    }
    scroller(p);
  },
```

Extend `reset()`:
```ts
  reset(): void {
    state = initialState();
    listeners.clear();
    scroller = null;
    programmaticTarget = null;
    programmaticDeadlineMs = 0;
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/scene/scroll/voyageStore.test.ts`
Expected: PASS — all tests in the file pass (8 new): 19 total (11 pre-existing + 8 new). Both scroll bridges in `VoyageScroll.tsx` (Lenis `lenis.on("scroll", …)` at `:31-38` and the native `onScroll` at `:49-62`) call `setScroll` on every emit, so the clearing path runs in both.

- [ ] **Step 5: Verify nothing else broke**

Run: `npx vitest run && npx tsc --noEmit`
Expected: the full suite passes (313 + 8 = 321 tests) and `tsc` reports 0 errors. `telemetryFormat.ts:16` takes `Pick<VoyageState, …>`, so a new field is additive there.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/scroll/voyageStore.ts src/scene/scroll/voyageStore.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): programmatic scroll flag on voyageStore

scrollTo arms it; setScroll clears it within EPS of the target, on a 2s
wall-clock timeout, or when a later scrollTo replaces the target. Chapter-edge
detectors read it so a CTA that scrolls through a micro-beat cannot fire it.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `jumpBeat.ts` — the pure edge-detector decision

**Files:**
- Create: `src/components/voyage/jumpBeat.ts`
- Test: `src/components/voyage/jumpBeat.test.ts`

**Interfaces:**
- Consumes: `CHAPTERS`, `ChapterId` from `@/scene/camera/flightPath`.
- Produces:
  ```ts
  export const JUMP_HOLD_MS = 900;
  export const JUMP_INDEX: number;
  export function chapterIndex(id: ChapterId): number;
  export interface JumpBeatInput {
    prevIndex: number; nextIndex: number;
    prevProgrammatic: boolean; nextProgrammatic: boolean;
    nowMs: number; holdUntilMs: number;
  }
  export interface JumpBeatResult { fire: boolean; letterbox: boolean; holdUntilMs: number }
  export function decideJumpBeat(input: JumpBeatInput): JumpBeatResult;
  ```

**Why `prevProgrammatic` *and* `nextProgrammatic`:** the emit that lands within `PROGRAMMATIC_EPS` of the target is the emit that clears the flag — and it can be the same emit that carries the crossing (native scroll lands instantly; one Lenis step can cover 25vh). Reading only the new state would fire the beat on the last frame of a programmatic scroll. ORing the two states inside the pure function keeps that case under test.

- [ ] **Step 1: Write the failing test**

`src/components/voyage/jumpBeat.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import type { ChapterId } from "@/scene/camera/flightPath";
import { decideJumpBeat, chapterIndex, JUMP_INDEX, JUMP_HOLD_MS, type JumpBeatInput } from "./jumpBeat";

const at = (id: ChapterId) => chapterIndex(id);

const input = (o: Partial<JumpBeatInput>): JumpBeatInput => ({
  prevIndex: at("launch"),
  nextIndex: at("launch"),
  prevProgrammatic: false,
  nextProgrammatic: false,
  nowMs: 10_000,
  holdUntilMs: 0,
  ...o,
});

describe("chapterIndex", () => {
  it("maps ids to their position in CHAPTERS", () => {
    expect(at("launch")).toBe(0);
    expect(at("approach")).toBe(1);
    expect(at("jump")).toBe(2);
    expect(at("orbit")).toBe(3);
    // A literal, not `at("jump")` — both sides of that would be the same call, which is
    // vacuous for any implementation of chapterIndex.
    expect(JUMP_INDEX).toBe(2);
  });
});

describe("decideJumpBeat — forward crossings", () => {
  it("fires on approach → jump", () => {
    const r = decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("jump") }));
    expect(r.fire).toBe(true);
    expect(r.letterbox).toBe(true);
    expect(r.holdUntilMs).toBe(10_000 + JUMP_HOLD_MS);
  });

  it("fires on approach → orbit, where the store never reports jump", () => {
    // One native-scroll emit can carry the whole 25vh band.
    expect(decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("orbit") })).fire).toBe(true);
  });

  it("fires on launch → landing (a flick past everything)", () => {
    expect(decideJumpBeat(input({ prevIndex: at("launch"), nextIndex: at("landing") })).fire).toBe(true);
  });
});

describe("decideJumpBeat — non-firing cases", () => {
  it("never fires backward", () => {
    expect(decideJumpBeat(input({ prevIndex: at("orbit"), nextIndex: at("approach") })).fire).toBe(false);
    expect(decideJumpBeat(input({ prevIndex: at("jump"), nextIndex: at("approach") })).fire).toBe(false);
    expect(decideJumpBeat(input({ prevIndex: at("orbit"), nextIndex: at("launch") })).fire).toBe(false);
  });

  it("does not re-fire once already inside or past the band", () => {
    expect(decideJumpBeat(input({ prevIndex: at("jump"), nextIndex: at("orbit") })).fire).toBe(false);
    expect(decideJumpBeat(input({ prevIndex: at("orbit"), nextIndex: at("worlds") })).fire).toBe(false);
  });

  it("does not fire without a crossing", () => {
    expect(decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("approach") })).fire).toBe(false);
  });

  it("is suppressed while a programmatic scroll is in flight", () => {
    expect(decideJumpBeat(input({
      prevIndex: at("launch"), nextIndex: at("landing"), nextProgrammatic: true,
    })).fire).toBe(false);
  });

  it("is suppressed when the flag cleared on the very emit that crossed", () => {
    expect(decideJumpBeat(input({
      prevIndex: at("approach"), nextIndex: at("orbit"),
      prevProgrammatic: true, nextProgrammatic: false,
    })).fire).toBe(false);
  });
});

describe("decideJumpBeat — minimum hold", () => {
  it("renews the hold on every in-band emit, without re-firing", () => {
    const first = decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("jump") }));
    expect(first.holdUntilMs).toBe(10_000 + JUMP_HOLD_MS);
    // An idle tick 400ms later, still inside the band: no crossing, bars still down, and the
    // deadline pushed out — a pass slower than 225 px/s must not lift the bars mid-burst.
    const idle = decideJumpBeat(input({
      prevIndex: at("jump"), nextIndex: at("jump"),
      nowMs: 10_400, holdUntilMs: first.holdUntilMs,
    }));
    expect(idle.fire).toBe(false);
    expect(idle.letterbox).toBe(true);
    expect(idle.holdUntilMs).toBe(10_400 + JUMP_HOLD_MS);
  });

  it("retracts once the hold has expired outside the band", () => {
    // Default prev/next are launch, so nothing renews: the deadline stands and lapses.
    const r = decideJumpBeat(input({ nowMs: 10_000 + JUMP_HOLD_MS, holdUntilMs: 10_000 + JUMP_HOLD_MS }));
    expect(r.letterbox).toBe(false);
    expect(r.holdUntilMs).toBe(10_000 + JUMP_HOLD_MS);
  });

  it("stops renewing the moment the band is left", () => {
    // jump → orbit inside the hold: the bars are still down on this emit, but the deadline
    // is frozen, so they come up JUMP_HOLD_MS after the reader left the band, not after
    // they entered it.
    const r = decideJumpBeat(input({
      prevIndex: at("jump"), nextIndex: at("orbit"),
      nowMs: 10_300, holdUntilMs: 10_900,
    }));
    expect(r.letterbox).toBe(true);
    expect(r.holdUntilMs).toBe(10_900);
  });

  it("a second crossing inside the hold does not re-fire", () => {
    const r = decideJumpBeat(input({
      prevIndex: at("approach"), nextIndex: at("jump"),
      nowMs: 10_300, holdUntilMs: 10_900,
    }));
    expect(r.fire).toBe(false);
    expect(r.letterbox).toBe(true);
    // Still in-band inside the hold, so the deadline renews rather than staying at 10_900.
    expect(r.holdUntilMs).toBe(10_300 + JUMP_HOLD_MS);
  });

  it("re-arms for a fresh crossing after the hold expires", () => {
    const r = decideJumpBeat(input({
      prevIndex: at("approach"), nextIndex: at("jump"),
      nowMs: 20_000, holdUntilMs: 10_900,
    }));
    expect(r.fire).toBe(true);
    expect(r.holdUntilMs).toBe(20_000 + JUMP_HOLD_MS);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/voyage/jumpBeat.test.ts`
Expected: FAIL — `Error: Cannot find module './jumpBeat' imported from /Users/admin/Codes-2/portfolio/src/components/voyage/jumpBeat.test.ts`, and vitest lists the file as `(0 test)`. The file is new, so all **14** of its tests are new and none of them runs: an unresolved import fails the file at collection time rather than producing 14 individual failures. There are no pre-existing tests in this file to keep green.

- [ ] **Step 3: Implement `src/components/voyage/jumpBeat.ts`**

```ts
import { CHAPTERS, type ChapterId } from "@/scene/camera/flightPath";

/**
 * *Minimum* wall-clock hold for the Jump letterbox, in ms. Letterbox.tsx:7 runs a 0.45s
 * transition each way, and a fast flick crosses the chapter's 25vh in well under that — so
 * the bars need a clock floor rather than a chapterProgress window. They also need a scroll
 * floor: the effective hold is `max(JUMP_HOLD_MS, the rest of the band)`, because every
 * in-band emit renews the deadline (see decideJumpBeat). Fast pass → the clock wins; slow or
 * keyboard pass → the band wins. The whoosh is not on this clock at all: it is a one-shot
 * 0.4s SFX fired once on the crossing edge.
 */
export const JUMP_HOLD_MS = 900;

/** Position of a chapter in CHAPTERS. */
export function chapterIndex(id: ChapterId): number {
  return CHAPTERS.findIndex((c) => c.id === id);
}

export const JUMP_INDEX = chapterIndex("jump");

export interface JumpBeatInput {
  /** Index of the chapter reported by the previous emit. */
  prevIndex: number;
  /** Index of the chapter reported by this emit. */
  nextIndex: number;
  /** voyageStore.programmatic as of the previous emit. */
  prevProgrammatic: boolean;
  /** voyageStore.programmatic as of this emit. */
  nextProgrammatic: boolean;
  nowMs: number;
  /** Wall-clock deadline of the hold currently in force (0 = none). */
  holdUntilMs: number;
}

export interface JumpBeatResult {
  /** One-shot: play the whoosh and log. */
  fire: boolean;
  /** Should the cinematic bars be down right now. */
  letterbox: boolean;
  /** Carry this back in as holdUntilMs on the next emit. */
  holdUntilMs: number;
}

/**
 * Chapter 03's whole decision, as one pure function.
 *
 * "Entered Jump forward" is an index comparison, not `id === "jump"`: a single emit can
 * carry approach → orbit and the store never reports the micro-beat at all.
 * Backward passes never fire. A programmatic scrollTo in flight on *either* side of the
 * emit suppresses it — the emit that lands on the target is also the emit that clears the
 * flag, and it can be the one that crossed.
 *
 * The hold is the one piece of state that is not a pure function of this emit alone: it is
 * renewed on every in-band emit, so the bars come up `JUMP_HOLD_MS` after the reader *leaves*
 * the band rather than `JUMP_HOLD_MS` after they entered it.
 */
export function decideJumpBeat(input: JumpBeatInput): JumpBeatResult {
  const { prevIndex, nextIndex, prevProgrammatic, nextProgrammatic, nowMs, holdUntilMs } = input;
  const forward = prevIndex < JUMP_INDEX && nextIndex >= JUMP_INDEX;
  const programmatic = prevProgrammatic || nextProgrammatic;
  // nowMs >= holdUntilMs also stops a jittering scroll from re-triggering mid-hold.
  const fire = forward && !programmatic && nowMs >= holdUntilMs;
  // Once the beat has fired, the bars stay down for the *whole* band, not for a flat 900ms:
  // while the reader is still inside Jump, every emit (including VoyageScroll's 250ms idle
  // tick) pushes the deadline out again. The band is 225px at a 900px viewport, so any pass
  // slower than 225 px/s — every arrow-key pass, ~40px per press — would otherwise lift the
  // bars while hyperLength was still growing. A cold backward entry has `nowMs < holdUntilMs`
  // false, so decision 2 (never fire backward) is untouched.
  const inBand = nextIndex === JUMP_INDEX;
  const hold = fire
    ? nowMs + JUMP_HOLD_MS
    : inBand && nowMs < holdUntilMs ? nowMs + JUMP_HOLD_MS : holdUntilMs;
  return { fire, letterbox: nowMs < hold, holdUntilMs: hold };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/voyage/jumpBeat.test.ts`
Expected: PASS — all tests in the file pass (14 new).

- [ ] **Step 5: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/components/voyage/jumpBeat.ts src/components/voyage/jumpBeat.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): pure decision function for the Jump beat

Forward chapter-index crossings only (one emit can skip the micro-beat entirely),
never backward, suppressed on either side of a programmatic scroll, with a 900ms
wall-clock minimum hold for the letterbox.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `WarpStreaks` hyperspace mode

**Files:**
- Modify: `src/scene/chapters/WarpStreaks.ts`
- Test: `src/scene/chapters/WarpStreaks.test.ts`

**Interfaces:**
- Consumes: `FrameContext` (`ctx.voyage.chapter.id`, `ctx.voyage.chapterProgress`).
- Produces:
  ```ts
  export const HYPER_LENGTH_MAX = 60;
  export const HYPER_OPACITY_PEAK = 0.9;
  export const HYPER_CONVERGE_MAX = 0.55;
  export function hyperLength(t01: number): number;    // 0.4 → 60
  export function hyperOpacity(t01: number): number;   // 0 → 0.9 → 0
  export function hyperConverge(t01: number): number;  // 0 → 0.55
  ```
  `streakLength` / `streakOpacity` are **not touched** — `WarpStreaks.test.ts:11-21` and `:50-67` pin them.

**Why `max`, not replacement:** `hyperLength(0) === streakLength(0)` and `hyperOpacity(0) === 0`, so combining with `Math.max` makes both ends of the beat continuous with the velocity curves, and floors the tunnel if the reader stalls mid-beat (the `dt*6` ease would otherwise decay it back). Exit at `t = 1` relaxes through the existing ease — that relaxation *is* the cut.

- [ ] **Step 1: Write the failing tests**

Append to `src/scene/chapters/WarpStreaks.test.ts`, and extend its import to:
```ts
import {
  WarpStreaks, streakLength, streakOpacity,
  hyperLength, hyperOpacity, hyperConverge,
  HYPER_LENGTH_MAX, HYPER_OPACITY_PEAK, HYPER_CONVERGE_MAX,
} from "./WarpStreaks";
```

```ts
describe("hyperspace curves", () => {
  it("length starts where the velocity curve rests and ends at the tunnel maximum", () => {
    // Entry continuity: max(streakLength(v), hyperLength(0)) can never step down.
    expect(hyperLength(0)).toBeCloseTo(streakLength(0), 10);
    expect(hyperLength(1)).toBeCloseTo(HYPER_LENGTH_MAX, 5);
    expect(hyperLength(-1)).toBeCloseTo(streakLength(0), 10);
    expect(hyperLength(2)).toBeCloseTo(HYPER_LENGTH_MAX, 5);
    expect(hyperLength(0.5)).toBeGreaterThan(hyperLength(0.25));
    expect(hyperLength(0.5)).toBeLessThan(hyperLength(0.75));
  });

  it("opacity is zero at both ends and peaks mid-beat", () => {
    expect(hyperOpacity(0)).toBeCloseTo(0, 10);
    expect(hyperOpacity(1)).toBeCloseTo(0, 10);
    expect(hyperOpacity(0.5)).toBeCloseTo(HYPER_OPACITY_PEAK, 10);
    expect(hyperOpacity(-1)).toBeCloseTo(0, 10);
    expect(hyperOpacity(2)).toBeCloseTo(0, 10);
  });

  it("convergence grows monotonically and clamps", () => {
    expect(hyperConverge(0)).toBeCloseTo(0, 10);
    expect(hyperConverge(1)).toBeCloseTo(HYPER_CONVERGE_MAX, 10);
    expect(hyperConverge(-1)).toBeCloseTo(0, 10);
    expect(hyperConverge(2)).toBeCloseTo(HYPER_CONVERGE_MAX, 10);
    expect(hyperConverge(0.75)).toBeGreaterThan(hyperConverge(0.25));
  });
});

describe("WarpStreaks — chapter 03", () => {
  it("stretches at zero scroll velocity inside the Jump", () => {
    // The regression this pins: a deliberate slow scroll through the 25vh beat has
    // velocity ~0, so anything keyed off velocity would show no hyperspace at all.
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.21, 0);
    const cp = voyageStore.getState().chapterProgress;
    expect(voyageStore.getState().chapter.id).toBe("jump");
    streaks.update(makeFrame());

    const positions = streaks.geometry.getAttribute("position").array as Float32Array;
    // 3 places: the buffer is Float32, and the length is read back as a difference of two
    // world-space z values around -100.
    const length = positions[5] - positions[2];
    expect(length).toBeCloseTo(hyperLength(cp), 3);
    expect(length).toBeGreaterThan(streakLength(1));
    expect(streaks.material.opacity).toBeCloseTo(hyperOpacity(cp), 5);
  });

  it("converges the far end of each streak toward the flight axis", () => {
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.215, 0);
    const cp = voyageStore.getState().chapterProgress;
    streaks.update(makeFrame());

    const p = streaks.geometry.getAttribute("position").array as Float32Array;
    const headR = Math.hypot(p[0], p[1]);
    const tailR = Math.hypot(p[3], p[4]);
    expect(tailR).toBeGreaterThan(0);
    expect(headR / tailR).toBeCloseTo(1 - hyperConverge(cp), 5);
  });

  it("floors the tunnel with the velocity curves rather than replacing them", () => {
    // Entering the band at speed: max() must keep the velocity values, which are the larger
    // pair this early in the beat. A bare assignment of the hyperspace curves steps them
    // down — every other jump-band test here runs at velocity 0, where max() and a plain
    // assignment are bit-identical, so this is the only test that can tell them apart.
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.2005, 1); // chapterProgress 0.025
    streaks.update(makeFrame());

    expect(streaks.material.opacity).toBeCloseTo(streakOpacity(1), 5); // 0.65, not 0.0706
    const p = streaks.geometry.getAttribute("position").array as Float32Array;
    expect(p[5] - p[2]).toBeCloseTo(0.4 + (streakLength(1) - 0.4) * 0.1, 3); // 1.76, not 0.5099
  });

  it("fades the tunnel with the ignition curtain", () => {
    // The new ctx.ignite multiplier on the hyperspace opacity is unreachable from every other
    // test here, because makeFrame() defaults to ignite: 1 — dropping it would leave the suite
    // green while the tunnel blazed at full brightness behind the ignition curtain.
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.21, 0);
    const cp = voyageStore.getState().chapterProgress;
    streaks.update(makeFrame({ ignite: 0.5 }));
    expect(streaks.material.opacity).toBeCloseTo(hyperOpacity(cp) * 0.5, 5);
  });

  it("leaves the Approach range exactly as it was", () => {
    // Guards WarpStreaks.test.ts's existing velocity assertions from the new branch.
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.1, 1);
    expect(voyageStore.getState().chapter.id).toBe("approach");
    streaks.update(makeFrame());

    expect(streaks.material.opacity).toBeCloseTo(streakOpacity(1), 5);
    const p = streaks.geometry.getAttribute("position").array as Float32Array;
    expect(Math.hypot(p[0], p[1])).toBeCloseTo(Math.hypot(p[3], p[4]), 5);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scene/chapters/WarpStreaks.test.ts`
Expected: FAIL — `TypeError: hyperLength is not a function` (and its `hyperOpacity` / `hyperConverge` siblings): under vitest 5 a not-yet-exported name imports as `undefined`, so the file still collects and only the tests that call one fail. **6** of the **8** new tests fail on the missing exports. Two **pass** in red, by design: `leaves the Approach range exactly as it was` is a regression guard over the untouched velocity path, and `floors the tunnel with the velocity curves rather than replacing them` asserts exactly the values today's velocity-only code already produces — it exists to go red later, if someone replaces `max()` with an assignment. All **8** pre-existing tests in the file still pass.

- [ ] **Step 3: Add the curves to `src/scene/chapters/WarpStreaks.ts`**

Insert after `streakOpacity` (i.e. after `:14`):
```ts
const smooth = (t: number) => t * t * (3 - 2 * t);

/* ── Chapter 03: hyperspace ──────────────────────────────────────────────────
 * A separate curve family from streakLength/streakOpacity, which stay velocity-driven and
 * are pinned by tests. These are driven by chapterProgress instead: velocity is
 * instantaneous and sign-less (voyageStore.ts:28-30), so a slow deliberate scroll through
 * the 25vh beat would otherwise produce no hyperspace at all.
 */

/** Full tunnel length at the end of the beat, in world units. */
export const HYPER_LENGTH_MAX = 60;
/** Peak additive opacity of the tunnel. */
export const HYPER_OPACITY_PEAK = 0.9;
/** How far the far end of a streak is pulled toward the flight axis (0..1). */
export const HYPER_CONVERGE_MAX = 0.55;

/** Starts at streakLength(0) so max() with the velocity length is continuous on entry. */
export function hyperLength(t01: number): number {
  return 0.4 + (HYPER_LENGTH_MAX - 0.4) * smooth(clamp01(t01));
}

/** Zero at both ends so max() with the velocity opacity is continuous in and out. */
export function hyperOpacity(t01: number): number {
  return HYPER_OPACITY_PEAK * Math.sin(Math.PI * clamp01(t01));
}

/** The far end of each streak converges on the axis, so the field reads as a tunnel
 *  radiating from the vanishing point rather than a curtain of parallel lines. */
export function hyperConverge(t01: number): number {
  return HYPER_CONVERGE_MAX * smooth(clamp01(t01));
}
```

- [ ] **Step 4: Add convergence to `writePositions` and the chapter branch to `update`**

Replace `writePositions` (`:89-96`) with:
```ts
  /** `converge` 0..1 pulls the head (far end, most negative z) toward the flight axis while
   *  the tail keeps its full radius. build() always writes with 0, so the seeded layout
   *  assertions compare like with like. */
  private writePositions(converge = 0): void {
    const n = this.count;
    const k = 1 - converge;
    for (let i = 0; i < n; i++) {
      const x = this.heads[i * 3], y = this.heads[i * 3 + 1], z = this.heads[i * 3 + 2];
      this.positions[i * 6 + 0] = x * k; this.positions[i * 6 + 1] = y * k; this.positions[i * 6 + 2] = z;
      this.positions[i * 6 + 3] = x; this.positions[i * 6 + 4] = y; this.positions[i * 6 + 5] = z + this.length;
    }
  }
```

Replace `update` (`:98-113`) with:
```ts
  update(ctx: FrameContext): void {
    if (!this.lines || !this._geometry) return;
    const v = ctx.voyage.velocity;
    // ease toward the target length so a scroll stop doesn't snap the streaks
    this.length += (streakLength(v) - this.length) * Math.min(1, ctx.dt * 6);
    this.material.opacity = streakOpacity(v) * ctx.ignite;
    // Chapter 03: direct chapterProgress assignment through max(), never the dt*6 ease
    // (tau ~0.17s barely reaches two time constants inside a 25vh beat). max() keeps both
    // ends continuous with the velocity curves and floors the tunnel if the reader stalls.
    let converge = 0;
    if (ctx.voyage.chapter.id === "jump") {
      const t = ctx.voyage.chapterProgress;
      this.length = Math.max(this.length, hyperLength(t));
      this.material.opacity = Math.max(this.material.opacity, hyperOpacity(t) * ctx.ignite);
      converge = hyperConverge(t);
    }
    const camZ = ctx.camera.position.z;
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const zi = i * 3 + 2;
      if (this.heads[zi] > camZ + BEHIND) this.heads[zi] = camZ - AHEAD + this.rand() * 10;
      if (this.heads[zi] < camZ - AHEAD - 20) this.heads[zi] = camZ - this.rand() * AHEAD;
    }
    this.writePositions(converge);
    (this._geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/scene/chapters/WarpStreaks.test.ts`
Expected: PASS — all tests in the file pass (8 new): 16 total (8 pre-existing + 8 new). If `reproduces the same layout when build() is called again` fails, `build()` is writing positions with a non-zero converge — it must call `this.writePositions()` with no argument.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/chapters/WarpStreaks.ts src/scene/chapters/WarpStreaks.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): hyperspace mode on WarpStreaks for chapter 03

New chapterProgress-driven curves (hyperLength/hyperOpacity/hyperConverge)
combined with the velocity curves by max, so both ends of the beat are
continuous and a slow scroll through the 25vh Jump still stretches.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `EnergyOrb` Jump flare

**Files:**
- Modify: `src/scene/chapters/EnergyOrb.ts`
- Test: `src/scene/chapters/EnergyOrb.test.ts`

**Interfaces:**
- Consumes: `FrameContext`.
- Produces: `export function jumpGlare(t01: number): number;` — 0 at both ends, peak 1 mid, clamped.

**Why a burst sprite:** `starScale(0.20…0.22) ≈ 0.64…0.71`, so `GLOW_SCALE * sc ≈ 2.7…3.0 < GLOW_MIN 3.5` — the glow sprite is pinned at its floor for the whole of Approach and Jump. The only headroom in the existing pipeline is the `(1 + glare*2)` multiplier plus one more additive sprite (Q3: no bloom).

**Design notes the implementer must not re-litigate:**
- **The burst has no unit coverage, and cannot have any in this repo.** `vitest.config.mts:10` sets `environment: "node"` globally and the burst lives inside `EnergyOrb.ts`'s existing `typeof document !== "undefined"` guard; moving the file to jsdom would not help either, because `makeBurstTexture` calls `canvas.getContext("2d")`, which is `null` in jsdom without the optional `canvas` package. Roughly 30 lines — the texture, the sprite, the per-frame scale and the dispose path — are therefore verified only by Task 10's `desktop-p21.png` / `mobile-p21.png`. Do not relocate the burst outside the guard to make it testable: `EnergyOrb.test.ts:18` and `:57` assert `children` length 1 under node.
- **`uGlare` is not gated by `ctx.ignite`; the burst's opacity and scale are.** The glare uniform is a shader input that `setGlare` also writes, and The Pilot's control must not be dimmed by the ignition curtain.

- [ ] **Step 1: Write the failing tests**

Append to `src/scene/chapters/EnergyOrb.test.ts`, extending its import to `import { EnergyOrb, jumpGlare } from "./EnergyOrb";`:

```ts
describe("jumpGlare", () => {
  it("is zero at both ends of the beat and peaks in the middle", () => {
    expect(jumpGlare(0)).toBeCloseTo(0, 10);
    expect(jumpGlare(1)).toBeCloseTo(0, 10);
    expect(jumpGlare(0.5)).toBeCloseTo(1, 10);
    expect(jumpGlare(0.25)).toBeGreaterThan(0);
    expect(jumpGlare(0.25)).toBeLessThan(1);
  });

  it("clamps outside 0..1 so another chapter's progress cannot flare the star", () => {
    expect(jumpGlare(-1)).toBeCloseTo(0, 10);
    expect(jumpGlare(2)).toBeCloseTo(0, 10);
  });
});

describe("EnergyOrb — chapter 03 flare", () => {
  it("drives uGlare from chapterProgress inside the Jump", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    voyageStore.setScroll(0.21, 0);
    const cp = voyageStore.getState().chapterProgress;
    expect(voyageStore.getState().chapter.id).toBe("jump");
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeCloseTo(jumpGlare(cp), 6);
    expect(orb.material.uniforms.uGlare.value).toBeGreaterThan(0.99);
  });

  it("combines with setGlare by max, so neither driver can cancel the other", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    // chapterProgress 0 → jumpGlare 0, so the manual control wins.
    voyageStore.setScroll(0.2, 0);
    orb.setGlare(1);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeCloseTo(1, 6);
    // Mid-ramp with two sub-1 drivers: max picks the larger, a sum (clamped or not) does not.
    // At chapterProgress 0.25 the drivers are 0.7071… and 0.2 — max gives 0.7071, a plain sum
    // 0.9071, a clamped sum 0.9071. A probe at the peak could not tell any of them apart.
    voyageStore.setScroll(0.205, 0); // chapterProgress 0.25 → jumpGlare 0.7071067811865451
    orb.setGlare(0.2);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value)
      .toBeCloseTo(jumpGlare(voyageStore.getState().chapterProgress), 6);
  });

  it("leaves every other chapter on setGlare alone", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    voyageStore.setScroll(0.1, 0);
    orb.setGlare(0.25);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeCloseTo(0.25, 6);
  });

  it("keeps the burst inside the document guard, so a node build stays a single child", () => {
    // The burst — and therefore its ctx.ignite multiplier — is unreachable under vitest's
    // global `node` environment: makeBurstTexture() calls canvas.getContext("2d"), which is
    // null even under jsdom without the optional `canvas` package. This pins the guard and
    // the frame path around it; the sprite's only regression net is Task 10's p21 captures.
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    voyageStore.setScroll(0.21, 0);
    expect(() => orb.update(makeFrame({ ignite: 0.5 }))).not.toThrow();
    expect(orb.object?.children).toHaveLength(1);
    // uGlare is deliberately NOT gated by ignite — the burst's opacity is.
    expect(orb.material.uniforms.uGlare.value)
      .toBeCloseTo(jumpGlare(voyageStore.getState().chapterProgress), 6);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scene/chapters/EnergyOrb.test.ts`
Expected: FAIL — `TypeError: jumpGlare is not a function`. **5** of the **6** new tests fail on that missing export. The sixth, `leaves every other chapter on setGlare alone`, **passes** in red — it is a regression guard that never touches `jumpGlare`. All **4** pre-existing tests in the file still pass.

- [ ] **Step 3: Add the curve and the burst texture to `src/scene/chapters/EnergyOrb.ts`**

Insert after `const GLOW_MIN = 3.5;` (`:14`):
```ts
/** World-space width of the additive burst at full flare. Spec §3 asks for "star flares";
 *  with no post-processing in the pipeline (Q3: no bloom) the flare is one more additive
 *  sprite — the technique the glow already uses. */
const BURST_WORLD = 26;

/**
 * Chapter 03's flare ramp over the Jump's chapterProgress: 0 at both ends, peak at
 * mid-beat, clamped so another chapter's progress can never flare the star.
 */
export function jumpGlare(t01: number): number {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t01)));
}
```

Insert after `makeGlowTexture()` (i.e. after `:83`):
```ts
/** White-hot core fading through amber — the Jump burst. Browser-only, like the glow. */
function makeBurstTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, `rgba(${AMBER_RGB},0.75)`);
  grad.addColorStop(1, `rgba(${AMBER_RGB},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```

Add the two fields next to `glow` (`:106-107`):
```ts
  private glowMaterial: THREE.SpriteMaterial | null = null;
  private glow: THREE.Sprite | null = null;
  private burstMaterial: THREE.SpriteMaterial | null = null;
  private burst: THREE.Sprite | null = null;
```

- [ ] **Step 4: Build, update and dispose the burst**

Inside `build()`, **within the existing `if (typeof document !== "undefined") { … }` block** (after `this.group.add(this.glow);`, `:131`) — it must stay inside that guard or `EnergyOrb.test.ts:18` and `:57` (`children` length 1 under node) fail:
```ts
      this.burstMaterial = new THREE.SpriteMaterial({
        map: makeBurstTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      this.burst = new THREE.Sprite(this.burstMaterial);
      this.burst.visible = false;
      this.group.add(this.burst);
```

Replace `update()` (`:142-159`) with:
```ts
  update(ctx: FrameContext): void {
    // SceneRoot may tick before the build lands.
    if (!this.group) return;
    const s = starScale(ctx.voyage.progress) * ctx.ignite;
    const sc = Math.max(0.001, s);
    this.group.scale.setScalar(sc);
    this.material.uniforms.uTime.value = ctx.t;
    // Chapter 03's flare and The Pilot's setGlare are combined by max so neither driver
    // can cancel the other, and setGlare keeps its meaning outside the Jump.
    const jump = ctx.voyage.chapter.id === "jump" ? jumpGlare(ctx.voyage.chapterProgress) : 0;
    const glare = Math.max(this.glare, jump);
    this.material.uniforms.uGlare.value = glare;
    if (this.glow) {
      // The sprite is a child of the scaled group, so its scale is in orb radii: divide the
      // world-space target back out by `sc`. The GLOW_MIN floor fades in with ignite so the
      // halo does not pop in at full size behind the ignition curtain.
      // A Sprite is a billboarded quad; z stays 1 so only its width/height breathe.
      const world = Math.max(GLOW_MIN * ctx.ignite, GLOW_SCALE * sc);
      const g = (world / sc) * (1 + ctx.audioEnergy * 0.4) * (1 + glare * 2);
      this.glow.scale.set(g, g, 1);
    }
    if (this.burst && this.burstMaterial) {
      // Hidden outside the beat rather than drawn at zero opacity.
      this.burst.visible = jump > 0.001;
      this.burstMaterial.opacity = jump;
      const b = (BURST_WORLD * jump * ctx.ignite) / sc;
      this.burst.scale.set(b, b, 1);
    }
  }
```

In `dispose()`, after the existing `this.glow = null;` (`:169`):
```ts
    this.burstMaterial?.map?.dispose();
    this.burstMaterial?.dispose();
    this.burstMaterial = null;
    this.burst = null;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/scene/chapters/EnergyOrb.test.ts`
Expected: PASS — all tests in the file pass (6 new): 10 total (4 pre-existing + 6 new). The `builds at STAR_POSITION with no glow sprite outside a document` test must still see `children` length 1: the burst lives inside the same `typeof document` guard.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/chapters/EnergyOrb.ts src/scene/chapters/EnergyOrb.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): Jump flare on EnergyOrb

jumpGlare(chapterProgress) peaks mid-beat and is combined with setGlare by max,
so The Pilot's control keeps its meaning. The glow sprite is pinned at GLOW_MIN
through the Jump, so the flare also gets its own additive burst sprite.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `Starfield` Approach focus pull

**Files:**
- Modify: `src/scene/chapters/Starfield.ts`
- Test: `src/scene/chapters/Starfield.test.ts`

**Interfaces:**
- Consumes: `ChapterId` from `@/scene/camera/flightPath`; `FrameContext`.
- Produces: `export function approachSoften(chapterId: ChapterId, chapterProgress: number): number;` — 0..1.

**Why a second field:** `setSoften` stays the external control (Dark Passage / later slices). The chapter-driven value lives in its own `chapterSoften` field and the two are combined by `max` inside `applyControls`, so `Starfield.test.ts:30-48` — which calls `setSoften` + `applyControls` directly — stays green and neither driver can cancel the other.

**Window (derived from the FLAGGED pin arithmetic):** rise over `chapterProgress 0.02 → 0.22`, hold to `0.45`, released by `0.65`. The pin is stationary only to `1/3`, so the field is fully soft across the whole docked frame and relaxes as the panel block leaves.

- [ ] **Step 1: Write the failing tests**

Replace `src/scene/chapters/Starfield.test.ts:1-5` with the block below — it reproduces the four existing import lines verbatim, rewrites line 1 to pull in `beforeEach`, and adds a store reset the file currently does not have:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { Starfield, approachSoften } from "./Starfield";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());
```

Append:
```ts
describe("approachSoften", () => {
  it("is zero outside the Approach chapter", () => {
    expect(approachSoften("launch", 0.5)).toBe(0);
    expect(approachSoften("jump", 0.5)).toBe(0);
    expect(approachSoften("orbit", 0.5)).toBe(0);
  });

  it("is zero at both ends of the chapter and full while the panels are docked", () => {
    expect(approachSoften("approach", 0)).toBe(0);
    expect(approachSoften("approach", 1)).toBe(0);
    // The 100vh pin holds for chapterProgress 0..1/3, so the hold band covers it.
    expect(approachSoften("approach", 1 / 3)).toBeCloseTo(1, 10);
    expect(approachSoften("approach", 0.45)).toBeCloseTo(1, 10);
  });

  it("rises, then releases as the panel block leaves", () => {
    expect(approachSoften("approach", 0.12)).toBeGreaterThan(0);
    expect(approachSoften("approach", 0.12)).toBeLessThan(1);
    expect(approachSoften("approach", 0.18)).toBeGreaterThan(approachSoften("approach", 0.12));
    expect(approachSoften("approach", 0.55)).toBeLessThan(1);
    expect(approachSoften("approach", 0.55)).toBeGreaterThan(0);
    expect(approachSoften("approach", 0.7)).toBe(0);
  });

  it("clamps out-of-range progress", () => {
    expect(approachSoften("approach", -1)).toBe(0);
    expect(approachSoften("approach", 2)).toBe(0);
  });
});

describe("Starfield — chapter 02 focus pull", () => {
  it("eases the field out of focus while Approach is docked, and back afterwards", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "mid");
    field.applyControls(1);
    const baseSize = field.material.size;
    const baseOpacity = field.material.opacity;

    voyageStore.setScroll(0.12, 0);
    expect(voyageStore.getState().chapter.id).toBe("approach");
    // ~2s of frames: the ease is deliberate, so one frame proves nothing.
    for (let i = 0; i < 120; i++) field.update(makeFrame());
    expect(field.material.size).toBeGreaterThan(baseSize);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    voyageStore.setScroll(0.5, 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
  });

  it("still honours setSoften while the chapter driver is idle", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "mid");
    field.applyControls(1);
    const baseSize = field.material.size;
    field.setSoften(1);
    // Launch: the chapter driver contributes 0, so the manual control is what shows.
    field.update(makeFrame());
    expect(field.material.size).toBeGreaterThan(baseSize);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scene/chapters/Starfield.test.ts`
Expected: FAIL — `TypeError: approachSoften is not a function`. **5** of the **6** new tests fail: the four `approachSoften` cases throw on the missing export, and `eases the field out of focus while Approach is docked` fails on `AssertionError: expected 0.14 to be greater than 0.14` because nothing drives the field yet. The sixth new test, `still honours setSoften while the chapter driver is idle`, **passes** in red — it is a regression guard over the existing `setSoften` path, which `update()` already routes through `applyControls`. All **6** pre-existing tests in the file still pass.

- [ ] **Step 3: Add the curve to `src/scene/chapters/Starfield.ts`**

Extend the import at `:1-6` with:
```ts
import { type ChapterId } from "@/scene/camera/flightPath";
```

Insert after `const BASE_OPACITY = 0.85;` (`:12`):
```ts
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/* Focus-pull window over Approach's chapterProgress (spec §3: "when a chapter panel pins,
 * background particles behind it soften"). Approach's section is 150vh and .chapter__pin is
 * 100vh, so the pin is stationary only for chapterProgress 0..1/3 — the field is fully soft
 * across that docked frame and releases as the panel block scrolls away. */
const SOFTEN_IN = 0.02;
const SOFTEN_FULL = 0.22;
const SOFTEN_HOLD_END = 0.45;
const SOFTEN_OUT = 0.65;

/** 0..1 focus pull for a chapter + its local progress. Zero everywhere but Approach. */
export function approachSoften(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "approach") return 0;
  const t = clamp01(chapterProgress);
  if (t <= SOFTEN_IN || t >= SOFTEN_OUT) return 0;
  if (t < SOFTEN_FULL) return smooth((t - SOFTEN_IN) / (SOFTEN_FULL - SOFTEN_IN));
  if (t <= SOFTEN_HOLD_END) return 1;
  return smooth(1 - (t - SOFTEN_HOLD_END) / (SOFTEN_OUT - SOFTEN_HOLD_END));
}
```

- [ ] **Step 4: Wire the second soften channel through `applyControls` and `update`**

Add the field next to `private soften = 0;` (`:57`):
```ts
  private soften = 0;
  /** Chapter-driven focus pull, owned by update(). Kept apart from `soften` so the external
   *  setSoften control (later slices) and the chapter cannot overwrite each other. */
  private chapterSoften = 0;
```

Add one line to `build()`, next to the other per-build resets (immediately after `if (this.points) this.dispose();`):
```ts
    this.chapterSoften = 0;
```

Replace `applyControls` (`:113-118`) with:
```ts
  /** Apply control values to the material. Exposed for tests; update() calls it every frame.
   *  The manual and chapter-driven pulls are combined by max. */
  applyControls(ignite: number, audioEnergy = 0): void {
    const soften = Math.max(this.soften, this.chapterSoften);
    this.material.size = BASE_SIZE * (1 + soften * 0.6) * (1 + audioEnergy * 1.5);
    const focus = 1 - soften * 0.65;
    this.material.opacity = BASE_OPACITY * ignite * focus * (1 - this.fade) * (0.75 + audioEnergy * 0.5);
  }
```

Replace `update` (`:120-124`) with:
```ts
  update(ctx: FrameContext): void {
    if (!this.points) return;
    // Chapter 02 owns the focus pull. Eased (tau ~0.33s) so a flick through Approach
    // blurs and recovers rather than strobing.
    const target = approachSoften(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
    this.chapterSoften += (target - this.chapterSoften) * Math.min(1, ctx.dt * 3);
    this.applyControls(ctx.ignite, ctx.audioEnergy);
    this.points.rotation.z += ctx.dt * 0.004 * (1 + ctx.audioEnergy * 2);
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/scene/chapters/Starfield.test.ts`
Expected: PASS — all tests in the file pass (6 new): 12 total (6 pre-existing + 6 new). `is deterministic across instances for a given tier` must still assert `positions[0] ≈ 7.11501407623291`: no `rand()` draw was added before or inside the placement loop, so the seed-1337 sequence is untouched.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/chapters/Starfield.ts src/scene/chapters/Starfield.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): Approach focus pull on Starfield

approachSoften() windows the pull over the chapter's docked frame (the 100vh pin
holds for chapterProgress 0..1/3) and update() eases into it. Combined with the
external setSoften by max, so neither driver can cancel the other.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `Topology` set piece (chapter 02)

**Files:**
- Create: `src/scene/chapters/Topology.ts`
- Test: `src/scene/chapters/Topology.test.ts`
- Modify: `src/scene/quality.ts` (`TierSettings.topologyNodes`)
- Modify: `src/scene/quality.test.ts`
- Modify: `src/scene/SceneRoot.tsx:63` (the set-piece registry)

**Interfaces:**
- Consumes: `SetPiece`, `FrameContext` (`./types`); `TIER_SETTINGS`, `Tier`; `mulberry32` (`@/scene/prng`); `ChapterId`.
- Produces:
  ```ts
  export interface TierSettings { dpr: number; starCount: number; streakCount: number; topologyNodes: number }
  export function visibleNodeCount(count: number, chapterProgress: number): number;
  export function topologyFade(chapterId: ChapterId, chapterProgress: number): number;
  export class Topology implements SetPiece {
    readonly nodeMaterial: THREE.PointsMaterial;
    readonly edgeMaterial: THREE.LineBasicMaterial;
    get positions(): Float32Array; get object(): THREE.Group | null;
    get count(): number; get edgeCount(): number;
  }
  ```
  Both materials are public because the tests read `opacity` off them as the fade readout.

**Design notes the implementer must not re-litigate:**
- Spec §5:105 names `Topology.ts` under `src/scene/chapters/` → it is a WebGL `SetPiece`, not DOM.
- **Assembly is a draw range, not a buffer rewrite.** Node `i` (for `i ≥ 1`) is linked to its nearest already-placed neighbour, so the first `k` edges only ever join the first `k+1` nodes: `setDrawRange(0, nodes)` and `setDrawRange(0, (nodes-1)*2)` assemble the graph node-by-node with zero per-frame allocation.
- **Placement is camera-relative in camera space.** Mouse parallax is added straight to `camera.position` (`SceneRoot.tsx:150`) and the panels it sits behind are screen-pinned, so the graph follows the lens: offset applied through `camera.quaternion`, and `group.quaternion` copied so it always faces the viewer. A world-axis offset would drift, because Approach's lookAt is up-left of the flight direction.
- **Monochrome.** `--amber` has a sanctioned-use comment (`voyage.css:8-10`); the graph is white-on-black like every other non-star object.
- Its own seed (9901). Never share Starfield's 1337 sequence.

- [ ] **Step 1: Extend the tier assertion in `src/scene/quality.test.ts`**

The assertion goes in before the field exists, so this task opens on a real red rather than on a step whose expected output is a pass. Add to the existing `TIER_SETTINGS` test body (after the `streakCount` assertions at `:89-91`):
```ts
    expect(TIER_SETTINGS.mid.topologyNodes).toBeLessThan(TIER_SETTINGS.high.topologyNodes);
    expect(TIER_SETTINGS.still.topologyNodes).toBe(0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/scene/quality.test.ts`
Expected: FAIL — the existing `TIER_SETTINGS` test fails on the first new assertion with `TypeError: actual value must be number or bigint, received "undefined"`, because `topologyNodes` is `undefined` on every tier (the second new assertion is never reached). No new `it(` block was added, so this is **0** new tests and **1** pre-existing test failing on its new assertions; every other test in the file still passes.

- [ ] **Step 3: Add the tier count to `src/scene/quality.ts`**

```ts
export interface TierSettings {
  dpr: number;
  starCount: number;
  streakCount: number;
  /** Chapter 02's topology graph. Edges are count-1, so this drives both buffers. */
  topologyNodes: number;
}

// "still" never reaches the GL path at all — VoyageRoot renders StillSky instead of
// SceneRoot — so its zeroed counts are documentation, not a branch anything reads.
export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high:  { dpr: 1.5, starCount: 2400, streakCount: 260, topologyNodes: 42 },
  mid:   { dpr: 1,   starCount: 1200, streakCount: 120, topologyNodes: 22 },
  still: { dpr: 1,   starCount: 0,    streakCount: 0,   topologyNodes: 0  },
};
```

`quality.test.ts` now passes again — that is Step 1's red closed, and the only green this task collects before the `Topology` cycle opens at Step 4.

- [ ] **Step 4: Write the failing test**

`src/scene/chapters/Topology.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { Topology, visibleNodeCount, topologyFade } from "./Topology";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

const nodesOf = (t: Topology) => (t.object!.children[0] as THREE.Points).geometry;
const edgesOf = (t: Topology) => (t.object!.children[1] as THREE.LineSegments).geometry;

describe("visibleNodeCount", () => {
  it("assembles from none to all across the assembly window", () => {
    expect(visibleNodeCount(42, 0)).toBe(0);
    expect(visibleNodeCount(42, 0.06)).toBe(0);
    expect(visibleNodeCount(42, 0.3)).toBe(42);
    expect(visibleNodeCount(42, 1)).toBe(42);
    expect(visibleNodeCount(42, 0.18)).toBe(21);
  });

  it("never goes backwards and handles an empty graph", () => {
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const n = visibleNodeCount(42, i / 100);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(visibleNodeCount(0, 0.5)).toBe(0);
  });
});

describe("topologyFade", () => {
  it("is zero outside Approach and at both ends of it", () => {
    expect(topologyFade("launch", 0.5)).toBe(0);
    expect(topologyFade("jump", 0.5)).toBe(0);
    expect(topologyFade("approach", 0)).toBe(0);
    expect(topologyFade("approach", 1)).toBe(0);
  });

  it("is full while the panels are docked and fades out after", () => {
    expect(topologyFade("approach", 1 / 3)).toBeCloseTo(1, 10);
    expect(topologyFade("approach", 0.5)).toBeCloseTo(1, 10);
    expect(topologyFade("approach", 0.6)).toBeGreaterThan(0);
    expect(topologyFade("approach", 0.6)).toBeLessThan(1);
    expect(topologyFade("approach", 0.75)).toBe(0);
  });
});

describe("Topology", () => {
  it("builds the tier's node count plus one edge per node after the first", () => {
    const scene = new THREE.Scene();
    const topo = new Topology();
    topo.build(scene, "high");
    expect(topo.count).toBe(TIER_SETTINGS.high.topologyNodes);
    expect(topo.edgeCount).toBe(TIER_SETTINGS.high.topologyNodes - 1);
    expect(scene.children).toHaveLength(1);
    expect(topo.object?.children).toHaveLength(2);
    expect(nodesOf(topo).getAttribute("position").count).toBe(TIER_SETTINGS.high.topologyNodes);
    expect(edgesOf(topo).getAttribute("position").count).toBe((TIER_SETTINGS.high.topologyNodes - 1) * 2);
  });

  it("keeps every node inside the graph's own volume", () => {
    const topo = new Topology();
    topo.build(new THREE.Scene(), "high");
    const p = topo.positions;
    let maxR = 0, maxZ = 0;
    for (let i = 0; i < p.length; i += 3) {
      maxR = Math.max(maxR, Math.hypot(p[i], p[i + 1]));
      maxZ = Math.max(maxZ, Math.abs(p[i + 2]));
    }
    expect(maxR).toBeLessThanOrEqual(9);
    expect(maxZ).toBeLessThanOrEqual(3.5);
  });

  it("is deterministic across instances and rebuilds", () => {
    const a = new Topology();
    const b = new Topology();
    a.build(new THREE.Scene(), "high");
    b.build(new THREE.Scene(), "high");
    expect(a.positions).toEqual(b.positions);
    // Locks the seed-9901 sequence itself, so re-ordering the rand() draws (or moving the
    // edge pass in front of the placement loop) cannot silently move every node.
    expect(a.positions[0]).toBeCloseTo(-4.798959255218506, 6);

    const scene = new THREE.Scene();
    const c = new Topology();
    c.build(scene, "mid");
    const first = Float32Array.from(c.positions);
    c.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(c.positions).toEqual(first);
  });

  it("is hidden outside Approach and assembles across it", () => {
    const topo = new Topology();
    // update() before build() must not throw — SceneRoot may tick before the build lands.
    expect(() => topo.update(makeFrame())).not.toThrow();

    topo.build(new THREE.Scene(), "high");
    topo.update(makeFrame());                        // launch
    expect(topo.object?.visible).toBe(false);

    voyageStore.setScroll(0.1, 0);                   // approach, mid-assembly
    const midProgress = voyageStore.getState().chapterProgress;
    topo.update(makeFrame());
    expect(topo.object?.visible).toBe(true);
    const partial = visibleNodeCount(TIER_SETTINGS.high.topologyNodes, midProgress);
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(TIER_SETTINGS.high.topologyNodes);
    expect(nodesOf(topo).drawRange.count).toBe(partial);
    expect(edgesOf(topo).drawRange.count).toBe((partial - 1) * 2);

    voyageStore.setScroll(0.12, 0);                  // docked: whole graph
    topo.update(makeFrame());
    expect(nodesOf(topo).drawRange.count).toBe(TIER_SETTINGS.high.topologyNodes);
    expect(topo.nodeMaterial.opacity).toBeGreaterThan(0);

    voyageStore.setScroll(0.21, 0);                  // jump: gone again
    topo.update(makeFrame());
    expect(topo.object?.visible).toBe(false);
  });

  it("sits in front of the camera and faces it", () => {
    const topo = new Topology();
    topo.build(new THREE.Scene(), "mid");
    voyageStore.setScroll(0.12, 0);
    const camera = new THREE.PerspectiveCamera();     // at the origin, looking down -z
    topo.update(makeFrame({ camera }));
    expect(topo.object!.position.z).toBeLessThan(-10);
    expect(topo.object!.quaternion.equals(camera.quaternion)).toBe(true);
  });

  it("builds an empty but valid graph on the still tier", () => {
    const scene = new THREE.Scene();
    const topo = new Topology();
    topo.build(scene, "still");
    expect(topo.count).toBe(0);
    expect(topo.edgeCount).toBe(0);
    expect(scene.children).toHaveLength(1);
    voyageStore.setScroll(0.12, 0);
    expect(() => topo.update(makeFrame())).not.toThrow();
  });

  it("links every node to one that is already placed", () => {
    // The load-bearing invariant behind the draw-range assembly: the first k edges may only
    // join the first k+1 nodes. Every other assertion here reads buffer lengths, the seed
    // literal or draw-range counts, all of which a forward-referencing edge loop leaves
    // byte-identical. Exact float comparison is valid because the edge pass copies node
    // vertices straight out of _positions. Vertices 0-2 are the neighbour, 3-5 are node i.
    const topo = new Topology();
    topo.build(new THREE.Scene(), "high");
    const nodes = topo.positions;
    const edges = edgesOf(topo).getAttribute("position").array as Float32Array;
    const indexOf = (x: number, y: number, z: number) => {
      for (let k = 0; k < topo.count; k++) {
        if (nodes[k * 3] === x && nodes[k * 3 + 1] === y && nodes[k * 3 + 2] === z) return k;
      }
      return -1;
    };
    for (let i = 1; i < topo.count; i++) {
      const e = (i - 1) * 6;
      expect(edges[e + 3]).toBe(nodes[i * 3]);       // the far vertex is node i
      expect(edges[e + 4]).toBe(nodes[i * 3 + 1]);
      expect(edges[e + 5]).toBe(nodes[i * 3 + 2]);
      const j = indexOf(edges[e + 0], edges[e + 1], edges[e + 2]);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(i);                     // …and the near vertex precedes it
    }
  });

  it("fades both materials with the ignition curtain", () => {
    // The new ctx.ignite multipliers are unreachable from every other test in this file,
    // because makeFrame() defaults to ignite: 1 — dropping them would leave the suite green
    // while the graph popped in at full brightness behind the ignition curtain.
    const topo = new Topology();
    topo.build(new THREE.Scene(), "high");
    voyageStore.setScroll(0.12, 0);                  // topologyFade === 1 at chapterProgress 1/3
    topo.update(makeFrame({ ignite: 0.5 }));
    expect(topo.nodeMaterial.opacity).toBeCloseTo(0.45, 6);
    expect(topo.edgeMaterial.opacity).toBeCloseTo(0.14, 6);
  });

  it("disposes idempotently and rebuilds after a dispose", () => {
    const scene = new THREE.Scene();
    const topo = new Topology();
    topo.build(scene, "mid");
    const firstGeometry = nodesOf(topo);
    topo.dispose();
    expect(scene.children).toHaveLength(0);
    expect(() => topo.dispose()).not.toThrow();
    topo.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(nodesOf(topo)).not.toBe(firstGeometry);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npx vitest run src/scene/chapters/Topology.test.ts src/scene/quality.test.ts`
Expected: `Topology.test.ts` FAILS with `Error: Cannot find module './Topology' imported from /Users/admin/Codes-2/portfolio/src/scene/chapters/Topology.test.ts`, and vitest lists the file as `(0 test)`. The file is new, so all **13** of its tests are new and none of them runs — an unresolved import fails the file at collection time rather than producing 13 individual failures. `quality.test.ts` PASSES in full, including the assertion Step 1 added: Steps 1–3 already closed that red.

- [ ] **Step 6: Implement `src/scene/chapters/Topology.ts`**

```ts
import * as THREE from "three";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
// Its own seed: sharing Starfield's 1337 sequence would couple the two layouts, and a
// draw-order change in either would move the other's pinned literal.
import { mulberry32 } from "@/scene/prng";
import { type ChapterId } from "@/scene/camera/flightPath";
import type { FrameContext, SetPiece } from "./types";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

const TOPOLOGY_SEED = 9901;

/** A flattened disc, so the graph reads as a diagram plane rather than a ball of points. */
const NODE_RADIUS = 9;
const NODE_FLATTEN = 0.62;
const NODE_DEPTH = 7;

/** Camera-space offset: up-left of centre and 34 units ahead, so the graph sits behind the
 *  docked panels rather than behind the star (which projects low-right). Inside the
 *  camera's near 0.1 / far 400 (SceneRoot.tsx:61). */
const OFFSET_X = -2.6;
const OFFSET_Y = 1.4;
const OFFSET_Z = -34;

/** Assembly window over Approach's chapterProgress. Completes inside the 100vh pin's hold
 *  (chapterProgress 0..1/3) so the graph is whole while the panels are docked. */
const ASSEMBLE_START = 0.06;
const ASSEMBLE_END = 0.30;

/** Whole-piece fade window, same shape as Starfield's focus pull. */
const FADE_IN = 0.04;
const FADE_FULL = 0.10;
const FADE_HOLD_END = 0.50;
const FADE_OUT = 0.70;

const NODE_OPACITY = 0.9;
const EDGE_OPACITY = 0.28;

/** How many of the `count` nodes have arrived at this point in the chapter. */
export function visibleNodeCount(count: number, chapterProgress: number): number {
  if (count <= 0) return 0;
  const t = clamp01((clamp01(chapterProgress) - ASSEMBLE_START) / (ASSEMBLE_END - ASSEMBLE_START));
  return Math.round(count * t);
}

/** 0..1 overall presence of the graph. Zero everywhere but Approach. */
export function topologyFade(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "approach") return 0;
  const t = clamp01(chapterProgress);
  if (t <= FADE_IN || t >= FADE_OUT) return 0;
  if (t < FADE_FULL) return smooth((t - FADE_IN) / (FADE_FULL - FADE_IN));
  if (t <= FADE_HOLD_END) return 1;
  return smooth(1 - (t - FADE_HOLD_END) / (FADE_OUT - FADE_HOLD_END));
}

/**
 * Chapter 02's set piece: a monochrome node/edge graph that assembles node-by-node behind
 * the service panels ("Topology graph assembles node-by-node behind the middle panel",
 * spec §3 row 02).
 *
 * The panels it sits behind are screen-pinned, so the graph is camera-relative: it holds
 * its framing through the chapter's dolly-in and through the mouse parallax that
 * SceneRoot adds straight to camera.position.
 */
export class Topology implements SetPiece {
  // Group, geometries and buffers are allocated per build() so a rebuild neither stacks a
  // second graph in the scene nor reuses a disposed geometry.
  private group: THREE.Group | null = null;
  private nodeGeometry: THREE.BufferGeometry | null = null;
  private edgeGeometry: THREE.BufferGeometry | null = null;
  /** Exposed read-only for tests and debug overlays (opacity is the fade readout). */
  readonly nodeMaterial = new THREE.PointsMaterial({
    size: 0.42,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  readonly edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private _positions: Float32Array = new Float32Array(0);
  private scene: THREE.Scene | null = null;
  /** Scratch vector, so update() allocates nothing per frame. */
  private readonly offset = new THREE.Vector3();

  /** Read-only view of the packed xyz node buffer (callers must not reassign it). */
  get positions(): Float32Array {
    return this._positions;
  }

  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.Group | null {
    return this.group;
  }

  get count(): number {
    return this._positions.length / 3;
  }

  /** One edge per node after the first: node i links to its nearest already-placed
   *  neighbour, so the first k edges only ever join the first k+1 nodes — which is what
   *  makes the draw-range assembly correct. */
  get edgeCount(): number {
    return Math.max(0, this.count - 1);
  }

  build(scene: THREE.Scene, tier: Tier): void {
    // An unpaired second build() would leak the previous Group into the scene.
    if (this.group) this.dispose();
    const n = TIER_SETTINGS[tier].topologyNodes;
    const rand = mulberry32(TOPOLOGY_SEED);
    this._positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = NODE_RADIUS * Math.sqrt(rand());
      const a = rand() * Math.PI * 2;
      this._positions[i * 3 + 0] = Math.cos(a) * r;
      this._positions[i * 3 + 1] = Math.sin(a) * r * NODE_FLATTEN;
      this._positions[i * 3 + 2] = (rand() - 0.5) * NODE_DEPTH;
    }
    // The edge pass draws no random numbers and runs *after* placement, so the pinned
    // layout literal stays valid.
    const edges = new Float32Array(Math.max(0, n - 1) * 6);
    for (let i = 1; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let j = 0; j < i; j++) {
        const dx = this._positions[i * 3] - this._positions[j * 3];
        const dy = this._positions[i * 3 + 1] - this._positions[j * 3 + 1];
        const dz = this._positions[i * 3 + 2] - this._positions[j * 3 + 2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD) { bestD = d; best = j; }
      }
      const e = (i - 1) * 6;
      edges[e + 0] = this._positions[best * 3];
      edges[e + 1] = this._positions[best * 3 + 1];
      edges[e + 2] = this._positions[best * 3 + 2];
      edges[e + 3] = this._positions[i * 3];
      edges[e + 4] = this._positions[i * 3 + 1];
      edges[e + 5] = this._positions[i * 3 + 2];
    }

    this.nodeGeometry = new THREE.BufferGeometry();
    this.nodeGeometry.setAttribute("position", new THREE.BufferAttribute(this._positions, 3));
    this.nodeGeometry.setDrawRange(0, 0);
    this.edgeGeometry = new THREE.BufferGeometry();
    this.edgeGeometry.setAttribute("position", new THREE.BufferAttribute(edges, 3));
    this.edgeGeometry.setDrawRange(0, 0);

    const points = new THREE.Points(this.nodeGeometry, this.nodeMaterial);
    const lines = new THREE.LineSegments(this.edgeGeometry, this.edgeMaterial);
    points.frustumCulled = false;
    lines.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.add(points);
    this.group.add(lines);
    this.scene = scene;
    scene.add(this.group);
  }

  update(ctx: FrameContext): void {
    // SceneRoot may tick before the build lands.
    if (!this.group || !this.nodeGeometry || !this.edgeGeometry) return;
    const fade = topologyFade(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
    this.group.visible = fade > 0.001;
    if (!this.group.visible) return;
    // Camera-relative, offset in *camera* space: Approach's lookAt is up-left of the flight
    // direction, so a world-axis offset would drift out of frame as the camera dollies.
    this.offset.set(OFFSET_X, OFFSET_Y, OFFSET_Z).applyQuaternion(ctx.camera.quaternion);
    this.group.position.copy(ctx.camera.position).add(this.offset);
    this.group.quaternion.copy(ctx.camera.quaternion);
    // Assembly is a draw range, not a buffer rewrite: nothing is allocated per frame.
    const nodes = visibleNodeCount(this.count, ctx.voyage.chapterProgress);
    this.nodeGeometry.setDrawRange(0, nodes);
    this.edgeGeometry.setDrawRange(0, Math.max(0, nodes - 1) * 2);
    this.nodeMaterial.opacity = NODE_OPACITY * fade * ctx.ignite;
    this.edgeMaterial.opacity = EDGE_OPACITY * fade * ctx.ignite;
  }

  dispose(): void {
    if (this.group && this.scene) this.scene.remove(this.group);
    this.nodeGeometry?.dispose();
    this.nodeGeometry = null;
    this.edgeGeometry?.dispose();
    this.edgeGeometry = null;
    this.nodeMaterial.dispose();
    this.edgeMaterial.dispose();
    this.group = null;
    this.scene = null;
  }
}
```

- [ ] **Step 7: Register it in `src/scene/SceneRoot.tsx`**

Add the import next to the other set pieces (`:9-11`):
```ts
import { Topology } from "@/scene/chapters/Topology";
```
Replace `:63`:
```ts
    const pieces: SetPiece[] = [new Starfield(), new WarpStreaks(), new Topology(), new EnergyOrb()];
```
(The orb stays last so the star draws over the graph; no `renderOrder` is set anywhere in the scene.)

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/scene/chapters/Topology.test.ts src/scene/quality.test.ts`
Expected: PASS — all tests in `Topology.test.ts` pass (13 new), and all tests in `quality.test.ts` pass. If `positions[0]` misses `-4.798959255218506`, the `rand()` draw order in `build()` has changed (it must be `r`, then `a`, then `z`, with the edge pass afterwards). If `links every node to one that is already placed` fails, the inner edge loop is scanning all `n` nodes instead of the already-placed `j < i` — that ships forward references and breaks the draw-range assembly while leaving every count byte-identical.

- [ ] **Step 9: Run the whole suite and the typechecker**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all green. `TierSettings` gained a required field, so any object literal of that type that is missing `topologyNodes` is a `tsc` error — `TIER_SETTINGS` is the only one.

- [ ] **Step 10: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/chapters/Topology.ts src/scene/chapters/Topology.test.ts src/scene/quality.ts src/scene/quality.test.ts src/scene/SceneRoot.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): Topology set piece for chapter 02

Seeded node cloud with one edge per node to its nearest placed neighbour, so the
graph assembles node-by-node through a draw range instead of a per-frame buffer
rewrite. Camera-relative (the panels it sits behind are screen-pinned) and
monochrome. Per-tier node count added to TierSettings with its assertion.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Data wiring — `getVoyageContent()` into the page

**Files:**
- Modify: `src/app/voyage/page.tsx`
- Modify: `src/components/voyage/VoyageRoot.tsx` (props only; the render wiring is Task 9)
- Test: `src/lib/data.voyage.test.ts` (new)

**Interfaces:**
- Consumes: `getVoyageContent(): Promise<VoyageContent>` (`src/lib/data.ts:294-303`), `VoyageContent = { services: Item[]; process: Item[]; caseStudies: Item[]; testimonials: Item[]; settings: Settings }`, `Item = { id: string; order: number; createdAt: string } & Record<string, FieldValue>`.
- Produces: `interface VoyageRootProps { settings: Settings; services: Item[] }`.

**Scope:** thread `services` only. `getVoyageContent()` already fetches all five in one `Promise.all`, so the DB cost is identical either way; unused props on a client component are dead weight that slices 4–7 would have to justify.

- [ ] **Step 1: Write the failing test**

`src/lib/data.voyage.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// data.ts opens a Mongo connection at module scope through these three; without the mocks
// the test would try to reach a real database.
vi.mock("@/lib/mongodb", () => ({ default: vi.fn(async () => {}) }));
vi.mock("@/lib/models", () => ({
  Project: {},
  Skill: {},
  Settings: { findOne: () => ({ lean: async () => ({ heroHeadline: "From the CMS" }) }) },
}));
vi.mock("@/lib/collections", () => ({
  services: { list: vi.fn(async () => [{ id: "svc_1", order: 0, createdAt: "", title: "Builds" }]) },
  processSteps: { list: vi.fn(async () => [{ id: "prc_1", order: 0, createdAt: "" }]) },
  caseStudies: { list: vi.fn(async () => [{ id: "cs_1", order: 0, createdAt: "" }]) },
  testimonials: { list: vi.fn(async () => []) },
}));

import { services, processSteps, caseStudies, testimonials } from "@/lib/collections";
import { getVoyageContent } from "./data";

beforeEach(() => {
  vi.mocked(services.list).mockClear();
  vi.mocked(processSteps.list).mockClear();
  vi.mocked(caseStudies.list).mockClear();
  vi.mocked(testimonials.list).mockClear();
});

describe("getVoyageContent", () => {
  it("reads published-only for the author-gated collections", async () => {
    await getVoyageContent();
    // services and process steps are not publishable — no filter to pass.
    expect(services.list).toHaveBeenCalledWith();
    expect(processSteps.list).toHaveBeenCalledWith();
    expect(caseStudies.list).toHaveBeenCalledWith({ publishedOnly: true });
    expect(testimonials.list).toHaveBeenCalledWith({ publishedOnly: true });
  });

  it("returns all five payloads in one call, settings included", async () => {
    const content = await getVoyageContent();
    expect(content.services).toHaveLength(1);
    expect(content.services[0].title).toBe("Builds");
    expect(content.process).toHaveLength(1);
    expect(content.caseStudies).toHaveLength(1);
    expect(content.testimonials).toEqual([]);
    expect(content.settings.heroHeadline).toBe("From the CMS");
    // Fields the stored doc never had still come back on their schema defaults.
    expect(content.settings.manifesto).toBe("Most software fails at the seams. I design the seams.");
  });
});
```

- [ ] **Step 2: Run the test — it is expected to pass on the first run**

Run: `npx vitest run src/lib/data.voyage.test.ts`
Expected: PASS — all tests in the file pass (2 new). This is the one step in the plan with no red, and that is deliberate, not an omission: `getVoyageContent()` shipped in sub-project 2 and this is its first test (map §9 GAP-8), so it is a characterisation test over existing code. Record the pass and move on — the failing-first cycle for this task lands at Step 4. If instead you see `expected "list" to be called with arguments: [ { publishedOnly: true } ]`, the mocks are wired wrong; fix the test, not `data.ts`.

- [ ] **Step 3: Wire the page — `src/app/voyage/page.tsx`**

```tsx
import type { Metadata } from "next";
import { getVoyageContent } from "@/lib/data";
import VoyageRoot from "@/components/voyage/VoyageRoot";
import "./voyage.css";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Voyage",
  robots: { index: false, follow: false },
};

export default async function VoyagePage() {
  // One Promise.all for everything /voyage renders; servicesDef.revalidate already targets
  // this route on a CMS write. Only `services` is threaded through — later slices add
  // their own prop rather than carrying four unused ones.
  const { services, settings } = await getVoyageContent();
  return <VoyageRoot settings={settings} services={services} />;
}
```

- [ ] **Step 4: Run the typechecker to verify it fails**

Run: `npx tsc --noEmit`
Expected: FAIL — `src/app/voyage/page.tsx … error TS2322: Type '{ settings: Settings; services: Item[]; }' is not assignable to type 'IntrinsicAttributes & VoyageRootProps'. Property 'services' does not exist on type 'IntrinsicAttributes & VoyageRootProps'.` This is the task's real red: `page.tsx` now hands over a prop `VoyageRoot` does not yet accept. No new tests are involved — 0 test failures, and every pre-existing test in the suite still passes. (Step 2's test was written against code that already shipped, which is why the failing-first cycle lands here instead.)

- [ ] **Step 5: Accept the prop in `src/components/voyage/VoyageRoot.tsx`**

Add the type import next to the `Settings` import (`:5`):
```ts
import type { Settings } from "@/lib/data";
import type { Item } from "@/lib/collections/defineCollection";
```
`import type` is erased at compile time, so no mongoose reaches the client bundle — the same arrangement as the `Settings` import directly above it, and as `src/app/admin/components/types.ts:23`.

Replace `VoyageRootProps` (`:27-31`):
```ts
interface VoyageRootProps {
  settings: Settings;
  /** Chapter 02's panels. Untyped past Item's three base fields — narrowed in Services. */
  services: Item[];
}

export default function VoyageRoot({ settings, services }: VoyageRootProps) {
```

Add one line immediately before the `return (` so the unused-variable lint does not fire before Task 9 consumes it. **Task 9 Step 6 deletes it** — unconditionally, in every session. Without it, `@typescript-eslint/no-unused-vars` reports `'services' is defined but never used` and Task 8 Step 10's stated "eslint 0 problems" would be false in a directory Task 8 cannot edit. Do **not** rename it to `_services`: Task 9 consumes the prop by name.
```ts
  void services;
```

- [ ] **Step 6: Run the test and the typechecker**

Run: `npx vitest run src/lib/data.voyage.test.ts && npx tsc --noEmit`
Expected: PASS — all tests in the file pass (2 new); `tsc` reports 0 errors, so Step 4's red is closed.

- [ ] **Step 7: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/app/voyage/page.tsx src/components/voyage/VoyageRoot.tsx src/lib/data.voyage.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): wire getVoyageContent into /voyage

page.tsx now reads all voyage content in one Promise.all and threads `services`
to VoyageRoot. First test for getVoyageContent: published-only on the
author-gated collections, settings defaults included.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `Services.tsx` + panel layout math + CSS

**Files:**
- Create: `src/components/voyage/servicesLayout.ts`
- Test: `src/components/voyage/servicesLayout.test.ts`
- Create: `src/components/voyage/Services.tsx`
- Test: `src/components/voyage/Services.test.tsx`
- Modify: `src/app/voyage/voyage.css`

**Interfaces:**
- Consumes: `Item` (type-only), `CHAPTERS`, `sectionHeightVh`, `useVoyage()`.
- Produces:
  ```ts
  export interface PanelPose { dock: number; arc: number; tilt: number; solo: number }
  export const STATIC_POSE: PanelPose;                       // { dock: 1, arc: 0, tilt: 0, solo: 1 }
  export function panelPose(index: number, count: number, chapterProgress: number): PanelPose;
  export default function Services({ services, animated }: { services: Item[]; animated: boolean }): JSX.Element;
  ```

**Design notes the implementer must not re-litigate:**
- **No framer `animate` here.** Docking is continuous scroll-derived motion, which the Global Constraints route through inline `style` — a framer target that moves every frame springs-lags. `useReducedMotion()` is still imported, as a second source of "render it static".
- **One pose, four CSS custom properties, and the media query picks.** `--dock`/`--arc`/`--tilt` drive the desktop arc; `--solo` drives the mobile replacement. No `matchMedia` listener in JS, so no hydration mismatch and no resize plumbing.
- **Every `Item` read is narrowed at the leaf.** 0 outcomes and a blank engagement line are legal (Q1).
- **A lone panel is deliberately flat.** `arc` is the parabola *between* panels; with `n === 1` it is meaningless, and `STATIC_POSE` already fixes `arc: 0` as the resting value. Q1 sets no count floor, so `n = 1` is a legal production state — an unguarded `1 - x * x` would return `arc: 1` there and offset a fully-docked lone panel by 26px against both the reduced-motion and the animated resting pose.
- The numbers come from the FLAGGED pin arithmetic: desktop docking finishes at `chapterProgress 0.28` (inside the 0..1/3 hold), mobile replacement runs `0.04 → 0.56` inside a 64vh mobile pin.

- [ ] **Step 1: Write the failing layout test**

`src/components/voyage/servicesLayout.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { panelPose, STATIC_POSE } from "./servicesLayout";

describe("panelPose — desktop docking", () => {
  it("docks from nothing to fully docked", () => {
    expect(panelPose(0, 3, 0).dock).toBe(0);
    expect(panelPose(0, 3, 0.02).dock).toBe(0);
    expect(panelPose(0, 3, 1).dock).toBe(1);
  });

  it("staggers: the first panel leads the last", () => {
    const t = 0.15;
    expect(panelPose(0, 3, t).dock).toBeGreaterThan(panelPose(1, 3, t).dock);
    expect(panelPose(1, 3, t).dock).toBeGreaterThan(panelPose(2, 3, t).dock);
  });

  it("has every panel docked before the 100vh pin starts to leave (chapterProgress 1/3)", () => {
    // The pin is stationary only for chapterProgress 0..1/3; a panel still arriving after
    // that would dock while the whole block is sliding out of frame.
    for (let n = 1; n <= 6; n++) {
      for (let i = 0; i < n; i++) {
        expect(panelPose(i, n, 0.28).dock).toBeCloseTo(1, 10);
      }
    }
  });

  it("never leaves the 0..1 range", () => {
    for (let i = 0; i <= 100; i++) {
      const p = panelPose(1, 3, i / 100);
      expect(p.dock).toBeGreaterThanOrEqual(0);
      expect(p.dock).toBeLessThanOrEqual(1);
      expect(p.solo).toBeGreaterThanOrEqual(0);
      expect(p.solo).toBeLessThanOrEqual(1);
    }
  });
});

describe("panelPose — the arc", () => {
  it("lifts the middle panel and tilts the outer ones symmetrically", () => {
    expect(panelPose(0, 3, 1).arc).toBeCloseTo(0, 10);
    expect(panelPose(1, 3, 1).arc).toBeCloseTo(1, 10);
    expect(panelPose(2, 3, 1).arc).toBeCloseTo(0, 10);
    expect(panelPose(0, 3, 1).tilt).toBeCloseTo(-1, 10);
    expect(panelPose(1, 3, 1).tilt).toBeCloseTo(0, 10);
    expect(panelPose(2, 3, 1).tilt).toBeCloseTo(1, 10);
  });

  it("is flat for a single panel", () => {
    expect(panelPose(0, 1, 1).arc).toBe(0);
    expect(panelPose(0, 1, 1).tilt).toBe(0);
  });

  it("is flat for two panels", () => {
    // The degenerate even case: both panels are end panels, so a 2-service CMS is a
    // deliberate flat row rather than an accident.
    expect(panelPose(0, 2, 1).arc).toBe(0);
    expect(panelPose(1, 2, 1).arc).toBe(0);
  });

  it("stays symmetric for an even count", () => {
    expect(panelPose(0, 4, 1).tilt).toBeCloseTo(-panelPose(3, 4, 1).tilt, 10);
    expect(panelPose(1, 4, 1).arc).toBeCloseTo(panelPose(2, 4, 1).arc, 10);
  });
});

describe("panelPose — mobile replacement", () => {
  // The browser-review capture points: p10 / p12 / p14 are chapterProgress 1/6, 1/3, 1/2.
  it("shows exactly one panel at each capture point", () => {
    const solos = (t: number) => [0, 1, 2].map((i) => panelPose(i, 3, t).solo);
    expect(solos(1 / 6)).toEqual([1, 0, 0]);
    expect(solos(1 / 3)).toEqual([0, 1, 0]);
    expect(solos(1 / 2)).toEqual([0, 0, 1]);
  });

  it("crossfades rather than cutting between panels", () => {
    // Panel 2 fades up over the tail of panel 1's slot, then panel 1 fades out underneath
    // it (later in DOM order = on top), so there is never a frame with nothing on screen.
    expect(panelPose(0, 3, 0.2).solo).toBe(1);
    const rising = panelPose(1, 3, 0.2).solo;
    expect(rising).toBeGreaterThan(0);
    expect(rising).toBeLessThan(1);

    expect(panelPose(1, 3, 0.24).solo).toBe(1);
    const falling = panelPose(0, 3, 0.24).solo;
    expect(falling).toBeGreaterThan(0);
    expect(falling).toBeLessThan(1);
  });

  it("is dark before and after the replacement window", () => {
    expect([0, 1, 2].map((i) => panelPose(i, 3, 0).solo)).toEqual([0, 0, 0]);
    expect([0, 1, 2].map((i) => panelPose(i, 3, 0.9).solo)).toEqual([0, 0, 0]);
  });
});

describe("STATIC_POSE", () => {
  it("is the fully-visible, un-offset pose for reduced motion", () => {
    expect(STATIC_POSE).toEqual({ dock: 1, arc: 0, tilt: 0, solo: 1 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/voyage/servicesLayout.test.ts`
Expected: FAIL — `Error: Cannot find module './servicesLayout' imported from /Users/admin/Codes-2/portfolio/src/components/voyage/servicesLayout.test.ts`, and vitest lists the file as `(0 test)`. The file is new, so all **12** of its tests are new and none of them runs: an unresolved import fails the file at collection time rather than producing 12 individual failures. There are no pre-existing tests in this file to keep green.

- [ ] **Step 3: Implement `src/components/voyage/servicesLayout.ts`**

```ts
/* Pure layout math for chapter 02's panels. No React, no DOM — the component turns these
 * four numbers into CSS custom properties and the media query decides which it uses.
 *
 * Every window is derived from the pin geometry: Approach's section is 150vh and
 * .chapter__pin is 100vh, so a sticky pin is stationary for only 50vh — chapterProgress
 * 0..1/3. Docking that ran past that would finish while the block was already leaving.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Desktop: the first panel starts here and the last is fully docked by DOCK_END. */
const DOCK_START = 0.02;
const DOCK_END = 0.28;
/** How much of the chapter one panel takes to dock. */
const DOCK_SPAN = 0.16;

/** Mobile: one panel at a time inside a 64vh pin, which is stationary to chapterProgress
 *  0.573 (150 - 64 = 86vh of hold). */
const SOLO_START = 0.04;
const SOLO_END = 0.56;
/** Crossfade between adjacent mobile panels, as a fraction of one panel's slot. */
const SOLO_CROSSFADE = 0.18;

export interface PanelPose {
  /** 0..1 desktop dock progress — drives opacity and the lift. */
  dock: number;
  /** 0..1, 1 at the middle panel — the shallow arc's rise. */
  arc: number;
  /** -1..1 left to right — the arc's tilt. */
  tilt: number;
  /** 0..1 mobile replacement opacity. */
  solo: number;
}

/** Reduced motion / still tier: everything visible, nothing offset. */
export const STATIC_POSE: PanelPose = { dock: 1, arc: 0, tilt: 0, solo: 1 };

/**
 * Pose for panel `index` of `count` at Approach's `chapterProgress`.
 * Data-driven in `count` (Q1): the CMS has no cap, so a fourth service must not break the
 * arc — it narrows the stagger instead.
 */
export function panelPose(index: number, count: number, chapterProgress: number): PanelPose {
  const t = clamp01(chapterProgress);
  const n = Math.max(1, count);

  const stagger = n > 1 ? (DOCK_END - DOCK_SPAN - DOCK_START) / (n - 1) : 0;
  const dock = smooth(clamp01((t - (DOCK_START + stagger * index)) / DOCK_SPAN));

  // -1 at the left panel, +1 at the right; the arc is the parabola through them.
  const x = n > 1 ? (index / (n - 1)) * 2 - 1 : 0;

  const slot = (SOLO_END - SOLO_START) / n;
  const local = (t - (SOLO_START + slot * index)) / slot;
  let solo = 0;
  if (local > -SOLO_CROSSFADE && local < 1 + SOLO_CROSSFADE) {
    solo = local < 0 ? 1 + local / SOLO_CROSSFADE
         : local > 1 ? 1 - (local - 1) / SOLO_CROSSFADE
         : 1;
  }

  // A lone panel is flat: the parabola only means something once there is a left/right pair.
  return { dock, arc: n > 1 ? 1 - x * x : 0, tilt: x, solo: clamp01(solo) };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/components/voyage/servicesLayout.test.ts`
Expected: PASS — all tests in the file pass (12 new).

- [ ] **Step 5: Write the failing component test**

`src/components/voyage/Services.test.tsx` (the environment pragma must be the **literal first line**):
```tsx
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
const cssVar = (el: HTMLElement, name: string) => Number(el.style.getPropertyValue(name));

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
    expect(panel.querySelector("h2")?.textContent).toBe("");
    expect(panel.querySelector(".service-panel__outcomes")).toBeNull();
    expect(panel.querySelector(".service-panel__engagement")).toBeNull();
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

  it("renders every panel fully visible when animation is off", () => {
    const { container } = render(
      <Services animated={false} services={[svc("a"), svc("b"), svc("c")]} />,
    );
    expect(container.querySelector("#approach")?.getAttribute("data-static")).toBe("true");
    for (const panel of panels(container)) {
      expect(cssVar(panel, "--dock")).toBe(1);
      expect(cssVar(panel, "--solo")).toBe(1);
    }
  });

  it("drives the panels from scroll position when animation is on", () => {
    // chapterProgress 1/3 — the last frame the 100vh pin is stationary.
    voyageStore.setScroll(0.12, 0);
    const { container } = render(
      <Services animated services={[svc("a"), svc("b"), svc("c")]} />,
    );
    expect(container.querySelector("#approach")?.getAttribute("data-static")).toBeNull();
    for (const panel of panels(container)) expect(cssVar(panel, "--dock")).toBe(1);
    // Mobile: only the middle panel is up at this point.
    expect(panels(container).map((p) => cssVar(p, "--solo"))).toEqual([0, 1, 0]);
  });

  it("keeps the panels dark before the chapter is reached", () => {
    voyageStore.setScroll(0.01, 0);
    const { container } = render(<Services animated services={[svc("a")]} />);
    expect(cssVar(panels(container)[0], "--dock")).toBe(0);
  });

  it("marks the panels the mobile replacement has faded out, so the CSS can drop their blur", () => {
    // opacity: 0 does not skip a backdrop-filter, so the invisible panels need their own
    // hook. Same scroll position as the --solo test above: solos are [0, 1, 0].
    voyageStore.setScroll(0.12, 0);
    const { container } = render(
      <Services animated services={[svc("a"), svc("b"), svc("c")]} />,
    );
    const [first, middle, last] = panels(container);
    expect(first.getAttribute("data-solo-off")).toBe("true");
    expect(middle.getAttribute("data-solo-off")).toBeNull();
    expect(last.getAttribute("data-solo-off")).toBe("true");
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/components/voyage/Services.test.tsx`
Expected: FAIL — `Failed to resolve import "./Services"`. The file is new, so all **9** of its tests are new and none of them runs: an unresolved import fails the file at collection time rather than producing 9 individual failures. There are no pre-existing tests in this file to keep green.

- [ ] **Step 7: Implement `src/components/voyage/Services.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
// Type-only: erased at compile time, so no mongoose reaches the client bundle.
import type { Item } from "@/lib/collections/defineCollection";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { panelPose, STATIC_POSE, type PanelPose } from "./servicesLayout";

interface ServicesProps {
  services: Item[];
  /** false in the `still` tier — panels render fully visible with no scroll-derived motion. */
  animated: boolean;
}

const chapter = CHAPTERS.find((c) => c.id === "approach")!;

/** CSS custom properties are not part of React's CSSProperties, so the pose is handed to
 *  CSS through this widened record. The media query — not JS — picks which of the four it
 *  uses, so there is no matchMedia listener and no hydration mismatch. */
type PoseStyle = CSSProperties & Record<"--dock" | "--arc" | "--tilt" | "--solo", number>;

const poseStyle = (p: PanelPose): PoseStyle => ({
  "--dock": p.dock,
  "--arc": p.arc,
  "--tilt": p.tilt,
  "--solo": p.solo,
});

/** `Item` is untyped past its three base fields, so every read is narrowed here at the leaf.
 *  `outcomes` (0–4) and `engagement` are both optional in the schema (Q1). */
function readService(item: Item) {
  return {
    title: typeof item.title === "string" ? item.title : "",
    promise: typeof item.promise === "string" ? item.promise : "",
    outcomes: Array.isArray(item.outcomes)
      ? item.outcomes.filter((o): o is string => typeof o === "string")
      : [],
    engagement: typeof item.engagement === "string" ? item.engagement : "",
  };
}

/** Chapter 02. Glass panels dock in a shallow arc over the pinned frame (desktop) or
 *  replace one another inside a shorter pin (mobile). */
export default function Services({ services, animated }: ServicesProps) {
  const s = useVoyage();
  const reduce = useReducedMotion();
  const still = !animated || reduce === true;
  // Before the chapter the panels are dark; after it they are docked (and off-screen).
  const t =
    s.chapter.id === "approach" ? s.chapterProgress : s.progress < chapter.start ? 0 : 1;

  return (
    <section
      id="approach"
      className="chapter chapter--approach"
      style={{ height: `${sectionHeightVh(chapter)}vh` }}
      aria-label="Services"
      data-static={still ? "true" : undefined}
    >
      <div className="chapter__pin">
        <p className="chapter__label">
          {chapter.index} / {chapter.label}
        </p>
        <div className="services">
          {services.map((item, i) => {
            const { title, promise, outcomes, engagement } = readService(item);
            const pose = still ? STATIC_POSE : panelPose(i, services.length, t);
            return (
              <article
                key={item.id}
                className="glass service-panel"
                style={poseStyle(pose)}
                // Mobile only: the panels overlap at full size, and `opacity: 0` does not skip
                // a backdrop filter. This attribute is what the mobile CSS gates the 18px blur
                // on. `visibility: hidden` would do it too, but it would also pull the panel
                // out of the accessibility tree — the blur is what costs, so gate only that.
                data-solo-off={pose.solo < 0.005 ? "true" : undefined}
              >
                <p className="service-panel__index">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="service-panel__title">{title}</h2>
                <p className="service-panel__promise">{promise}</p>
                {outcomes.length > 0 && (
                  <ul className="service-panel__outcomes">
                    {/* Chips can repeat, so the index is part of the key. */}
                    {outcomes.map((o, oi) => (
                      <li key={`${o}-${oi}`}>{o}</li>
                    ))}
                  </ul>
                )}
                {engagement !== "" && (
                  <p className="service-panel__engagement">
                    <span>Typical engagement</span>
                    {engagement}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Add the styles to `src/app/voyage/voyage.css`**

Append after the `/* ====== Launch ====== */` block (before `/* ====== CTA ====== */`):
```css
/* ====== Approach Vector (ch. 02) ====== */
/* The pose arrives as four custom properties; this media query, not JS, decides which two
   of them are in force. Desktop: a staggered arc. Mobile: one panel at a time. */
.services { display: flex; align-items: stretch; gap: clamp(1rem, 2vw, 1.75rem); width: 100%; }
.service-panel {
  flex: 1 1 0; min-width: 0; display: flex; flex-direction: column;
  padding: clamp(1.25rem, 2vw, 2rem);
  opacity: var(--dock);
  transform: translateY(calc((1 - var(--dock)) * 48px - var(--arc) * 26px))
             rotate(calc(var(--tilt) * 1.1deg));
  will-change: transform, opacity;
}
.service-panel__index {
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.62rem; letter-spacing: 0.2em;
  color: var(--gray-dark); margin: 0 0 0.9rem;
}
.service-panel__title {
  font-family: "Styrene A", var(--font-space-grotesk), sans-serif;
  font-size: clamp(1.15rem, 1.8vw, 1.6rem); font-weight: 500; letter-spacing: -0.01em;
  line-height: 1.15; margin: 0 0 0.75rem;
}
.service-panel__promise {
  font-size: 0.95rem; line-height: 1.6; color: var(--gray-light); margin: 0 0 1.25rem;
}
.service-panel__outcomes {
  list-style: none; padding: 0; margin: 0 0 1.25rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.service-panel__outcomes li {
  position: relative; padding-left: 1rem; font-size: 0.88rem; line-height: 1.5; color: var(--gray-mid);
}
.service-panel__outcomes li::before {
  content: ""; position: absolute; left: 0; top: 0.65em; width: 6px; height: 1px;
  background: rgba(255, 255, 255, 0.45);
}
.service-panel__engagement {
  margin: auto 0 0; font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.66rem; letter-spacing: 0.12em; color: var(--gray-dark);
}
.service-panel__engagement span {
  display: block; margin-bottom: 0.3rem; opacity: 0.6; text-transform: uppercase;
}

/* Mobile: a 64vh pin is stationary for 86vh of the 150vh section — chapterProgress 0..0.573,
   which is where servicesLayout's replacement windows end. Three full panels cannot stack
   inside one phone viewport, so they replace one another in place.

   The pin keeps .chapter__pin's `top: 0`, so the panel sits in the upper two-thirds with
   empty track beneath it. Do NOT add a `top` offset to compensate: the sticky hold is
   `section − top − height`, so `top: 18vh` would cut it from 86vh to 68vh (chapterProgress
   0.453) and push the replacement windows' 0.56 end outside the pin. Adjust the panel's own
   internal padding instead. */
@media (max-width: 767px) {
  .chapter--approach .chapter__pin { height: 64vh; }
  .services { position: relative; flex: 1 1 auto; }
  .service-panel {
    position: absolute; inset: 0; overflow-y: auto;
    opacity: var(--solo); transform: none;
  }
  /* All N panels overlap at full size with only opacity separating them, and `opacity: 0`
     does NOT skip a backdrop filter — Blink's PaintedOutputInvisible bails out early both on
     a non-initial backdrop-filter and on will-change: opacity, so the invisible panels would
     re-sample an 18px blur of a canvas that repaints every frame, on the one tier whose
     demotion floor is 45fps. `data-solo-off` (set in Services.tsx) is the gate; `will-change`
     above is NOT the remedy here (transform: none means it promotes nothing, and
     backdrop-filter is itself a compositing trigger) — dropping it is an optional tidy-up. */
  .service-panel[data-solo-off="true"] {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

/* Reduced motion / still tier: no pin, no scroll-derived motion — the panels just flow.
   The section height stays a fixed 150vh on every tier (VoyageScroll derives progress and
   drives scrollTo from `scrollHeight − innerHeight`, so `height: auto` here would land every
   dock and rail link after Approach short). 2rem of padding rather than 6rem keeps the
   stacked column inside 150vh at 390x844; `mobile-still.png` in Task 10 Step 3 is the
   evidence. Nothing clips either way — no ancestor sets `overflow: hidden`. */
.chapter--approach[data-static="true"] .chapter__pin {
  position: static; height: auto; min-height: 100vh;
  padding-top: 2rem; padding-bottom: 2rem;
}
.chapter--approach[data-static="true"] .service-panel {
  position: static; inset: auto; opacity: 1; transform: none;
}
@media (max-width: 767px) {
  .chapter--approach[data-static="true"] .services { flex-direction: column; }
}
```

- [ ] **Step 9: Run the component test**

Run: `npx vitest run src/components/voyage/Services.test.tsx`
Expected: PASS — all tests in the file pass (9 new).

- [ ] **Step 10: Run the whole suite, the typechecker and the linter**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src/components/voyage src/scene`
Expected: suite green, `tsc` 0 errors, `eslint` 0 problems in those two directories (the 16 pre-existing problems elsewhere are untouched — see `worklog.md` "Task 14 closing verification").

- [ ] **Step 11: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/components/voyage/servicesLayout.ts src/components/voyage/servicesLayout.test.ts src/components/voyage/Services.tsx src/components/voyage/Services.test.tsx src/app/voyage/voyage.css
git commit -m "$(cat <<'EOF'
feat(voyage): chapter 02 service panels

Data-driven N panels: a staggered shallow arc that finishes docking inside the
pinned frame on desktop, one-at-a-time replacement inside a 64vh pin on mobile.
Pure pose math is unit-tested; the component hands CSS four custom properties and
the media query picks. Item is narrowed at the leaf, 0 outcomes and a blank
engagement line render correctly, and reduced motion drops the pin entirely.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `VoyageRoot` wiring — `<Services>`, the Jump section, and the beat

**Files:**
- Create: `src/components/voyage/useJumpBeat.ts`
- Modify: `src/components/voyage/VoyageRoot.tsx`
- Modify: `src/lib/clientLog.ts`
- Test: `src/app/api/logs/route.test.ts`
- Modify: `src/app/voyage/voyage.css`

**Interfaces:**
- Consumes: `decideJumpBeat`, `chapterIndex` (Task 2); `voyageStore.subscribe` / `.getState()` and `VoyageState.programmatic` (Task 1); `Services` (Task 8); `sectionHeightVh`, `CHAPTERS`; `getAudioEngine().whoosh(opts)`; `logClient`.
- Produces: `export function useJumpBeat(animated: boolean): boolean;` and `"voyage.jump"` in `LOG_EVENTS`.

**Why there is no unit test for the hook or for `VoyageRoot`:** neither has one today, and the map is explicit — `SceneRoot.tsx`, `VoyageScroll.tsx`, `VoyageRoot.tsx`, `Ignition.tsx`, `Letterbox.tsx` have **no** test files, so all decision logic belongs in the pure `decideJumpBeat` (Task 2), which is exhaustively tested. This wrapper only carries the two refs the store cannot.

- [ ] **Step 1: Write the failing route test**

Append to `src/app/api/logs/route.test.ts`, inside the existing `describe("POST /api/logs", …)`. Write **only** this — `clientLog.ts` is edited at Step 3, so that the red is real:
```ts
  it("accepts the voyage.jump event the Jump beat emits", async () => {
    // The route imports LOG_EVENTS from clientLog, so this pins that the two stay in step.
    const res = await POST(post(JSON.stringify({ event: "voyage.jump", progress: 0.2004 })));
    expect(res.status).toBe(204);
    expect(appendLog).toHaveBeenCalledWith("client", expect.objectContaining({ event: "voyage.jump" }));
  });
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `npx vitest run src/app/api/logs/route.test.ts`
Expected: FAIL — the **1** new test fails with `expected 400 to be 204`: the route rejects any event not in `LOG_EVENTS`. All **8** pre-existing tests in the file still pass.

- [ ] **Step 3: Add the log event to `src/lib/clientLog.ts`**

Extend `LOG_EVENTS`:
```ts
export const LOG_EVENTS = [
  "quality.tier",
  "quality.probe",
  "scene.context_lost",
  "admin.upload_failed",
  "admin.save_failed",
  // A failed *read* is not a failed save: the dashboard reports them separately so a
  // stale tab can be told apart from a rejected mutation.
  "admin.load_failed",
  // Slice 3: one line per Jump beat that actually fired, so the browser review can tell a
  // missed beat apart from a suppressed one.
  "voyage.jump",
] as const;
```

`src/app/api/logs/route.ts` imports this same array, so there is nothing to mirror by hand — the event is accepted the moment it is listed.

- [ ] **Step 4: Run the route test to verify it passes**

Run: `npx vitest run src/app/api/logs/route.test.ts`
Expected: PASS — all tests in the file pass (1 new): 9 total (8 pre-existing + 1 new).

- [ ] **Step 5: Implement `src/components/voyage/useJumpBeat.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import { logClient } from "@/lib/clientLog";
import { chapterIndex, decideJumpBeat } from "./jumpBeat";

/**
 * Chapter 03's edge detector: returns whether the Jump letterbox should be down.
 *
 * Subscribes to the store rather than re-rendering per frame, and holds the only two
 * pieces of state the store cannot carry — the previous emit's chapter/flag, and the
 * current hold deadline. Every decision is made by the pure decideJumpBeat().
 *
 * The 250ms idle `tick` in VoyageScroll is load-bearing in both directions: inside the band
 * it is what *renews* the hold, so a slow or keyboard pass cannot lift the bars mid-burst;
 * outside it, it is what re-evaluates and releases the hold once the reader has stopped
 * scrolling. Without an emit the bars would simply stay down.
 */
export function useJumpBeat(animated: boolean): boolean {
  const [letterbox, setLetterbox] = useState(false);

  useEffect(() => {
    // `still` tier: the store still reports chapter "jump", so the gate lives here.
    if (!animated) return;
    // subscribe() does not invoke the listener immediately (voyageStore.ts:56-61), so the
    // previous-emit refs are seeded from the current state.
    const seed = voyageStore.getState();
    let prevIndex = chapterIndex(seed.chapter.id);
    let prevProgrammatic = seed.programmatic;
    let holdUntilMs = 0;

    return voyageStore.subscribe((s) => {
      const result = decideJumpBeat({
        prevIndex,
        nextIndex: chapterIndex(s.chapter.id),
        prevProgrammatic,
        nextProgrammatic: s.programmatic,
        nowMs: Date.now(),
        holdUntilMs,
      });
      prevIndex = chapterIndex(s.chapter.id);
      prevProgrammatic = s.programmatic;
      holdUntilMs = result.holdUntilMs;
      if (result.fire) {
        // The engine self-guards on muted / uninitialised (AudioEngine.ts:205-208), and
        // playWhoosh({ direction: 1 }) is already the upward sweep spec §3:64 asks for.
        getAudioEngine().whoosh({ volume: 0.12, direction: 1 });
        logClient("voyage.jump", { progress: Number(s.progress.toFixed(4)) });
      }
      // React bails out when the value is unchanged, so the 4/s idle ticks cost nothing.
      setLetterbox(result.letterbox);
    });
  }, [animated]);

  return letterbox;
}
```

- [ ] **Step 6: Wire `src/components/voyage/VoyageRoot.tsx`**

Add to the imports (next to `import Launch from "./Launch";`):
```ts
import Launch from "./Launch";
import Services from "./Services";
import { useJumpBeat } from "./useJumpBeat";
```

Add a module-scope lookup below `const PROBE_DELAY_MS = 900;` (the `Launch.tsx:17-19` pattern):
```ts
/** Chapter 03 has no component of its own — it is 25vh of scroll and a beat. */
const jumpChapter = CHAPTERS.find((c) => c.id === "jump")!;
```

Replace three things — the `placeholders` memo, the `if (tier === null)` early return, and the `const animated = tier !== "still";` line **below** that early return — with the block that follows. Anchor on the code text, not on line numbers: Task 7 added an import and grew `VoyageRootProps` from 5 lines to 7, so every line in this file has shifted by about +3 since the plan was written.
```ts
  // Chapters 01–03 own their own sections now; the rest are still placeholders.
  const placeholders = useMemo(
    () => CHAPTERS.filter((c) => c.id !== "launch" && c.id !== "approach" && c.id !== "jump"),
    [],
  );

  // Computed before the early return so the hook below is never called conditionally.
  const animated = tier !== null && tier !== "still";
  const jumpLetterbox = useJumpBeat(animated);

  if (tier === null) return <div className="voyage-root voyage-root--booting" />;
```

Then delete the `void services;` line Task 7 added immediately before the `return (`. Task 7 adds it unconditionally and this step removes it unconditionally — the prop is consumed by name below, so do **not** rename it to `_services` instead.

In the returned JSX, change the scene line to narrow `tier` directly — `SceneRoot` takes `Exclude<Tier, "still">`, and narrowing on the literal check never depends on TypeScript's aliased-condition analysis:
```tsx
      {tier !== "still" ? <SceneRoot tier={tier} ignite={ignited} onContextLost={onContextLost} /> : <StillSky />}
```

Replace the `<Letterbox …>` line (`:108`):
```tsx
      {/* Two independent sources, OR'd here. Ignition writes `letterbox` and clears it
          unconditionally in finish() (Ignition.tsx:49), so sharing one boolean would let it
          stomp a Jump-driven true. */}
      <Letterbox active={animated && (letterbox || jumpLetterbox)} />
```

Replace the track's children (`:118-134`) with:
```tsx
        <Launch headline={settings.heroHeadline} subheadline={settings.heroSubheadline} ready={ignited} />
        <Services services={services} animated={animated} />
        {/* Chapter 03 carries 25vh of scroll and nothing else: no pin, no label, and no
            aria-label — an empty labelled region is a screen-reader dead end. The beat it
            names is entirely in useJumpBeat + the set pieces. */}
        <section
          id="jump"
          className="chapter chapter--micro"
          style={{ height: `${sectionHeightVh(jumpChapter)}vh` }}
        />
        {placeholders.map((c) => (
          <section
            key={c.id}
            id={c.id}
            className={`chapter chapter--placeholder${c.micro ? " chapter--micro" : ""}`}
            style={{ height: `${sectionHeightVh(c)}vh` }}
          >
            {!c.micro && (
              <div className="chapter__pin">
                <p className="chapter__label chapter__label--placeholder">
                  {c.index} / {c.label}
                </p>
              </div>
            )}
          </section>
        ))}
```

- [ ] **Step 7: Add the `.chapter--micro` rule to `src/app/voyage/voyage.css`**

The class has been emitted since slice 1 with no matching selector. Append it to the `/* ====== Track & chapters ====== */` block, after `.chapter__label--placeholder`:
```css
/* Micro-beats (Jump, Dark Passage) are scroll distance and nothing else: no pin, no
   content, nothing to hit-test. */
.chapter--micro { pointer-events: none; }
```

- [ ] **Step 8: Run the full suite, typecheck, lint and build**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src/components/voyage src/scene src/lib/clientLog.ts && npm run build`
Expected: suite green, `tsc` 0 errors, 0 eslint problems in those paths, `next build` succeeds with `/voyage` listed. A `tsc` error on `<SceneRoot tier={tier} …>` means Step 6's literal narrowing was not applied. A `TS2451: Cannot redeclare block-scoped variable 'animated'` means the old `const animated = tier !== "still";` declaration below the early return was left behind — Step 6 replaces it, it does not add a second one. An eslint `'services' is defined but never used` means the `void services;` line from Task 7 Step 5 was deleted without the `<Services services={services} …>` line landing.

- [ ] **Step 9: Smoke-test the beat against the dev server**

Run: `npm run dev` and open `http://localhost:3000/voyage`. With DevTools open:
1. Scroll organically from the hero to past the Jump band → the bars drop and lift once.
2. Scroll back up through the band → **no** bars (backward never fires).
3. Click `Book a call` in the hero (it scrolls to Landing at 0.84, straight through the band) → **no** bars (programmatic is suppressed).
4. `logs/client.jsonl` has exactly one `voyage.jump` line, from step 1.

Expected: all four. If step 3 shows bars, `programmatic` is clearing before the crossing emit is evaluated — check that `decideJumpBeat` receives `prevProgrammatic` as well as `nextProgrammatic`.

- [ ] **Step 10: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/components/voyage/useJumpBeat.ts src/components/voyage/VoyageRoot.tsx src/lib/clientLog.ts src/app/api/logs/route.test.ts src/app/voyage/voyage.css
git commit -m "$(cat <<'EOF'
feat(voyage): render chapters 02 and 03 in VoyageRoot

Services replaces the Approach placeholder, Jump becomes a bare 25vh section
(no pin, no aria-label), and useJumpBeat subscribes the pure decision function to
the store: letterbox OR'd with Ignition's, whoosh gated on the animated tier, one
voyage.jump log line per beat that fires.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Browser review (controller-run)

**Files:**
- Create: `screenshots/voyage/slice-3/*.png`
- Modify (only if the review says so): tuning constants in `Topology.ts`, `Starfield.ts`, `WarpStreaks.ts`, `EnergyOrb.ts`, `servicesLayout.ts`, `jumpBeat.ts`, `voyage.css`

**Interfaces:**
- Consumes: the dev server at `http://localhost:3000/voyage` with everything Tasks 1–9 shipped; `logs/client.jsonl` (the `quality.probe` and `voyage.jump` lines); the chrome-devtools MCP (`navigate_page`, `resize_page`, `emulate`, `evaluate_script`, `take_screenshot`, `list_console_messages`), with the Playwright MCP as the mobile fallback.
- Produces: the sixteen PNG baselines in `screenshots/voyage/slice-3/` (seven desktop, eight mobile, one reduced-motion), the FPS probe reading, the lookAt cut-or-smear verdict, and the list of retuned constants with old and new values. All four are consumed by Task 11.

**This task is run by the controller, not a fresh implementer.** It returns control after every capture is on disk; the controller looks at each one. Spec §6 requires a browser review before the next slice begins, and per `insights.md` the screenshots are the only regression net for textures, sprites and DOM.

- [ ] **Step 1: Start the server and create the screenshot directory**

```bash
cd /Users/admin/Codes-2/portfolio
mkdir -p screenshots/voyage/slice-3
npm run dev
```
Open `http://localhost:3000/voyage` with the chrome-devtools MCP (`navigate_page`). Let Ignition finish.

- [ ] **Step 2: Capture the desktop set at 1440×900**

Resize to 1440×900 (`resize_page`). For each progress `p` below, run this in `evaluate_script` and then `take_screenshot` immediately:

```js
// Native scrollTo, NOT voyageStore.scrollTo: the store's scrollTo sets the programmatic
// flag, which suppresses the very beat these captures exist to check.
window.scrollTo({ top: P * (document.documentElement.scrollHeight - window.innerHeight), behavior: "auto" });
```

| File | `P` | chapterProgress | What it must show |
|---|---|---|---|
| `desktop-p08.png` | 0.08 | approach 0.00 | Chapter enters: panels not yet docked, graph dark |
| `desktop-p10.png` | 0.10 | approach 0.167 | Mid-dock: panels staggered (first ahead of last), topology assembling |
| `desktop-p12.png` | 0.12 | approach 0.333 | **The money frame.** All panels docked in the arc, graph whole behind them, starfield softened. Last frame the 100vh pin is stationary |
| `desktop-p16.png` | 0.16 | approach 0.667 | Exit: the panel block is sliding out of frame, graph fading |
| `desktop-p195.png` | 0.195 | approach 0.958 | Pre-jump: streaks still velocity-driven, no letterbox |
| `desktop-p21.png` | 0.21 | jump 0.50 | Mid-jump: bars down, hyperspace tunnel at full stretch, star flare at peak |
| `desktop-p23.png` | 0.23 | orbit 0.083 | Post-jump: bars still down with the hold running out, streaks relaxed, orbit placeholder |

**Letterbox timing for p21 and p23.** The hold is `max(900 ms, the rest of the band)`: while the store still reports chapter `jump`, the 250 ms idle tick renews the deadline (Task 2's `inBand` branch). So parking at p21 holds the bars indefinitely — step from p195 to p21 in one `evaluate_script` and screenshot at leisure; there is no race and no retry. p23 is the opposite: renewal stops the moment the band is left, so the bars come up ~900 ms after the p23 scroll and the `Letterbox` transition runs 0.45 s on top of that (`Letterbox.tsx:7`). Screenshot p23 **immediately** after the scroll to catch the bars still down; if they are already gone, re-run the p195 → p21 → p23 sequence faster.

- [ ] **Step 3: Capture the mobile set at 390×844**

`resize_page` clamps around ~500px (`insights.md`, 2026-09-15), so it cannot reproduce a phone. Use the chrome-devtools `emulate` tool with device metrics width 390, height 844, deviceScaleFactor 3, mobile true. If `emulate` is unavailable, drive these eight progress captures (and the reduced-motion one below) with the Playwright MCP `browser_resize` + `browser_take_screenshot` instead — Q4 deferred the Playwright *test suite*, not a Playwright-driven screenshot.

Mobile is the **only** capture set at tier `mid` (`quality.ts:22-26` returns `"mid"` for `isMobile`), so it is the sole baseline for chapter entry, pin release, pre-jump and post-jump on that tier. All eight points from the decisions file's GAP-6 list are captured here, not just the panel ones.

| File | `P` | chapterProgress | What it must show |
|---|---|---|---|
| `mobile-p08.png` | 0.08 | approach 0.00 | Chapter enters at tier `mid`: panels not yet docked |
| `mobile-p10.png` | 0.10 | approach 0.167 | Panel **1** alone, inside the 64vh pin, no horizontal overflow |
| `mobile-p12.png` | 0.12 | approach 0.333 | Panel **2** alone (panel 1 fully gone) |
| `mobile-p14.png` | 0.14 | approach 0.500 | Panel **3** alone |
| `mobile-p16.png` | 0.16 | approach 0.667 | The 64vh pin has released; the block is leaving |
| `mobile-p195.png` | 0.195 | approach 0.958 | Pre-jump at tier `mid`: streaks still velocity-driven |
| `mobile-p21.png` | 0.21 | jump 0.50 | Mid-jump: bars, tunnel, flare |
| `mobile-p23.png` | 0.23 | orbit 0.083 | Post-jump at tier `mid`: bars still down with the hold running out, streaks relaxed |

One more capture, and the only evidence the `still` tier's phone layout has: keep the 390×844 emulation and add `prefers-reduced-motion: reduce` (chrome-devtools `emulate`, or Playwright's `browser_resize` with the same media override), reload, and capture `mobile-still.png` at `P = 0.12`. It must show the un-pinned column — every panel flowing, nothing clipped, no horizontal scrollbar. The section is a fixed 150vh on every tier, so this is where a still-tier overflow would show up.

- [ ] **Step 4: Read the FPS probe**

```bash
cd /Users/admin/Codes-2/portfolio && grep '"quality.probe"' logs/client.jsonl | tail -3
```
Record the `fps`, `from` and `to` values in `worklog.md` (Task 11) as **baseline tier held through Launch** — that is all this reading can support. The probe is armed once per page load and samples a 1s window starting 900 ms after ignition (`VoyageRoot.tsx:25`, `:64-79`), i.e. during Launch, where `Topology` draws nothing (`group.visible = fade > 0.001`) and `Services` is below the fold. It therefore cannot see chapter 02/03 frame cost at all; that measurement is scheduled at slice 8 per spec §7 (Lighthouse + performance trace), so no new measurement is owed here. Judder in the new chapters is a live-page observation — checklist item 9.

- [ ] **Step 5: Work the checklist**

Against the captures and the live page:
1. Panel copy is legible at both sizes; no clipped text, no horizontal scrollbar at 390px.
2. The arc reads as an arc — middle panel lifted, outer panels tilted — and not as a flat row.
3. The topology graph reads as *behind the middle panel*, not floating beside it or hidden behind the star. If it is off-frame, retune `OFFSET_X` / `OFFSET_Y` / `OFFSET_Z` in `Topology.ts` — and the docked graph must read as nodes-and-edges, not an undifferentiated glow. If it does not, raise `EDGE_OPACITY` or pull `OFFSET_Z` toward the camera, not just the X/Y offsets. (At 1440×900 with `OFFSET_Z = -34` and FOV 60 the disc is ~413 × 256px against a ~404px-wide middle panel, so most of it sits behind `rgba(10,10,10,.55)` + `blur(18px)`.)
4. The starfield softening is visible at p12 (compare against `desktop-p08.png`).
5. The Jump reads as one beat: letterbox → tunnel → flare → whoosh (unmute to check the audio), then Orbit.
6. **The lookAt swing** (`LOOKAT_POINTS[2] → [3]`, ~(28, −18, −10) inside 25vh — slice-1 deferral line 16, map §6.9b): does p21 → p23 read as a **cut** or as a **smear**? Only if it reads as a smear does a one-frame `smoothPos.copy(pose.position)` / lerp override in `SceneRoot` become a task — record the verdict either way.
7. `list_console_messages` → zero errors and zero warnings from app code.
8. Re-check the three beat cases from Task 9 Step 9 by hand at 1440×900.
9. No visible judder scrolling P 0.08 → 0.24 on the live page. First suspects are the panel `backdrop-filter` and `will-change`, then `topologyNodes`. (The FPS probe cannot answer this — see Step 4.)
10. **The star flare** is visible at p21 and absent at p23. The burst sprite has no unit coverage at all (`vitest.config.mts` is `environment: "node"` and `makeBurstTexture` needs `canvas.getContext("2d")`), so these two captures are its only regression net.
11. **Scroll the band organically over ~2 s, then again with arrow keys** (~40px per press). The bars, the tunnel and the flare must end together — the letterbox hold renews while the store still reports chapter `jump`, so a slow pass must not lift the bars mid-burst. If it does, the `inBand` renewal in `decideJumpBeat` is not in force.
12. **Mobile vertical framing:** the 64vh pin is top-anchored, so the panel sits in the upper two-thirds with empty track beneath it. Confirm from `mobile-p10` / `mobile-p12` / `mobile-p14` that this reads as deliberate rather than as a layout bug.

- [ ] **Step 6: Commit the captures, then any tuning separately**

```bash
cd /Users/admin/Codes-2/portfolio
git add screenshots/voyage/slice-3
git commit -m "$(cat <<'EOF'
chore(voyage): slice 3 screenshot baselines

Desktop 1440x900 at p08/p10/p12/p16/p195/p21/p23 and mobile 390x844 at
p08/p10/p12/p14/p16/p195/p21/p23, plus one reduced-motion 390x844 capture of
the still tier. Mobile is the only set at tier mid, so it is the sole baseline
for chapter entry, pin release, pre-jump and post-jump on that tier.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

If the checklist produced tuning changes, commit them **separately** from the captures and re-capture the affected screenshots. `git add` the tuned source files you actually edited plus `screenshots/voyage/slice-3`. Title the commit `fix(voyage): retune` followed by the name of the constant you changed, and give it one body paragraph naming the capture that motivated the change and saying what the new value does. End that body with the same trailer every other commit in this plan uses:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

Record every retuned constant, with its old and new value, in Task 11 Step 2.

---

### Task 11: Docs + closing verification

**Files:**
- Modify: `worklog.md`, `insights.md`, `design.md`
- Modify: `.superpowers/sdd/slice3-decisions.md` (Step 5 — the source of truth catches up with the FLAGGED pin arithmetic). `.superpowers/sdd/` carries its own `.gitignore` with `*`, so this file is edited but **never** committed; do not add it to Step 7's `git add`.

**Interfaces:**
- Consumes: everything Tasks 1–10 produced — the verification output of Step 1, Task 10's captures, its FPS probe reading, its lookAt cut-or-smear verdict, and its list of retuned constants with old and new values.
- Produces: the slice-3 sections of `worklog.md`, `insights.md` and `design.md`; the amended `slice3-decisions.md`; the pushed branch.

- [ ] **Step 1: Run the whole verification set and capture the real numbers**

```bash
cd /Users/admin/Codes-2/portfolio
npx tsc --noEmit
npx vitest run
npx eslint .
npm run build
```
Expected: `tsc` 0 errors. `vitest` green — record the exact test/file counts. `eslint .` still reports the **16 pre-existing problems (10 errors, 6 warnings)** in files this branch never touched (`TypewriterText`, `ThemeToggle`, `ThreeBackground`, `CustomCursor`, `CinematicIntro`, `FilmGrain`, `ProjectsClient`, `admin/page.tsx:337`) — and **zero** in slice-3 files, which `npx eslint src/scene src/components/voyage src/lib src/app/voyage` proves separately. `npm run build` succeeds with `/voyage` in the route table.

- [ ] **Step 2: Append the slice-3 section to `worklog.md`**

Under a new `## Slice 3 — Approach Vector + Jump (feat/voyage-slice-3)` heading, one bullet per task, plus:
- the FPS probe values from Task 10 Step 4;
- the verdict on the lookAt swing (cut or smear) from Task 10 Step 5 item 6;
- every constant retuned in the browser review, with its old and new value;
- the verification numbers from Step 1;
- a `### Next` block naming slice 4 (Orbit / process ring) and carrying forward the tuned constants list plus the two open follow-ups: `Launch.tsx` has no `useReducedMotion()` guard (GAP-3, deliberately not retrofitted in slice 3), and Playwright integration tests are deferred to slice 8 (spec §7).

- [ ] **Step 3: Append the slice-3 findings to `insights.md`**

Under `## 2026-09-18 — Voyage slice 3 (Approach Vector + Jump)`. The findings worth keeping (write what actually happened, not this list verbatim):
- **A 100vh sticky pin inside a 150vh section is stationary for 50vh, not 150.** Every chapter-progress window has to be derived from `sectionHeight − pinHeight`, or the animation plays while the block is already leaving the frame. This is the whole reason the mobile pin is 64vh.
- **`max()` is how two drivers share one control.** Glare (`setGlare` × Jump), soften (`setSoften` × Approach) and the streak curves (velocity × hyperspace) all combine that way, which keeps the existing tests green *and* makes both ends of each beat continuous.
- **Velocity is the wrong clock for a scroll-native beat.** It is instantaneous and sign-less, so a slow deliberate scroll through the Jump would show nothing. `chapterProgress` is the only monotonic 0→1 driver inside a 25vh window.
- **The whoosh is wall-clock; the letterbox is wall-clock *floored by the band*.** The whoosh is a one-shot 0.4 s SFX fired on the crossing edge. The bars are not: they are held for `max(900 ms, the rest of the band)`, because the 250 ms idle tick renews the deadline for as long as the store still reports chapter `jump`. Without that renewal any pass slower than 225 px/s — every arrow-key pass — lifts the bars while the tunnel is still growing.
- **A chapter-edge detector has to read chapter *indices*, not ids.** One native-scroll emit can carry approach → orbit, and the store never reports the micro-beat at all.
- **A programmatic `scrollTo` needs a timeout as well as an epsilon — and a no-op guard.** Lenis's lerp tail can stall short of the target, so without the timeout one interrupted CTA click would suppress the beat for the rest of the session; and a `scrollTo` naming the position the reader is already at emits no scroll event at all, so nothing would ever clear the flag.
- Any finding from the browser review that the six bullets above do not cover — if there are none, say so explicitly.

- [ ] **Step 4: Update `design.md`**

Add an "Approach Vector and Jump" subsection to the voyage architecture section covering:
- the data path `page.tsx → getVoyageContent() → VoyageRoot → Services`, with narrowing at the leaf;
- the pose-as-CSS-custom-properties arrangement and why the media query, not JS, picks desktop vs mobile;
- the set-piece additions (`Topology`, and the chapter-gated branches in `Starfield` / `WarpStreaks` / `EnergyOrb`), with the rule that a piece reads `ctx.voyage.chapter.id` inside its own `update()` rather than being driven from `SceneRoot`;
- the two-clock Jump beat: `decideJumpBeat` + `useJumpBeat` + the store's `programmatic` flag.

- [ ] **Step 5: Amend `.superpowers/sdd/slice3-decisions.md` so the source of truth matches what shipped**

Two lines in the decisions file were superseded by the ⚠ FLAGGED pin arithmetic and must be corrected at source, or slice 4 inherits them. Edit in place, leave every other line byte-identical, and record the amendment in the `worklog.md` section from Step 2.

1. **`slice3-decisions.md:18`** — replace "(thirds of chapterProgress), single 100vh pin" with: *"a **64vh** pin for the Approach chapter only (150 − 64 = 86vh of hold → chapterProgress ∈ [0, 0.573]); `sectionHeightVh`, the offset identity and `VOYAGE_SCROLL_VH` are untouched — only the pin's CSS height changes, and a shorter pin needs less scroll to clear."*
2. **`slice3-decisions.md:31`** — replace "panel i is active for chapterProgress in `[i/N, (i+1)/N)`" with: *"panel i owns one slot of the `[0.04, 0.56]` replacement window (`SOLO_START`/`SOLO_END` in `servicesLayout.ts`), with an 18%-of-slot crossfade either side."* In the same line delete "inside the single 100vh pin" (the pin is now 64vh on mobile, see item 1) and replace the named captures "mobile p10 (panel 1), p14 (panel 2), p18 (panel 3)" with *"mobile p10 / p12 / p14 — chapterProgress 1/6, 1/3, 1/2, one panel each. p18 is chapterProgress 0.833, past `SOLO_END = 0.56`, and would photograph an empty pin."*

Do **not** add a new binding decision for these constants: the FLAGGED block deliberately reserves the controller's licence to retune them at Task 10, and freezing them here would remove it.

`.superpowers/sdd/` is covered by its own `.gitignore` (`*`), so this file is amended on disk only — it is not part of Step 7's commit.

- [ ] **Step 6: Check the slice against spec §8**

Confirm and record in `worklog.md`, for chapters 02 and 03 only:
- both chapters are reachable and legible on desktop and mobile (Task 10 captures);
- still exactly one WebGL context (`Topology` joined the existing `pieces` array; no composer was added);
- the baseline tier held through Launch (Launch-window sample only — chapter 02/03 frame cost is measured at slice 8 per spec §7);
- zero console errors (Task 10 Step 5 item 7);
- the reduced-motion path is usable end to end: `still` renders `StillSky`, `Services` drops its pin and shows every panel, and the Jump section is inert but keeps its 25vh.
Anything that fails goes into `### Next` as a named follow-up, not into a silent pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add worklog.md insights.md design.md
git commit -m "$(cat <<'EOF'
docs(voyage): slice 3 worklog, insights and architecture notes

Approach Vector + Jump: per-task record, browser-review verdicts and retuned
constants, the pin-geometry finding, and the spec section 8 check for chapters
02 and 03.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Push the branch**

```bash
cd /Users/admin/Codes-2/portfolio && git push -u origin feat/voyage-slice-3
```

---

## Self-review

**1. Spec coverage — chapter 02 (row 72) and chapter 03 (row 73), plus §3's cinematic direction.**

| Spec requirement | Where |
|---|---|
| "Dolly-in toward the star" | **Already implemented.** Approach travels Δz = −28 over Δprogress 0.12 in `POSITION_POINTS[1] → [2]`. No slice-3 work. |
| "streak length ∝ velocity" | **Already implemented.** `streakLength(ctx.voyage.velocity)`, pinned by tests. Untouched. |
| "FOV widens" | **Already implemented.** `fovForVelocity` lerped in `SceneRoot.tsx:152-156`. Spec §3:61's "snaps back on rest" is that lerp settling. No slice-3 work. |
| "Three glass panels dock in a shallow arc, staggered" | Task 8 (`panelPose`, `.service-panel`), data-driven in N per Q1. |
| "Topology graph assembles node-by-node behind the middle panel" | Task 6. |
| Panel content: mono label, one-line promise, outcome bullets, "typical engagement" | Task 8 (`service-panel__index/title/promise/outcomes/engagement`). |
| Data source `services[]` | Task 7. |
| "Focus pulls: particles behind a pinned panel soften (size ×1.6, opacity ×0.35)" | Task 5 — the existing `applyControls` math already produces exactly those numbers at soften 1. |
| "letterbox drops in" | Task 9 (`jumpLetterbox` OR'd into `<Letterbox>`). |
| "streaks stretch to full hyperspace tunnel" | Task 3. |
| "star flares" | Task 4. |
| "whoosh + filter sweep" | Task 9 — `playWhoosh({ direction: 1 })` is the upward 400→3200 Hz sweep; no second ambient ramp (Q3). |
| "cut to Orbit" | Delivered by the curve + letterbox; **no camera snap** (decision 6), verdict recorded in Task 10. |
| "No content" in Jump | Task 9 — bare section, no pin, no label, no `aria-label`. |
| "Skipped entirely in `still` tier" | Structurally present, behaviourally inert: `StillSky` replaces the scene, `animated &&` gates the letterbox, `useJumpBeat` returns early, `Services` drops its pin. The 25vh **stays** (decision 5). |
| §7 "Integration (Playwright)" | **Deferred to slice 8** — recorded deviation (Q4). |
| §7 "Visual: committed screenshot baselines per slice" | Task 10. |
| §5:129 "Empty data → chapter hides and the flight path drops its waypoint" | **Not implemented and out of scope** — no such mechanism exists anywhere (map §6.11), and `CHAPTERS`/`POSITION_POINTS` are module-scope constants. Slice 3 instead renders the empty state correctly (Task 8: 0 services → section at full height, no panels). |
| §5:121 "bloom" on `high` | **Not implemented** — Q3. Flares are additive sprites in the existing pipeline. |

**2. Placeholder scan.** Every code step carries complete code, and there is no `<…>` token anywhere outside a real code sample — Task 10's optional retune commit is written in prose for exactly that reason. The only measured-at-runtime value (`Topology`'s seed literal `-4.798959255218506`) was computed against the exact `mulberry32(9901)` draw order written in Task 6 and is stated as a literal, not deferred to the implementer. Task 7 Step 2 is the one test step with no red — a characterisation test over code that shipped in sub-project 2 — and that task's real red is the `tsc` failure at Step 4; both are stated explicitly, with the reason, rather than left ambiguous.

**2b. Test counts.** Every RED step names the number of new tests that must fail, the error text, and which pre-existing tests must stay green; every GREEN step names how many new tests the file gained. Per task: Task 1 8 new (19 total), Task 2 14 new, Task 3 8 new (16 total), Task 4 6 new (10 total), Task 5 6 new (12 total), Task 6 13 new in `Topology.test.ts` plus two assertions on an existing `quality.test.ts` test, Task 7 2 new, Task 8 12 new in `servicesLayout.test.ts` and 9 in `Services.test.tsx`, Task 9 1 new (9 total). The whole-suite baseline is 313 passed / 30 files at `063e2d5`.

**3. Type consistency.** Names used identically across every task and every Consumes/Produces block: `programmatic` · `PROGRAMMATIC_EPS` · `PROGRAMMATIC_TIMEOUT_MS` · `decideJumpBeat` · `JumpBeatInput` · `JumpBeatResult` · `JUMP_HOLD_MS` · `JUMP_INDEX` · `chapterIndex` · `hyperLength` / `hyperOpacity` / `hyperConverge` · `HYPER_LENGTH_MAX` / `HYPER_OPACITY_PEAK` / `HYPER_CONVERGE_MAX` · `jumpGlare` · `approachSoften` · `visibleNodeCount` · `topologyFade` · `Topology` · `topologyNodes` · `PanelPose` / `panelPose` / `STATIC_POSE` · `Services({ services, animated })` · `useJumpBeat(animated)` · `"voyage.jump"`.

