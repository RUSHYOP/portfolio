# Voyage Redesign — Slice 4 (Orbit / the Process Ring) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Execution shape:** Task 1 runs **alone and first** (every other task rebases on its chapter table). Then three file-disjoint waves may each run in parallel git worktrees: **Wave 1 = Tasks 2 ∥ 3 ∥ 5**, **Wave 2 = Tasks 4 ∥ 6 ∥ 7** (after Wave 1 is merged), then **Task 8 alone**, then Task 9 (controller-run browser review) and Task 10 (docs + closing verification). See "Parallelism" below for the dependency reasons — do not reorder across waves.

**Goal:** Ship chapter 04 "Orbit": the camera banks ~30° and settles; the star reads as a sphere; one large monochrome ring with one node per process step turns so each node arrives front-centre as its glass panel takes over; the chapter is 300vh (up from 150) inside a 1400vh voyage.

**Architecture:** The chapter table is re-declared in vh (one cumulative array derives every `start`/`end`, so fractions can never drift or leave a 1-ulp gap) and every test names scroll positions through a new `progressAt(chapterId, t)` helper instead of absolute progress literals. One pure module, `orbitSchedule.ts`, is the single clock for the three Orbit consumers — the DOM panels (`Process.tsx`), the ring (`OrbitRing.ts`) and the starfield focus pull — so a panel and its node always change together. Every continuous beat stays driven by `ctx.voyage.chapter.id` + `chapterProgress` inside the set piece that owns it; the camera roll is a pure `bankForProgress` applied after `lookAt`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 strict, three@0.169, framer-motion 12, lenis 1.3, vitest 5 (+ jsdom / @testing-library/react, already installed), MongoDB/Mongoose 9.

**Spec:** `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md` §3 (row 04 + "Cinematic direction"), §5, §6–§8.
**Codebase map (authoritative over the spec's code blocks):** `.superpowers/sdd/slice4-map.md` (delta on `.superpowers/sdd/slice3-map.md`).
**Decisions:** `.superpowers/sdd/slice4-decisions.md` (including its "Amendments after the map" and "Ring geometry amendments" sections, which override the sections above them).

## Global Constraints

*(copied from `docs/superpowers/plans/2026-09-14-voyage-slices-1-2.md`; the "Scroll geometry" bullet and the commit-trailer wording are superseded for this slice and replaced by the slice 4 additions below — see the note after the slice 3 additions)*

- Exactly **one** WebGL context for the scene. `@designcodeio/threeui` is **not** a dependency (its dock is ported, see Task 10).
- Device pixel ratio capped at **1.5** (`high`), **1** (`mid`). Tiers: `high | mid | still`. A 1s FPS probe **demotes one tier if < 45 fps**.
- Amber accent **`#f2b35c`** appears only as: the star, primary CTA fill, flight-rail progress dot, cursor ring over CTA. All 3D geometry other than the star is **monochrome white on black**.
- Typography: display **Styrene A** (existing self-hosted) with `var(--font-space-grotesk)` fallback; instrument text **JetBrains Mono** via `var(--font-jetbrains-mono)`. Hero H1 `clamp(3.5rem, 8vw, 8rem)`, weight 500, letter-spacing −0.02em, line-height 0.95.
- Glass panel: border `1px solid rgba(255,255,255,.08)`, `backdrop-filter: blur(18px)`, background `rgba(10,10,10,.55)`, inner top highlight `rgba(255,255,255,.06)`, radius 20px.
- DOM motion: fade-up 12px, 0.5s, ease `[0.2, 0.7, 0.2, 1]`. Nothing bounces.
- FOV **60° → 70°** with scroll velocity. Camera **never reverses**: position `z` is non-increasing along the path and the forward vector always has negative `z`.
- `distanceAU` is monotonically non-increasing with progress and is `0` from chapter `pilot` onward.
- `prefers-reduced-motion`: tier `still`, no Lenis, no camera motion, Ignition skipped, Letterbox never shown.
- Ignition ≤ 1.2s, skippable (click / Escape / Enter / Space), plays once per session (`sessionStorage["voyage-ignition-played"]`).
- No `TypewriterText`, no keystroke sounds anywhere in new code.
- `/admin` and `/work/*` never mount the scene. `GlobalOverlays` already excludes `/admin`.
- Copy is data-driven: hero headline/subheadline come from `Settings` (new fields with defaults). Admin inputs for them are sub-project 2.
- Structured logs: client events POST to `/api/logs`, appended as JSON lines to `logs/<name>.jsonl` when the filesystem is writable.
- Commit after every task. Every commit message ends with the trailer fixed in the slice 4 additions below.

### Global Constraints additions for slice 3

- Client/server boundary: no `"use client"` file imports `@/lib/collections` (index) or `defineCollection.ts`/`markdown.ts`/`mail.ts` **as values**. A type-only `import type { Item } from "@/lib/collections/defineCollection"` is erased at compile time and is the established pattern (`src/app/admin/components/types.ts:23`, and `VoyageRoot.tsx:5` already type-imports `Settings` from the mongoose-importing `@/lib/data`). Client code narrows `Item` at the leaf (`Array.isArray(...) ? ... : []`, `typeof x === "string" ? x : ""`).
- Structured logging only: server `appendLog`, client `logClient` with events added to `LOG_EVENTS` in `src/lib/clientLog.ts` (`/api/logs/route.ts` imports that same array, so there is nothing to mirror by hand). No `console.*` in app code. Slice 3 adds `voyage.jump`.
- `/voyage` stays `noindex`; `/work/[slug]` stays `noindex`; flip together at launch.
- New set pieces: own `mulberry32(seed)` (never share Starfield's 1337 sequence), `update()` is a no-op before `build()`, `dispose()` idempotent, tier counts live in `TierSettings` with a matching `quality.test.ts` assertion.
- New voyage DOM: `useVoyage()` for reveals; continuous scroll-derived motion via inline `style`, framer `animate` only for boolean-gated reveals; module-scope handlers; `sectionHeightVh(chapter)` for heights; `.chapter__pin` only on content chapters.

*(The block above is copied from `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`, including its slice-3 additions; "Task 10" inside it refers to that plan. Three of its bullets were superseded for this slice and are **not repeated here**: the "Scroll geometry" bullet (1250 / 1350vh / 0.08), the "Never mutate … `CHAPTERS` … `VOYAGE_SCROLL_VH`" bullet, and the commit-trailer wording (the "Commit after every task" half is kept). Their replacements are the slice 4 additions below.)*

### Global Constraints additions for slice 4

- `VOYAGE_SCROLL_VH = 1400`; chapter spans are declared in vh with derived fractions; `sectionHeightVh` is exact; no hand-typed fractions anywhere new. The track is `VOYAGE_SCROLL_VH + VOYAGE_TAIL_VH` = 1500vh and `scrollHeight − innerHeight === VOYAGE_SCROLL_VH` still holds (this replaces the slice-3 "1250 / 1350vh" bullet; the identity is unchanged).
- No absolute progress literals in new tests — use `progressAt(id, t)`.
- `-webkit-backdrop-filter` must be declared before `backdrop-filter` (lightningcss drops the standard property otherwise).
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` on every commit in this plan, verbatim. It replaces the slice-3 trailer wording and any attribution the executing agent's own harness supplies.
- Slice 4 deliberately changes `CHAPTERS` and `VOYAGE_SCROLL_VH` (Task 1, only). It still never mutates `POSITION_POINTS` / `LOOKAT_POINTS` (a mid-orbit waypoint would break the `i/11` mapping `flightPath.test.ts` pins), `streakLength` / `streakOpacity`, or the tuned constants `STAR_SCALE_MAX`, `LAUNCH_LOOK_OFFSET`, `GLOW_MIN`, `Topology`'s offsets, `JUMP_HOLD_MS`, the Jump curves and the slice-3 service-panel windows.
- New set piece (`OrbitRing`) follows the slice-3 rules: `update()` is a no-op before `build()`, `dispose()` is idempotent, `build()` disposes a previous build, tier counts live in `TierSettings` with a matching `quality.test.ts` assertion, nothing is allocated per frame. It needs no PRNG (its layout is deterministic), so it has no seed.
- Every browser-review tunable introduced here is an **exported constant** (`BANK_MAX`, `RING_RADIUS`, `RING_TILT`, `RING_TUBE`, `NODE_RADIUS`, `NODE_ACTIVE_BOOST`, `RING_OPACITY`, `NODE_OPACITY`, `RING_FADE_OUT_END`, `LIMB_POWER`, `LIMB_RIM`, `ORBIT_SOFTEN_PEAK`, `ORBIT_WINDOW`, `ORBIT_EDGE_FADE`, `STEP_CROSSFADE`) or a CSS custom property (`--orbit-panel-w`, `--orbit-panel-h`), so Task 9 can retune without touching logic.
- Structured logging: slice 4 adds no client events. No `console.*` in app code.

---

## Decisions and spec deviations

These are binding. Do not reopen them; if execution surfaces a contradiction, stop and report it rather than re-deciding.

1. **U1 — Orbit is 300vh; `VOYAGE_SCROLL_VH` is 1400.** Every other chapter keeps its current vh length (launch 100, approach 150, jump 25, worlds 225, belt 100, passage 37.5, constellation 137.5, pilot 125, landing 137.5, surface 62.5). Target ≈ ½ viewport of pinned hold per process step at N = 4. **Spec deviation recorded:** spec §3 row 04 says "each panel pins ~1 viewport"; the user's 300vh decision gives ½. Settled, not a question.
2. **E1 — Chapter table in vh, with one construction rule.** `start_i = cum[i] / VOYAGE_SCROLL_VH` and `end_i = cum[i+1] / VOYAGE_SCROLL_VH` (the same expression as `start_{i+1}`); the last `end` is forced to exactly 1. Never `start + span / VOYAGE_SCROLL_VH` — that leaves 1-ulp gaps at 6 of the 10 boundaries, and `chapterAt` falls through to `surface` (a one-frame teleport). The contiguity test becomes `toBe` (exact) and a sweep test pins `chapterAt` never returning `surface` before surface starts. `sectionHeightVh` returns `spanVh` (+ tail on surface) exactly. `Chapter`'s public shape keeps `start`/`end` (and gains `spanVh`), so `FlightRail`, `Dock`, `Launch`, `scrollTo` need no edits. `PILOT_START` is already derived from `CHAPTERS` and needs no edit (its value moves 0.74 → 0.768; the star's per-vh growth slows slightly — accepted).
3. **E2 — `progressAt(id, t)` and the literal conversion.** Exported from `flightPath.ts`; `t ≤ 0` / `t ≥ 1` return the chapter's own `start` / `end` bit-for-bit. Every slice 1–3 test that used an absolute progress literal is rewritten to it, preserving chapter + relative position (the 11 tests the map measured as failing **and** the silently-retargeted ones: `Topology.test.ts:120`, `EnergyOrb.test.ts:107`, `WarpStreaks.test.ts:184`, `useJumpBeat.test.tsx:45,55,100,109` and the `{ progress: 0.21 }` log assertion). **Sequencing deviation:** Task 1 first adds `progressAt` and converts the tests *while the old table is still in force* (they stay green — each literal maps to the same place), and only then swaps the geometry. That makes the conversion a pure refactor with a green bar on both sides, instead of 11 reds fixed after the fact.
4. **E3 — Bank.** Pure `bankForProgress(progress)` in `flightPath.ts` (0 outside Orbit; eases to `BANK_MAX` = 30° over orbit cp [0, 0.18], holds, eases back to 0 over [0.82, 1]); applied in `SceneRoot` as `camera.rotateZ(smoothBank)` immediately after `lookAt`, with `smoothBank` lerped at `POSE_LERP`. It cannot reach `getCameraPose`, so the never-reverse test and every waypoint invariant are untouched. Topology copies the camera quaternion but is invisible outside Approach, and the bank is 0 there (`smoothBank` can lag into Approach only on a fast scroll back, and Topology is camera-locked, so it simply rolls with the camera — harmless). `WarpStreaks` reads `camera.position.z` only, never the camera's rotation, so the roll cannot reach it.
5. **E4 — One schedule, one window.** `src/scene/chapters/orbitSchedule.ts`: `ORBIT_WINDOW = [0.04, 0.62]`, `orbitCursor(cp, n)`, `stepSolo(i, n, cp)` (plus `panelPresence`, `orbitPresence`, the edge-fade envelope, and the derived holds). One window serves every device: the ring is a single WebGL instance and cannot be media-query-aware, and the desktop hold (cp 0 … 2/3) is the smaller one; on mobile (hold to 0.787) the last step simply dwells — `stepSolo(last)` stays 1 from the window end through the mobile pin release (tested). **Interpretation recorded (the one place this plan chose between two readings of E4):** inside `ORBIT_WINDOW` the summed panel visibility is never below 1, which is only possible if the first panel's fade-in sits in the *margin* before the window (`[0, 0.04]`) rather than inside it; every cross-fade *between* steps is inside the window. The panels have **no fade-out**: `panelPresence` is 0 → 1 over `[0, 0.04]` and then stays 1, so the last step dwells until the pin releases (desktop cp 2/3, mobile 0.787) and leaves with the pin — the pin's own release is the panels' exit, and `Process` gates on `chapter.id === "orbit"` so nothing shows once Orbit is over. Only the ring and the starfield focus pull use `orbitPresence`'s fade-out over `[0.62, 0.66]` (the ring then finishes its own fade by cp 0.9). Accepted cost of the single window: on a phone, panel 4 is still up at cp 0.787 while the ring is ≈ 46% faded and the stars are back in focus; on desktop at cp 0.70 the panel is leaving with the pin at full opacity while the ring is still ≈ 93% visible (holding the soften instead would give desktop 100vh of blur with no panel after cp 2/3). Cursor and panel visibility use the same boundaries and the same easing, so `Σ i·stepSolo(i) === orbitCursor` inside the window (a tested invariant): a node arrives front-centre exactly as its panel replaces the previous one.
6. **E5 + ring-geometry amendments — `OrbitRing`.** A thin `TorusGeometry` (6 radial segments, tubular = `TierSettings.ringSegments`: 128 / 64 / 0) with additive `MeshBasicMaterial` — not `LineLoop` (1 px in WebGL regardless of `linewidth`). Nodes are low-poly spheres (`SphereGeometry(1, 12, 8)`) sharing one geometry and one material; the active node swells by scale (no per-node material, so no per-frame allocation). Because nodes are geometry, not canvas textures, there is nothing to put behind a `typeof document` guard. World space, centred on `STAR_POSITION (6, −3, −140)`, `RING_RADIUS = 20`, `RING_TILT = 72°` (angle between the ring plane's normal and the view axis: a shallow ellipse, minor/major = cos 72° = 0.31) with `tilt.rotation.x = −RING_TILT`, which carries the NEAR arc below the star. "Front-centre" = the lowest point of the near arc; node `round(cursor)` sits there (`ringSpin`). `depthTest: true`, `depthWrite: false`, additive — depth testing stays on as a guard, but at any tilt that keeps the front node clear of the star (60–85°) the back arc never reaches the disc, so it never occludes; the 3D read comes from the ellipse, perspective size on the nodes (front ≈ 2× back) and the star's limb darkening (measured at 1440×900: the back arc clears the disc by ~60 px at 72° and still by ~25 px at 84°; occlusion would need ≳ 87°, where the front node would sit on the star). **Recorded deviation from the decisions file's "the opaque orb occludes the back arc (the main 3D cue)":** `RING_TILT` stays 72° — a flatter ring only pulls the front node into the star's glow (node 130 px below the star at 72°, 81 px at 80°). `visible = false` outside Orbit; the fade-out is complete by orbit cp 0.9 (the camera flies through the star region later). **Empty states:** N = 0 or the `still` tier builds an empty hidden group (no GPU resources); N = 1 is a static single node. N comes from `SceneRoot`'s `stepCount` prop; effect deps become `[tier, onContextLost, stepCount]`. Measured on this tree (1440×900): nearest ring point to the camera 24.8 units at cp 0.9 (≥ 15 required, tested), ring spans ndc x ∈ [−0.35, 0.40] and y ∈ [−0.27, 0.14] at mid-orbit, front node ≈ 6.2 units below the star.
7. **E6 — `Process.tsx` mirrors `Services.tsx`.** `"use client"`, props `{ steps: Item[]; animated: boolean }`, leaf narrowing (`title` / `what` / `deliverable` / `duration`), `aria-label="Process"`, `<h2>` only for a non-empty title, `aria-hidden` ordinal, one panel visible at a time on **both** desktop and mobile (driven by `stepSolo`), fields "What happens" / "What you get" / "How long" (mono labels, omitted with their label when empty), `data-solo-off` gating blur + pointer events (`-webkit-backdrop-filter` FIRST), still tier (`animated=false` or reduced motion) stacks all steps statically inside the fixed 300vh section, mobile 64vh pin with `padding-top: 4.5rem` and a top-anchored panel capped at `min(34vh, 18rem)` so it stops short of the star and the active node (at 390×844 the star sits at y ≈ 420–460 and the active node at y ≈ 520–590; a pin-filling panel would cover both). **Layout default:** the desktop panel occupies the LEFT ~38% of the frame — the pin's `6vw` left gutter plus a `--orbit-panel-w: min(30rem, 32vw)` panel (6vw + 32vw = 38vw at 1440; the 30rem cap only bites above 1500px), same gutter as Services — with ring + star + node centre-right; browser-review tunable via `--orbit-panel-*`. **A11y carry-over closed here:** an animated panel (`overflow-y: auto`) gets `tabIndex={0}` only while it is the *active* panel (`solo >= 0.5`) — so at most one panel is a tab stop (two only at the exact middle of a cross-fade), none outside Orbit and none in the static tier — with a visible focus ring; "scrollable" means the animated tier's `overflow-y: auto` panel, not a measured overflow (overflow is CMS-dependent and measuring it needs a ref per panel) (the slice-3 "mobile overflow-y panel lacks tabIndex" follow-up, for this component only; `Services` is not touched). Empty data (N = 0): the section stays 300vh with the label only (Services precedent); spec §5:129 "chapter hides and the path drops its waypoint" is still not implemented anywhere.
8. **E7 — Data.** `page.tsx` passes `process`; `VoyageRootProps` gains `process: Item[]` (type-only `Item` import already present). Inside the component it is destructured as `steps` so it never shadows Node's `process` global. A temporary `void steps;` guard (Task 5) keeps lint green until Task 8 deletes it; `OrbitRing` and `Process` get their data through `SceneRoot.stepCount` and `<Process steps>` respectively.
9. **E8 — Star as a sphere.** Pure `orbitLimb(progress)` in `EnergyOrb.ts` (0 outside Orbit, ramps in over orbit cp [0, 0.2], holds, ramps out over [0.8, 1]) feeding a new `uLimb` uniform: `body *= mix(1, pow(ndotv, LIMB_POWER), uLimb)` and `fresnel *= mix(1, LIMB_RIM, uLimb)`. `uLimb = 0` leaves both factors at exactly 1, so every other chapter renders as before and the Jump flare / Pilot glare logic is untouched. The curve is unit-tested; the shader is browser-review only. `Starfield`'s soften generalises: `approachSoften` is **unchanged** (and still exported); new `orbitSoften` (= `ORBIT_SOFTEN_PEAK × orbitPresence`, i.e. its window IS `ORBIT_WINDOW` plus the schedule's edge fades) and `chapterSoften(chapterId, cp)` dispatch between them.
10. **E9 — Dock + carry.** `Dock.tsx`'s `progress > 0.05` becomes the exported `DOCK_COMPACT_PROGRESS = progressAt("launch", 0.625)` (the compaction point stays at 62.5% through Launch). No rail / telemetry / audio changes; `JUMP_INDEX` and the Jump hold are untouched (chapter order is unchanged).
11. **Carried decisions from slice 3.** Data-driven N tuned for 4, CMS rendered as-is (no schema change); Playwright integration tests deferred to slice 8 (spec §7 deviation, user decision); dark only; amber only on the star / primary CTA / rail dot / cursor ring.
12. **Task-order deviation: Task 4 moves to Wave 2.** The decisions file's order puts the star/field task in the first parallel wave; `Starfield` imports `orbitPresence` from Task 3's `orbitSchedule.ts` (its soften window must *be* `ORBIT_WINDOW`, not a copy of it), so Task 4 cannot start before Task 3 lands. It stays file-disjoint from Tasks 6 and 7.
13. **Interface deviation: `SceneRoot.stepCount` is optional (default 0) in Task 6 and required in Task 8.** Making it required in Task 6 would leave `tsc` red at `VoyageRoot` until Task 8; Task 8 tightens the type so the compiler then enforces the wiring.
14. **Commit trailer** on every commit: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Execution amendments

*(Recorded 2026-10-14, after the browser review. Where a bullet below contradicts the Decisions section or a task's code, the bullet is what shipped.)*

- **Tasks 1–8:** each was implemented in the planned wave order (T1 alone; T2 ∥ T3 ∥ T5 and T4 ∥ T6 ∥ T7 in parallel worktrees merged one at a time; T8 alone) and independently reviewed; every review approved on the first pass, so no task needed a fix pass. Reviewer minors are carried in `.superpowers/sdd/progress.md`. Suite after each: 421 (T1), 429 (T2), 444 (T3 worktree), 464 (T4 worktree), 473 (T6 worktree), 470 (T7 worktree), 503 (T8, merged).
- **Task 7:** the controller added a tab-stop gate to the plan (commit `085bae9`): the active panel is a tab stop only while `chapterProgress < ORBIT_HOLD_MOBILE`. Reviewer minor left open: the gate is device-agnostic, so on desktop the last panel keeps an off-screen tab stop for cp 0.667 – 0.787 (commented in `Process.tsx`).
- **Task 9 (Approach dock, `b4fec31`):** the user flagged a half-built Approach frame. The slice-3 desktop dock was scroll-scrubbed (cp 0.02 … 0.28), so every rest point inside it was half-built, and Dock / rail / CTA arrivals at `approach.start + 0.001` landed on an empty chapter. The dock is now a 0/1 trigger at cp > 0 with a CSS transition staggered by `--dock-delay` (0 / 120 / 240 ms, fixed 240 ms total). A slice-3 behaviour, not a slice-4 regression; mobile `--solo` stays scrubbed. Files outside the plan's list: `servicesLayout.ts`, `Services.tsx`, `voyage.css` and their tests.
- **Task 9 (Orbit trigger, `5c462b2`, user: "Proceed"):** **Task 3's `stepSolo` / `panelPresence`, Task 7's `--solo` scrub and Decisions 5 and 7 are superseded.** `orbitSchedule.stepTarget(i, n, cp)` gives each panel a 0/1 target (lit step = `Math.round(orbitCursor)`, dark at cp 0, first step from the first pixel, last step held through the mobile pin release) and the `.process-panel` CSS transition (opacity 0.45 s / transform 0.6 s) is the cross-fade. The "telescoping" invariant (`Σ i·stepSolo === orbitCursor`) no longer exists; the ring cursor stays scroll-scrubbed and Topology's node assembly was deliberately left scrubbed.
- **Task 9 (retunes, `b591511`, `b86844f`):** `--orbit-panel-h` `clamp(20rem, 48vh, 27rem)` → `clamp(20rem, 48vh, 23rem)`; `.process-panel__field:last-child` `margin-bottom` 1.1rem → 0; a mobile Orbit type scale added (index `margin-bottom` 0.5rem; title 1.15rem / 0.6rem; field 0.85rem, `line-height` 1.45, `margin-bottom` 0.65rem; field label span `margin-bottom` 0.15rem) because the seed steps overflowed the `min(34vh, 18rem)` box by up to 67 px. No `BANK_MAX`, ring, limb or schedule constant changed.
- **Task 9 (captures, `dc821d8`):** 26 baselines, not 25 — `desktop-approach-nav-arrival.png` was added for the dock fix.
- **Task 10:** the suite ended at **507 passed / 40 files**, not 503 — the two trigger commits added 4 tests (503 → 506 → 507). Verification otherwise as the plan expected: `tsc` 0, `npx eslint .` 16 pre-existing problems (10 errors, 6 warnings), targeted eslint 0 errors (the 2 pre-existing warnings only), build green with `/voyage`.

## Deferred / carried (not in this slice)

Slice-3 follow-ups that Process inherits and that stay open: `Services` re-renders on every store emit (no selector) — `Process` has the same cost and the same fix (a selector) when slice 8 measures it; `getVoyageContent` still fetches three collections `/voyage` does not yet render (case studies and testimonials are slice 5/6); `WarpStreaks` converges toward world (0,0), not the star; `Launch.tsx` has no `useReducedMotion()` guard; the Safari/Firefox late-scroll-restoration spurious beat; mid-tier blur cost at ≥768px coarse pointer (Process gates the blur on `data-solo-off`, so only one panel ever blurs). Slice 8 owns Lighthouse / perf. Still tier: `Process`'s stacked steps overflow the fixed 300vh section once copy averages ≳ 330 chars per step on a phone (~max-length copy on desktop); the fix (a copy budget in the CMS validators, or a compact still-tier typographic scale) is slice 8's — the same limit `Services` has at 150vh.

## Parallelism (which tasks may run in parallel worktrees)

| Wave | Tasks | Why this is safe |
|---|---|---|
| 0 | **T1** alone | Changes `CHAPTERS`, `VOYAGE_SCROLL_VH`, `sectionHeightVh` and rewrites literals in 8 test files; everything else reads the new table. |
| 1 | **T2** ∥ **T3** ∥ **T5** | File-disjoint: T2 = `flightPath.ts` (+test) + `SceneRoot.tsx`; T3 = new `orbitSchedule.ts` (+test); T5 = `page.tsx` + `VoyageRoot.tsx`. |
| 2 | **T4** ∥ **T6** ∥ **T7** | Need Wave 1 merged (T4, T6, T7 import `orbitSchedule`; T6 edits `SceneRoot.tsx`, which T2 also edits). File-disjoint: T4 = `EnergyOrb.ts` + `Starfield.ts` (+tests); T6 = new `OrbitRing.ts` + `quality.ts` (+tests) + `SceneRoot.tsx`; T7 = new `Process.tsx` (+test) + `voyage.css`. |
| 3 | **T8** alone | Edits `VoyageRoot.tsx` + `SceneRoot.tsx` and consumes T5, T6 and T7. |
| 4 | **T9**, then **T10** | T9 is the controller's browser review; T10 is docs + closing verification. |

**Test counts.** Every "Expected" line below gives the count of new tests and the per-file totals, which are absolute. Whole-suite totals depend on merge order; the baseline at `fc91f88` is **413 passed / 36 files**, and each task adds its stated number to whatever the branch had when it started. Run in the order T1 → T8 the suite reads 421 (T1), 429 (T2), 452 (T3), 464 (T4), 464 (T5), 485 (T6), 503 (T7), 503 (T8) — 503 passed / 40 files in all (+90 tests, +4 files).

---

## File Structure

| Path | Responsibility | New / Modified |
|---|---|---|
| `src/scene/camera/flightPath.ts` | vh-declared `CHAPTERS` (+`spanVh`), `VOYAGE_SCROLL_VH = 1400`, exact `sectionHeightVh`, `progressAt`, `bankForProgress` / `BANK_MAX` | Modified |
| `src/scene/camera/flightPath.test.ts` | Chapter-table, `progressAt`, sweep and bank tests | Modified |
| `src/components/dock/Dock.tsx` | `DOCK_COMPACT_PROGRESS` derived from Launch | Modified |
| `src/components/dock/dockLinks.test.ts` | Pins `DOCK_COMPACT_PROGRESS` | Modified |
| `src/components/voyage/Services.test.tsx`, `useJumpBeat.test.tsx` | Absolute progress literals → `progressAt`; in-band hold-renewal test | Modified |
| `src/scene/scroll/voyageStore.test.ts` | One orbit literal → `progressAt` | Modified |
| `src/scene/chapters/{Topology,EnergyOrb,WarpStreaks,Starfield}.test.ts` | Absolute progress literals → `progressAt` (T1); new curve tests (T4) | Modified |
| `src/scene/chapters/orbitSchedule.ts` | Pure shared schedule: `ORBIT_WINDOW`, `orbitPresence` (ring + stars), `panelPresence` (panels), `orbitCursor`, `stepSolo` | **New** |
| `src/scene/chapters/orbitSchedule.test.ts` | Exhaustive N = 0/1/2/4/6 schedule tests | **New** |
| `src/scene/chapters/EnergyOrb.ts` | `orbitLimb` + `uLimb` limb darkening | Modified |
| `src/scene/chapters/Starfield.ts` | `orbitSoften` + `chapterSoften` (approach unchanged) | Modified |
| `src/scene/chapters/OrbitRing.ts` | Chapter-04 set piece: torus ring + N nodes, world space | **New** |
| `src/scene/chapters/OrbitRing.test.ts` | Fade/spin curves, build, placement, clearance, lifecycle | **New** |
| `src/scene/quality.ts` / `quality.test.ts` | `TierSettings.ringSegments` | Modified |
| `src/scene/SceneRoot.tsx` | Camera roll (T2); `stepCount` prop + `OrbitRing` registration (T6); `stepCount` required (T8) | Modified |
| `src/app/voyage/page.tsx` | Passes `process` | Modified |
| `src/components/voyage/Process.tsx` | Chapter 04 DOM: one glass panel at a time, empty states, a11y | **New** |
| `src/components/voyage/Process.test.tsx` | jsdom RTL tests | **New** |
| `src/components/voyage/VoyageRoot.tsx` | Threads `process`; mounts `<Process>`; passes `stepCount` | Modified |
| `src/app/voyage/voyage.css` | `.process*` styles, mobile pin + panel cap, still-tier rules | Modified |
| `src/app/voyage/voyageCss.test.ts` | Pins the Orbit CSS no jsdom test can see: panels overlap, opacity from `--solo`, `-webkit-backdrop-filter` before `backdrop-filter`, focus ring, static stacking | **New** |
| `screenshots/voyage/slice-4/*.png` | Visual baselines | **New** (T9) |
| `worklog.md` / `insights.md` / `design.md` / `docs/superpowers/specs/2026-09-14-consulting-content-model-design.md` | Slice-4 record; stale `1250` note | Modified (T10) |

---

### Task 1: Chapter geometry in vh, `progressAt`, and every test literal converted

**Runs alone, first. Everything else rebases on it.**

**Files:**
- Modify: `src/scene/camera/flightPath.ts` (chapter table, `VOYAGE_SCROLL_VH`, `sectionHeightVh`, new `progressAt`)
- Modify: `src/components/dock/Dock.tsx` (`DOCK_COMPACT_PROGRESS`)
- Test (new tests): `src/scene/camera/flightPath.test.ts`, `src/components/dock/dockLinks.test.ts`, `src/components/voyage/useJumpBeat.test.tsx`
- Test (literal → `progressAt` conversions only): `src/components/voyage/Services.test.tsx`, `src/components/voyage/useJumpBeat.test.tsx`, `src/scene/chapters/{Topology,EnergyOrb,WarpStreaks,Starfield}.test.ts`, `src/scene/scroll/voyageStore.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (every later task relies on these exact names):
  ```ts
  // flightPath.ts
  export interface Chapter { id: ChapterId; label: string; index: string; spanVh: number; start: number; end: number; micro: boolean }
  export const VOYAGE_SCROLL_VH = 1400;
  export const CHAPTERS: readonly Chapter[];            // start/end derived from spanVh, exact contiguity
  export function sectionHeightVh(chapter: Chapter): number;   // = spanVh (+ VOYAGE_TAIL_VH on "surface"), exact
  export function progressAt(id: ChapterId, t: number): number; // start + clamp01(t)*(end-start); t<=0 → start, t>=1 → end, bit-for-bit
  // Dock.tsx
  export const DOCK_COMPACT_PROGRESS: number;           // progressAt("launch", 0.625)
  ```

**Why this shape:** the map measured 11 failing tests when `CHAPTERS` is swapped with no test edits, and 8 more that keep passing while silently testing a different chapter. So `progressAt` goes in **first**, under the old table, and every literal is converted while the bar is still green; only then does the geometry change. The `progressAt` round-trip test is also what proves the new table.

- [ ] **Step 1: Write the failing `progressAt` tests**

In `src/scene/camera/flightPath.test.ts`, extend the import:

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
  CAMERA_WAYPOINTS, progressToCurveT, sectionHeightVh, VOYAGE_SCROLL_VH, VOYAGE_TAIL_VH,
} from "./flightPath";
```
with:
```ts
  CAMERA_WAYPOINTS, progressToCurveT, sectionHeightVh, VOYAGE_SCROLL_VH, VOYAGE_TAIL_VH,
  progressAt,
} from "./flightPath";
```

Then add the `progressAt` block above the existing `chapters` block.

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
describe("chapters", () => {
```
with:
```ts
// The one way tests (and the browser review) name a scroll position: a chapter plus a position
// inside it. Absolute progress literals silently change meaning whenever the chapter table moves.
describe("progressAt", () => {
  const ids = CHAPTERS.map((c) => c.id);

  it("is the chapter's start at t = 0 and its end at t = 1, exactly", () => {
    for (const c of CHAPTERS) {
      expect(progressAt(c.id, 0)).toBe(c.start);
      expect(progressAt(c.id, 1)).toBe(c.end);
    }
  });

  it("interpolates linearly and round-trips through chapterAt", () => {
    for (const id of ids) {
      for (const t of [0.05, 0.1, 0.25, 1 / 3, 0.5, 0.75, 0.9, 0.95]) {
        const hit = chapterAt(progressAt(id, t));
        expect(hit.chapter.id).toBe(id);
        expect(hit.chapterProgress).toBeCloseTo(t, 9);
      }
    }
  });

  it("clamps t to [0, 1] and treats NaN as 0", () => {
    const c = CHAPTERS.find((x) => x.id === "orbit")!;
    expect(progressAt("orbit", -3)).toBe(c.start);
    expect(progressAt("orbit", 7)).toBe(c.end);
    expect(progressAt("orbit", NaN)).toBe(c.start);
  });
});

describe("chapters", () => {
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scene/camera/flightPath.test.ts`
Expected: FAIL — the **3** new `progressAt` tests fail with `TypeError: progressAt is not a function` (vitest 5 imports a not-yet-exported name as `undefined`, so the file still collects); the 18 pre-existing tests in the file pass. Summary line: `Tests  3 failed | 18 passed (21)`.

- [ ] **Step 3: Implement `progressAt` (old table still in force)**

In `src/scene/camera/flightPath.ts`, replace:
```ts
/** The star is fixed in world space; the whole voyage approaches it. */
```
with:
```ts
/**
 * Absolute progress for "position `t` (0..1) inside chapter `id`" — `start + t * (end - start)`.
 * Tests and the browser review name scroll positions through this, never through a raw
 * progress literal, so a change to the chapter table cannot silently retarget them.
 * `t <= 0` and `t >= 1` return the chapter's own `start` / `end` bit-for-bit (no float
 * round-trip); note `end` already belongs to the NEXT chapter, so use t < 1 to stay inside.
 */
export function progressAt(id: ChapterId, t: number): number {
  const c = CHAPTERS.find((x) => x.id === id)!;
  const u = clamp01(t);
  if (u === 0) return c.start;
  if (u === 1) return c.end;
  return c.start + u * (c.end - c.start);
}

/** The star is fixed in world space; the whole voyage approaches it. */
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scene/camera/flightPath.test.ts`
Expected: PASS — `Tests  21 passed (21)`.

- [ ] **Step 5: Convert every absolute progress literal to `progressAt`**

Each replacement below keeps the **same chapter and the same relative position** the literal had under the old table, so the suite stays green. Apply them file by file. (The "old meaning" notes are the map's measurements; the "new" column is what the literal would have meant under the new table if left alone.)

**5a. `src/scene/camera/flightPath.test.ts`** — three sites (`:28`, `:39-40`, `:92`):

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
    const mid = chapterAt(0.27);
    expect(mid.chapter.id).toBe("orbit");
    expect(mid.chapterProgress).toBeGreaterThan(0);
    expect(mid.chapterProgress).toBeLessThan(1);
```
with:
```ts
    const mid = chapterAt(progressAt("orbit", 0.4));
    expect(mid.chapter.id).toBe("orbit");
    expect(mid.chapterProgress).toBeCloseTo(0.4, 9);
```

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
    expect(chapterAt(0.08).chapter.id).toBe("approach");
    expect(chapterAt(0.08).chapterProgress).toBe(0);
```
with:
```ts
    const approach = CHAPTERS.find((c) => c.id === "approach")!;
    expect(chapterAt(approach.start).chapter.id).toBe("approach");
    expect(chapterAt(approach.start).chapterProgress).toBe(0);
```

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
    const result = getCameraPose(0.5, out);
```
with:
```ts
    const result = getCameraPose(progressAt("worlds", 0.5), out);
```

**5b. `src/components/voyage/Services.test.tsx`** — five sites (`:96`, `:107`, `:118`, `:140`, `:152`). Old meaning: `0.12` = Approach cp 1/3 (the last frame of the 100vh pin's hold); `0.09` = early Approach (cp 1/12); `0.01` = Launch. (Under the new table `0.12` would be Approach cp 0.453 and `:96` and `:152` would fail.)

In `src/components/voyage/Services.test.tsx`, replace:
```tsx
import { voyageStore } from "@/scene/scroll/voyageStore";
import Services from "./Services";
```
with:
```tsx
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
import Services from "./Services";
```

In `src/components/voyage/Services.test.tsx`, replace:
```tsx
    // chapterProgress 1/3 — the last frame the 100vh pin is stationary.
    voyageStore.setScroll(0.12, 0);
```
with:
```tsx
    // chapterProgress 1/3 — the last frame the 100vh pin is stationary.
    voyageStore.setScroll(progressAt("approach", 1 / 3), 0);
```

In `src/components/voyage/Services.test.tsx`, replace:
```tsx
  it("lays the desktop arc out left to right at the docked frame", () => {
    voyageStore.setScroll(0.12, 0);
```
with:
```tsx
  it("lays the desktop arc out left to right at the docked frame", () => {
    voyageStore.setScroll(progressAt("approach", 1 / 3), 0);
```

In `src/components/voyage/Services.test.tsx`, replace:
```tsx
    voyageStore.setScroll(0.09, 0);                  // early Approach: animated poses would be dark
```
with:
```tsx
    voyageStore.setScroll(progressAt("approach", 1 / 12), 0); // early Approach: animated poses would be dark
```

In `src/components/voyage/Services.test.tsx`, replace:
```tsx
    voyageStore.setScroll(0.01, 0);
    const { container } = render(<Services animated services={[svc("a")]} />);
```
with:
```tsx
    voyageStore.setScroll(progressAt("launch", 0.125), 0);   // still in Launch
    const { container } = render(<Services animated services={[svc("a")]} />);
```

In `src/components/voyage/Services.test.tsx`, replace:
```tsx
    // hook. Same scroll position as the --solo test above: solos are [0, 1, 0].
    voyageStore.setScroll(0.12, 0);
```
with:
```tsx
    // hook. Same scroll position as the --solo test above: solos are [0, 1, 0].
    voyageStore.setScroll(progressAt("approach", 1 / 3), 0);
```

**5c. `src/scene/chapters/Topology.test.ts`** — six sites (`:105`, `:115`, `:120`, `:130`, `:153`, `:190`). `:120` (`0.21`, "jump: gone again") is one of the silent retargets: it meant **Jump** cp 0.5 and under the new table would mean Orbit cp 0.063, so it would stop exercising the Jump at all.

In `src/scene/chapters/Topology.test.ts`, replace:
```ts
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";
```
with:
```ts
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
import { makeFrame } from "./testUtils";
```

In `src/scene/chapters/Topology.test.ts`, replace:
```ts
const nodesOf =
```
with:
```ts
// Approach's chapterProgress 1/3 — the last frame the 100vh pin is stationary (graph whole).
const DOCKED = progressAt("approach", 1 / 3);

const nodesOf =
```

In `src/scene/chapters/Topology.test.ts`, replace:
```ts
    voyageStore.setScroll(0.1, 0);                   // approach, mid-assembly
```
with:
```ts
    voyageStore.setScroll(progressAt("approach", 1 / 6), 0); // approach, mid-assembly
```

In `src/scene/chapters/Topology.test.ts`, replace:
```ts
    voyageStore.setScroll(0.12, 0);                  // docked: whole graph
```
with:
```ts
    voyageStore.setScroll(DOCKED, 0);                // docked: whole graph
```

In `src/scene/chapters/Topology.test.ts`, replace:
```ts
    voyageStore.setScroll(0.21, 0);                  // jump: gone again
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0.5), 0); // jump: gone again
```

In `src/scene/chapters/Topology.test.ts`, replace:
```ts
    topo.build(new THREE.Scene(), "mid");
    voyageStore.setScroll(0.12, 0);
    const camera
```
with:
```ts
    topo.build(new THREE.Scene(), "mid");
    voyageStore.setScroll(DOCKED, 0);
    const camera
```

In `src/scene/chapters/Topology.test.ts`, replace:
```ts
    expect(scene.children).toHaveLength(1);
    voyageStore.setScroll(0.12, 0);
```
with:
```ts
    expect(scene.children).toHaveLength(1);
    voyageStore.setScroll(DOCKED, 0);
```

In `src/scene/chapters/Topology.test.ts`, replace:
```ts
    voyageStore.setScroll(0.12, 0);                  // topologyFade === 1 at chapterProgress 1/3
```
with:
```ts
    voyageStore.setScroll(DOCKED, 0);                // topologyFade === 1 at chapterProgress 1/3
```

**5d. `src/scene/chapters/EnergyOrb.test.ts`** — five sites (`:94`, `:107`, `:114`, `:125`, `:139`). Old meaning: `0.21` = Jump cp 0.5; `0.2` = Jump cp 0; `0.205` = Jump cp 0.25; `0.1` = Approach cp 1/6. `:107` is a silent retarget (it became a vacuous pass in Orbit).

In `src/scene/chapters/EnergyOrb.test.ts`, replace:
```ts
import { STAR_POSITION, starScale } from "@/scene/camera/flightPath";
```
with:
```ts
import { STAR_POSITION, starScale, progressAt } from "@/scene/camera/flightPath";
```

In `src/scene/chapters/EnergyOrb.test.ts`, replace:
```ts
    voyageStore.setScroll(0.21, 0);
    const cp = voyageStore.getState().chapterProgress;
    expect(voyageStore.getState().chapter.id).toBe("jump");
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    const cp = voyageStore.getState().chapterProgress;
    expect(voyageStore.getState().chapter.id).toBe("jump");
```

In `src/scene/chapters/EnergyOrb.test.ts`, replace:
```ts
    voyageStore.setScroll(0.2, 0);
    orb.setGlare(1);
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0), 0);
    orb.setGlare(1);
```

In `src/scene/chapters/EnergyOrb.test.ts`, replace:
```ts
    voyageStore.setScroll(0.205, 0); // chapterProgress 0.25 → jumpGlare 0.7071067811865451
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0.25), 0); // chapterProgress 0.25 → jumpGlare 0.7071067811865451
```

In `src/scene/chapters/EnergyOrb.test.ts`, replace:
```ts
    voyageStore.setScroll(0.1, 0);
    orb.setGlare(0.25);
```
with:
```ts
    voyageStore.setScroll(progressAt("approach", 1 / 6), 0);
    orb.setGlare(0.25);
```

In `src/scene/chapters/EnergyOrb.test.ts`, replace:
```ts
    voyageStore.setScroll(0.21, 0);
    expect(() => orb.update(makeFrame({ ignite: 0.5 }))).not.toThrow();
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    expect(() => orb.update(makeFrame({ ignite: 0.5 }))).not.toThrow();
```

**5e. `src/scene/chapters/WarpStreaks.test.ts`** — eight sites (`:62`, `:147`, `:165`, `:184`, `:199`, `:210`, `:225`, `:228`). Old meaning: `0.1` = Approach cp 1/6; `0.21` = Jump cp 0.5; `0.215` = Jump cp 0.75; `0.2005` = Jump cp 0.025; `0.219` = Jump cp 0.95; `0.221` = Orbit cp 0.008. `:184` is a silent retarget (it became a vacuous pass: the `max()` it pins was no longer exercised).

In `src/scene/chapters/WarpStreaks.test.ts`, replace:
```ts
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";
```
with:
```ts
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
import { makeFrame } from "./testUtils";
```

In `src/scene/chapters/WarpStreaks.test.ts`, replace:
```ts
    voyageStore.setScroll(0.1, 1);
    streaks.update(makeFrame({ voyage: voyageStore.getState() }));
```
with:
```ts
    voyageStore.setScroll(progressAt("approach", 1 / 6), 1);
    streaks.update(makeFrame({ voyage: voyageStore.getState() }));
```

In `src/scene/chapters/WarpStreaks.test.ts`, replace:
```ts
    voyageStore.setScroll(0.21, 0);
    const cp = voyageStore.getState().chapterProgress;
    expect(voyageStore.getState().chapter.id).toBe("jump");
    streaks.update(makeFrame());
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    const cp = voyageStore.getState().chapterProgress;
    expect(voyageStore.getState().chapter.id).toBe("jump");
    streaks.update(makeFrame());
```

In `src/scene/chapters/WarpStreaks.test.ts`, replace:
```ts
    voyageStore.setScroll(0.215, 0);
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0.75), 0);
```

In `src/scene/chapters/WarpStreaks.test.ts`, replace:
```ts
    voyageStore.setScroll(0.2005, 1); // chapterProgress 0.025
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0.025), 1); // chapterProgress 0.025
```

In `src/scene/chapters/WarpStreaks.test.ts`, replace:
```ts
    voyageStore.setScroll(0.21, 0);
    const cp = voyageStore.getState().chapterProgress;
    streaks.update(makeFrame({ ignite: 0.5 }));
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    const cp = voyageStore.getState().chapterProgress;
    streaks.update(makeFrame({ ignite: 0.5 }));
```

In `src/scene/chapters/WarpStreaks.test.ts`, replace:
```ts
    voyageStore.setScroll(0.1, 1);
    expect(voyageStore.getState().chapter.id).toBe("approach");
```
with:
```ts
    voyageStore.setScroll(progressAt("approach", 1 / 6), 1);
    expect(voyageStore.getState().chapter.id).toBe("approach");
```

In `src/scene/chapters/WarpStreaks.test.ts`, replace:
```ts
    voyageStore.setScroll(0.219, 0); // chapterProgress ~0.95, the last in-band frame
```
with:
```ts
    voyageStore.setScroll(progressAt("jump", 0.95), 0); // chapterProgress ~0.95, the last in-band frame
```

In `src/scene/chapters/WarpStreaks.test.ts`, replace:
```ts
    voyageStore.setScroll(0.221, 0);
```
with:
```ts
    voyageStore.setScroll(progressAt("orbit", 0.008), 0);
```

**5f. `src/scene/chapters/Starfield.test.ts`** — three sites (`:140`, `:147`, `:161`). Old meaning: `0.12` = Approach cp 1/3; `0.5` = Worlds (any); `0.08 + 0.12 * 0.12` = Approach cp 0.12, hand-computed from the old fractions (it **fails** under the new table: 0.9977 vs 0.5).

In `src/scene/chapters/Starfield.test.ts`, replace:
```ts
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";
```
with:
```ts
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
import { makeFrame } from "./testUtils";
```

In `src/scene/chapters/Starfield.test.ts`, replace:
```ts
    voyageStore.setScroll(0.12, 0);
    expect(voyageStore.getState().chapter.id).toBe("approach");
```
with:
```ts
    voyageStore.setScroll(progressAt("approach", 1 / 3), 0);
    expect(voyageStore.getState().chapter.id).toBe("approach");
```

In `src/scene/chapters/Starfield.test.ts`, replace:
```ts
    voyageStore.setScroll(0.5, 0);
    for (let i = 0; i < 200
```
with:
```ts
    voyageStore.setScroll(progressAt("worlds", 0.5), 0);
    for (let i = 0; i < 200
```

In `src/scene/chapters/Starfield.test.ts`, replace:
```ts
    voyageStore.setScroll(0.08 + 0.12 * 0.12, 0);    // Approach, chapterProgress ≈ 0.12
```
with:
```ts
    voyageStore.setScroll(progressAt("approach", 0.12), 0); // Approach, chapterProgress 0.12
```

**5g. `src/components/voyage/useJumpBeat.test.tsx`** — seventeen literal lines (`:43, 45, 49, 54, 55, 64, 65, 78, 79, 82, 88, 90, 99, 100, 108, 109, 111`). Old meaning: `0.15` = Approach (cp 0.583); `0.21` = **Jump** cp 0.5 (under the new table it would be Orbit cp 0.063: the crossing would be approach → orbit, and the in-band renewal path would never be exercised); `0.25` = just past the band; `0.3` / `0.31` = already in Orbit; `0.5` / `0.9` = far `scrollTo` targets.

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
import { voyageStore, PROGRAMMATIC_TIMEOUT_MS } from "@/scene/scroll/voyageStore";
```
with:
```tsx
import { voyageStore, PROGRAMMATIC_TIMEOUT_MS } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
/** Store emits call setLetterbox
```
with:
```tsx
// Chapter-relative scroll positions (never absolute literals — see progressAt).
const APPROACH = progressAt("approach", 0.6);       // a point before the band
const JUMP_MID = progressAt("jump", 0.5);           // inside the 25vh band
const ORBIT_EARLY = progressAt("orbit", 0.25);      // just past the band
const ORBIT_MID = progressAt("orbit", 0.5);
const FAR_TARGET = progressAt("worlds", 0.5);       // a scrollTo target far from the band
const FARTHER_TARGET = progressAt("landing", 0.5);

/** Store emits call setLetterbox
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    scroll(0.15);                                    // approach
    expect(result.current).toBe(false);
    scroll(0.21);                                    // jump
```
with:
```tsx
    scroll(APPROACH);                                // approach
    expect(result.current).toBe(false);
    scroll(JUMP_MID);                                // jump
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    expect(logClient).toHaveBeenCalledWith("voyage.jump", { progress: 0.21 });
```
with:
```tsx
    expect(logClient).toHaveBeenCalledWith("voyage.jump", { progress: Number(JUMP_MID.toFixed(4)) });
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    scroll(0.15);
    scroll(0.21);
    expect(result.current).toBe(false);
    expect(whoosh).not.toHaveBeenCalled();
```
with:
```tsx
    scroll(APPROACH);
    scroll(JUMP_MID);
    expect(result.current).toBe(false);
    expect(whoosh).not.toHaveBeenCalled();
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    act(() => voyageStore.scrollTo(0.5));
    scroll(0.25, 0.8);                               // crosses into orbit, target not reached
```
with:
```tsx
    act(() => voyageStore.scrollTo(FAR_TARGET));
    scroll(ORBIT_EARLY, 0.8);                        // crosses into orbit, target not reached
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    act(() => voyageStore.scrollTo(0.9));
    scroll(0.15, 0.6);                               // interrupted in approach
```
with:
```tsx
    act(() => voyageStore.scrollTo(FARTHER_TARGET));
    scroll(APPROACH, 0.6);                           // interrupted in approach
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    scroll(0.25, 1);                                 // one-emit flick to orbit
```
with:
```tsx
    scroll(ORBIT_EARLY, 1);                          // one-emit flick to orbit
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    voyageStore.setScroll(0.3, 0);                   // already in orbit before mount
```
with:
```tsx
    voyageStore.setScroll(ORBIT_MID, 0);             // already in orbit before mount
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    scroll(0.31, 0);                                 // next emit, still orbit
```
with:
```tsx
    scroll(progressAt("orbit", 0.55), 0);            // next emit, still orbit
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    scroll(0.15);
    scroll(0.21);
    expect(result.current).toBe(true);
    rerender
```
with:
```tsx
    scroll(APPROACH);
    scroll(JUMP_MID);
    expect(result.current).toBe(true);
    rerender
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    scroll(0.15);
    scroll(0.21);                                    // fires at 1000 → hold until 1900
```
with:
```tsx
    scroll(APPROACH);
    scroll(JUMP_MID);                                // fires at 1000 → hold until 1900
```

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
    scroll(0.25);                                    // left the band: deadline frozen
```
with:
```tsx
    scroll(ORBIT_EARLY);                             // left the band: deadline frozen
```

**5h. `src/scene/scroll/voyageStore.test.ts`** — one site (`:17`, the only literal that asserts a chapter id). The remaining literals in this file (`0.1` / `0.2` emit counting, the `scrollTo` / `setScroll` programmatic-flag tests, the clamp / NaN cases) are chapter-agnostic: they compare only against `PROGRAMMATIC_EPS` or the previous value, so they are justified as-is (Step 12 lists them).

In `src/scene/scroll/voyageStore.test.ts`, replace:
```ts
import { voyageStore, normalizeVelocity, VELOCITY_NORMALIZER, PROGRAMMATIC_EPS, PROGRAMMATIC_TIMEOUT_MS } from "./voyageStore";
```
with:
```ts
import { voyageStore, normalizeVelocity, VELOCITY_NORMALIZER, PROGRAMMATIC_EPS, PROGRAMMATIC_TIMEOUT_MS } from "./voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
```

In `src/scene/scroll/voyageStore.test.ts`, replace:
```ts
    voyageStore.setScroll(0.27, 0.4);
    let s = voyageStore.getState();
    expect(s.progress).toBe(0.27);
```
with:
```ts
    const inOrbit = progressAt("orbit", 0.4);
    voyageStore.setScroll(inOrbit, 0.4);
    let s = voyageStore.getState();
    expect(s.progress).toBe(inOrbit);
```

- [ ] **Step 6: Run the whole suite — still green on the old table**

Run: `npx vitest run`
Expected: PASS — `Test Files  36 passed (36)`, `Tests  416 passed (416)` (413 + the 3 `progressAt` tests). Nothing was supposed to change behaviour in this step; if anything is red, a conversion changed its chapter or relative position — fix the conversion, never the assertion.

- [ ] **Step 7: Write the failing geometry tests**

These tests describe the new table. They are written against the old one first so the red is visible.

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
  it("cover [0,1] contiguously in order", () => {
    expect(CHAPTERS[0].start).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1].end).toBe(1);
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].start).toBeCloseTo(CHAPTERS[i - 1].end, 10);
    }
  });
```
with:
```ts
  it("cover [0,1] contiguously in order — bit-for-bit, not approximately", () => {
    expect(CHAPTERS[0].start).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1].end).toBe(1);
    // `toBe`, not `toBeCloseTo`: a 1-ulp gap between end_i and start_{i+1} is a hole that
    // chapterAt() falls through to its `?? last` fallback — a one-frame teleport to Surface.
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].start).toBe(CHAPTERS[i - 1].end);
    }
  });
  it("declares its spans in vh and derives every fraction from one cumulative sum", () => {
    expect(VOYAGE_SCROLL_VH).toBe(1400);
    // The user's pacing decision, pinned: only Orbit grew (150 → 300).
    expect(CHAPTERS.map((c) => [c.id, c.spanVh])).toEqual([
      ["launch", 100], ["approach", 150], ["jump", 25], ["orbit", 300], ["worlds", 225],
      ["belt", 100], ["passage", 37.5], ["constellation", 137.5], ["pilot", 125],
      ["landing", 137.5], ["surface", 62.5],
    ]);
    expect(CHAPTERS.reduce((sum, c) => sum + c.spanVh, 0)).toBe(VOYAGE_SCROLL_VH);
    let cumulative = 0;
    for (const c of CHAPTERS) {
      expect(c.start).toBe(cumulative / VOYAGE_SCROLL_VH);
      cumulative += c.spanVh;
    }
  });
  it("chapterAt never falls through to surface before surface starts", () => {
    const surface = CHAPTERS[CHAPTERS.length - 1];
    // A dense sweep (every 0.07vh) …
    for (let k = 0; k < 20000; k++) {
      const p = k / 20000;
      if (p >= surface.start) break;
      expect(chapterAt(p).chapter.id).not.toBe("surface");
    }
    // … and the exact boundaries: a boundary belongs to the chapter that starts there, and a
    // value just under it (x·(1−ε) is at least one ulp below x) to the chapter that ends there.
    for (let i = 1; i < CHAPTERS.length; i++) {
      const boundary = CHAPTERS[i].start;
      const below = boundary * (1 - Number.EPSILON);
      expect(below).toBeLessThan(boundary);
      expect(chapterAt(boundary).chapter.id).toBe(CHAPTERS[i].id);
      expect(chapterAt(below).chapter.id).toBe(CHAPTERS[i - 1].id);
    }
  });
```

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
  // `.chapter__pin` is a 100vh sticky child; a section shorter than that never pins.
  // At VOYAGE_SCROLL_VH = 1250 the smallest span (0.08) is exactly 100vh in real
  // arithmetic, but IEEE-754 gives 99.99999999999994 for belt (0.60 - 0.52), so the
  // bound carries a 1e-9 epsilon — far below the sub-pixel threshold CSS resolves.
  it("every content chapter is at least one viewport tall", () => {
    for (const c of CONTENT_CHAPTERS) {
      expect(sectionHeightVh(c)).toBeGreaterThanOrEqual(100 - 1e-9);
    }
  });
```
with:
```ts
  // `.chapter__pin` is a 100vh sticky child; a section shorter than that never pins. The
  // smallest content chapters (Launch, Belt) are exactly 100vh — spans are declared in vh and
  // sectionHeightVh returns them verbatim, so there is no float error to excuse.
  it("every content chapter is at least one viewport tall", () => {
    for (const c of CONTENT_CHAPTERS) {
      expect(sectionHeightVh(c)).toBeGreaterThanOrEqual(100);
    }
  });

  it("sectionHeightVh is the declared span exactly, plus the tail on the last chapter", () => {
    for (const c of CHAPTERS) {
      expect(sectionHeightVh(c)).toBe(c.spanVh + (c.id === "surface" ? VOYAGE_TAIL_VH : 0));
    }
  });
```

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
    expect(starScale(0)).toBeCloseTo(0.25, 5);
    expect(starScale(1)).toBeCloseTo(2.4, 5);
```
with:
```ts
    expect(starScale(0)).toBeCloseTo(0.25, 5);
    expect(starScale(1)).toBeCloseTo(2.4, 5);
    // PILOT_START is derived from the table, so the growth ends exactly where The Pilot starts.
    const pilot = CHAPTERS.find((c) => c.id === "pilot")!;
    expect(starScale(pilot.start)).toBeCloseTo(2.4, 5);
    expect(starScale(pilot.start * 0.99)).toBeLessThan(2.4);
```

Add the in-band hold-renewal test (the map's §6 gap: with the literals fixed, `useJumpBeat` finally enters the band, so the renewal path can be covered). It is a characterisation test — it passes before and after the geometry swap, and says so.

In `src/components/voyage/useJumpBeat.test.tsx`, replace:
```tsx
  it("releases the hold on an idle tick once it lapses outside the band", () => {
```
with:
```tsx
  // Exercises the in-band renewal path (decideJumpBeat's `inBand` branch): every emit while
  // the store still reports chapter "jump" pushes the deadline out, so a slow pass keeps the
  // bars down well past the original 900 ms.
  it("renews the hold on every in-band emit, so a slow pass keeps the bars down", () => {
    const { result } = renderHook(() => useJumpBeat(true));
    scroll(APPROACH);
    scroll(JUMP_MID);                                // fires at 1000 → hold until 1900
    expect(result.current).toBe(true);
    // Each idle tick lands before the previous deadline, so each one renews it. 3400 is far
    // past the original 1900: only renewal can be keeping the bars down.
    for (const t of [1800, 2600, 3400]) {
      nowMs = t;
      act(() => voyageStore.tick(250));
      expect(result.current).toBe(true);
    }
    expect(whoosh).toHaveBeenCalledTimes(1);         // renewal never re-fires the beat
  });

  it("releases the hold on an idle tick once it lapses outside the band", () => {
```

Pin the Dock's compaction point. The compaction used to be the literal `0.05`; it is now derived from Launch.

In `src/components/dock/dockLinks.test.ts`, replace:
```ts
import { DOCK_LINKS } from "./Dock";
import { CHAPTERS } from "@/scene/camera/flightPath";
```
with:
```ts
import { DOCK_LINKS, DOCK_COMPACT_PROGRESS } from "./Dock";
import { CHAPTERS, progressAt } from "@/scene/camera/flightPath";
```

In `src/components/dock/dockLinks.test.ts`, replace:
```ts
    expect(new Set(DOCK_LINKS.map((l) => l.chapter)).size).toBe(DOCK_LINKS.length);
  });
});
```
with:
```ts
    expect(new Set(DOCK_LINKS.map((l) => l.chapter)).size).toBe(DOCK_LINKS.length);
  });
});

// The dock shrinks once the hero has mostly scrolled by. It used to be the absolute literal
// 0.05 (62.5% of Launch at the old 0.08 span); it is now derived, so a chapter-table change
// moves it with Launch instead of leaving it stranded.
describe("DOCK_COMPACT_PROGRESS", () => {
  it("is 62.5% of the way through Launch", () => {
    expect(DOCK_COMPACT_PROGRESS).toBe(progressAt("launch", 0.625));
    const launch = CHAPTERS.find((c) => c.id === "launch")!;
    expect(DOCK_COMPACT_PROGRESS).toBeGreaterThan(launch.start);
    expect(DOCK_COMPACT_PROGRESS).toBeLessThan(launch.end);
  });
});
```

- [ ] **Step 8: Run the tests to verify they fail**

Run: `npx vitest run src/scene/camera/flightPath.test.ts src/components/dock/dockLinks.test.ts src/components/voyage/useJumpBeat.test.tsx`
Expected: FAIL — **4** tests fail (3 new tests and 1 edited existing test), 3 in `flightPath.test.ts` and 1 in `dockLinks.test.ts`:
- `declares its spans in vh …` → `AssertionError: expected 1250 to be 1400`
- `every content chapter is at least one viewport tall` (the edited existing test) → `AssertionError: expected 99.99999999999994 to be greater than or equal to 100`
- `sectionHeightVh is the declared span exactly …` → `AssertionError: expected 100 to be NaN` (`spanVh` is `undefined` on the old table)
- `DOCK_COMPACT_PROGRESS … is 62.5% of the way through Launch` → `AssertionError: expected undefined to be 0.05` (the named export does not exist yet and imports as `undefined`; `progressAt("launch", 0.625)` is still 0.05 on the old table)

Three more new tests pass on the old table by design and pin the new one afterwards: `chapterAt never falls through to surface …` and the exact-contiguity test (the old literals happen to be exactly contiguous), and the `useJumpBeat` renewal test (a characterisation test). All other tests in the three files pass. Summary: `Test Files  2 failed | 1 passed (3)`, `Tests  4 failed | 31 passed (35)`.

- [ ] **Step 9: Implement the vh chapter table**

In `src/scene/camera/flightPath.ts`, replace:
```ts
export interface Chapter {
  id: ChapterId;
  label: string;
  /** Two-digit display index, e.g. "01". Micro-beats keep their index but are not rail ticks. */
  index: string;
  start: number;
  end: number;
  micro: boolean;
}

/** Normalized scroll ranges for every beat. Contiguous, ordered, sums to 1. */
export const CHAPTERS: readonly Chapter[] = [
  { id: "launch",        label: "LAUNCH",          index: "01", start: 0.00, end: 0.08, micro: false },
  { id: "approach",      label: "APPROACH VECTOR", index: "02", start: 0.08, end: 0.20, micro: false },
  { id: "jump",          label: "JUMP",            index: "03", start: 0.20, end: 0.22, micro: true  },
  { id: "orbit",         label: "ORBIT",           index: "04", start: 0.22, end: 0.34, micro: false },
  { id: "worlds",        label: "WORLDS",          index: "05", start: 0.34, end: 0.52, micro: false },
  { id: "belt",          label: "THE BELT",        index: "06", start: 0.52, end: 0.60, micro: false },
  { id: "passage",       label: "DARK PASSAGE",    index: "07", start: 0.60, end: 0.63, micro: true  },
  { id: "constellation", label: "CONSTELLATION",   index: "08", start: 0.63, end: 0.74, micro: false },
  { id: "pilot",         label: "THE PILOT",       index: "09", start: 0.74, end: 0.84, micro: false },
  { id: "landing",       label: "LANDING",         index: "10", start: 0.84, end: 0.95, micro: false },
  { id: "surface",       label: "SURFACE",         index: "11", start: 0.95, end: 1.00, micro: false },
];
```
with:
```ts
export interface Chapter {
  id: ChapterId;
  label: string;
  /** Two-digit display index, e.g. "01". Micro-beats keep their index but are not rail ticks. */
  index: string;
  /** Scroll length of the chapter's section in vh — the source of truth; `start`/`end` derive from it. */
  spanVh: number;
  /** Derived: cumulative vh before this chapter / VOYAGE_SCROLL_VH. */
  start: number;
  /** Derived: cumulative vh through this chapter / VOYAGE_SCROLL_VH (1 for the last). */
  end: number;
  micro: boolean;
}

/** Scrollable range of the voyage in vh — the denominator the store's progress divides by.
 *  Every chapter span below sums to it (pinned by a test). Spans, not fractions, are what is
 *  declared: the smallest content chapters (Launch, Belt) are 100vh, exactly the 100vh sticky
 *  `.chapter__pin`, so their pin hold is 0 but they still clear it; total travel = 14
 *  viewports + 1 tail. Declared before CHAPTERS because the table reads it at module load. */
export const VOYAGE_SCROLL_VH = 1400;

type ChapterDef = Omit<Chapter, "start" | "end">;

const CHAPTER_DEFS: readonly ChapterDef[] = [
  { id: "launch",        label: "LAUNCH",          index: "01", spanVh: 100,   micro: false },
  { id: "approach",      label: "APPROACH VECTOR", index: "02", spanVh: 150,   micro: false },
  { id: "jump",          label: "JUMP",            index: "03", spanVh: 25,    micro: true  },
  { id: "orbit",         label: "ORBIT",           index: "04", spanVh: 300,   micro: false },
  { id: "worlds",        label: "WORLDS",          index: "05", spanVh: 225,   micro: false },
  { id: "belt",          label: "THE BELT",        index: "06", spanVh: 100,   micro: false },
  { id: "passage",       label: "DARK PASSAGE",    index: "07", spanVh: 37.5,  micro: true  },
  { id: "constellation", label: "CONSTELLATION",   index: "08", spanVh: 137.5, micro: false },
  { id: "pilot",         label: "THE PILOT",       index: "09", spanVh: 125,   micro: false },
  { id: "landing",       label: "LANDING",         index: "10", spanVh: 137.5, micro: false },
  { id: "surface",       label: "SURFACE",         index: "11", spanVh: 62.5,  micro: false },
];

/** cumulativeVh[i] = vh before chapter i; the last entry is the total. Every span is a
 *  multiple of 12.5, so each running sum is exactly representable in IEEE-754. */
const cumulativeVh: number[] = CHAPTER_DEFS.reduce(
  (acc, d) => [...acc, acc[acc.length - 1] + d.spanVh],
  [0],
);

/** Normalized scroll ranges for every beat. Contiguous, ordered, sums to 1.
 *  CONSTRUCTION RULE: `end_i` and `start_{i+1}` are the *same expression* (`cumulativeVh[i+1] /
 *  VOYAGE_SCROLL_VH`), so they are bit-identical. Never write `start + span / VOYAGE_SCROLL_VH`:
 *  that leaves 1-ulp gaps at 6 of the 10 boundaries, and a progress value inside a gap falls
 *  through chapterAt()'s `?? last` to Surface. */
export const CHAPTERS: readonly Chapter[] = CHAPTER_DEFS.map((d, i) => ({
  ...d,
  start: cumulativeVh[i] / VOYAGE_SCROLL_VH,
  end: i === CHAPTER_DEFS.length - 1 ? 1 : cumulativeVh[i + 1] / VOYAGE_SCROLL_VH,
}));
```

Remove the old `VOYAGE_SCROLL_VH` declaration (it moved above `CHAPTERS`):

In `src/scene/camera/flightPath.ts`, replace:
```ts
/** Scrollable range of the voyage in vh — the denominator the store's progress divides by.
 *  1250 is the minimum at which every content chapter (smallest span 0.08) still clears
 *  the 100vh sticky pin; total travel = 12.5 viewports + 1 tail. */
export const VOYAGE_SCROLL_VH = 1250;

/** The last section carries one extra viewport beyond its chapter span, so the track is
```
with:
```ts
/** The last section carries one extra viewport beyond its chapter span, so the track is
```

Make `sectionHeightVh` exact:

In `src/scene/camera/flightPath.ts`, replace:
```ts
  return (chapter.end - chapter.start) * VOYAGE_SCROLL_VH + (chapter.id === "surface" ? VOYAGE_TAIL_VH : 0);
```
with:
```ts
  // The declared span, verbatim: deriving it from the fractions drifts by up to 1.4e-13 vh.
  return chapter.spanVh + (chapter.id === "surface" ? VOYAGE_TAIL_VH : 0);
```

- [ ] **Step 10: Derive the Dock's compaction point**

In `src/components/dock/Dock.tsx`, replace:
```tsx
import { CHAPTERS, type ChapterId } from "@/scene/camera/flightPath";
```
with:
```tsx
import { CHAPTERS, progressAt, type ChapterId } from "@/scene/camera/flightPath";
```

In `src/components/dock/Dock.tsx`, replace:
```tsx
const DOCK_OPTIONS =
```
with:
```tsx
/** The capsule compacts once the hero is 62.5% scrolled. Derived from Launch's own span (it
 *  was the absolute literal 0.05 while Launch ended at 0.08), so it tracks the chapter table. */
export const DOCK_COMPACT_PROGRESS = progressAt("launch", 0.625);

const DOCK_OPTIONS =
```

In `src/components/dock/Dock.tsx`, replace:
```tsx
  const compact = s.progress > 0.05;
```
with:
```tsx
  const compact = s.progress > DOCK_COMPACT_PROGRESS;
```

- [ ] **Step 11: Run everything**

Run:
```bash
cd /Users/admin/Codes-2/portfolio
npx vitest run
npx tsc --noEmit
npx eslint src/scene src/components/dock src/components/voyage
```
Expected: `vitest` — `Test Files  36 passed (36)`, `Tests  421 passed (421)` = 413 + **8 new tests** (3 `progressAt`, `declares its spans`, `chapterAt never falls through`, `sectionHeightVh is the declared span`, the `DOCK_COMPACT_PROGRESS` test, the `useJumpBeat` renewal test); the exact-contiguity and viewport-height tests are edits of existing ones, not additions. `tsc` prints nothing. `eslint` over those directories reports no problems in files this task touched (the repo-wide baseline of 16 problems lives in files this slice never touches; Task 10 reconfirms it).
Per-file counts: `flightPath.test.ts` 24, `dockLinks.test.ts` 3, `useJumpBeat.test.tsx` 8.

If a test fails after Step 9, check `chapterAt` boundaries first: a `toBe` contiguity failure means an `end` was computed with `start + span / VOYAGE_SCROLL_VH` instead of from the cumulative array.

- [ ] **Step 12: Audit — no unjustified absolute progress literal remains**

Run:
```bash
cd /Users/admin/Codes-2/portfolio
grep -rnE "(setScroll|scrollTo|chapterAt|getCameraPose|starScale|distanceAU|progressToCurveT|scroll)\(\s*-?[0-9]*\.[0-9]+" src --include=*.test.ts --include=*.test.tsx
```
Expected: every hit is in `src/scene/scroll/voyageStore.test.ts` (32 lines; each is chapter-agnostic — see below) and nothing else. The grep deliberately does not match the second, velocity argument of `setScroll(p, 0.5)`, only the first. Specifically justified and left alone:
- `voyageStore.test.ts` `setScroll(1.7, 5)`, `setScroll(-0.2, -1)`: clamp cases.
- `voyageStore.test.ts` `setScroll(0.1, 0)` / `setScroll(0.2, 0)`: emit-counting (only "did it change" is asserted).
- `voyageStore.test.ts` `scrollTo(0.5 / 0.84 / 0.9 / 0.3 / 0.6)` and the paired `setScroll(0.3 / 0.31 / 0.5 / 0.6 / 0.84, …)`: programmatic-flag tests that compare only against `PROGRAMMATIC_EPS` and the target, never a chapter.
- Not matched by the grep, listed for completeness: `flightPath.test.ts` `getCameraPose(0)`, `distanceAU(0)`, `starScale(0)`, `starScale(1)`, `chapterAt(0)` / `(1)` are voyage endpoints no table change moves, and `src/app/api/logs/route.test.ts:78` `progress: 0.2004` is an opaque request payload.
Any hit in a `Services`, `Topology`, `EnergyOrb`, `WarpStreaks`, `Starfield` or `useJumpBeat` test file is a missed conversion — fix it before committing.

- [ ] **Step 13: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/camera/flightPath.ts src/scene/camera/flightPath.test.ts \
  src/components/dock/Dock.tsx src/components/dock/dockLinks.test.ts \
  src/components/voyage/Services.test.tsx src/components/voyage/useJumpBeat.test.tsx \
  src/scene/chapters/Topology.test.ts src/scene/chapters/EnergyOrb.test.ts \
  src/scene/chapters/WarpStreaks.test.ts src/scene/chapters/Starfield.test.ts \
  src/scene/scroll/voyageStore.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): vh-derived chapter table, progressAt, Orbit to 300vh

CHAPTERS now declares spans in vh and derives every start/end from one
cumulative sum (exact contiguity; chapterAt can never fall through to
Surface). VOYAGE_SCROLL_VH 1250 -> 1400, Orbit 150 -> 300vh, sectionHeightVh
exact. progressAt(id, t) replaces every absolute progress literal in the
test suite (including the ones that silently retargeted); the Dock's
compaction point is derived from Launch.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The Orbit bank — `bankForProgress` + the camera roll

**Wave 1 (parallel with Tasks 3 and 5). Needs Task 1.**

**Files:**
- Modify: `src/scene/camera/flightPath.ts` (append `BANK_MAX`, `bankForProgress`)
- Modify: `src/scene/SceneRoot.tsx` (`smoothBank`, `camera.rotateZ` after `lookAt`)
- Test: `src/scene/camera/flightPath.test.ts`

**Interfaces:**
- Consumes: `chapterAt`, the module-private `smooth` easing in `flightPath.ts`, `CHAPTERS`, `progressAt` (Task 1).
- Produces:
  ```ts
  export const BANK_MAX: number;                       // 30° in radians — a browser-review tunable
  export function bankForProgress(progress: number): number;  // radians; 0 outside Orbit
  ```

**Why it is pure and outside `getCameraPose`:** the never-reverse test (`flightPath.test.ts`) samples only `getCameraPose`, and `lookAt` rebuilds the camera quaternion from scratch every frame. A roll about the camera's *forward* axis applied *after* `lookAt` leaves position, lookAt target and the star's screen position unchanged, so none of the existing path invariants can see it. `SceneRoot` has no tests; the roll's logic lives in the pure function and the `SceneRoot` diff is three lines.

- [ ] **Step 1: Write the failing tests**

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
  progressAt,
} from "./flightPath";
```
with:
```ts
  progressAt, bankForProgress, BANK_MAX,
} from "./flightPath";
```

In `src/scene/camera/flightPath.test.ts`, replace:
```ts
// VoyageScroll guards Lenis's `limit <= 0` report at the source
```
with:
```ts
// Spec §3 row 04: "Camera banks ~30° and settles into orbit". Pure and orbit-scoped: SceneRoot
// applies it as a roll AFTER lookAt, so none of the position/lookAt invariants above can see it.
describe("bankForProgress", () => {
  const bank = (t: number) => bankForProgress(progressAt("orbit", t));

  it("is 30 degrees at most — the spec's figure", () => {
    expect(BANK_MAX).toBeCloseTo(Math.PI / 6, 12);
  });

  it("is exactly 0 in every chapter but Orbit, so Approach, Jump and Worlds stay level", () => {
    for (const c of CHAPTERS.filter((x) => x.id !== "orbit")) {
      for (const t of [0, 0.25, 0.5, 0.75, 0.999]) expect(bankForProgress(progressAt(c.id, t))).toBe(0);
    }
  });

  it("starts at 0 on Orbit's first frame and is back to ~0 on its last", () => {
    expect(bank(0)).toBe(0);
    expect(bank(0.999999)).toBeLessThan(1e-6);
    expect(bank(0.999999)).toBeGreaterThanOrEqual(0);
  });

  it("holds BANK_MAX across the middle of the chapter", () => {
    for (const t of [0.18, 0.3, 0.5, 0.7, 0.82]) expect(bank(t)).toBeCloseTo(BANK_MAX, 9);
  });

  it("eases in over the first 18% and out over the last 18%, monotonically", () => {
    let prev = -1;
    for (let k = 0; k <= 100; k++) {
      const v = bank((k / 100) * 0.18);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    prev = BANK_MAX + 1;
    for (let k = 0; k <= 100; k++) {
      const v = bank(Math.min(0.999999, 0.82 + (k / 100) * 0.18));
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
    // Smooth, not linear: the quarter point of the ramp is below a quarter of the way up.
    expect(bank(0.18 * 0.25)).toBeLessThan(BANK_MAX * 0.25);
  });

  it("is symmetric about the middle of the chapter", () => {
    for (const t of [0.03, 0.06, 0.1, 0.15]) expect(bank(t)).toBeCloseTo(bank(1 - t), 9);
  });

  it("is continuous across both chapter edges (no jump in the roll)", () => {
    const orbit = CHAPTERS.find((c) => c.id === "orbit")!;
    const justBefore = (x: number) => x * (1 - 1e-9);
    expect(Math.abs(bankForProgress(justBefore(orbit.start)) - bankForProgress(orbit.start))).toBeLessThan(1e-6);
    expect(Math.abs(bankForProgress(justBefore(orbit.end)) - bankForProgress(orbit.end))).toBeLessThan(1e-6);
  });

  it("stays inside [0, BANK_MAX] over the whole voyage and treats non-finite input as level", () => {
    for (let i = 0; i <= STEPS; i++) {
      const b = bankForProgress(i / STEPS);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(BANK_MAX);
    }
    expect(bankForProgress(NaN)).toBe(0);
    expect(bankForProgress(Infinity)).toBe(0);
    expect(bankForProgress(-Infinity)).toBe(0);
  });
});

// VoyageScroll guards Lenis's `limit <= 0` report at the source
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scene/camera/flightPath.test.ts`
Expected: FAIL — all **8** new `bankForProgress` tests fail (`TypeError: bankForProgress is not a function`, and `AssertionError: expected undefined to be close to 0.5235987755982988` for the `BANK_MAX` one — a not-yet-exported name imports as `undefined`, so the file still collects). The 24 tests already in the file pass. Summary: `Tests  8 failed | 24 passed (32)`.

- [ ] **Step 3: Implement `bankForProgress`**

In `src/scene/camera/flightPath.ts`, replace:
```ts
export function fovForVelocity(velocity01: number): number {
  return FOV_MIN + (FOV_MAX - FOV_MIN) * clamp01(velocity01);
}
```
with:
```ts
export function fovForVelocity(velocity01: number): number {
  return FOV_MIN + (FOV_MAX - FOV_MIN) * clamp01(velocity01);
}

/** Peak roll of the Orbit bank, in radians (spec §3 row 04: "banks ~30°"). The sign is the
 *  direction of the roll; a browser-review tunable. */
export const BANK_MAX = (30 * Math.PI) / 180;

/** The bank eases in over Orbit's first 18% and out over its last 18%, so Jump hands over
 *  level (the letterbox bars still hide the first of it) and Worlds starts level. */
const BANK_IN_END = 0.18;
const BANK_OUT_START = 0.82;

/**
 * Camera roll in radians for a voyage progress: 0 in every chapter but Orbit, `BANK_MAX`
 * through the middle of it, smooth at both ends. Pure and kept out of `getCameraPose` on
 * purpose — SceneRoot applies it as `camera.rotateZ(...)` after `lookAt`, a roll about the
 * forward axis, so position, lookAt and the never-reverse invariant cannot be affected.
 */
export function bankForProgress(progress: number): number {
  const { chapter, chapterProgress: t } = chapterAt(progress);
  if (chapter.id !== "orbit") return 0;
  if (t < BANK_IN_END) return BANK_MAX * smooth(t / BANK_IN_END);
  if (t > BANK_OUT_START) return BANK_MAX * smooth((1 - t) / (1 - BANK_OUT_START));
  return BANK_MAX;
}
```

- [ ] **Step 4: Apply the roll in `SceneRoot`**

In `src/scene/SceneRoot.tsx`, replace:
```tsx
import { getCameraPose, fovForVelocity, type CameraPose } from "@/scene/camera/flightPath";
```
with:
```tsx
import { getCameraPose, bankForProgress, fovForVelocity, type CameraPose } from "@/scene/camera/flightPath";
```

In `src/scene/SceneRoot.tsx`, replace:
```tsx
    const smoothLook = new THREE.Vector3(0, 0, -1);
```
with:
```tsx
    const smoothLook = new THREE.Vector3(0, 0, -1);
    // Orbit's roll about the camera's forward axis, eased like the pose so a Dock click or a
    // scroll restore mid-orbit does not snap it while position and lookAt glide.
    let smoothBank = 0;
```

In `src/scene/SceneRoot.tsx`, replace:
```tsx
      camera.lookAt(smoothLook);
```
with:
```tsx
      camera.lookAt(smoothLook);
      // After lookAt: lookAt rebuilds the orientation from scratch every frame, so the roll
      // never accumulates, and rotating about local Z leaves the view direction (and the
      // star's screen position) unchanged.
      smoothBank += (bankForProgress(voyage.progress) - smoothBank) * POSE_LERP;
      camera.rotateZ(smoothBank);
```

- [ ] **Step 5: Run the tests, the typecheck and the lint**

Run:
```bash
cd /Users/admin/Codes-2/portfolio
npx vitest run src/scene/camera/flightPath.test.ts
npx tsc --noEmit
npx eslint src/scene/SceneRoot.tsx src/scene/camera
```
Expected: `Tests  32 passed (32)` in `flightPath.test.ts` (24 + 8 new); `tsc` and `eslint` print nothing. The full suite gains exactly these 8 tests (run `npx vitest run` once: it must show no failures).

`SceneRoot` has no unit tests (it owns the WebGL context); the visual check — the horizon rolling in over Orbit's first fifth and back out over its last, Worlds starting level, no roll in Approach/Jump — is Task 9's. Which way it banks is a Task 9 tunable: flip the sign at the `camera.rotateZ(smoothBank)` call in `SceneRoot.tsx` (negate the argument), **not** `BANK_MAX` — `flightPath.test.ts` pins `0 ≤ bankForProgress ≤ BANK_MAX`.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/camera/flightPath.ts src/scene/camera/flightPath.test.ts src/scene/SceneRoot.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): Orbit bank — pure bankForProgress, applied as a roll after lookAt

0 outside Orbit, eases to 30deg over cp 0-0.18, holds, eases back by 1 so
Worlds starts level. SceneRoot lerps it at POSE_LERP and rolls the camera
about its forward axis after lookAt, so position, lookAt and the
never-reverse invariant are untouched.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `orbitSchedule.ts` — the one clock for panels, ring and starfield

**Wave 1 (parallel with Tasks 2 and 5). Needs Task 1.**

**Files:**
- Create: `src/scene/chapters/orbitSchedule.ts`
- Test: `src/scene/chapters/orbitSchedule.test.ts` (new)

**Interfaces:**
- Consumes: `CHAPTERS` from `@/scene/camera/flightPath` (only to derive the pin holds from Orbit's `spanVh`).
- Produces (Tasks 4, 6 and 7 rely on these exact names; every `cp` argument is **Orbit's own `chapterProgress`**, 0..1):
  ```ts
  export const ORBIT_HOLD_DESKTOP: number;              // (300 − 100) / 300 = 2/3 — last cp the 100vh pin is stationary
  export const ORBIT_HOLD_MOBILE: number;               // (300 − 64) / 300 = 0.787
  export const ORBIT_WINDOW: readonly [number, number]; // [0.04, 0.62] — where steps dwell
  export const ORBIT_EDGE_FADE: number;                 // 0.04 — width of the fade-in before / fade-out after the window
  export const ORBIT_PRESENCE_END: number;              // ORBIT_WINDOW[1] + ORBIT_EDGE_FADE = 0.66
  export const STEP_CROSSFADE: number;                  // 0.3 — cross-fade width as a fraction of one step's slot
  export function orbitPresence(chapterProgress: number): number;       // 0..1 envelope for the RING and the STARFIELD (fades in and out)
  export function panelPresence(chapterProgress: number): number;       // 0..1 envelope for the PANELS (fades in, then holds 1 until the pin releases)
  export function orbitCursor(chapterProgress: number, n: number): number; // continuous step index in [0, n−1]
  export function stepSolo(i: number, n: number, chapterProgress: number): number; // 0..1 visibility of step i of n
  ```

**Design (so the test below reads as a spec):** inside the window the N steps share equal slots. Between slot `b−1` and slot `b` a short cross-fade (0.3 of a slot) is centred on the boundary; the cursor moves between the same two steps across the same stretch, using the same easing. So `stepSolo(i) = crossed(i) − crossed(i+1)` (with `crossed(0) = 1`, `crossed(n) = 0`) telescopes: the summed visibility is exactly 1 inside the window, never below, and `Σ i·stepSolo(i) === orbitCursor` — a node arrives front-centre exactly as its panel takes over. The first panel's fade-in is `panelPresence` (0 → 1 over the margin `[0, 0.04]`, then 1): the last panel never fades out — it dwells until the pin releases (desktop cp 2/3, mobile 0.787) and leaves with it, so a phone's extra 0.12 is a held last step, not an empty frame. The ring and the starfield pull use `orbitPresence`, which also fades out over the margin `[0.62, 0.66]` (inside the desktop hold, 0.66 < 2/3). N = 0 and N = 1 are handled without division by zero (cursor 0 throughout).

- [ ] **Step 1: Write the failing test**

Create `src/scene/chapters/orbitSchedule.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { progressAt, chapterAt } from "@/scene/camera/flightPath";
import {
  ORBIT_WINDOW, ORBIT_EDGE_FADE, ORBIT_PRESENCE_END, ORBIT_HOLD_DESKTOP, ORBIT_HOLD_MOBILE,
  STEP_CROSSFADE, orbitPresence, orbitCursor, stepSolo,
} from "./orbitSchedule";

const [W0, W1] = ORBIT_WINDOW;
const COUNTS = [1, 2, 3, 4, 6, 12];
/** chapterProgress at the middle of step `i`'s slot (where it dwells front-centre). */
const centre = (i: number, n: number) => W0 + ((i + 0.5) / n) * (W1 - W0);
/** chapterProgress at the boundary between step `b - 1` and step `b`. */
const boundary = (b: number, n: number) => W0 + (b / n) * (W1 - W0);
const sweep = (from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, k) => from + ((to - from) * k) / steps);
const sum = (n: number, cp: number) =>
  Array.from({ length: n }, (_, i) => stepSolo(i, n, cp)).reduce((a, b) => a + b, 0);

describe("schedule constants", () => {
  it("derive the pin holds from Orbit's 300vh section", () => {
    expect(ORBIT_HOLD_DESKTOP).toBeCloseTo(2 / 3, 10);      // (300 - 100) / 300
    expect(ORBIT_HOLD_MOBILE).toBeCloseTo(236 / 300, 10);   // (300 - 64) / 300
  });

  it("keeps the window and both edge fades inside the desktop hold", () => {
    expect(W0).toBeGreaterThan(0);
    expect(W1).toBeGreaterThan(W0);
    expect(ORBIT_PRESENCE_END).toBeCloseTo(W1 + ORBIT_EDGE_FADE, 12);
    expect(ORBIT_PRESENCE_END).toBeLessThanOrEqual(ORBIT_HOLD_DESKTOP);
    expect(ORBIT_PRESENCE_END).toBeLessThanOrEqual(ORBIT_HOLD_MOBILE);
    expect(ORBIT_EDGE_FADE).toBeLessThanOrEqual(W0);          // the fade-in fits before the window
    expect(STEP_CROSSFADE).toBeGreaterThan(0);
    expect(STEP_CROSSFADE).toBeLessThan(1);
  });
});

describe("orbitPresence", () => {
  it("is 0 at the chapter start, 1 across the window, 0 from the presence end on", () => {
    expect(orbitPresence(0)).toBe(0);
    expect(orbitPresence(W0)).toBe(1);
    expect(orbitPresence((W0 + W1) / 2)).toBe(1);
    expect(orbitPresence(W1)).toBe(1);
    expect(orbitPresence(ORBIT_PRESENCE_END)).toBe(0);
    expect(orbitPresence(ORBIT_HOLD_DESKTOP)).toBe(0);
    expect(orbitPresence(1)).toBe(0);
  });

  it("ramps monotonically up before the window and down after it", () => {
    let prev = -1;
    for (const cp of sweep(0, W0, 40)) {
      const v = orbitPresence(cp);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    prev = 2;
    for (const cp of sweep(W1, ORBIT_PRESENCE_END, 40)) {
      const v = orbitPresence(cp);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it("clamps out-of-range input and treats NaN as the chapter start", () => {
    expect(orbitPresence(-5)).toBe(0);
    expect(orbitPresence(9)).toBe(0);
    expect(orbitPresence(NaN)).toBe(0);
  });
});

describe("orbitCursor", () => {
  it("is 0 for no steps, one step, and nonsense counts, at every progress", () => {
    for (const n of [0, 1, -3, NaN, Infinity, 0.9]) {
      for (const cp of sweep(0, 1, 20)) expect(orbitCursor(cp, n)).toBe(0);
    }
  });

  it("rests exactly on step i while it dwells, for N = 2, 4 and 6", () => {
    for (const n of [2, 4, 6]) {
      for (let i = 0; i < n; i++) expect(orbitCursor(centre(i, n), n)).toBe(i);
    }
  });

  it("is halfway between two steps in the middle of their cross-fade", () => {
    for (const n of [2, 4, 6]) {
      for (let b = 1; b < n; b++) expect(orbitCursor(boundary(b, n), n)).toBeCloseTo(b - 0.5, 10);
    }
  });

  it("holds step 0 before the window and the last step after it", () => {
    for (const n of [2, 4, 6]) {
      expect(orbitCursor(0, n)).toBe(0);
      expect(orbitCursor(W0, n)).toBe(0);
      expect(orbitCursor(W1, n)).toBe(n - 1);
      expect(orbitCursor(1, n)).toBe(n - 1);
    }
  });

  it("never decreases and stays inside [0, n - 1]", () => {
    for (const n of [2, 3, 4, 6, 12]) {
      let prev = -1;
      for (const cp of sweep(0, 1, 2000)) {
        const c = orbitCursor(cp, n);
        expect(c).toBeGreaterThanOrEqual(prev);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(n - 1);
        prev = c;
      }
    }
  });

  it("treats NaN progress as the chapter start and fractional counts as their floor", () => {
    expect(orbitCursor(NaN, 4)).toBe(0);
    expect(orbitCursor(W1, 4.9)).toBe(3);
  });

  it("is driven by the real chapter: Orbit's own progress, never another chapter's", () => {
    const hit = chapterAt(progressAt("orbit", centre(2, 4)));
    expect(hit.chapter.id).toBe("orbit");
    expect(orbitCursor(hit.chapterProgress, 4)).toBe(2);
  });
});

describe("stepSolo", () => {
  // E4 "each step dwells front-centre": a hard cut (STEP_CROSSFADE → 0) or a schedule that never
  // rests (STEP_CROSSFADE → 1) would pass every other test here, so the plateau is pinned directly.
  it("dwells at least ±0.25 of a slot around each centre, and cross-fades over at least ±0.1 of a slot at each boundary", () => {
    const n = 4, slot = (W1 - W0) / n;
    for (let i = 0; i < n; i++) {
      for (const d of [-0.25, -0.1, 0, 0.1, 0.25]) {
        expect(orbitCursor(centre(i, n) + d * slot, n)).toBeCloseTo(i, 9);
        expect(stepSolo(i, n, centre(i, n) + d * slot)).toBeCloseTo(1, 9);
      }
    }
    for (let b = 1; b < n; b++) {
      for (const d of [-0.1, 0.1]) {
        const c = orbitCursor(boundary(b, n) + d * slot, n);
        expect(c).toBeGreaterThan(b - 1);
        expect(c).toBeLessThan(b);
      }
    }
  });

  it("shows exactly one step at the centre of each slot", () => {
    for (const n of [1, 2, 4, 6]) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) expect(stepSolo(j, n, centre(i, n))).toBe(i === j ? 1 : 0);
      }
    }
  });

  it("never lets the summed visibility drop below 1 inside the window (N >= 1)", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(W0, W1, 1000)) {
        expect(sum(n, cp)).toBeGreaterThanOrEqual(1 - 1e-9);
        expect(sum(n, cp)).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it("shows at most two steps at once, and only neighbours", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(0, 1, 1000)) {
        const lit = Array.from({ length: n }, (_, i) => i).filter((i) => stepSolo(i, n, cp) > 0);
        expect(lit.length).toBeLessThanOrEqual(2);
        if (lit.length === 2) expect(lit[1] - lit[0]).toBe(1);
      }
    }
  });

  it("keeps every cross-fade inside the window: only the first step before it, only the last after", () => {
    for (const n of [2, 4, 6]) {
      for (const cp of sweep(0, W0, 50)) {
        for (let i = 1; i < n; i++) expect(stepSolo(i, n, cp)).toBe(0);
      }
      for (const cp of sweep(W1, 1, 50)) {
        for (let i = 0; i < n - 1; i++) expect(stepSolo(i, n, cp)).toBe(0);
      }
    }
  });

  it("is dark at the chapter start, for every step", () => {
    for (const n of COUNTS) for (let i = 0; i < n; i++) expect(stepSolo(i, n, 0)).toBe(0);
  });

  it("fades the first step in across the leading margin", () => {
    expect(stepSolo(0, 4, W0 / 2)).toBeGreaterThan(0);
    expect(stepSolo(0, 4, W0 / 2)).toBeLessThan(1);
  });

  // E4: ONE schedule for every device — on a phone (pin held to ORBIT_HOLD_MOBILE) the last
  // step simply dwells; on desktop it leaves with the pin. The panels have no fade-out of
  // their own: the pin's release is their exit.
  it("keeps the last step up from the window end through the mobile pin release, and no other", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(W1, ORBIT_HOLD_MOBILE, 50)) {
        for (let i = 0; i < n; i++) expect(stepSolo(i, n, cp)).toBe(i === n - 1 ? 1 : 0);
      }
    }
  });

  it("agrees with the cursor: the visibility-weighted step index IS the cursor", () => {
    for (const n of [2, 4, 6]) {
      for (const cp of sweep(W0, W1, 400)) {
        let weighted = 0;
        for (let i = 0; i < n; i++) weighted += i * stepSolo(i, n, cp);
        expect(weighted).toBeCloseTo(orbitCursor(cp, n), 9);
      }
    }
  });

  it("is 0 for no steps, an out-of-range index, or a non-integer index", () => {
    expect(stepSolo(0, 0, centre(0, 1))).toBe(0);
    expect(stepSolo(0, NaN, 0.3)).toBe(0);
    expect(stepSolo(-1, 4, 0.3)).toBe(0);
    expect(stepSolo(4, 4, 0.3)).toBe(0);
    expect(stepSolo(0.5, 4, 0.3)).toBe(0);
  });

  it("gives a lone step the whole window (N = 1) and halves the window for N = 2", () => {
    for (const cp of sweep(W0, W1, 50)) expect(stepSolo(0, 1, cp)).toBe(1);
    expect(stepSolo(0, 2, centre(0, 2))).toBe(1);
    expect(stepSolo(1, 2, centre(1, 2))).toBe(1);
    expect(stepSolo(0, 2, boundary(1, 2))).toBeCloseTo(0.5, 10);
    expect(stepSolo(1, 2, boundary(1, 2))).toBeCloseTo(0.5, 10);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scene/chapters/orbitSchedule.test.ts`
Expected: FAIL at collection — `Error: Cannot find module './orbitSchedule' imported from …/orbitSchedule.test.ts`, the file reports `(0 test)` and `Test Files  1 failed (1)`. (The module does not exist, so — unlike a missing named export — nothing is collected.)

- [ ] **Step 3: Implement the schedule**

Create `src/scene/chapters/orbitSchedule.ts`:
```ts
/* Pure schedule for chapter 04 (Orbit), shared by the DOM panels (Process.tsx), the ring
 * (OrbitRing.ts) and the starfield focus pull (Starfield.ts). No React, no three, no DOM.
 *
 * Pin arithmetic (derived, not typed): Orbit's section is 300vh and `.chapter__pin` is
 * stationary for `section - pin`: 200vh on desktop (100vh pin) = chapterProgress 0..2/3, and
 * 236vh on mobile (64vh pin) = 0..0.787. ONE schedule serves both and every device: the ring is a
 * single WebGL instance and cannot be media-query-aware, so the schedule is sized to the
 * smaller (desktop) hold. The PANELS never fade out: the last step stays at 1 until the pin
 * releases (desktop cp 2/3, mobile 0.787), so a phone dwells on it for its extra 0.12 and the
 * pin's own release is the panel's exit. Only the ring and the starfield fade out (orbitPresence).
 *
 * Layout of chapterProgress (cp); the pin is stationary for cp 0 .. 0.667 (desktop) / 0.787 (mobile):
 *   0 ......... 0.04 ........................ 0.62 ........ 0.66 .... 0.667 ........ 0.787
 *   [ fade in ][ window: steps cross-fade   ][ ring/stars fade out ]
 *   panels:    [ step 0 .. step n-1 ........................ last step holds at 1 ........]
 *
 * Inside ORBIT_WINDOW the N steps share the window in equal slots. Between slot b-1 and slot b
 * there is a short cross-fade centred on the slot boundary, and the ring's cursor moves
 * between the same two steps over the same stretch, so a node arrives front-centre exactly as
 * its panel replaces the previous one.
 */
import { CHAPTERS } from "@/scene/camera/flightPath";

const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));
const smooth = (t: number) => t * t * (3 - 2 * t);

const orbit = CHAPTERS.find((c) => c.id === "orbit")!;

/** Desktop pin height and the mobile Approach/Orbit pin height, in vh (voyage.css). */
const PIN_DESKTOP_VH = 100;
const PIN_MOBILE_VH = 64;

/** Last chapterProgress at which the sticky pin is still stationary (hold = section - pin). */
export const ORBIT_HOLD_DESKTOP = (orbit.spanVh - PIN_DESKTOP_VH) / orbit.spanVh;
export const ORBIT_HOLD_MOBILE = (orbit.spanVh - PIN_MOBILE_VH) / orbit.spanVh;

/** Where the steps dwell, as chapterProgress `[start, end]`. Inside it the summed panel
 *  visibility is never below 1. Sits inside the desktop hold with margin for the edge fades. */
export const ORBIT_WINDOW: readonly [number, number] = [0.04, 0.62];

/** Width of the fade-in before the window and the fade-out after it, in chapterProgress. The
 *  fade-in serves the panels, the ring and the starfield; the fade-out only the ring and the
 *  starfield (the panels dwell until the pin releases). Both margins sit inside the desktop hold. */
export const ORBIT_EDGE_FADE = 0.04;

/** Last chapterProgress at which the ring and the starfield pull are still held by the
 *  schedule's envelope (0.66 < 2/3); the ring then finishes its own fade by RING_FADE_OUT_END.
 *  The panels are not tied to it. */
export const ORBIT_PRESENCE_END = ORBIT_WINDOW[1] + ORBIT_EDGE_FADE;

/** Width of a cross-fade between two steps, as a fraction of one step's slot. */
export const STEP_CROSSFADE = 0.3;

/** 0..1 presence of the RING and the STARFIELD pull: 0 at cp 0, ramps to 1 by the window start,
 *  holds through the window, ramps back to 0 by ORBIT_PRESENCE_END and stays 0 after. */
export function orbitPresence(chapterProgress: number): number {
  const t = clamp01(chapterProgress);
  const [start, end] = ORBIT_WINDOW;
  if (t < start) return smooth(t / start);
  if (t <= end) return 1;
  if (t < ORBIT_PRESENCE_END) return smooth(1 - (t - end) / ORBIT_EDGE_FADE);
  return 0;
}

/** 0..1 presence of the PANELS only: fades in over [0, ORBIT_WINDOW[0]] and then stays 1, so the
 *  last step dwells until the pin releases (desktop cp 2/3, mobile 0.787) and leaves with the
 *  pin. The ring and the starfield keep `orbitPresence` (they do fade out). */
export function panelPresence(chapterProgress: number): number {
  const t = clamp01(chapterProgress);
  const start = ORBIT_WINDOW[0];
  return t < start ? smooth(t / start) : 1;
}

/** Whole numbers only: the CMS may hold any count, and a non-finite or negative one is empty. */
function sanitizeCount(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Position inside the window measured in step slots: 0 at the window start, `count` at its end. */
function slotPosition(chapterProgress: number, count: number): number {
  const [start, end] = ORBIT_WINDOW;
  return clamp01((clamp01(chapterProgress) - start) / (end - start)) * count;
}

/** 0 → 1 across the cross-fade centred on slot boundary `b`. Two different boundaries are
 *  never active at once (the cross-fade is 0.3 of a slot wide, boundaries are 1 apart). */
function crossed(b: number, x: number): number {
  return smooth(clamp01((x - b) / STEP_CROSSFADE + 0.5));
}

/**
 * Continuous step index in [0, n-1]: it sits on an integer while a step dwells and moves
 * between two integers only across a cross-fade. Monotone non-decreasing in chapterProgress;
 * 0 for n <= 1; 0 before the window and n-1 after it.
 */
export function orbitCursor(chapterProgress: number, n: number): number {
  const count = sanitizeCount(n);
  if (count <= 1) return 0;
  const x = slotPosition(chapterProgress, count);
  let cursor = 0;
  for (let b = 1; b < count; b++) cursor += crossed(b, x);
  return cursor;
}

/**
 * 0..1 visibility of step `i` of `n`: exactly one panel at a time except across a
 * cross-fade, where the two visibilities sum to 1. Inside ORBIT_WINDOW the sum over all steps
 * is exactly 1; before it only the first step is non-zero (fading in over the leading margin),
 * and after it the last step stays at 1 until the chapter ends — the pin's release is its exit,
 * so the caller (Process) must not show any step outside Orbit. Out-of-range or non-integer `i`,
 * and n <= 0, give 0.
 */
export function stepSolo(i: number, n: number, chapterProgress: number): number {
  const count = sanitizeCount(n);
  if (!Number.isInteger(i) || i < 0 || i >= count) return 0;
  const x = slotPosition(chapterProgress, count);
  const enter = i === 0 ? 1 : crossed(i, x);
  const leave = i === count - 1 ? 0 : crossed(i + 1, x);
  return clamp01(panelPresence(chapterProgress) * (enter - leave));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scene/chapters/orbitSchedule.test.ts`
Expected: PASS — `Tests  23 passed (23)` (2 constants, 3 presence, 7 cursor, 11 `stepSolo`).

- [ ] **Step 5: Verify the whole suite and the types**

Run:
```bash
cd /Users/admin/Codes-2/portfolio
npx vitest run
npx tsc --noEmit
npx eslint src/scene/chapters/orbitSchedule.ts src/scene/chapters/orbitSchedule.test.ts
```
Expected: no failures anywhere (the suite gains exactly these 23 tests); `tsc` and `eslint` print nothing.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/chapters/orbitSchedule.ts src/scene/chapters/orbitSchedule.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): orbitSchedule — one pure clock for Orbit's panels, ring and starfield

ORBIT_WINDOW, orbitPresence (ring + stars), panelPresence (panels),
orbitCursor(cp, n) and stepSolo(i, n, cp): summed panel visibility is exactly 1
inside the window, the cross-fades never leave it, the last panel dwells until
the pin releases, and the visibility-weighted step index equals the ring's
cursor, so a node arrives front-centre as its panel takes over. N = 0/1/2 are
handled.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: The star as a sphere (`orbitLimb` + `uLimb`) and the Orbit focus pull

**Wave 2 (parallel with Tasks 6 and 7, after Wave 1 is merged). Needs Tasks 1 and 3.**

**Files:**
- Modify: `src/scene/chapters/EnergyOrb.ts` (`orbitLimb`, `LIMB_POWER`, `LIMB_RIM`, the `uLimb` uniform + fragment shader)
- Modify: `src/scene/chapters/Starfield.ts` (`ORBIT_SOFTEN_PEAK`, `orbitSoften`, `chapterSoften`; `update()` calls `chapterSoften`)
- Test: `src/scene/chapters/EnergyOrb.test.ts`, `src/scene/chapters/Starfield.test.ts`

**Interfaces:**
- Consumes: `chapterAt`, `progressAt` (Task 1); `orbitPresence`, `ORBIT_WINDOW`, `ORBIT_PRESENCE_END` from `./orbitSchedule` (Task 3).
- Produces:
  ```ts
  // EnergyOrb.ts
  export const LIMB_POWER = 0.6;                       // browser-review tunable
  export const LIMB_RIM = 0.3;                         // browser-review tunable
  export function orbitLimb(progress: number): number; // 0..1; 0 outside Orbit
  //   EnergyOrb.material.uniforms.uLimb: { value: number }  (written every update())
  // Starfield.ts
  export const ORBIT_SOFTEN_PEAK = 0.75;               // browser-review tunable
  export function orbitSoften(chapterProgress: number): number;
  export function chapterSoften(chapterId: ChapterId, chapterProgress: number): number;
  //   approachSoften is UNCHANGED and still exported
  ```

**Why:** at orbit distance the star is only 13 → 56 px across (map §3) and the existing shader — a bright fresnel *rim* plus drifting noise, no shaded roundness — reads as a dot. Limb darkening (darker toward the edge, rim cut back) is the cheapest in-repo lever; the ring's ellipse and perspective (Task 6) are the second cue. Jump's `jumpGlare` and the Pilot's `setGlare` are separate and untouched: `uLimb = 0` leaves both shader factors at exactly 1.0, so every other chapter renders exactly as before. The curve is unit-tested; the shader itself has no unit coverage — Task 9's captures are its regression net.

- [ ] **Step 1: Write the failing tests**

In `src/scene/chapters/EnergyOrb.test.ts`, replace:
```ts
import { EnergyOrb, jumpGlare } from "./EnergyOrb";
```
with:
```ts
import { EnergyOrb, jumpGlare, orbitLimb } from "./EnergyOrb";
```

In `src/scene/chapters/EnergyOrb.test.ts`, replace:
```ts
describe("EnergyOrb — chapter 03 flare", () => {
```
with:
```ts
// Slice 4: chapter 04 (Orbit) limb darkening — the pure ramp, then how update() feeds the shader.
describe("orbitLimb", () => {
  it("is 0 in every chapter but Orbit", () => {
    for (const id of ["launch", "approach", "jump", "worlds", "belt", "pilot", "surface"] as const) {
      expect(orbitLimb(progressAt(id, 0.5))).toBe(0);
    }
  });

  it("ramps 0 → 1 over Orbit's first fifth, holds, and ramps back over its last fifth", () => {
    expect(orbitLimb(progressAt("orbit", 0))).toBe(0);
    expect(orbitLimb(progressAt("orbit", 0.1))).toBeGreaterThan(0);
    expect(orbitLimb(progressAt("orbit", 0.1))).toBeLessThan(1);
    for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) expect(orbitLimb(progressAt("orbit", t))).toBeCloseTo(1, 9);
    expect(orbitLimb(progressAt("orbit", 0.9))).toBeGreaterThan(0);
    expect(orbitLimb(progressAt("orbit", 0.9))).toBeLessThan(1);
    expect(orbitLimb(progressAt("orbit", 0.999))).toBeLessThan(1e-4);
    // Worlds starts with a plain star again.
    expect(orbitLimb(progressAt("worlds", 0))).toBe(0);
  });

  it("is symmetric, monotone on both ramps, and always inside 0..1", () => {
    for (const t of [0.02, 0.05, 0.1, 0.15, 0.19]) {
      expect(orbitLimb(progressAt("orbit", t))).toBeCloseTo(orbitLimb(progressAt("orbit", 1 - t)), 9);
    }
    let prev = -1;
    for (let k = 0; k <= 100; k++) {
      const v = orbitLimb(progressAt("orbit", (k / 100) * 0.2));
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    for (let k = 0; k <= 200; k++) {
      const v = orbitLimb(progressAt("orbit", Math.min(0.999, k / 200)));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("treats NaN progress as the voyage start", () => {
    expect(orbitLimb(NaN)).toBe(0);
  });
});

describe("EnergyOrb — chapter 04 limb", () => {
  it("starts at 0 and follows orbitLimb(progress) frame by frame", () => {
    const orb = new EnergyOrb();
    orb.build(new THREE.Scene(), "mid");
    expect(orb.material.uniforms.uLimb.value).toBe(0);
    voyageStore.setScroll(progressAt("orbit", 0.5), 0);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uLimb.value).toBeCloseTo(1, 9);
    voyageStore.setScroll(progressAt("orbit", 0.1), 0);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uLimb.value).toBeCloseTo(orbitLimb(voyageStore.getState().progress), 9);
    voyageStore.setScroll(progressAt("worlds", 0.5), 0);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uLimb.value).toBe(0);
  });

  it("leaves the Jump flare and the Pilot glare alone", () => {
    const orb = new EnergyOrb();
    orb.build(new THREE.Scene(), "mid");
    // Inside Orbit the limb is fully on, and setGlare still reaches the shader untouched.
    voyageStore.setScroll(progressAt("orbit", 0.5), 0);
    orb.setGlare(0.25);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeCloseTo(0.25, 6);
    // Inside the Jump the flare is at peak and the limb is off.
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    orb.setGlare(0);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeGreaterThan(0.99);
    expect(orb.material.uniforms.uLimb.value).toBe(0);
  });
});

describe("EnergyOrb — chapter 03 flare", () => {
```

In `src/scene/chapters/Starfield.test.ts`, replace:
```ts
import { Starfield, approachSoften } from "./Starfield";
```
with:
```ts
import { Starfield, approachSoften, orbitSoften, chapterSoften, ORBIT_SOFTEN_PEAK } from "./Starfield";
import { ORBIT_WINDOW, ORBIT_PRESENCE_END } from "./orbitSchedule";
```

In `src/scene/chapters/Starfield.test.ts`, replace:
```ts
describe("Starfield — chapter 02 focus pull", () => {
```
with:
```ts
// Slice 4: the focus pull generalises from Approach to Approach + Orbit.
describe("orbitSoften", () => {
  it("is the schedule's presence scaled to ORBIT_SOFTEN_PEAK, so it matches ORBIT_WINDOW", () => {
    expect(orbitSoften(0)).toBe(0);
    expect(orbitSoften(ORBIT_WINDOW[0])).toBeCloseTo(ORBIT_SOFTEN_PEAK, 12);
    expect(orbitSoften((ORBIT_WINDOW[0] + ORBIT_WINDOW[1]) / 2)).toBeCloseTo(ORBIT_SOFTEN_PEAK, 12);
    expect(orbitSoften(ORBIT_WINDOW[1])).toBeCloseTo(ORBIT_SOFTEN_PEAK, 12);
    expect(orbitSoften(ORBIT_PRESENCE_END)).toBe(0);
    expect(orbitSoften(1)).toBe(0);
    expect(ORBIT_SOFTEN_PEAK).toBeGreaterThan(0);
    expect(ORBIT_SOFTEN_PEAK).toBeLessThanOrEqual(1);
  });

  it("ramps in and out inside the margins of the hold", () => {
    expect(orbitSoften(ORBIT_WINDOW[0] / 2)).toBeGreaterThan(0);
    expect(orbitSoften(ORBIT_WINDOW[0] / 2)).toBeLessThan(ORBIT_SOFTEN_PEAK);
    expect(orbitSoften((ORBIT_WINDOW[1] + ORBIT_PRESENCE_END) / 2)).toBeGreaterThan(0);
    expect(orbitSoften((ORBIT_WINDOW[1] + ORBIT_PRESENCE_END) / 2)).toBeLessThan(ORBIT_SOFTEN_PEAK);
  });
});

describe("chapterSoften", () => {
  it("is exactly approachSoften inside Approach — that behaviour is unchanged", () => {
    for (let k = 0; k <= 100; k++) {
      expect(chapterSoften("approach", k / 100)).toBe(approachSoften("approach", k / 100));
    }
  });

  // The comparison above is approachSoften against itself, so it cannot catch an edit to
  // approachSoften's own constants — these golden values are the "byte-identical" proof (E8).
  it("pins approachSoften to golden values — the byte-identical proof", () => {
    const f = (t: number) => approachSoften("approach", t);
    expect(f(0.02)).toBe(0);
    expect(f(0.12)).toBeCloseTo(0.5, 12);   // midpoint of the 0.02 → 0.22 ramp
    expect(f(0.22)).toBe(1);
    expect(f(0.45)).toBe(1);
    expect(f(0.55)).toBeCloseTo(0.5, 12);   // midpoint of the 0.45 → 0.65 ramp
    expect(f(0.65)).toBe(0);
    expect(approachSoften("orbit", 0.3)).toBe(0);
  });

  it("is orbitSoften inside Orbit and zero everywhere else", () => {
    for (let k = 0; k <= 100; k++) {
      expect(chapterSoften("orbit", k / 100)).toBe(orbitSoften(k / 100));
    }
    for (const id of ["launch", "jump", "worlds", "belt", "passage", "constellation", "pilot", "landing", "surface"] as const) {
      expect(chapterSoften(id, 0.5)).toBe(0);
    }
  });
});

describe("Starfield — chapter 04 focus pull", () => {
  it("eases the field out of focus inside Orbit's window, and back in Worlds", () => {
    const field = new Starfield();
    field.build(new THREE.Scene(), "mid");
    field.applyControls(1);
    const baseSize = field.material.size;
    const baseOpacity = field.material.opacity;

    voyageStore.setScroll(progressAt("orbit", 0.3), 0);
    expect(voyageStore.getState().chapter.id).toBe("orbit");
    for (let i = 0; i < 120; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize * (1 + ORBIT_SOFTEN_PEAK * 0.6), 3);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    voyageStore.setScroll(progressAt("worlds", 0.5), 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
  });
});

describe("Starfield — chapter 02 focus pull", () => {
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/scene/chapters/EnergyOrb.test.ts src/scene/chapters/Starfield.test.ts`
Expected: FAIL — **11** of the 12 new tests fail, 6 in `EnergyOrb.test.ts` (`TypeError: orbitLimb is not a function` ×4; `TypeError: Cannot read properties of undefined (reading 'value')` ×2, because `uniforms.uLimb` does not exist yet) and 5 in `Starfield.test.ts` (`TypeError: orbitSoften is not a function` ×2, `TypeError: chapterSoften is not a function` ×2, and `AssertionError: expected 0.14 to be close to NaN` — `ORBIT_SOFTEN_PEAK` imports as `undefined`). Neither file fails at collection. The twelfth new test (`pins approachSoften to golden values`) passes already, by design: it pins pre-existing behaviour so a *later* edit to `approachSoften` fails it. Summary: `Tests  11 failed | 24 passed (35)`.

- [ ] **Step 3: Implement the limb darkening in `EnergyOrb`**

In `src/scene/chapters/EnergyOrb.ts`, replace:
```ts
import { STAR_POSITION, starScale } from "@/scene/camera/flightPath";
```
with:
```ts
import { STAR_POSITION, starScale, chapterAt } from "@/scene/camera/flightPath";
```

In `src/scene/chapters/EnergyOrb.ts`, replace:
```ts
/** AMBER as sRGB
```
with:
```ts
/** Orbit's limb-darkening envelope over the chapter's progress: ramps in over the first fifth,
 *  holds, ramps out over the last fifth, so Worlds starts with a plain star again. */
const LIMB_IN_END = 0.2;
const LIMB_OUT_START = 0.8;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Limb darkening: the body brightness goes as `ndotv ^ LIMB_POWER` toward the edge (higher =
 *  darker limb; 1.0 is Lambert-like, 0.6 is mild), and the bright fresnel rim is cut to LIMB_RIM of itself, so the disc reads as
 *  a lit sphere instead of a flat bright coin. Browser-review tunables (shader, no unit test). */
export const LIMB_POWER = 0.6;
export const LIMB_RIM = 0.3;

/**
 * 0..1 limb-darkening amount for the whole voyage's progress: 0 in every chapter but Orbit
 * (so the Jump flare, the Pilot glare and every other chapter's star are untouched). At orbit
 * distance the star is only 13–56 px across, and the flat fresnel-rimmed shader reads as a dot.
 */
export function orbitLimb(progress: number): number {
  const { chapter, chapterProgress: t } = chapterAt(progress);
  if (chapter.id !== "orbit") return 0;
  if (t < LIMB_IN_END) return smooth(t / LIMB_IN_END);
  if (t > LIMB_OUT_START) return smooth((1 - t) / (1 - LIMB_OUT_START));
  return 1;
}

/** AMBER as sRGB
```

In `src/scene/chapters/EnergyOrb.ts`, replace:
```ts
  uniform float uGlare;
  varying vec3 vNormal;
```
with:
```ts
  uniform float uGlare;
  uniform float uLimb;
  varying vec3 vNormal;
```

In `src/scene/chapters/EnergyOrb.ts`, replace:
```ts
    float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
    vec3 body = mix(uColor * 0.5, uColor * 1.1, n);
```
with:
```ts
    float ndv = max(dot(vNormal, vView), 0.0);
    // uLimb = 0 leaves both factors at exactly 1.0, so every chapter but Orbit renders as before.
    float limb = mix(1.0, pow(ndv, ${LIMB_POWER.toFixed(3)}), uLimb);
    float fresnel = pow(1.0 - ndv, 2.2) * mix(1.0, ${LIMB_RIM.toFixed(3)}, uLimb);
    vec3 body = mix(uColor * 0.5, uColor * 1.1, n) * limb;
```

In `src/scene/chapters/EnergyOrb.ts`, replace:
```ts
      uGlare: { value: 0 },
    },
```
with:
```ts
      uGlare: { value: 0 },
      uLimb: { value: 0 },
    },
```

In `src/scene/chapters/EnergyOrb.ts`, replace:
```ts
    this.material.uniforms.uTime.value = ctx.t;
```
with:
```ts
    this.material.uniforms.uTime.value = ctx.t;
    // Chapter 04's limb darkening: a separate uniform, so glare logic below is untouched.
    this.material.uniforms.uLimb.value = orbitLimb(ctx.voyage.progress);
```

- [ ] **Step 4: Implement the Orbit focus pull in `Starfield`**

In `src/scene/chapters/Starfield.ts`, replace:
```ts
import { type ChapterId } from "@/scene/camera/flightPath";
```
with:
```ts
import { type ChapterId } from "@/scene/camera/flightPath";
import { orbitPresence } from "./orbitSchedule";
```

In `src/scene/chapters/Starfield.ts`, replace:
```ts
/**
 * A soft round sprite
```
with:
```ts
/** How far the field is pulled out of focus behind Orbit's pinned panels, at the peak of
 *  ORBIT_WINDOW (Approach goes to 1.0). The ring and the star are the subject here, so the
 *  pull is lighter. Browser-review tunable. */
export const ORBIT_SOFTEN_PEAK = 0.75;

/** 0..1 focus pull inside Orbit. Its window IS ORBIT_WINDOW (plus the schedule's edge fades),
 *  so the stars soften while the step panels are in their window and sharpen back as the
 *  pin releases. */
export function orbitSoften(chapterProgress: number): number {
  return ORBIT_SOFTEN_PEAK * orbitPresence(chapterProgress);
}

/** The focus pull for whichever chapter is current: Approach and Orbit pull, the rest don't.
 *  (Distinct from the `chapterSoften` instance field on `Starfield`, which is the eased value.) */
export function chapterSoften(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId === "approach") return approachSoften(chapterId, chapterProgress);
  if (chapterId === "orbit") return orbitSoften(chapterProgress);
  return 0;
}

/**
 * A soft round sprite
```

In `src/scene/chapters/Starfield.ts`, replace:
```ts
    // Chapter 02 owns the focus pull. Eased (tau ~0.33s) so a flick through Approach
    // blurs and recovers rather than strobing.
    const target = approachSoften(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
```
with:
```ts
    // Chapters 02 and 04 own the focus pull. Eased (tau ~0.33s) so a flick through either
    // blurs and recovers rather than strobing.
    const target = chapterSoften(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/scene/chapters/EnergyOrb.test.ts src/scene/chapters/Starfield.test.ts`
Expected: PASS — `Tests  35 passed (35)`: `EnergyOrb.test.ts` 16 (10 + 6 new), `Starfield.test.ts` 19 (13 + 6 new). Every pre-existing test in both files passes **unmodified** (apart from Task 1's literal conversions); together with the new golden-value test, which pins `approachSoften`'s constants directly, that is the "approach behaviour byte-identical" proof.

- [ ] **Step 6: Verify the whole suite, types and lint**

Run:
```bash
cd /Users/admin/Codes-2/portfolio
npx vitest run
npx tsc --noEmit
npx eslint src/scene/chapters/EnergyOrb.ts src/scene/chapters/Starfield.ts
```
Expected: no failures (the suite gains exactly 12 tests); `tsc` and `eslint` print nothing. The GLSL is built by template literal, so a typo in it fails only at GPU compile time, not here: confirm by loading `/voyage` in `npm run dev` once and checking the console for a `THREE.WebGLProgram` error (none expected; Task 9 does the visual review).

- [ ] **Step 7: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/chapters/EnergyOrb.ts src/scene/chapters/EnergyOrb.test.ts src/scene/chapters/Starfield.ts src/scene/chapters/Starfield.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): star limb darkening in Orbit and the Orbit focus pull

orbitLimb(progress) (0 outside Orbit, ramps over cp 0-0.2 / 0.8-1) feeds a
new uLimb uniform: body *= mix(1, ndotv^0.6, uLimb) and the fresnel rim is cut
to 0.3 of itself, so the 13-56px star reads as a sphere. Jump glare and the
Pilot glare are untouched (uLimb = 0 leaves both factors at exactly 1).
Starfield's soften generalises: orbitSoften (window = ORBIT_WINDOW) and
chapterSoften; approachSoften and its tests are unchanged.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Data wiring — `process` into the page and `VoyageRoot`

**Wave 1 (parallel with Tasks 2 and 3). Needs Task 1 only for a green baseline.**

**Files:**
- Modify: `src/app/voyage/page.tsx`
- Modify: `src/components/voyage/VoyageRoot.tsx`

**Interfaces:**
- Consumes: `getVoyageContent()` from `@/lib/data`, which **already returns** `process: Item[]` (sub-project 2; `src/lib/data.voyage.test.ts` already pins it).
- Produces:
  ```ts
  interface VoyageRootProps { settings: Settings; services: Item[]; process: Item[] }
  // Inside VoyageRoot the prop is destructured as `steps` (never shadow Node's `process`):
  //   export default function VoyageRoot({ settings, services, process: steps }: VoyageRootProps)
  ```
  Task 8 reads `steps` (to mount `<Process steps={steps}>` and pass `stepCount={steps.length}`) and deletes the temporary `void steps;` this task adds.

**Why no new unit test:** `VoyageRoot` has no tests (it owns the boot gate, dynamic `SceneRoot`, audio and the FPS probe) and `page.tsx` is a server component. The data path is already pinned by `data.voyage.test.ts` (`returns all five payloads in one call` asserts `content.process`). The red/green here is the typechecker: change the call site first and `tsc` must fail, then change the component and it must pass.

- [ ] **Step 1: Pass `process` from the page**

In `src/app/voyage/page.tsx`, replace:
```tsx
  // One Promise.all for everything /voyage renders; servicesDef.revalidate already targets
  // this route on a CMS write. Only `services` is threaded through — later slices add
  // their own prop rather than carrying four unused ones.
  const { services, settings } = await getVoyageContent();
  return <VoyageRoot settings={settings} services={services} />;
```
with:
```tsx
  // One Promise.all for everything /voyage renders; servicesDef.revalidate and
  // processStepsDef.revalidate already target this route on a CMS write. `services` (ch. 02)
  // and `process` (ch. 04) are threaded through — later slices add their own prop rather than
  // carrying unused ones. Destructured as `steps` so it never shadows Node's `process` global.
  const { services, process: steps, settings } = await getVoyageContent();
  return <VoyageRoot settings={settings} services={services} process={steps} />;
```

- [ ] **Step 2: Run the typecheck to verify it fails**

Run: `npx tsc --noEmit`
Expected: FAIL — exactly one error, in `src/app/voyage/page.tsx`: `error TS2322: Type '{ settings: Settings; services: Item[]; process: Item[]; }' is not assignable to type 'IntrinsicAttributes & VoyageRootProps'. Property 'process' does not exist on type 'IntrinsicAttributes & VoyageRootProps'.`

- [ ] **Step 3: Accept the prop in `VoyageRoot`**

In `src/components/voyage/VoyageRoot.tsx`, replace:
```tsx
  services: Item[];
}

export default function VoyageRoot({ settings, services }: VoyageRootProps) {
```
with:
```tsx
  services: Item[];
  /** Chapter 04's steps. Untyped past Item's three base fields — narrowed in Process. */
  process: Item[];
}

// The prop is named `process` (the content key); it is destructured as `steps` so it never
// shadows Node's `process` global inside this module.
export default function VoyageRoot({ settings, services, process: steps }: VoyageRootProps) {
  // TEMPORARY (Task 5): nothing reads `steps` until Task 8 mounts <Process>. Task 8 deletes this line.
  void steps;
```

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/admin/Codes-2/portfolio
npx tsc --noEmit
npx eslint src/app/voyage src/components/voyage/VoyageRoot.tsx
npx vitest run src/lib/data.voyage.test.ts
```
Expected: `tsc` prints nothing; `eslint` prints nothing (the `void steps;` is what keeps `@typescript-eslint/no-unused-vars` quiet); `data.voyage.test.ts` passes (`Tests  2 passed (2)`). The full suite is unchanged by this task.

- [ ] **Step 5: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/app/voyage/page.tsx src/components/voyage/VoyageRoot.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): thread the process steps into VoyageRoot

page.tsx passes getVoyageContent().process (already returned, untested
consumer-side until now); VoyageRoot accepts it as `process` and holds it as
`steps`, with a temporary void guard that Task 8 removes when <Process> and
SceneRoot's stepCount consume it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `OrbitRing` set piece + `TierSettings.ringSegments` + `SceneRoot` registration

**Wave 2 (parallel with Tasks 4 and 7, after Wave 1 is merged). Needs Tasks 1, 2 (same `SceneRoot.tsx`) and 3.**

**Files:**
- Create: `src/scene/chapters/OrbitRing.ts`
- Modify: `src/scene/quality.ts` (`TierSettings.ringSegments`)
- Modify: `src/scene/SceneRoot.tsx` (`stepCount` prop, registration, effect deps)
- Test: `src/scene/chapters/OrbitRing.test.ts` (new), `src/scene/quality.test.ts`

**Interfaces:**
- Consumes: `STAR_POSITION`, `getCameraPose`, `progressAt`, `ChapterId` (Task 1/flightPath); `orbitCursor`, `ORBIT_WINDOW`, `ORBIT_PRESENCE_END` (Task 3); `TIER_SETTINGS`; `SetPiece` / `FrameContext` from `./types`; `makeFrame` from `./testUtils`.
- Produces:
  ```ts
  // quality.ts
  interface TierSettings { /* …existing… */ ringSegments: number }   // high 128 · mid 64 · still 0
  // OrbitRing.ts — all exported tunables are for the Task 9 browser review
  export const RING_RADIUS = 20;  export const RING_TILT = (72 * Math.PI) / 180;  export const RING_TUBE = 0.1;
  export const NODE_RADIUS = 0.55;  export const NODE_ACTIVE_BOOST = 0.9;
  export const RING_OPACITY = 0.5;  export const NODE_OPACITY = 0.95;  export const RING_FADE_OUT_END = 0.9;
  export function ringFade(chapterId: ChapterId, chapterProgress: number): number;  // 0 outside Orbit, 0 by cp 0.9
  export function ringSpin(cursor: number, n: number): number;                      // node `cursor` → −90° (front-centre)
  export class OrbitRing implements SetPiece {
    constructor(stepCount: number);          // non-finite / negative → 0; fractions floor
    readonly count: number;
    readonly ringMaterial: THREE.MeshBasicMaterial;  readonly nodeMaterial: THREE.MeshBasicMaterial;
    get object(): THREE.Group | null;        // root, at STAR_POSITION
    get tilt(): THREE.Group | null;          // rotation.x = −RING_TILT
    get nodes(): THREE.Group | null;         // rotation.z = ringSpin(cursor); children = the N node meshes
    get torus(): THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> | null;
    build(scene: THREE.Scene, tier: Tier): void;  update(ctx: FrameContext): void;  dispose(): void;
  }
  // SceneRoot.tsx
  interface SceneRootProps { /* …existing… */ stepCount?: number }   // optional (default 0) until Task 8 makes it required
  ```

**Geometry (read this before reviewing the test numbers):** world space, centred on `STAR_POSITION (6, −3, −140)`. The torus lies in its local XY plane; `tilt.rotation.x = −RING_TILT` (72° between the ring's normal and the view axis: a shallow ellipse, minor/major = cos 72° = 0.31) carries its **near (+z) arc to the bottom**. A node at in-plane angle −90° is the lowest point of the near arc: `star + (0, −R·cos72°, +R·sin72°)` = 6.2 units below the star, 19 units toward the camera — clear of the star's disc (≤ 2.4 radii) and the nearest ring point to the camera stays ≥ 24 units over the whole visible range (measured; the test pins ≥ 15). Nodes enter along the near arc from the right and leave to the left. `depthTest` stays on as a guard — so a future tilt that reaches the disc would still be occluded (not reachable at the default: the back arc clears the disc by ~60 px at 72°); `depthWrite` is off and blending additive like every other transparent piece. The torus is a *tube* (6 radial segments), not a `LineLoop`: a WebGL line is 1 px wide regardless of `linewidth`.

- [ ] **Step 1: Write the failing `ringSegments` assertions**

In `src/scene/quality.test.ts`, replace:
```ts
    expect(TIER_SETTINGS.still.topologyNodes).toBe(0);
  });
```
with:
```ts
    expect(TIER_SETTINGS.still.topologyNodes).toBe(0);
    // Chapter 04's ring tessellation scales the same way; `still` never builds one.
    expect(TIER_SETTINGS.high.ringSegments).toBe(128);
    expect(TIER_SETTINGS.mid.ringSegments).toBe(64);
    expect(TIER_SETTINGS.mid.ringSegments).toBeLessThan(TIER_SETTINGS.high.ringSegments);
    expect(TIER_SETTINGS.still.ringSegments).toBe(0);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scene/quality.test.ts`
Expected: FAIL — 1 test (`respects the DPR caps and scales the counts down by tier`) fails with `AssertionError: expected undefined to be 128`; the other 11 pass. Summary: `Tests  1 failed | 11 passed (12)`.

- [ ] **Step 3: Add the tier field**

In `src/scene/quality.ts`, replace:
```ts
  topologyNodes: number;
}
```
with:
```ts
  topologyNodes: number;
  /** Chapter 04's orbital ring: tubular segments of the torus (smoothness of the ellipse). */
  ringSegments: number;
}
```

In `src/scene/quality.ts`, replace:
```ts
  high:  { dpr: 1.5, starCount: 2400, streakCount: 260, topologyNodes: 42 },
  mid:   { dpr: 1,   starCount: 1200, streakCount: 120, topologyNodes: 22 },
  still: { dpr: 1,   starCount: 0,    streakCount: 0,   topologyNodes: 0  },
```
with:
```ts
  high:  { dpr: 1.5, starCount: 2400, streakCount: 260, topologyNodes: 42, ringSegments: 128 },
  mid:   { dpr: 1,   starCount: 1200, streakCount: 120, topologyNodes: 22, ringSegments: 64  },
  still: { dpr: 1,   starCount: 0,    streakCount: 0,   topologyNodes: 0,  ringSegments: 0   },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scene/quality.test.ts`
Expected: PASS — `Tests  12 passed (12)`.

- [ ] **Step 5: Write the failing `OrbitRing` tests**

Create `src/scene/chapters/OrbitRing.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import {
  OrbitRing, ringFade, ringSpin,
  RING_RADIUS, RING_TILT, RING_OPACITY, NODE_RADIUS, NODE_ACTIVE_BOOST,
} from "./OrbitRing";
import { ORBIT_WINDOW, ORBIT_PRESENCE_END } from "./orbitSchedule";
import { TIER_SETTINGS } from "@/scene/quality";
import { STAR_POSITION, getCameraPose, progressAt } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

const [W0, W1] = ORBIT_WINDOW;
/** Orbit chapterProgress at the middle of step `i`'s slot, i.e. where the cursor equals `i`. */
const centre = (i: number, n: number) => W0 + ((i + 0.5) / n) * (W1 - W0);
const scrollToOrbit = (cp: number) => voyageStore.setScroll(progressAt("orbit", cp), 0);

/** Build a ring in a fresh scene and return both. */
function built(stepCount: number, tier: "high" | "mid" | "still" = "high") {
  const scene = new THREE.Scene();
  const ring = new OrbitRing(stepCount);
  ring.build(scene, tier);
  return { scene, ring };
}
const worldPos = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());

describe("ringFade", () => {
  it("is 0 outside Orbit and at its first frame", () => {
    for (const id of ["launch", "approach", "jump", "worlds", "belt", "pilot", "surface"] as const) {
      expect(ringFade(id, 0.5)).toBe(0);
    }
    expect(ringFade("orbit", 0)).toBe(0);
  });

  it("fades in over the first 10% and holds through the schedule window and its edge margin", () => {
    expect(ringFade("orbit", 0.05)).toBeGreaterThan(0);
    expect(ringFade("orbit", 0.05)).toBeLessThan(1);
    for (const cp of [0.1, 0.3, 0.5, ORBIT_PRESENCE_END]) expect(ringFade("orbit", cp)).toBe(1);
  });

  it("is completely faded out by chapterProgress 0.9 and stays out (the camera flies through later)", () => {
    expect(ringFade("orbit", 0.8)).toBeGreaterThan(0);
    expect(ringFade("orbit", 0.8)).toBeLessThan(1);
    for (const cp of [0.9, 0.95, 1]) expect(ringFade("orbit", cp)).toBe(0);
  });

  it("never rises while fading out, and clamps NaN to the chapter start", () => {
    let prev = 2;
    for (let k = 0; k <= 100; k++) {
      const v = ringFade("orbit", ORBIT_PRESENCE_END + (k / 100) * (0.9 - ORBIT_PRESENCE_END));
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
    expect(ringFade("orbit", NaN)).toBe(0);
  });
});

describe("ringSpin", () => {
  it("puts node k at the front-centre (−90° in the ring plane) when the cursor is k", () => {
    for (const n of [1, 2, 4, 6]) {
      for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k) / n + ringSpin(k, n);
        expect(Math.cos(angle)).toBeCloseTo(0, 9);
        expect(Math.sin(angle)).toBeCloseTo(-1, 9);
      }
    }
  });

  it("turns the ring one node-spacing per step and is 0 for an empty ring", () => {
    expect(ringSpin(0, 4) - ringSpin(1, 4)).toBeCloseTo(Math.PI / 2, 12);
    expect(ringSpin(0, 0)).toBe(0);
    expect(ringSpin(3, -2)).toBe(0);
  });
});

describe("OrbitRing build", () => {
  it("builds a torus with the tier's segment count and one node per step", () => {
    for (const tier of ["high", "mid"] as const) {
      const { scene, ring } = built(4, tier);
      expect(scene.children).toHaveLength(1);
      expect(ring.torus!.geometry.parameters.tubularSegments).toBe(TIER_SETTINGS[tier].ringSegments);
      expect(ring.torus!.geometry.parameters.radius).toBe(RING_RADIUS);
      expect(ring.nodes!.children).toHaveLength(4);
      expect(ring.count).toBe(4);
    }
  });

  it("sits on the star, in world space, tilted so the ring is a shallow ellipse", () => {
    const { ring } = built(4);
    expect(ring.object!.position.equals(STAR_POSITION)).toBe(true);
    expect(ring.tilt!.rotation.x).toBeCloseTo(-RING_TILT, 12);
    expect(RING_TILT).toBeGreaterThan(Math.PI / 3);      // well past 60°: shallow, not a face-on circle
    expect(RING_TILT).toBeLessThan(Math.PI / 2);         // …but not edge-on
  });

  it("uses additive, depth-tested materials (a guard: at the default tilt the back arc never reaches the disc)", () => {
    const { ring } = built(4);
    for (const m of [ring.ringMaterial, ring.nodeMaterial]) {
      expect(m).toBeInstanceOf(THREE.MeshBasicMaterial);
      expect(m.depthTest).toBe(true);
      expect(m.depthWrite).toBe(false);
      expect(m.transparent).toBe(true);
      expect(m.blending).toBe(THREE.AdditiveBlending);
      expect(m.color.getHex()).toBe(0xffffff);           // monochrome: amber is the star's alone
    }
  });

  it("sanitises the step count: negatives, NaN and Infinity are empty, fractions floor", () => {
    expect(new OrbitRing(-3).count).toBe(0);
    expect(new OrbitRing(NaN).count).toBe(0);
    expect(new OrbitRing(Infinity).count).toBe(0);
    expect(new OrbitRing(2.9).count).toBe(2);
  });

  it("builds nothing visible for zero steps or the still tier (no GPU resources for nothing)", () => {
    for (const { ring } of [built(0), built(4, "still")]) {
      expect(ring.object!.children).toHaveLength(0);
      expect(ring.torus).toBeNull();
      scrollToOrbit(0.3);
      expect(() => ring.update(makeFrame())).not.toThrow();
      expect(ring.object!.visible).toBe(false);
    }
  });
});

describe("OrbitRing update", () => {
  it("is a no-op before build() and after dispose()", () => {
    const ring = new OrbitRing(4);
    expect(() => ring.update(makeFrame())).not.toThrow();
    const { ring: b } = built(4);
    b.dispose();
    expect(() => b.update(makeFrame())).not.toThrow();
  });

  it("is hidden outside Orbit and once its fade has finished, visible between", () => {
    const { ring } = built(4);
    ring.update(makeFrame());                                         // launch
    expect(ring.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("approach", 0.9), 0);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(false);
    scrollToOrbit(0.3);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(true);
    scrollToOrbit(0.9);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("worlds", 0.1), 0);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(false);
  });

  it("brings node round(cursor) to the lowest point of the near arc, below the star disc", () => {
    const n = 4;
    const { ring } = built(n);
    for (let i = 0; i < n; i++) {
      scrollToOrbit(centre(i, n));
      ring.update(makeFrame());
      ring.object!.updateMatrixWorld(true);
      const p = ring.nodes!.children.map(worldPos);
      // Front-centre: where the ring's lowest near-arc point is — below the star by R·cos(tilt)
      // and R·sin(tilt) nearer the camera (+z).
      expect(p[i].x).toBeCloseTo(STAR_POSITION.x, 6);
      expect(p[i].y).toBeCloseTo(STAR_POSITION.y - RING_RADIUS * Math.cos(RING_TILT), 6);
      expect(p[i].z).toBeCloseTo(STAR_POSITION.z + RING_RADIUS * Math.sin(RING_TILT), 6);
      // …and it is the nearest node to the camera and the lowest node on the ring.
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        expect(p[i].z).toBeGreaterThan(p[j].z);
        expect(p[i].y).toBeLessThan(p[j].y);
      }
      // Below the star disc: even the biggest star (2.4 radii) leaves the node clear.
      expect(STAR_POSITION.y - p[i].y).toBeGreaterThan(2.4);
    }
  });

  it("keeps every node on the ring while it turns", () => {
    const { ring } = built(6);
    scrollToOrbit(0.3);
    ring.update(makeFrame());
    ring.object!.updateMatrixWorld(true);
    for (const node of ring.nodes!.children) {
      const local = ring.tilt!.worldToLocal(worldPos(node));
      expect(Math.hypot(local.x, local.y)).toBeCloseTo(RING_RADIUS, 6);
      expect(local.z).toBeCloseTo(0, 6);
    }
  });

  it("swells the active node and shrinks the rest", () => {
    const n = 4;
    const { ring } = built(n);
    scrollToOrbit(centre(1, n));
    ring.update(makeFrame());
    const scale = (k: number) => ring.nodes!.children[k].scale.x;
    expect(scale(1)).toBeCloseTo(NODE_RADIUS * (1 + NODE_ACTIVE_BOOST), 9);
    for (const k of [0, 2, 3]) expect(scale(k)).toBeCloseTo(NODE_RADIUS, 9);
  });

  it("rotates the nodes by ringSpin(cursor) and keeps a lone node static", () => {
    const { ring } = built(1);
    for (const cp of [0.1, 0.3, 0.55]) {
      scrollToOrbit(cp);
      ring.update(makeFrame());
      expect(ring.nodes!.rotation.z).toBe(ringSpin(0, 1));
    }
  });

  it("scales both materials by the fade and by the ignition curtain", () => {
    const { ring } = built(4);
    scrollToOrbit(0.3);                                               // ringFade === 1
    ring.update(makeFrame({ ignite: 0.5 }));
    expect(ring.ringMaterial.opacity).toBeCloseTo(RING_OPACITY * 0.5, 6);
    expect(ring.nodeMaterial.opacity).toBeGreaterThan(ring.ringMaterial.opacity);
    scrollToOrbit(0.05);                                              // mid fade-in
    ring.update(makeFrame());
    expect(ring.ringMaterial.opacity).toBeGreaterThan(0);
    expect(ring.ringMaterial.opacity).toBeLessThan(RING_OPACITY);
  });

  // Spec/decision: nearest ring point ≥ ~15 units from the camera at orbit exit. The ring is
  // checked against the real camera path at every point it can be visible (cp ≤ 0.9).
  it("never comes within 15 world units of the camera while it is visible", () => {
    const { ring } = built(4, "high");
    ring.object!.updateMatrixWorld(true);
    const torusMatrix = ring.torus!.matrixWorld;
    let nearest = Infinity;
    for (const cp of [0, 0.25, 0.5, 0.75, 0.9]) {
      const cam = getCameraPose(progressAt("orbit", cp)).position;
      for (let k = 0; k < 720; k++) {
        const a = (k / 720) * Math.PI * 2;
        const pt = new THREE.Vector3(Math.cos(a) * RING_RADIUS, Math.sin(a) * RING_RADIUS, 0).applyMatrix4(torusMatrix);
        nearest = Math.min(nearest, pt.distanceTo(cam));
      }
    }
    expect(nearest).toBeGreaterThanOrEqual(15);
  });
});

describe("OrbitRing lifecycle", () => {
  it("replaces the previous ring when build() is called twice", () => {
    const scene = new THREE.Scene();
    const ring = new OrbitRing(4);
    ring.build(scene, "high");
    const first = ring.torus!.geometry;
    ring.build(scene, "high");
    expect(scene.children).toHaveLength(1);
    expect(ring.torus!.geometry).not.toBe(first);
    expect(ring.nodes!.children).toHaveLength(4);
  });

  it("disposes idempotently and rebuilds after a dispose", () => {
    const scene = new THREE.Scene();
    const ring = new OrbitRing(4);
    ring.build(scene, "mid");
    const first = ring.torus!.geometry;
    const onDispose = vi.fn();
    first.addEventListener("dispose", onDispose);        // the torus' GPU buffers are freed, exactly once
    ring.dispose();
    expect(onDispose).toHaveBeenCalledTimes(1);
    expect(scene.children).toHaveLength(0);
    expect(ring.object).toBeNull();
    expect(() => ring.dispose()).not.toThrow();
    expect(onDispose).toHaveBeenCalledTimes(1);          // a second dispose frees nothing twice
    ring.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(ring.torus!.geometry).not.toBe(first);
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/scene/chapters/OrbitRing.test.ts`
Expected: FAIL at collection — `Error: Cannot find module './OrbitRing' imported from …/OrbitRing.test.ts`, `(0 test)`, `Test Files  1 failed (1)`.

- [ ] **Step 7: Implement `OrbitRing`**

Create `src/scene/chapters/OrbitRing.ts`:
```ts
import * as THREE from "three";
import { STAR_POSITION, type ChapterId } from "@/scene/camera/flightPath";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import { ORBIT_PRESENCE_END, orbitCursor } from "./orbitSchedule";
import type { FrameContext, SetPiece } from "./types";

const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));
const smooth = (t: number) => t * t * (3 - 2 * t);

/* ---- Browser-review tunables (spec §3 row 04). Exported so the review can retune a value
 * without touching any logic below. ---- */

/** World-space radius of the ring around the star. Keep the nearest point >= ~15 units from
 *  the camera at orbit exit (z -100; tested), so R <~ 22. */
export const RING_RADIUS = 20;

/** Angle between the ring plane's normal and the view axis (-z). 0 = a face-on circle, 90° =
 *  edge-on. At 72° the ring is a shallow ellipse (minor/major = cos 72° = 0.31) whose near arc
 *  passes BELOW the star disc. */
export const RING_TILT = (72 * Math.PI) / 180;

/** Torus tube radius in world units (~3 px at mid-orbit). A tube, not a line: WebGL lines are 1 px. */
export const RING_TUBE = 0.1;
const RING_RADIAL_SEGMENTS = 6;

/** Node radius at rest, and how much the active node swells (scale 1 + boost). */
export const NODE_RADIUS = 0.55;
export const NODE_ACTIVE_BOOST = 0.9;

export const RING_OPACITY = 0.5;
export const NODE_OPACITY = 0.95;

/** Fade-in over Orbit's first tenth. The fade-out runs from ORBIT_PRESENCE_END (the end of the
 *  schedule's edge margin) to RING_FADE_OUT_END, after which the ring is hidden: the camera flies through this region
 *  in the chapters that follow. */
const RING_FADE_IN_END = 0.1;
export const RING_FADE_OUT_END = 0.9;

/** 0..1 overall presence of the ring. Zero everywhere but Orbit; fully out by cp 0.9. */
export function ringFade(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "orbit") return 0;
  const t = clamp01(chapterProgress);
  if (t <= 0 || t >= RING_FADE_OUT_END) return 0;
  if (t < RING_FADE_IN_END) return smooth(t / RING_FADE_IN_END);
  if (t <= ORBIT_PRESENCE_END) return 1;
  return smooth(1 - (t - ORBIT_PRESENCE_END) / (RING_FADE_OUT_END - ORBIT_PRESENCE_END));
}

/**
 * Rotation (radians, about the ring plane's normal) of the node group for a cursor value.
 * Node k sits at angle 2πk/n in the ring's own plane; this spin carries node `cursor` to
 * -90° — the lowest point of the near arc, "front-centre" — and turns the ring one
 * node-spacing per step. 0 for an empty ring.
 */
export function ringSpin(cursor: number, n: number): number {
  if (!(n >= 1)) return 0;
  return -Math.PI / 2 - (2 * Math.PI * cursor) / n;
}

/**
 * Chapter 04's set piece: one large monochrome ring around the star with a luminous node per
 * process step. Scroll turns it (via orbitCursor) so each node arrives front-centre as its
 * panel takes over.
 *
 * World space, not camera-relative: the ring orbits the star. Depth testing is kept as a guard
 * only: at the default tilt the ring does not overlap the disc (measured: the back arc clears it
 * by ~60 px), so the sphere read comes from the star's own shading (orbitLimb) and the ring's
 * perspective. Everything it owns is allocated in build(); update() only writes scalars, so
 * nothing is allocated per frame.
 */
export class OrbitRing implements SetPiece {
  private group: THREE.Group | null = null;
  private tiltGroup: THREE.Group | null = null;
  private nodeGroup: THREE.Group | null = null;
  private torusMesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> | null = null;
  private torusGeometry: THREE.TorusGeometry | null = null;
  private nodeGeometry: THREE.SphereGeometry | null = null;
  /** Exposed read-only for tests and debug overlays (opacity is the fade readout). */
  readonly ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  readonly nodeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private scene: THREE.Scene | null = null;
  /** Number of process steps (nodes). Fixed for the instance: SceneRoot rebuilds on change. */
  readonly count: number;

  /** `stepCount` comes from the CMS: anything non-finite or negative is an empty ring. */
  constructor(stepCount: number) {
    this.count = Number.isFinite(stepCount) ? Math.max(0, Math.floor(stepCount)) : 0;
  }

  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.Group | null {
    return this.group;
  }
  /** The ring's tilt frame (rotation.x = -RING_TILT). Null when nothing was built. */
  get tilt(): THREE.Group | null {
    return this.tiltGroup;
  }
  /** The group the nodes live in; its rotation.z is the spin. Null when nothing was built. */
  get nodes(): THREE.Group | null {
    return this.nodeGroup;
  }
  get torus(): THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> | null {
    return this.torusMesh;
  }

  build(scene: THREE.Scene, tier: Tier): void {
    // An unpaired second build() would leak the previous Group into the scene.
    if (this.group) this.dispose();
    this.group = new THREE.Group();
    this.group.position.copy(STAR_POSITION);
    this.group.visible = false;
    const segments = TIER_SETTINGS[tier].ringSegments;
    // No steps, or the `still` tier (which never reaches GL): an empty hidden group, no GPU resources.
    if (this.count > 0 && segments > 0) {
      this.torusGeometry = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, RING_RADIAL_SEGMENTS, segments);
      this.torusMesh = new THREE.Mesh(this.torusGeometry, this.ringMaterial);
      this.torusMesh.frustumCulled = false;

      this.nodeGeometry = new THREE.SphereGeometry(1, 12, 8);
      this.nodeGroup = new THREE.Group();
      for (let k = 0; k < this.count; k++) {
        const angle = (2 * Math.PI * k) / this.count;
        const node = new THREE.Mesh(this.nodeGeometry, this.nodeMaterial);
        node.position.set(Math.cos(angle) * RING_RADIUS, Math.sin(angle) * RING_RADIUS, 0);
        node.scale.setScalar(NODE_RADIUS);
        node.frustumCulled = false;
        this.nodeGroup.add(node);
      }

      this.tiltGroup = new THREE.Group();
      // The torus lies in its local XY plane; rotating about X by -tilt carries its near
      // (+z) arc to the bottom, below the star.
      this.tiltGroup.rotation.x = -RING_TILT;
      this.tiltGroup.add(this.torusMesh);
      this.tiltGroup.add(this.nodeGroup);
      this.group.add(this.tiltGroup);
    }
    this.scene = scene;
    scene.add(this.group);
  }

  update(ctx: FrameContext): void {
    // SceneRoot may tick before the build lands; an empty ring has nothing to drive.
    if (!this.group || !this.nodeGroup) return;
    const fade = ringFade(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
    this.group.visible = fade > 0.001;
    if (!this.group.visible) return;
    const cursor = orbitCursor(ctx.voyage.chapterProgress, this.count);
    this.nodeGroup.rotation.z = ringSpin(cursor, this.count);
    // The node nearest the cursor swells; the rest rest at NODE_RADIUS. Scalars only — no allocation.
    const nodes = this.nodeGroup.children;
    for (let k = 0; k < nodes.length; k++) {
      const nearness = clamp01(1 - Math.abs(cursor - k));
      nodes[k].scale.setScalar(NODE_RADIUS * (1 + NODE_ACTIVE_BOOST * smooth(nearness)));
    }
    this.ringMaterial.opacity = RING_OPACITY * fade * ctx.ignite;
    this.nodeMaterial.opacity = NODE_OPACITY * fade * ctx.ignite;
  }

  dispose(): void {
    if (this.group && this.scene) this.scene.remove(this.group);
    this.torusGeometry?.dispose();
    this.torusGeometry = null;
    this.nodeGeometry?.dispose();
    this.nodeGeometry = null;
    this.ringMaterial.dispose();
    this.nodeMaterial.dispose();
    this.torusMesh = null;
    this.nodeGroup = null;
    this.tiltGroup = null;
    this.group = null;
    this.scene = null;
  }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/scene/chapters/OrbitRing.test.ts`
Expected: PASS — `Tests  21 passed (21)` (4 `ringFade`, 2 `ringSpin`, 5 build, 8 update, 2 lifecycle).

- [ ] **Step 9: Register the ring in `SceneRoot`**

`stepCount` is optional here (default 0 builds an empty, always-hidden ring) so `tsc` stays green at `VoyageRoot`, which does not pass it until Task 8 — which then makes it required.

In `src/scene/SceneRoot.tsx`, replace:
```tsx
import { Topology } from "@/scene/chapters/Topology";
```
with:
```tsx
import { Topology } from "@/scene/chapters/Topology";
import { OrbitRing } from "@/scene/chapters/OrbitRing";
```

In `src/scene/SceneRoot.tsx`, replace:
```tsx
  onContextLost: () => void;
}
```
with:
```tsx
  onContextLost: () => void;
  /** Chapter 04's process-step count (one ring node each). Comes from the CMS: stable after
   *  load, never derived from scroll. Optional only until VoyageRoot passes it (Task 8
   *  makes it required); 0 builds an empty, always-hidden ring. */
  stepCount?: number;
}
```

In `src/scene/SceneRoot.tsx`, replace:
```tsx
export default function SceneRoot({ tier, ignite, onContextLost }: SceneRootProps) {
```
with:
```tsx
export default function SceneRoot({ tier, ignite, onContextLost, stepCount = 0 }: SceneRootProps) {
```

In `src/scene/SceneRoot.tsx`, replace:
```tsx
    const pieces: SetPiece[] = [new Starfield(), new WarpStreaks(), new Topology(), new EnergyOrb()];
```
with:
```tsx
    const pieces: SetPiece[] = [
      new Starfield(), new WarpStreaks(), new Topology(), new OrbitRing(stepCount), new EnergyOrb(),
    ];
```

In `src/scene/SceneRoot.tsx`, replace:
```tsx
  }, [tier, onContextLost]);
```
with:
```tsx
    // stepCount rebuilds the context if the CMS count ever changes under a live page (rare:
    // it is server-rendered with revalidate 300).
  }, [tier, onContextLost, stepCount]);
```

- [ ] **Step 10: Verify the whole suite, types and lint**

Run:
```bash
cd /Users/admin/Codes-2/portfolio
npx vitest run
npx tsc --noEmit
npx eslint src/scene
```
Expected: no failures (the suite gains exactly 21 tests; the `quality.test.ts` assertions extend an existing test); `tsc` and `eslint` print nothing. `SceneRoot` has no unit tests; the ring on screen is Task 9's.

**Reviewer checklist (not unit-testable):** `OrbitRing.update()` allocates nothing per frame — no `new`, no array, closure or `Vector3` creation inside it, scalars only (Global Constraints, slice 4).

- [ ] **Step 11: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/scene/chapters/OrbitRing.ts src/scene/chapters/OrbitRing.test.ts src/scene/quality.ts src/scene/quality.test.ts src/scene/SceneRoot.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): OrbitRing set piece — world-space ring and process nodes

A thin additive torus (tier ringSegments 128/64/0) tilted 72deg around the
star so its near arc passes below the disc, with one node per CMS step. The
ring turns with orbitCursor so node round(cursor) sits at the lowest point of
the near arc as its panel takes over; it fades in over cp 0-0.1 and is gone by
0.9. Depth testing stays on as a guard (the back arc never reaches the
disc at this tilt). SceneRoot gains an optional stepCount prop and rebuilds on
a change.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `Process.tsx` + Orbit CSS

**Wave 2 (parallel with Tasks 4 and 6, after Wave 1 is merged). Needs Tasks 1 and 3.**

**Files:**
- Create: `src/components/voyage/Process.tsx`
- Modify: `src/app/voyage/voyage.css` (insert the `.process*` block above `/* ====== CTA ====== */`)
- Test: `src/components/voyage/Process.test.tsx` (new, jsdom), `src/app/voyage/voyageCss.test.ts` (new, node — reads `voyage.css`)

**Interfaces:**
- Consumes: `CHAPTERS`, `sectionHeightVh`, `progressAt` (Task 1); `stepSolo`, `ORBIT_WINDOW` (Task 3); `useVoyage` from `@/scene/scroll/useVoyage`; `useReducedMotion` from `framer-motion`; type-only `Item` from `@/lib/collections/defineCollection`.
- Produces:
  ```tsx
  export default function Process(props: { steps: Item[]; animated: boolean }): JSX.Element;
  // DOM contract (Task 8 mounts it, Task 9 inspects it):
  //   <section id="orbit" class="chapter chapter--orbit" aria-label="Process" style="height:300vh" data-static?="true">
  //     <div class="chapter__pin"><p class="chapter__label">04 / ORBIT</p>
  //       <div class="process">  (omitted when there are no steps)
  //         <article class="glass process-panel" style="--solo:0..1" data-solo-off?="true" tabindex?="0">
  //           <p class="process-panel__index" aria-hidden>01</p> <h2 class="process-panel__title">…</h2>  (h2 omitted when the title is empty)
  //           <p class="process-panel__field"><span>What happens|What you get|How long</span>text</p>  (omitted with its label when empty)
  ```
  CSS custom properties for the Task 9 retune: `--orbit-panel-w` (default `min(30rem, 32vw)`), `--orbit-panel-h` (default `clamp(20rem, 48vh, 27rem)`).

**Why it mirrors `Services.tsx`, and where it deliberately differs:** same "use client" / `useVoyage` / `useReducedMotion` / `still` / leaf-narrowing / `data-static` / `data-solo-off` shape. Different: **one panel at a time on every device** (so the single `--solo` custom property replaces Services' four-property pose, and no media query chooses between schedules), driven by Task 3's `stepSolo` so a panel and the ring's front-centre node change together. Task 8 puts it inside the `tier === null` boot gate (it calls `useReducedMotion`, which must never server-render).

**The one a11y addition over `Services`:** the panel scrolls (`overflow-y: auto`) when a long step (`what` allows 600 chars) does not fit the mobile panel cap, and a scroll region must be keyboard-reachable — so the *active* panel (`solo >= 0.5`, animated tier only) gets `tabIndex={0}` and a visible `:focus-visible` ring. "Scrollable" is read as "the animated tier's `overflow-y: auto` panel", not a measured overflow: overflow depends on CMS copy, and a per-panel ref is not worth it for N = 4. Panels that are not showing are not tabbable (and are not `visibility: hidden`, so they stay in the accessibility tree like Services' do).

- [ ] **Step 1: Write the failing tests**

Create `src/components/voyage/Process.test.tsx`:
```tsx
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
```

Also create `src/app/voyage/voyageCss.test.ts`. The jsdom tests above only see the inline `--solo` / `data-solo-off` the component writes; the CSS that actually makes "one panel at a time" (and the `-webkit` ordering, the focus ring, the static stacking) has no other automated coverage, and the `-webkit` ordering has already bitten this repo once (`voyage.css:73`). These three tests read the stylesheet as text and pin those declarations:
```ts
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// CSS has no other automated coverage. These pin the few declarations the Orbit behaviour depends on.
const css = readFileSync("src/app/voyage/voyage.css", "utf8");
const body = (selector: string) => {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `rule ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
};

describe("voyage.css — Orbit", () => {
  it("overlaps the step panels and drives each one's opacity from --solo", () => {
    const r = body(".process-panel");
    expect(r).toMatch(/position:\s*absolute/);
    expect(r).toMatch(/inset:\s*0/);
    expect(r).toMatch(/opacity:\s*var\(--solo\)/);
  });
  it("gates the blur and the pointer events on a panel that is not showing, prefixed property first", () => {
    const r = body('.process-panel[data-solo-off="true"]');
    const prefixed = r.indexOf("-webkit-backdrop-filter: none");
    const standard = r.search(/[^-]backdrop-filter: none/);
    expect(prefixed).toBeGreaterThan(-1);
    expect(standard).toBeGreaterThan(prefixed);
    expect(r).toMatch(/pointer-events:\s*none/);
  });
  it("gives the focusable panel a visible focus ring and stacks the still tier statically", () => {
    expect(body(".process-panel:focus-visible")).toMatch(/outline:\s*2px solid/);
    const still = body('.chapter--orbit[data-static="true"] .process-panel');
    expect(still).toMatch(/position:\s*static/);
    expect(still).toMatch(/opacity:\s*1/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/voyage/Process.test.tsx src/app/voyage/voyageCss.test.ts`
Expected: FAIL — `Process.test.tsx` fails at collection: `Error: Failed to resolve import "./Process" from "src/components/voyage/Process.test.tsx". Does the file exist?`, `(0 test)` (under the jsdom pragma, vite's import analysis reports the missing module, rather than node's `Cannot find module`); `voyageCss.test.ts` collects and all **3** of its tests fail on `AssertionError: rule .process-panel: expected -1 to be greater than -1` (the rules do not exist yet). Summary: `Test Files  2 failed (2)`, `Tests  3 failed (3)`.

- [ ] **Step 3: Implement `Process.tsx`**

Create `src/components/voyage/Process.tsx`:
```tsx
"use client";

import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
// Type-only: erased at compile time, so no mongoose reaches the client bundle.
import type { Item } from "@/lib/collections/defineCollection";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { stepSolo, ORBIT_HOLD_MOBILE } from "@/scene/chapters/orbitSchedule";
import { useVoyage } from "@/scene/scroll/useVoyage";

interface ProcessProps {
  steps: Item[];
  /** false in the `still` tier — every step renders stacked and fully visible, no scroll-derived motion. */
  animated: boolean;
}

const chapter = CHAPTERS.find((c) => c.id === "orbit")!;

/** CSS custom properties are not part of React's CSSProperties, so the one value CSS needs
 *  (a panel's visibility, 0..1) is handed over through this widened record. */
type SoloStyle = CSSProperties & Record<"--solo", number>;

/** `Item` is untyped past its three base fields, so every read is narrowed here at the leaf.
 *  `title` and `what` are required in the schema and `deliverable` / `duration` optional, but
 *  the CMS is data-driven, so nothing here may assume a string. */
function readStep(item: Item) {
  return {
    title: typeof item.title === "string" ? item.title : "",
    what: typeof item.what === "string" ? item.what : "",
    deliverable: typeof item.deliverable === "string" ? item.deliverable : "",
    duration: typeof item.duration === "string" ? item.duration : "",
  };
}

/** One labelled field of a step. Rendered only when it has text (label and value go together). */
function Field({ label, value }: { label: string; value: string }) {
  if (value === "") return null;
  return (
    <p className="process-panel__field">
      <span>{label}</span>
      {value}
    </p>
  );
}

/** Chapter 04. One glass panel at a time, replaced in place as the ring turns the next node
 *  front-centre. The schedule (orbitSchedule.stepSolo) is shared with the ring, so panel and
 *  node always change together. Same panel on desktop and mobile; only the CSS box differs. */
export default function Process({ steps, animated }: ProcessProps) {
  const s = useVoyage();
  const reduce = useReducedMotion();
  const still = !animated || reduce === true;

  return (
    <section
      id="orbit"
      className="chapter chapter--orbit"
      style={{ height: `${sectionHeightVh(chapter)}vh` }}
      aria-label="Process"
      data-static={still ? "true" : undefined}
    >
      <div className="chapter__pin">
        <p className="chapter__label">
          {chapter.index} / {chapter.label}
        </p>
        {steps.length > 0 && (
          <div className="process">
            {steps.map((item, i) => {
              const { title, what, deliverable, duration } = readStep(item);
              // Outside Orbit nothing shows (stepSolo(last) is 1 at the chapter's end, and the
              // panels have no fade-out of their own: the pin's release is their exit).
              const solo = still ? 1 : s.chapter.id === "orbit" ? stepSolo(i, steps.length, s.chapterProgress) : 0;
              // `opacity: 0` does not skip a backdrop filter, so the CSS gates the blur and the
              // pointer events on this attribute (not on visibility, which would also pull the
              // panel out of the accessibility tree).
              const off = solo < 0.005;
              const style: SoloStyle = { "--solo": solo };
              return (
                <article
                  key={item.id}
                  className="glass process-panel"
                  style={style}
                  data-solo-off={off ? "true" : undefined}
                  // The panel scrolls (`overflow-y: auto`) when a long step does not fit the
                  // pin, and a scroll region needs a tab stop. Only the ACTIVE panel gets one
                  // (solo >= 0.5 — not every panel mid-cross-fade, and none once Orbit is over);
                  // the static tier does not scroll at all. Also none once the longest pin hold
                  // (mobile, cp 0.787) is over: on desktop the last panel stays at full solo while
                  // its pin scrolls off-screen, and an off-screen tab stop would pull the page back.
                  tabIndex={!still && solo >= 0.5 && s.chapterProgress < ORBIT_HOLD_MOBILE ? 0 : undefined}
                >
                  {/* Decorative ordinal: hidden so it is not read before every title. */}
                  <p className="process-panel__index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</p>
                  {/* No heading for a missing CMS title — an empty <h2> is an a11y violation. */}
                  {title !== "" && <h2 className="process-panel__title">{title}</h2>}
                  <Field label="What happens" value={what} />
                  <Field label="What you get" value={deliverable} />
                  <Field label="How long" value={duration} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add the CSS**

In `src/app/voyage/voyage.css`, replace:
```css
/* ====== CTA ====== */
```
with:
```css
/* ====== Orbit (ch. 04) ====== */
/* Orbit's section is 300vh and .chapter__pin (100vh) is stationary for 300 - 100 = 200vh =
   chapterProgress 0..2/3 (orbitSchedule.ts derives its window from exactly this). ONE panel is
   up at a time on every device: the step panels overlap in one box and --solo (stepSolo) is
   each one's opacity, so the ring's front-centre node and the panel always change together.
   The layout knobs are custom properties so the browser review can retune them without
   touching JS: the panel takes the left of the frame, the ring + star read centre-right. */
.chapter--orbit {
  --orbit-panel-w: min(30rem, 32vw);
  --orbit-panel-h: clamp(20rem, 48vh, 27rem);
}
.process { position: relative; width: var(--orbit-panel-w); height: var(--orbit-panel-h); }
.process-panel {
  position: absolute; inset: 0; overflow-y: auto;
  display: flex; flex-direction: column;
  padding: clamp(1.25rem, 2vw, 2rem);
  opacity: var(--solo);
  transform: translateY(calc((1 - var(--solo)) * 14px));
}
/* A scrollable panel is a tab stop, so it needs a visible focus ring. */
.process-panel:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.6); outline-offset: 3px; }
/* All N panels overlap at full size with only opacity separating them, and `opacity: 0` does NOT
   skip a backdrop filter (Blink re-samples an 18px blur of a canvas that repaints every frame),
   so a panel that is not showing drops its blur and stops swallowing touches and scrolls.
   `-webkit-backdrop-filter` first: lightningcss drops the standard property when the prefixed
   one follows it. */
.process-panel[data-solo-off="true"] {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  pointer-events: none;
}
.process-panel__index {
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.62rem; letter-spacing: 0.2em;
  color: var(--gray-dark); margin: 0 0 0.9rem;
}
.process-panel__title {
  font-family: "Styrene A", var(--font-space-grotesk), sans-serif;
  font-size: clamp(1.25rem, 2vw, 1.8rem); font-weight: 500; letter-spacing: -0.01em;
  line-height: 1.15; margin: 0 0 1rem;
}
.process-panel__field {
  margin: 0 0 1.1rem; font-size: 0.95rem; line-height: 1.6; color: var(--gray-light);
}
.process-panel__field span {
  display: block; margin-bottom: 0.3rem; text-transform: uppercase;
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.62rem; letter-spacing: 0.14em;
  color: var(--gray-dark);
}

/* Mobile: a 64vh pin is stationary for 300 - 64 = 236vh (chapterProgress 0..0.787); the shared
   schedule's window ends at 0.62 and the last panel then holds (panelPresence stays 1), so a
   phone dwells on the last step until the pin releases.
   padding-top, NOT top: an inner inset keeps the sticky hold at 236vh (a `top` offset would cut
   it), and 4.5rem clears the fixed mobile dock exactly as Approach's pin does. Top-anchored and
   capped at 34vh so the centred star and the ring's near arc stay visible below it. */
@media (max-width: 767px) {
  .chapter--orbit .chapter__pin { height: 64vh; padding-top: 4.5rem; justify-content: flex-start; }
  /* A fixed box ABOVE the star: at 390x844 the star sits at y ≈ 420-460 and the active node at
     y ≈ 520-590, so the panel (y ≈ 113 → 400) stops short of both; long copy scrolls inside it
     (it is a tab stop). min() = 287 px at 844, 18rem on taller phones. */
  .process { flex: 0 0 auto; width: 100%; height: min(34vh, 18rem); }
}

/* Reduced motion / still tier: no pin, no scroll-derived motion — the steps just flow, stacked,
   sized to their content. The section height stays a fixed 300vh on every tier (VoyageScroll
   derives progress and drives scrollTo from `scrollHeight − innerHeight`, so `height: auto`
   would land every dock and rail link after Orbit short); four steps fit 300vh at 390x844 while
   what + deliverable average ≲ 330 chars per step (seed copy is ~110); longer CMS copy overflows
   into Worlds, the same limit Services has at 150vh — tracked in Deferred. */
.chapter--orbit[data-static="true"] .chapter__pin {
  position: static; height: auto; min-height: 100vh;
  padding-top: 2rem; padding-bottom: 2rem;
}
.chapter--orbit[data-static="true"] .process {
  height: auto; display: flex; flex-direction: column; gap: 1rem;
}
.chapter--orbit[data-static="true"] .process-panel {
  position: static; inset: auto; opacity: 1; transform: none; overflow: visible;
}
@media (max-width: 767px) {
  .chapter--orbit[data-static="true"] .process { flex: 0 0 auto; }
}

/* ====== CTA ====== */
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/voyage/Process.test.tsx src/app/voyage/voyageCss.test.ts`
Expected: PASS — `Tests  18 passed (18)`: `Process.test.tsx` 15 (5 render, 6 one-panel-at-a-time, 4 empty/still), `voyageCss.test.ts` 3.

- [ ] **Step 6: Verify the CSS survives the build's CSS pipeline, then the whole suite**

The standard `backdrop-filter` is silently dropped by lightningcss when the prefixed form follows it, and no unit test can see that. Check the gating rule survives:

```bash
cd /Users/admin/Codes-2/portfolio
node -e '
const l = require("lightningcss"), fs = require("fs");
const out = l.transform({ filename: "voyage.css", code: fs.readFileSync("src/app/voyage/voyage.css"),
  targets: { chrome: 100 << 16, safari: 15 << 16, firefox: 100 << 16 } }).code.toString();
const i = out.indexOf(".process-panel[data-solo-off");
console.log(out.slice(i, i + 130));
'
npx vitest run
npx tsc --noEmit
npx eslint src/components/voyage/Process.tsx src/components/voyage/Process.test.tsx src/app/voyage/voyageCss.test.ts
```
Expected: the printed rule reads exactly
```
.process-panel[data-solo-off="true"] {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  pointer-events: none;
}
```
(both declarations present, prefixed first). The suite gains exactly 18 tests (15 + 3) with no failures; `tsc` and `eslint` print nothing (`eslint` does not lint the `.css`). The manual check above stays: it proves the property survives lightningcss, which `voyageCss.test.ts` (source order only) cannot.

- [ ] **Step 7: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/components/voyage/Process.tsx src/components/voyage/Process.test.tsx src/app/voyage/voyage.css src/app/voyage/voyageCss.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): Process chapter DOM — one glass step panel at a time

Mirrors Services: leaf narrowing, aria-label, h2 only for a non-empty title,
data-solo-off gating blur and pointer events (prefixed backdrop-filter first),
a stacked static tier inside the fixed 300vh section, and a 64vh mobile pin
with dock clearance and a panel capped to stay above the star. Visibility comes
from the shared stepSolo schedule so a panel and the ring's front-centre node
change together; the active panel is a tab stop with a focus ring because long
copy scrolls. voyageCss.test.ts pins the CSS the jsdom tests cannot see.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `VoyageRoot` wiring — mount `<Process>`, pass `stepCount`, drop the guard

**Wave 3, alone. Needs Tasks 5, 6 and 7.**

**Files:**
- Modify: `src/components/voyage/VoyageRoot.tsx`
- Modify: `src/scene/SceneRoot.tsx` (`stepCount` becomes required)

**Interfaces:**
- Consumes: `VoyageRoot`'s `steps` (Task 5); `SceneRoot`'s `stepCount` prop (Task 6); `Process` (Task 7).
- Produces: the finished chapter 04 — `<Process>` mounted between the Jump section and the remaining placeholders (DOM order is scroll order), `SceneRoot` built with `new OrbitRing(steps.length)`, and `orbit` no longer a placeholder section.

**Why no new unit test:** `VoyageRoot` has no tests (boot gate, dynamic `SceneRoot`, audio, FPS probe) and neither does `SceneRoot`; everything either of them calls is covered in its own task. The compiler is the red/green here (making `stepCount` required must break `VoyageRoot`), then the build, then Task 9's live review. The three things only the live page can show — DOM order, the ring turning with the panels, no duplicate `orbit` section — are on Task 9's checklist.

- [ ] **Step 1: Make `stepCount` required**

In `src/scene/SceneRoot.tsx`, replace:
```tsx
  /** Chapter 04's process-step count (one ring node each). Comes from the CMS: stable after
   *  load, never derived from scroll. Optional only until VoyageRoot passes it (Task 8
   *  makes it required); 0 builds an empty, always-hidden ring. */
  stepCount?: number;
```
with:
```tsx
  /** Chapter 04's process-step count (one ring node each). Comes from the CMS: stable after
   *  load, never derived from scroll. 0 builds an empty, always-hidden ring. */
  stepCount: number;
```

In `src/scene/SceneRoot.tsx`, replace:
```tsx
export default function SceneRoot({ tier, ignite, onContextLost, stepCount = 0 }: SceneRootProps) {
```
with:
```tsx
export default function SceneRoot({ tier, ignite, onContextLost, stepCount }: SceneRootProps) {
```

- [ ] **Step 2: Run the typecheck to verify it fails**

Run: `npx tsc --noEmit`
Expected: FAIL — exactly one error, in `src/components/voyage/VoyageRoot.tsx` (`SceneRoot` is loaded through `next/dynamic`, so TypeScript reports an overload failure): `error TS2769: No overload matches this call.` followed by `Property 'stepCount' is missing in type '{ tier: "high" | "mid"; ignite: boolean; onContextLost: () => void; }' but required in type 'SceneRootProps'.`

- [ ] **Step 3: Wire `VoyageRoot`**

In `src/components/voyage/VoyageRoot.tsx`, replace:
```tsx
// Slice 3: chapter 02's panels and chapter 03's beat.
import Services from "./Services";
import { useJumpBeat } from "./useJumpBeat";
```
with:
```tsx
// Slice 3: chapter 02's panels and chapter 03's beat. Slice 4: chapter 04's step panels.
import Services from "./Services";
import Process from "./Process";
import { useJumpBeat } from "./useJumpBeat";
```

Delete the Task 5 guard:

In `src/components/voyage/VoyageRoot.tsx`, replace:
```tsx
  // TEMPORARY (Task 5): nothing reads `steps` until Task 8 mounts <Process>. Task 8 deletes this line.
  void steps;

```
with:
```tsx

```

Remove `orbit` from the placeholders:

In `src/components/voyage/VoyageRoot.tsx`, replace:
```tsx
  // Chapters 01–03 own their own sections now; the rest are still placeholders.
  const placeholders = useMemo(
    () => CHAPTERS.filter((c) => c.id !== "launch" && c.id !== "approach" && c.id !== "jump"),
    [],
  );
```
with:
```tsx
  // Chapters 01–04 own their own sections now; the rest are still placeholders.
  const placeholders = useMemo(
    () => CHAPTERS.filter((c) => c.id !== "launch" && c.id !== "approach" && c.id !== "jump" && c.id !== "orbit"),
    [],
  );
```

Pass the step count to the scene:

In `src/components/voyage/VoyageRoot.tsx`, replace:
```tsx
      {tier !== "still" ? <SceneRoot tier={tier} ignite={ignited} onContextLost={onContextLost} /> : <StillSky />}
```
with:
```tsx
      {tier !== "still" ? (
        <SceneRoot tier={tier} ignite={ignited} onContextLost={onContextLost} stepCount={steps.length} />
      ) : (
        <StillSky />
      )}
```

Mount the chapter, in chapter order (after the Jump section, before the placeholders):

In `src/components/voyage/VoyageRoot.tsx`, replace:
```tsx
          style={{ height: `${sectionHeightVh(jumpChapter)}vh` }}
        />
```
with:
```tsx
          style={{ height: `${sectionHeightVh(jumpChapter)}vh` }}
        />
        {/* Chapter 04, in chapter order (DOM order is scroll order). Inside the boot gate for the
            same reason as Services: it calls useReducedMotion(). */}
        <Process steps={steps} animated={animated} />
```

- [ ] **Step 4: Verify — types, lint, tests, build**

Run:
```bash
cd /Users/admin/Codes-2/portfolio
npx tsc --noEmit
npx eslint src/components/voyage src/scene src/app/voyage
npx vitest run
npm run build
```
Expected: `tsc` prints nothing; `eslint` prints nothing; `vitest` passes with no failures (this task adds no tests); `npm run build` succeeds and lists `/voyage` in the route table (as static, revalidate 5m). If the build cannot reach MongoDB (`.env.local` supplies `MONGODB_URI`), that failure is the data fetch, not the code — report it rather than skipping the build.

- [ ] **Step 5: Commit**

```bash
cd /Users/admin/Codes-2/portfolio
git add src/components/voyage/VoyageRoot.tsx src/scene/SceneRoot.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): mount the Process chapter and size the ring from the CMS

VoyageRoot renders <Process> after the Jump section (inside the boot gate),
stops treating Orbit as a placeholder, and passes steps.length to SceneRoot,
whose stepCount prop is now required. Removes Task 5's temporary guard.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Browser review (controller-run)

**Files:**
- Create: `screenshots/voyage/slice-4/*.png` (25 files, listed below)
- Modify (only if the review says so): the exported tunables in `flightPath.ts` (`BANK_MAX`), `OrbitRing.ts`, `EnergyOrb.ts`, `Starfield.ts`, `orbitSchedule.ts`, the `camera.rotateZ` sign in `SceneRoot.tsx`, and the `--orbit-panel-*` custom properties in `voyage.css`

**Interfaces:**
- Consumes: everything Tasks 1–8 shipped, served at `http://localhost:3000/voyage`; `logs/client.jsonl` (the `quality.probe` line); the chrome-devtools MCP (`navigate_page`, `resize_page`, `emulate`, `evaluate_script`, `take_screenshot`, `list_console_messages`) with the Playwright MCP as the mobile fallback.
- Produces: the 25 PNG baselines, the FPS probe reading, a verdict on each checklist item below, and the list of retuned constants with old and new values. All consumed by Task 10.

**This task is run by the controller, not a fresh implementer.** Spec §6 requires a browser review before the next slice begins, and per `insights.md` the screenshots are the only regression net for shaders, sprites and DOM. Three things in this slice have **no unit coverage at all and are judged only here**: the GLSL limb darkening, the ring and nodes as drawn (placement is unit-tested, appearance is not), and the camera roll as seen.

**Prerequisites.** The local Docker `mongo:7` on port 27018 with the seed applied (4 process steps: Discover / Architect / Build / Ship & operate) and `.env.local` pointing at it. Then:

- [ ] **Step 1: Start the server and create the screenshot directory**

```bash
cd /Users/admin/Codes-2/portfolio
mkdir -p screenshots/voyage/slice-4
npm run dev
```
Open `http://localhost:3000/voyage` with the chrome-devtools MCP (`navigate_page`). Let Ignition finish. Confirm the page has exactly one `#orbit` section and it follows `#jump` in the DOM:
```js
[...document.querySelectorAll("main.voyage-track > section")].map((s) => s.id)
// expected: ["launch","approach","jump","orbit","worlds","belt","passage","constellation","pilot","landing","surface"]
```

- [ ] **Step 2: Compute every capture point from the code, not by hand**

Every progress value below comes from `progressAt` / `orbitCursor` (the plan's no-literal rule applies to captures too). Run once and keep the output beside you (`npx tsx` needs network on first use; alternatively print the same table from a throwaway `*.test.ts` and delete it afterwards):

```bash
cd /Users/admin/Codes-2/portfolio
npx tsx -e '
import { progressAt } from "./src/scene/camera/flightPath";
import { ORBIT_WINDOW, orbitCursor } from "./src/scene/chapters/orbitSchedule";
const n = 4, [w0, w1] = ORBIT_WINDOW;
const centre = (i: number) => w0 + ((i + 0.5) / n) * (w1 - w0);
const rows: [string, number][] = [
  ["orbit-entry", progressAt("orbit", 0.003)],
  ...[0, 1, 2, 3].map((i): [string, number] => [`step${i + 1} (cursor ${orbitCursor(centre(i), n)})`, progressAt("orbit", centre(i))]),
  ["crossfade 1|2 (cp 0.185, cursor 0.5)", progressAt("orbit", w0 + (1 / n) * (w1 - w0))],
  ["desktop pin-release (orbit cp 0.70)", progressAt("orbit", 0.7)],
  ["mobile pin-release (orbit cp 0.787)", progressAt("orbit", 0.787)],
  ["bank-out (orbit cp 0.90: ring 0, bank ~18°)", progressAt("orbit", 0.9)],
  ["worlds-entry", progressAt("worlds", 0.02)],
  ["approach-docked", progressAt("approach", 1 / 3)],
  ["approach-prejump (cp 0.958)", progressAt("approach", 0.958)],
  ["jump-mid", progressAt("jump", 0.5)],
  ["still (orbit cp 0.20)", progressAt("orbit", 0.2)],
];
for (const [k, v] of rows) console.log(k.padEnd(46), v.toFixed(6));
'
```
Expected output (the fractions of this tree: orbit = 275/1400 → 575/1400):
```
orbit-entry                                    0.197071
step1 (cursor 0)                               0.220536
step2 (cursor 1)                               0.251607
step3 (cursor 2)                               0.282679
step4 (cursor 3)                               0.313750
crossfade 1|2 (cp 0.185, cursor 0.5)           0.236071
desktop pin-release (orbit cp 0.70)            0.346429
mobile pin-release (orbit cp 0.787)            0.365071
bank-out (orbit cp 0.90: ring 0, bank ~18°)    0.389286
worlds-entry                                   0.413929
approach-docked                                0.107143
approach-prejump (cp 0.958)                    0.174071
jump-mid                                       0.187500
still (orbit cp 0.20)                          0.239286
```
(Any other chapter point: `progress = (startVh + spanVh × t) / 1400`, with Orbit at `startVh 275, spanVh 300`.) If your numbers differ, the chapter table drifted from Task 1 — stop and fix that first.

- [ ] **Step 3: Capture the desktop set at 1440×900**

Resize to 1440×900 (`resize_page`). For each row, run this in `evaluate_script` (substituting `P`), **wait ≥ 1.5 s** (the camera pose, the bank and the star's eased state all settle with `POSE_LERP = 0.08`, ~1 s), then `take_screenshot`:

```js
// Native scrollTo, NOT voyageStore.scrollTo: the store's scrollTo sets the programmatic flag,
// which suppresses the very Jump beat the approach/jump captures exist to check.
(() => {
  const P = 0.220536; // ← from Step 2
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: P * max, behavior: "auto" });
  return { target: P, actual: Number((window.scrollY / max).toFixed(4)) };
})()
```
Require `actual` within ~0.002 of `target` before photographing (Lenis owns the scroll position; if it lags, wait and re-read `window.scrollY / max`).

| File | Point | What it must show |
|---|---|---|
| `desktop-approach-prejump.png` | approach-prejump | Slice 3 regression (compare `screenshots/voyage/slice-3/desktop-p195.png`): streaks velocity-driven, no letterbox, star as in the slice-3 baseline |
| `desktop-jump-mid.png` | jump-mid | Slice 3 regression (compare `desktop-p21.png`): bars down, hyperspace tunnel at full stretch, star flare at peak (step from `approach-prejump` to `jump-mid` in **one** `evaluate_script` so the bars are down when you photograph) |
| `desktop-approach-docked.png` | approach-docked | **Slice 3's money frame at the new fractions:** all three service panels docked in the arc, graph whole behind them, starfield softened. Must match `screenshots/voyage/slice-3/desktop-p12.png` |
| `desktop-orbit-entry.png` | orbit-entry | The cut from Jump: level horizon (bank ≈ 0), star a small dot, ring beginning to fade in (ring opacity ≈ 0), no panel yet |
| `desktop-step1.png` … `desktop-step4.png` | step1–step4 | Node *k* at the lowest point of the near arc, front-centre below the star; panel *k* alone in the left of the frame; the other three panels invisible |
| `desktop-crossfade-1-2.png` | crossfade 1\|2 | Two panels each ≈ 50% (never two full panels, never a gap), ring ≈ 45° through its turn, node 1 swelling as node 0 shrinks |
| `desktop-pin-release.png` | desktop pin-release | Panel 4 leaving with the pin at full opacity (the last panel dwells until the pin releases), ring still ≈ 93% visible and fading toward cp 0.9 (`ringFade(0.70)` = 0.93), stars sharp, horizon fully banked (bank holds to cp 0.82) |
| `desktop-bank-out.png` | bank-out | No ring (gone at cp 0.9), horizon still rolling back (bank ≈ 18°), star a plain disc returning |
| `desktop-worlds-entry.png` | worlds-entry | **Level horizon** (bank 0), no ring, no stray panel, star back to a plain disc (no limb darkening), Worlds placeholder label only |

Also resize to **1024×768** (the desktop layout with a ≈ 246–328 px panel, the ring's left tip well under the glass) and capture **step 2** → `desktop-1024-step2.png`: the panel is legible and the node and the disc stay clear of it (the ring tip under the glass is acceptable, as at 1440).

- [ ] **Step 4: Capture the mobile set at 390×844**

`resize_page` clamps around ~500 px (`insights.md`), so it cannot reproduce a phone. Use the chrome-devtools `emulate` tool with device metrics width 390, height 844, deviceScaleFactor 3, mobile true (tier `mid`). If `emulate` is unavailable, drive these captures with the Playwright MCP (`browser_resize` + `browser_take_screenshot`) — Playwright as a *screenshot driver* is fine; the Playwright *test suite* is deferred to slice 8.

Mobile is the only capture set at tier `mid`, so it is the sole baseline for chapter entry, pin release and the Jump on that tier. Same `evaluate_script` as Step 3.

| File | Point | What it must show |
|---|---|---|
| `mobile-approach-docked.png` | approach-docked | Slice 3 regression (compare `screenshots/voyage/slice-3/mobile-p12.png`): panel 2 alone, inside the 64vh pin, below the dock |
| `mobile-approach-prejump.png` | approach-prejump | Slice 3 regression (compare `mobile-p195.png`): star just off the right edge at 390 (the slice-3 lookAt note in `worklog.md`), no letterbox, streaks velocity-driven |
| `mobile-jump-mid.png` | jump-mid | Slice 3 regression (compare `mobile-p21.png`): bars, tunnel, flare |
| `mobile-orbit-entry.png` | orbit-entry | Level horizon, star dot, no panel |
| `mobile-step1.png` … `mobile-step4.png` | step1–step4 | One panel alone, top-anchored under the chapter label, clear of the dock pill (`padding-top: 4.5rem`), no horizontal overflow; the star disc and the active node are NOT covered by the panel (panel bottom ≈ y 400; node ≈ y 520–590). Expect ≈ 60 px of internal scroll on seed copy (≈ 345 px of content in a 287 px box): either accept it or tighten the mobile type scale (smaller `.process-panel__field` font and margins) — do not raise the cap |
| `mobile-pin-release.png` | mobile pin-release | Panel 4 still up at full opacity as the 64vh pin releases (hold ends at cp 0.787; the last step dwells until here). Ring ≈ 46% faded (`ringFade(0.787)` = 0.46) and the stars back in focus — expected with one shared window, not a defect |
| `mobile-worlds-entry.png` | worlds-entry | Level horizon, nothing left of Orbit |

Also, still at 390×844: `Tab` into the page while a panel is showing and confirm the focus ring is visible on the *active* panel only (`.process-panel:focus-visible`), that no other panel is a tab stop, and that a long step scrolls inside it.

- [ ] **Step 5: Capture the still tier (reduced motion)**

Keep the viewport, add `prefers-reduced-motion: reduce` (chrome-devtools `emulate`, or Playwright's media override), reload, and photograph at the `still` point (`0.239286`): once at 1440×900 (`desktop-still.png`) and once at 390×844 (`mobile-still.png`). Each must show `StillSky` (no WebGL canvas), the four steps stacked and fully visible, sized to their content, nothing clipped, no horizontal scrollbar, and the chapter label `04 / ORBIT`. The section is a fixed 300vh on every tier, so check that scrolling on to Worlds lands on the Worlds label (`#worlds` top within a pixel of the viewport top after `scrollTo(0, document.querySelector("#worlds").offsetTop)` — i.e. the reduced-motion layout did not shorten the track).

**Stress once:** set the four steps to 600-char `what` / 400-char `deliverable` through `/admin` (restore afterwards, as in checklist item 11), reload with reduced motion at 390×844, and record whether the last step overlaps `#worlds`; put the result in the worklog's `### Next`. Seed copy (≤ ~110 chars per field) cannot show the overflow, so a pass here on seed copy alone is not evidence the still tier is closed.

- [ ] **Step 6: Read the FPS probe**

```bash
cd /Users/admin/Codes-2/portfolio && grep '"quality.probe"' logs/client.jsonl | tail -3
```
Record `fps`, `from`, `to` in `worklog.md` (Task 10) as **baseline tier held through Launch** — all this reading can support. The probe is armed once per page load and samples a 1 s window starting 900 ms after ignition, i.e. during Launch, where Orbit's ring is hidden and its panels are below the fold; it cannot see chapter 04 frame cost. That measurement is slice 8's (spec §7). Judder in the new chapter is a live-page observation — checklist item 9.

- [ ] **Step 7: Work the checklist**

Against the captures and the live page, write down a verdict (pass / retune + what) for each, ticking the bullets individually:
- [ ] **1. The bank reads.** Between `orbit-entry` and `step2` the horizon visibly rolls (~30° at peak) and Worlds starts level (`bank-out`: ring gone, bank ≈ 18° rolling back). Flip direction at the `camera.rotateZ(smoothBank)` call if it banks away from the drift toward −x. Do not retune `BANK_MAX` casually: `flightPath.test.ts` pins it at 30°, so changing the magnitude means updating the `is 30 degrees at most` assertion deliberately (see the retune rule in Step 8).
- [ ] **2. The star reads as a sphere.** Limb darkening visible at `step3`/`step4` (darker edge, rim cut back), not a flat coin; at `step1` (13–20 px) it may still read as a dot — acceptable. Retune `LIMB_POWER` (higher = darker limb) / `LIMB_RIM`. Also check there is no dark outline ring between the disc edge and the additive halo outside it (the halo fails the depth test only inside the silhouette): if so, raise `LIMB_RIM` toward 0.5 before touching `LIMB_POWER`.
- [ ] **3. The ring reads as orbiting the star.** An ellipse centred on the star, near arc passing *below* the disc, nodes luminous but monochrome (amber stays the star's alone). Occlusion never engages at any usable tilt (the back arc is ≥ 25 px clear of the disc even at 84°), so judge the 3D read from the ellipse, the front/back node size ratio (≈ 2×) and the limb darkening. Do not raise `RING_TILT` above ~76°: a flatter ring pulls the front node into the star's glow (node 130 px below the star at 72°, 81 px at 80°). If the disc looks pasted on rather than ringed, first retune `LIMB_*`, then `RING_RADIUS`. If the ring reads as a faint grey line (the tube is ≈ 4 px on the near arc and ≈ 2 px on the far arc at 1440×900), raise `RING_TUBE` (0.1 → 0.15) / `RING_OPACITY` before `RING_RADIUS`. The unit tests hold `RING_TILT` in (60°, 90°) and the nearest-point clearance ≥ 15.
- [ ] **4. The front-centre node.** At each of `step1`–`step4` the active node is at the bottom-centre of the near arc, visibly larger than the rest, below the star disc and not under the panel. It must not out-shine the star disc (at mid-orbit the active node is ≈ 45 px across against a ≈ 28 px disc, white against amber); if it does, lower `NODE_ACTIVE_BOOST` (0.9 → 0.5) or `NODE_OPACITY`.
- [ ] **5. The panel is legible and does not cover the node or the star.** At 1440×900 the panel occupies the left ~38% of the frame (the `6vw` gutter + `--orbit-panel-w` = 32vw, right edge ≈ 550 px); ring ellipse tips reach ≈ ndc ±0.35 of the centre, so the left tip may slide under the glass — acceptable if the node and the disc stay clear; otherwise narrow `--orbit-panel-w` or reduce `RING_RADIUS`.
- [ ] **6. One panel at a time.** At each step capture exactly one panel is visible; scrub slowly through a step change (the `crossfade 1|2` capture is the mid-point: two panels each ≈ 50%) and confirm a clean cross-fade (never two full panels, never a gap); the node changes as the panel does.
- [ ] **7. Slice 3's money frames are unchanged** at the new fractions: `desktop-approach-docked` against `screenshots/voyage/slice-3/desktop-p12.png`, `desktop-jump-mid` against `desktop-p21.png`, and the Jump still drops bars, tunnels and flares exactly once on a forward pass (scroll the band organically over ~2 s and with arrow keys; bars must hold through it). The Jump band is still 25vh.
- [ ] **8. Chrome and HUD.** The flight rail's Orbit tick sits at ≈ 19.6% (was 22%) and Worlds at ≈ 41.1%; the DIST readout at Orbit's start reads ≈ 7.0 AU (was 6.7); the dock's `Process` link lands 1.4vh into Orbit and highlights — confirm what the user sees on arrival (an empty frame for ~12vh of scroll: panel 0, ring 0, bank 0, star a dot); if it reads as broken, point the Orbit dock link at orbit cp ≈ 0.05 (`Dock.tsx` `startOf`); the dock compacts at ≈ 62.5% through Launch.
- [ ] **9. No judder** scrolling `orbit-entry` → `worlds-entry`. First suspects: the panel `backdrop-filter` (only the showing panel should blur: inspect `getComputedStyle(panel).backdropFilter` on a `[data-solo-off]` panel — it must be `none`), then the ring's overdraw. The Launch-only probe cannot see this chapter, so take one in-chapter reading: while scrolling steps 1→4 over ~5 s, run a `requestAnimationFrame` delta sampler in `evaluate_script` and record the median frame time at desktop and again with 4× CPU throttle plus mobile `emulate` (spec §8's 45 / 55 fps proper is still slice 8's).
- [ ] **10. Console clean.** `list_console_messages` → zero errors and zero warnings from app code (a `THREE.WebGLProgram` shader error here means a typo in the `EnergyOrb` GLSL template — the only part of this slice no test can compile).
- [ ] **11. Optional edge data** (only with care): temporarily reduce the local `processSteps` collection through `/admin` to 0, 1 and 2 items and reload — 0: section stays 300vh with the label only and no ring; 1: one panel, one static node; 2: two panels, half the window each. Restore exactly what you removed through `/admin` (do not re-run the seed script unless you have confirmed it is idempotent).

- [ ] **Step 8: Commit the captures, then any tuning separately**

```bash
cd /Users/admin/Codes-2/portfolio
git add screenshots/voyage/slice-4
git commit -m "$(cat <<'EOF'
chore(voyage): slice 4 screenshot baselines

Desktop 1440x900 and mobile 390x844 at Orbit entry, each of the four steps
front-centre, a mid-cross-fade frame, pin release, bank-out and Worlds entry,
a 1024x768 step, plus both still-tier layouts and the slice 3 money frames
(approach docked, pre-jump, jump mid) re-shot at the new chapter fractions.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

If the checklist produced tuning changes, commit them **separately** from the captures, re-capture the affected screenshots, and `git add` the tuned source files you edited plus `screenshots/voyage/slice-4`. Title each commit `fix(voyage): retune` followed by the name of the constant, with one body paragraph naming the capture that motivated it and saying what the new value does, ending with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Retuning constraints the unit tests enforce (so a change must update the assertion *deliberately*, never to make a test pass): `BANK_MAX` = 30° in magnitude (a different magnitude means editing the `is 30 degrees at most` assertion deliberately) and bank within `[0, BANK_MAX]`; `RING_TILT` in (60°, 90°); nearest ring point ≥ 15 units from the camera for cp ≤ 0.9; `ORBIT_WINDOW`/`ORBIT_EDGE_FADE` such that the presence end stays inside the desktop hold; `ORBIT_SOFTEN_PEAK` in (0, 1]. Record every retuned constant, old and new value, for Task 10.

---

### Task 10: Docs + closing verification

**Files:**
- Modify: `worklog.md`, `insights.md`, `design.md`
- Modify: `docs/superpowers/specs/2026-09-14-consulting-content-model-design.md:20` (stale pacing note)
- Modify: this plan's own "Execution amendments" section (record whatever the controller changed during execution and Task 9)

**Interfaces:**
- Consumes: everything Tasks 1–9 produced — the verification output of Step 1, Task 9's captures, FPS probe reading, checklist verdicts and retuned-constants list.
- Produces: the slice-4 sections of `worklog.md`, `insights.md` and `design.md`; the corrected content-model note; the pushed branch.

- [ ] **Step 1: Run the whole verification set and capture the real numbers**

```bash
cd /Users/admin/Codes-2/portfolio
npx tsc --noEmit
npx vitest run
npx eslint .
npx eslint src/scene src/components/voyage src/components/dock src/lib src/app/voyage
npm run build
```
Expected: `tsc` 0 errors. `vitest` green — **503 passed / 40 files** if no Task 9 retune touched a test (baseline at `fc91f88`: 413 / 36; slice 4 adds +90 tests and +4 files: `orbitSchedule.test.ts`, `OrbitRing.test.ts`, `Process.test.tsx`, `voyageCss.test.ts`) — record the exact counts. `npx eslint .` still reports the **16 pre-existing problems (10 errors, 6 warnings)** in files this branch never touched, and the second, targeted run reports **zero problems in files this branch changed** (it may report the two pre-existing warnings in `src/lib/auth.ts` and `src/lib/mongodb.ts`, which it does not touch). `npm run build` succeeds with `/voyage` in the route table.

- [ ] **Step 2: Append the slice-4 section to `worklog.md`**

Under a new `## Slice 4 — Orbit / the process ring (feat/voyage-slice-4)` heading, one bullet per task, plus:
- the FPS probe values from Task 9 Step 6, labelled **baseline tier held through Launch** (chapter 04 frame cost is measured at slice 8, spec §7);
- the Task 9 verdict on each checklist item, in particular items 1–5 (bank direction, star sphere read, ring read incl. the finding that depth occlusion never engages, front-centre node, panel clearance);
- every constant retuned in the browser review, with old and new value;
- the verification numbers from Step 1;
- a `### Next` block naming slice 5 (Worlds + `/work/[slug]`) and carrying forward the tuned constants (`BANK_MAX`, `RING_RADIUS`, `RING_TILT`, `RING_TUBE`, `NODE_RADIUS`, `NODE_ACTIVE_BOOST`, `LIMB_POWER`, `LIMB_RIM`, `ORBIT_SOFTEN_PEAK`, `ORBIT_WINDOW`, `--orbit-panel-w`, `--orbit-panel-h`) plus the open follow-ups: `Launch.tsx` has no `useReducedMotion()` guard; Playwright integration tests deferred to slice 8; `Services` and `Process` re-render on every store emit (add a selector); `getVoyageContent` fetches case studies and testimonials that slice 5/6 will finally use; the mobile scroll-region `tabIndex` is fixed for `Process` only, not `Services`; spec §5:129 (empty data hides the chapter and drops its waypoint) is still not implemented.

- [ ] **Step 3: Append the slice-4 findings to `insights.md`**

Under `## 2026-10-13 — Voyage slice 4 (Orbit)`. The findings worth keeping (write what actually happened, not this list verbatim):
- **Derive fractions from a cumulative vh sum; never `start + span / total`.** Computing `end` as `start + span/1400` leaves a 1-ulp gap at 6 of the 10 chapter boundaries and `chapterAt`'s `?? last` fallback turns that gap into a one-frame teleport to Surface. `end_i` and `start_{i+1}` must be the *same expression*; a `toBe` contiguity test and a one-ulp-below-each-boundary test pin it (the old `toBeCloseTo(…, 10)` could not).
- **Absolute progress literals in tests silently retarget when the chapter table moves.** Eleven tests failed loudly, but eight more kept passing while testing a different chapter (a Jump test that had become an Orbit test; a `max()` test that had become vacuous). `progressAt(id, t)` names a chapter-relative position, and doing the conversion *first*, under the old table, made it a pure refactor with a green bar on both sides.
- **Telescoping cross-fades make "exactly one panel at a time" a theorem, not a tuning.** `stepSolo(i) = crossed(i) − crossed(i+1)` sums to exactly 1 inside the window and `Σ i·stepSolo(i)` equals the ring's cursor, so the panel and the node cannot disagree. The first panel's fade-in had to live in the *margin* before the window, because a fade inside it would break the "summed visibility ≥ 1" invariant; the last panel gets no fade-out at all (`panelPresence` holds 1) — the pin's own release is its exit, which is also what makes "on mobile the last step dwells" true. A first draft multiplied the panels by the ring's fade-out envelope and left a phone with ~38vh of empty pinned frame; the plan review's mobile-hold test caught it.
- **Compute the sticky hold before placing windows — again.** 300vh section − 100vh pin = 200vh = cp 0…2/3 on desktop, 0…0.787 on a 64vh mobile pin; one schedule sized to the smaller hold serves both, because the ring is a single WebGL instance and cannot be media-query-aware.
- **Roll after `lookAt`.** `lookAt` rebuilds the quaternion every frame, so `camera.rotateZ` afterwards never accumulates and leaves the view direction (and the star's screen position) unchanged; keeping the bank out of `getCameraPose` kept the never-reverse test and all waypoint invariants blind to it.
- **A ring around a star only occludes itself if it is nearly edge-on.** With the near arc passing below the disc (what the composition needs) the disc sits *inside* the ellipse and the back arc passes above it; the depth-test occlusion never engages (the back arc clears the disc at every tilt that keeps the front node clear of it, ≳ 87° would be needed); the 3D read comes from the ellipse, the nodes' perspective size and the limb darkening. Record what the browser review decided about tilt.
- **WebGL lines are 1 px.** The ring is a thin torus, not a `LineLoop`; no `Line2` resize plumbing was needed.
- Any finding from the browser review that the bullets above do not cover — if there are none, say so explicitly.

- [ ] **Step 4: Update `design.md`**

Add an "Orbit (chapter 04, slice 4)" subsection to the voyage architecture section covering:
- the chapter table in vh and the `progressAt` convention (spans are the source of truth; fractions derive; tests and captures name positions by chapter);
- `orbitSchedule.ts` as the single clock (`ORBIT_WINDOW`, `orbitPresence` for the ring and the stars, `panelPresence` for the panels, `orbitCursor`, `stepSolo`) consumed by `Process`, `OrbitRing` and `Starfield`, why one window serves desktop and mobile, and why the panels have no fade-out of their own (the pin's release is their exit);
- the data path `page.tsx → getVoyageContent().process → VoyageRoot → <Process steps>` and `SceneRoot.stepCount → OrbitRing`;
- the camera bank (`bankForProgress` + `rotateZ` after `lookAt`) and the star's limb darkening (`orbitLimb` / `uLimb`);
- the ring's geometry (world space, torus tube, tilt, front-centre = lowest near-arc point) and the exported tunables.

- [ ] **Step 5: Correct the stale pacing note**

In `docs/superpowers/specs/2026-09-14-consulting-content-model-design.md`, replace:
```
| Pacing (carried over) | `VOYAGE_SCROLL_VH = 1250` (tuned 2026-09-14, commit ea5944e). |
```
with:
```
| Pacing (carried over) | `VOYAGE_SCROLL_VH = 1400` (was 1250, tuned 2026-09-14, commit ea5944e; Orbit grew 150 → 300vh in slice 4 — spans are now declared in vh in `flightPath.ts`). |
```

- [ ] **Step 6: Check the slice against spec §8 and spec §3 row 04**

Confirm and record in `worklog.md`, for chapter 04 only:
| Criterion | How to confirm |
|---|---|
| Reachable and legible on desktop and mobile | Task 9 captures (steps 1–4 at both sizes), no clipped copy, `document.documentElement.scrollWidth === 390` at 390×844 |
| Exactly one WebGL context for the scene | `OrbitRing` joined the `pieces` array in `SceneRoot.tsx`; `grep -rn "new THREE.WebGLRenderer" src` shows only `SceneRoot.tsx` for `/voyage` (plus the pre-existing `ThreeBackground`, which is `/` only); no `EffectComposer`, no `Line2` |
| ≥ 45 fps mid-tier phone / ≥ 55 fps desktop `high` | Baseline tier held through Launch only (Task 9 Step 6); chapter 04 frame cost and real-phone fps are slice 8's |
| Zero console errors | Task 9 checklist item 10 |
| Reduced-motion path fully usable | `still` tier renders `StillSky`; `Process` sets `data-static`, drops the pin and stacks all steps inside the fixed 300vh section (Task 9 Step 5) |
| Spec §3 row 04 content | Banked camera (Task 9 item 1), star visibly a sphere (item 2), one ring with N luminous nodes (item 3), each node front-centre as its panel pins (items 4 and 6), each panel shows what happens / what you get / how long (Task 7) |
Anything that fails goes into `### Next` as a named follow-up, not into a silent pass.

- [ ] **Step 7: Record the execution amendments in this plan**

Fill the (currently empty) "Execution amendments" section near the top of this file with one bullet per deviation the controller accepted during execution or Task 9 (retuned constants, any task that needed a fix pass, anything a reviewer changed), in the format slice 3's plan used (`**Task N:** …`). If nothing deviated, write `None.` explicitly.

- [ ] **Step 8: Commit and push**

```bash
cd /Users/admin/Codes-2/portfolio
git add worklog.md insights.md design.md docs/superpowers/specs/2026-09-14-consulting-content-model-design.md docs/superpowers/plans/2026-10-13-voyage-slice-4.md
git commit -m "$(cat <<'EOF'
docs(voyage): slice 4 worklog, insights and architecture notes

Orbit / the process ring: per-task record, browser-review verdicts and
retuned constants, the vh chapter table and progressAt convention, the shared
orbit schedule, and the spec section 8 check for chapter 04. Corrects the
stale 1250 pacing note in the content-model spec.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push -u origin feat/voyage-slice-4
```

---

## Self-review

**1. Spec coverage — chapter 04 (spec row 04, :74) and the "Cinematic direction" lines that name it.**

| Spec requirement | Where |
|---|---|
| "Camera banks ~30° and settles into orbit" (row 04; "bank & settle into orbit", cinematic direction) | Task 2 — `bankForProgress` (0 outside Orbit, ease in/out, 30° peak) applied as a roll after `lookAt`; the "settle" is the ease-out back to level by Worlds. Direction and magnitude are Task 9 tunables. |
| "The star is now visibly a sphere" | Task 4 — `orbitLimb` + `uLimb` limb darkening (curve unit-tested, shader judged in Task 9). The ring (Task 6) is the second cue. |
| "One large orbital ring with 4 luminous nodes" | Task 6 — `OrbitRing`: one torus + N nodes, N from the CMS (`stepCount`), tuned for 4, any count legal. |
| "scroll rotates the ring so each node arrives front-center" | Tasks 3 + 6 — `orbitCursor` drives `ringSpin`; node `round(cursor)` sits at the lowest point of the near arc. |
| "…and its panel pins ~1 viewport" | Task 7 + Task 3 — one glass panel per step, driven by the same schedule. **Recorded deviation:** the user's 300vh decision (U1) gives ½ viewport per step at N = 4, not 1. |
| Panel content: "what happens, what you get, how long" | Task 7 — three labelled mono fields, each omitted with its label when empty. |
| Data source `process[]` | Task 5 (page → `VoyageRoot`) and Task 8 (`<Process steps>`, `SceneRoot.stepCount`). `getVoyageContent()` already returned it. |
| "Focus pulls: when a chapter panel pins, background particles behind it soften" | Task 4 — `orbitSoften` / `chapterSoften`, window = `ORBIT_WINDOW`. Approach unchanged. |
| §5 architecture: `OrbitRing.ts`, `Process.tsx`, quality tiers | Tasks 6, 7; `TierSettings.ringSegments` high 128 / mid 64 / still 0 with a `quality.test.ts` assertion. |
| §5 "exactly one WebGL context" | `OrbitRing` joins `SceneRoot`'s `pieces` array; a torus (not `Line2`) needs no renderer or resize plumbing. |
| §5 error handling "missing/empty data arrays → chapter hides and the path drops its waypoint" | **Not implemented, as in slice 3.** N = 0 keeps the 300vh section with the label only and an empty hidden ring (Services precedent, tested); the waypoint tables are module-scope constants. |
| §3 "Skipped entirely in `still` tier" analogue | Reduced motion / `still`: `StillSky` replaces the scene, `Process` renders every step stacked inside the fixed 300vh section (tested, Task 9 captured). |
| §6 browser review per slice; §7 committed screenshot baselines | Task 9 (25 PNGs incl. both still layouts, a cross-fade and a bank-out frame, a 1024×768 step, and slice 3's money frames re-shot at the new fractions). |
| §7 Playwright integration tests | **Deferred to slice 8** (carried decision). |
| §8 success criteria for chapter 04 | Task 10 Step 6. |
| U1 pacing: Orbit 300vh, `VOYAGE_SCROLL_VH` 1400, other spans unchanged | Task 1 — pinned verbatim by the `declares its spans in vh` test. |
| Slice-3 follow-up "mobile overflow-y panel lacks tabIndex" | Task 7, for `Process` only (a documented scope limit): the active animated panel is the tab stop. |

**2. Placeholder scan.** Every code step carries complete code, and every edit is an exact find-and-replace pair whose anchor is unique in its file at the point the step runs. The plan was mechanically verified: each `Create` / `replace … with` block was applied in order to a pristine copy of the `fc91f88` tree, the suite was run at every red and green checkpoint, and the resulting counts below are the observed ones. After the two plan reviews were applied, all 110 blocks of Tasks 1–8 were re-applied in order to a fresh pristine copy (0 anchor failures): the resulting tree typechecks, lints clean on every file the slice touched, and passes all 503 tests / 40 files (the new `voyageCss.test.ts` fails 3/3 against the unmodified stylesheet, as Task 7 Step 2 states). The only values left to the controller's eyes are the ones no test can see — the shader, the ring's and nodes' appearance, the roll direction, the panel/ring composition — and those are named, exported tunables with a stated owner (Task 9), not placeholders. Tasks 5 and 8 have no new unit test on purpose, and say why (no test harness exists for `VoyageRoot` / `SceneRoot`; the typechecker supplies their red and green).

**2b. Test counts.** RED counts observed: Task 1 `3 failed | 18 passed (21)` (then `4 failed | 31 passed (35)` across three files), Task 2 `8 failed | 24 passed (32)`, Task 3 `(0 test)` module-missing, Task 4 `11 failed | 24 passed (35)`, Task 6 `1 failed | 11 passed (12)` (quality) then module-missing (ring), Task 7 `(0 test)` for `Process.test.tsx` (module-missing) and `3 failed (3)` for `voyageCss.test.ts`. New tests per task: T1 8, T2 8, T3 23, T4 12, T5 0, T6 21 (+ assertions in existing `quality.test.ts` and `OrbitRing.test.ts` tests), T7 18 (15 `Process` + 3 CSS), T8 0 — +90 in all (413 → 503), +4 files (40).

**3. Type consistency.** Names used identically across every task and every Consumes/Produces block: `Chapter.spanVh` · `VOYAGE_SCROLL_VH` (1400) · `CHAPTERS` · `sectionHeightVh` · `progressAt` · `DOCK_COMPACT_PROGRESS` · `BANK_MAX` · `bankForProgress` · `ORBIT_HOLD_DESKTOP` / `ORBIT_HOLD_MOBILE` · `ORBIT_WINDOW` · `ORBIT_EDGE_FADE` · `ORBIT_PRESENCE_END` · `STEP_CROSSFADE` · `orbitPresence` · `panelPresence` · `orbitCursor` · `stepSolo` · `orbitLimb` · `uLimb` · `LIMB_POWER` / `LIMB_RIM` · `ORBIT_SOFTEN_PEAK` · `orbitSoften` · `chapterSoften` (and the unchanged `approachSoften`) · `TierSettings.ringSegments` · `OrbitRing(stepCount)` · `ringFade` · `ringSpin` · `RING_RADIUS` / `RING_TILT` / `RING_TUBE` / `NODE_RADIUS` / `NODE_ACTIVE_BOOST` / `RING_OPACITY` / `NODE_OPACITY` / `RING_FADE_OUT_END` · `SceneRoot.stepCount` (optional in Task 6, required in Task 8) · `VoyageRootProps.process` → `steps` · `Process({ steps, animated })` · DOM `#orbit`, `.process`, `.process-panel`, `--solo`, `data-solo-off`, `data-static` · CSS `--orbit-panel-w` / `--orbit-panel-h`.

## Execution handoff

Plan complete. Two execution options: **(1) Subagent-driven (recommended)** — a fresh subagent per task in the wave order above, a Sonnet task reviewer after each, Tasks 1 and 8 alone, Waves 1 and 2 in parallel worktrees merged one at a time with the suite green after each merge, the controller running Tasks 9 and 10 personally and looking at every screenshot; **(2) inline execution** with the executing-plans skill, batching Wave 1 and Wave 2.
