# Voyage Redesign — Slice 5 (Worlds / chapter 05 + `/work/[slug]`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Execution shape:** Task 1 runs **alone and first** (every other task rebases on its chapter table and star clock). Then three file-disjoint waves: **Wave 1 = Tasks 2 ∥ 3 ∥ 4**, **Wave 2 = Tasks 5 ∥ 6** (after Wave 1 is merged), then **Task 7 alone**, then Task 8 (controller-run browser review) and Task 9 (docs + closing verification). See "Parallelism" below for the dependency reasons and the per-wave file ownership — do not reorder across waves.

**Goal:** Ship chapter 05 "Worlds": one lit planet per published case study (ring / moon / storm / plain) is carried across the frame as its glass panel takes over; each panel quotes the case study's Problem / Architecture / Outcome and links to `/work/<slug>`; the chapter is 450vh (up from 225) inside a 1625vh voyage; the "Back to the voyage" link on `/work/<slug>` finally lands on Worlds.

**Architecture:** The chapter table grows by one number (`worlds.spanVh` 450, `VOYAGE_SCROLL_VH` 1625) and the star's size / the DIST readout are re-keyed through a shared "star clock" so everything outside Worlds renders exactly as in slices 3–4. One pure module, `worldsSchedule.ts`, is the single clock for the three Worlds consumers — the DOM panels (`Worlds.tsx`), the planets (`Planet.ts`) and the starfield focus pull — and mirrors `orbitSchedule.ts`. Panels take a 0/1 target and a CSS transition animates it (no partial rest frames); the planets and the starfield stay scroll-scrubbed. Case studies reach the client only as a slim server-built DTO (`WorldCase`, three ~160-character excerpts instead of up to 18 000 characters of markdown). Planets are placed in world space from the camera pose at the centre of their slot plus a camera-space offset, so each sits at an exact, testable screen target while its panel is read. Their chapter-level fade-in is a dt-eased trigger like the panels' CSS transition (an arrival at `start + 0.001` shows the planet within half a second); only the per-planet cross-fade and the last planet's long fade-out follow scroll.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 strict, three@0.169, framer-motion 12, lenis 1.3, marked 18 + sanitize-html (server), vitest 5 (+ jsdom / @testing-library/react), MongoDB/Mongoose 9.

**Spec:** `docs/superpowers/specs/2026-10-14-voyage-slice-5-worlds-design.md` (user-approved; parent: `2026-09-14-voyage-redesign-design.md` §3 row 05, §5, §6 step 5).
**Codebase map (authoritative over the spec's code blocks):** `.superpowers/sdd/slice5-map.md` (delta on `.superpowers/sdd/slice4-map.md`).
**Decisions:** `.superpowers/sdd/slice5-decisions.md` — its "Amendments after the map" section (A1–A13) wins over the draft engineering decisions and over the spec wherever they conflict.

## Global Constraints

*(carried from `docs/superpowers/plans/2026-10-13-voyage-slice-4.md` and the slice 1–3 plans it copied; bullets that slice 5 changes are marked and restated in "Global Constraints additions for slice 5")*

- Exactly **one** WebGL context for the scene. `@designcodeio/threeui` is **not** a dependency.
- Device pixel ratio capped at **1.5** (`high`), **1** (`mid`). Tiers: `high | mid | still`. A 1s FPS probe **demotes one tier if < 45 fps**.
- Amber accent **`#f2b35c`** appears only as: the star, primary CTA fill, flight-rail progress dot, cursor ring over CTA — **plus, new in slice 5, the narrow terminator band on a planet's surface** (the star's own light grazing it; spec §3 row 05). All other 3D geometry is **monochrome white on black**.
- Typography: display **Styrene A** (existing self-hosted) with `var(--font-space-grotesk)` fallback; instrument text **JetBrains Mono** via `var(--font-jetbrains-mono)`.
- Glass panel: border `1px solid rgba(255,255,255,.08)`, `backdrop-filter: blur(18px)`, background `rgba(10,10,10,.55)`, inner top highlight `rgba(255,255,255,.06)`, radius 20px (the shared `.glass` class).
- DOM motion: fade-up 12px, 0.5s, ease `[0.2, 0.7, 0.2, 1]`. Nothing bounces. **Panels take a 0/1 target and a CSS transition animates it — no panel opacity is ever scroll-scrubbed (standing rule since slice 4's browser review). The planets' chapter-level fade-in follows the same rule: a 0/1 target eased by `dt`.**
- FOV **60° → 70°** with scroll velocity. Camera **never reverses**: position `z` is non-increasing and the forward vector always has negative `z`.
- `distanceAU` is monotonically non-increasing with progress and is `0` from chapter `pilot` onward.
- `prefers-reduced-motion`: tier `still`, no Lenis, no camera motion, Ignition skipped, Letterbox never shown.
- Ignition ≤ 1.2s, skippable, plays once per session (`sessionStorage["voyage-ignition-played"]`).
- No `TypewriterText`, no keystroke sounds anywhere in new code.
- `/admin` and `/work/*` never mount the scene. `GlobalOverlays` already excludes `/admin`.
- Structured logs: client events POST to `/api/logs`, appended as JSON lines to `logs/<name>.jsonl` when the filesystem is writable. Server code and scripts use `appendLog`; client code uses `logClient` with an event from the closed `LOG_EVENTS` allow-list in `src/lib/clientLog.ts` (`/api/logs/route.ts` imports that same array). **No `console.*` in app code** (the pre-existing `console.log` lines in `scripts/seed.ts` stay; new seed output goes through `appendLog`).
- Client/server boundary: no `"use client"` file imports `@/lib/collections` (index), `defineCollection.ts`, `markdown.ts`, `worldCase.ts` or `mail.ts` **as values**. A type-only `import type { … }` is erased at compile time and is the established pattern (`Item`, `WorldCase`, `Settings`). Client code narrows CMS values at the leaf.
- `/voyage` and `/work/[slug]` stay `noindex`; flip together at launch.
- New set pieces follow the slice-3/4 rules: `update()` is a no-op before `build()`, `dispose()` is idempotent, `build()` disposes a previous build, tier counts live in `TierSettings` with a matching `quality.test.ts` assertion, nothing is allocated per frame.
- New voyage DOM: `useVoyage()` for reveals; continuous scroll-derived motion via inline `style`; module-scope handlers; `sectionHeightVh(chapter)` for heights; `.chapter__pin` only on content chapters.
- `-webkit-backdrop-filter` must be declared before `backdrop-filter` (lightningcss drops the standard property otherwise).
- jsdom tests need the first-line `// @vitest-environment jsdom` pragma (vitest's default environment is `node`); vitest's `include` is `src/**/*.test.ts(x)` only, so anything under test must live under `src/` (scripts import it).
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, verbatim (a deliberate choice, consistent with slices 1–4: it replaces any attribution the executing agent's own harness supplies, whichever model authors the commit). **Commit and push after every task** (the user's standing rule): `git push -u origin feat/voyage-slice-5` the first time, `git push` after that.

### Global Constraints additions for slice 5

- `VOYAGE_SCROLL_VH = 1625`; `worlds.spanVh = 450`; every other chapter keeps its vh span (launch 100, approach 150, jump 25, orbit 300, belt 100, passage 37.5, constellation 137.5, pilot 125, landing 137.5, surface 62.5). Spans stay multiples of 12.5 (1625 = 130 × 12.5), so the cumulative construction keeps every boundary bit-exact. The track is `VOYAGE_SCROLL_VH + VOYAGE_TAIL_VH` = 1725vh and `scrollHeight − innerHeight === VOYAGE_SCROLL_VH` still holds.
- No absolute progress literals in new tests or captures — use `progressAt(id, t)`. (Golden values in Task 1 are keyed by `(chapter, chapterProgress)`, never by absolute progress.)
- The star's on-screen size and the DIST readout outside Worlds are **unchanged from slices 3–4** (A1): `starScale` / `distanceAU` run on the star clock (`starClock`), pinned by golden values captured from the slice-4 tree.
- `WORLDS_WINDOW = [0.04, 0.73]`, `WORLDS_EDGE_FADE = 0.04` (window + fade = 0.77 < desktop hold 0.7778); N = 3 slot centres 0.155 / 0.385 / 0.615 (A2). Desktop panel `--worlds-panel-w: min(40rem, 44vw)` (A3). Phone panel box `height: min(34vh, 18rem)`, `overflow: hidden`, excerpts clamped to 2 lines, context 1 line, stack chips and diagram hidden, link kept (A4).
- Planet constants are exported browser-review tunables. **Shipped values (after the browser review; the plan's original A6 values in brackets):** `PLANET_DEPTH = 18`, `PLANET_RADIUS = 2.2` [2.5], landscape NDC target `(0.50, −0.05)` [(0.40, −0.05)], portrait phone target `(0, −0.45)`, **new** `PLANET_TARGET_PORTRAIT_WIDE = (0.5, −0.55)` for a portrait window wider than `PHONE_MAX_WIDTH = 767`, `PLANET_FADE_OUT_END = 0.9` (**superseded by Execution amendment M2:** the last planet no longer scrubs 0.77 → 0.90; it leaves on a `dt` timer once cp passes `PLANET_LEAVE_AT = 0.80` (`PLANET_LEAVE_RATE = 12`), and `PLANET_FADE_OUT_END` is now only the positional safety cut that hides the group at cp ≥ 0.90; every opacity factor is a trigger), `PLANET_FADE_IN_RATE = 8` (the dt-eased fade-in reaches 95 % within 0.5 s), and **new** `PLANET_SWAP_OUT_RATE = 20`, `PLANET_SWAP_IN_RATE = 8`, `PLANET_SWAP_CLEAR = 0.02` (the timed, staged planet swap that replaced the scrubbed per-planet cross-fade; see Execution amendments).
- The `SceneRoot` GL effect depends on a stable string key (`planetsKey`), never on the `planets` array's identity (A7).
- The case-study DTO sent to the client is `WorldCase` only: no markdown body, no metrics, no `order` / `createdAt` / `published` (A13: ≈ 1.8 KB of JSON worst case — 1.5 KB of field text — and a test caps it at 2000 characters).
- Worlds is designed and tested for up to **8 published case studies** (clearance is verified to N = 8; each case gets 0.69 / N of the chapter): more is outside the tested range (README and `insights.md` say so).
- Every browser-review tunable introduced here is an **exported constant** (`WORLDS_WINDOW`, `WORLDS_EDGE_FADE`, `CASE_TRAVEL`, `WORLDS_SOFTEN_PEAK`, `PLANET_RADIUS`, `PLANET_DEPTH`, `PLANET_TARGET_LANDSCAPE`, `PLANET_TARGET_PORTRAIT`, `PLANET_TARGET_PORTRAIT_WIDE`, `PHONE_MAX_WIDTH`, `PLANET_FADE_OUT_END`, `PLANET_FADE_IN_RATE`, `PLANET_SWAP_OUT_RATE`, `PLANET_SWAP_IN_RATE`, `PLANET_SWAP_CLEAR`, `PLANET_RING_*`, `MOON_*`, `PLANET_NIGHT_FLOOR`, `EXCERPT_MAX`) or a CSS custom property (`--worlds-panel-w`), so Task 8 can retune without touching logic.

---

## Decisions and spec deviations

These are binding. Do not reopen them; if execution surfaces a contradiction, stop and report it rather than re-deciding.

1. **User decisions D1–D6 (spec §1).** D1: Worlds is built and reviewed against **three seeded placeholder case studies**, one per planet feature (ring, moon, storm). D2: Worlds is **450vh**, `VOYAGE_SCROLL_VH` **1625**. D3: the three short column texts are an **auto-excerpt** (first paragraph of each markdown section as plain text, cut at a word boundary at ~160 characters with an ellipsis), no schema change. D4: **zero published cases** → the `05 / WORLDS` label and the quiet line "Case studies are being written up.", no planets, the section keeps its 450vh (spec §5's "hide the chapter and drop its waypoint" stays unimplemented, as for Services and Process). D5: **hybrid placement** (approach C): each planet is placed from the camera pose at the centre of its slot plus a camera-space offset. D6: **trigger, not scrub** for panels.
2. **A1 — star clock (re-keys `starScale` / `distanceAU`).** Both used to divide ABSOLUTE progress by The Pilot's start; at 1625 that shrinks the star 10–21 % at Approach and Orbit (orbit entry 13.3 → 11.1 px) and invalidates slice 4's tuning of the limb darkening and the ring. `starClock(progress)` counts every chapter at its slice-4 length (Worlds as its old 225vh), so every position outside Worlds is bit-for-bit the old star (golden values), and inside Worlds the star grows at half the old rate per vh (accepted: Worlds is twice as long for the same growth). Accepted shifts, no re-key: rail tick positions (a tick is a chapter start by construction), `PROGRAMMATIC_EPS` (3.25vh ≪ the 25vh Jump), the `+0.001` arrivals (1.625vh into a chapter).
3. **A2 — window.** `WORLDS_WINDOW = [0.04, 0.73]` (the draft `0.74` + a 0.04 edge fade would end past the 0.7778 desktop hold; a test pins it).
4. **A3 — panel width** `min(40rem, 44vw)`: the draft `min(46rem, 52vw)` ended at 822 px at 1440 with the star centre at 801 px, half behind the glass.
5. **A4 — phone panel** is a capped box like `.process`. The 450vh section's phone pin is 64vh (386vh hold = chapterProgress 0..0.858).
6. **A5 — motion tests.** Landscape asserts screen-x increases through each planet's slot (≈ 0.09 NDC ≈ 60 px at 1440); portrait asserts screen-y decreases (the planet drops down the frame) and |x| stays under 0.05. "Left → right" is a landscape property; no portrait horizontal offset.
7. **A6 — visibility (amended by controller ruling B-I2).** Per-planet opacity = a dt-eased **fade-in follower** (`shown` eases toward `planetPresenceTarget` — 1 for any chapterProgress past 0 inside Worlds, 0 at cp 0 and outside — at `PLANET_FADE_IN_RATE`; no allocation, a huge `dt` lands on the target, a NaN / non-positive `dt` is no step) × `planetFadeOut` (scroll-scrubbed: 1 through the window and its edge margin, then the last planet's long 0.77 → 0.90 fade-out, 0 outside Worlds) × `planetWeight(worldsCursor, k)` (1 while its case dwells, a straight cross-fade only inside the cursor's travel stretch, weights sum to 1, scrubbed) × the ignition curtain; `visible = false` at ~0. **Why the fade-in became a trigger:** a Dock / rail / back-link arrival lands at `start + 0.001` (chapterProgress 0.0036) with the panel lit by its 0/1 target, but a scrubbed fade-in left the planet at 2 % opacity although it was already in place and full size — a half-built arrival frame. The planet only travels ~28 px between arrival and its slot centre, so nothing is lost by showing it at once. `worldsSoften` (the starfield pull) is **not** given the same ramp: `Starfield` already eases `chapterSoften` with `dt` (tau ≈ 0.33 s) and the pull is cosmetic; the stars are sharp on arrival from Orbit anyway. Clearance (≥ `PLANET_RADIUS + 3`) is asserted over each planet's **visible interval only** — the corridor after Worlds passes within ~4 units of this spot, so hiding the planet is load-bearing.
8. **A7 — rebuild key.** `planetsKey(features)` / `planetsFromKey(key)` are a pure pair in `Planet.ts` (`[]` ↔ `""`, `["none"]` ↔ `"none"`); `SceneRoot` computes the key during render and its effect reads `planetsFromKey(planetKey)`, so the dependency array is honest and `react-hooks/exhaustive-deps` stays quiet.
9. **A8 — subtle motion accepted** (~60 px of planet travel per slot at 1440, N = 3); documented design range: designed and tested up to 8 published case studies (clearance is verified to N = 8; the same number as Global Constraints, README and `insights.md`).
10. **A9 — `/voyage#worlds` is fixed in this slice.** `id="worlds"` only exists after VoyageRoot's `tier === null` boot gate, so a hash arrival (the "Back to the voyage" link on `/work/[slug]`) landed at the top. A pure `chapterForHash` / `hashArrivalProgress` plus a one-shot, ref-guarded effect in `VoyageRoot` jump to the chapter's `start + 0.001` once the tier resolves, through a new immediate mode on `voyageStore.scrollTo` (still programmatic, so the Jump beat does not fire). `Worlds` owns `id="worlds"`; `worlds` leaves the placeholder list.
11. **A10 — seed.** `canSeedPlaceholders(uri, argv)` fails closed; the seed is idempotent (`getBySlug` → `update` | `create`), `published: true` is explicit, an existing case is validated in `"update"` mode (only the keys the literal lists are written, so a defaulted field it omits — `planetFeature`, `published` — is never rewritten; `diagram` has no spec default and is untouched in either mode), output goes through `appendLog("seed", …)`. The decision and its logging live in `seedPlaceholdersIfAllowed({ uri, argv, store, log })` (tested with refused / allowed cases), so the script only maps `ran === false` to `process.exitCode = 1`. **Recorded interpretation:** a refusal logs, writes no case studies and sets `process.exitCode = 1`, but does NOT abort the pre-existing seeding of projects, skills, settings, services and process steps — that unguarded wipe is pre-existing and this slice does not widen it (documented in `insights.md` and `README.md`). Spec §6's "writing nothing" therefore holds for the case studies, not for the rest of the seed — so the guard is evaluated **before** the wipe too, and a refusal is announced there ("case studies will be skipped; the rest of the seed will still run"), not only after it. The T4 commit message says the same.
12. **A11 — nebula.** The reference is `MengTo/threeui` `julian-vance-nebula.html` (MIT, 2D simplex, not vendored). Only the fBm constants (4 octaves, start amplitude 0.55, gain 0.5, lacunarity 2.05) and the domain-warp *idea* (offset the sample point by fBm of itself) are ported. The warp as shipped is not the source's `p += fbm(…) * 0.35` (two fBm calls on a 2D point): it is three fBm calls on a 3D point, centred on 0.52 (value noise is not zero-mean) and scaled by 0.7, `p += (w − 0.52) * 0.7`; the noise primitive is the 3D value noise `EnergyOrb` already uses, sampled on the sphere's object-space direction (no UV seam). The attribution header in `Planet.ts` says exactly this.
13. **A12 — precompile.** `renderer.compile(scene, camera)` runs right after the pieces are built (synchronous; it walks hidden objects too), wrapped in try/catch with a new allow-listed `scene.compile_failed` event. three reports a GLSL error through `renderer.debug.onShaderError` / `console.error`, not as an exception from `compile()`, so the hook (`renderer.debug.onShaderError`, fed by the pure `shaderErrorMessage` — a truncated info log, nothing else) is what actually feeds the event; the try/catch only guards the call. The browser review re-measures the first entry into Orbit and into Worlds and the mount-to-first-frame cost of the compile.
14. **A13 — payload.** Today `/voyage` sends no case-study bytes; the slim `WorldCase` is the only case data reaching the client: ≈ 1.8 KB of JSON worst case (≈ 1.5 KB of field text — A13's figure — plus keys and quoting), ~0.8 KB typical; a test caps the JSON at 2000 characters.
15. **Plan-level choices (this plan).**
    - `PlanetFeature` and `toPlanetFeature` live in a pure `src/lib/planetFeature.ts` (derived from the CMS select's option list), so `Planet.ts` (client), `worldCase.ts` (server) and `SceneRoot` can all use them without making Wave 2 depend on Wave 1's mapper or pulling `marked` into the client. `WorldCase` / `toWorldCase` live in `src/lib/worldCase.ts`; client files import the type only.
    - `caseCentre(i, n)` is exported from `worldsSchedule.ts` (the planets are placed from it); the planets' envelope lives in `Planet.ts` as `planetPresenceTarget` (the 0/1 fade-in target) and `planetFadeOut` (the scrubbed long last-planet tail), because A6 amends the spec's "`worldsPresence` for the planets" — `worldsPresence` now only feeds the starfield pull.
    - `WORLDS_SOFTEN_PEAK = 0.6` (lighter than Approach's 1.0, a little lighter than Orbit's 0.75: the planets and the panel are the subject). A browser-review tunable.
    - Portrait target applies when the camera aspect is below 1 (a portrait tablet ≥ 768 px gets the portrait planet with the desktop panel: accepted, outside the review matrix).
    - Desktop panels share one CSS grid cell (box = tallest panel, no fixed height to tune); the phone box is absolute and capped (A4), and **only its excerpt block gives way** on a short viewport — the link is never clipped. Between 768 and 1099 px the three excerpt columns stack (a 44vw panel is too narrow for three). Desktop stack chips are bounded to two rows (`max-height: 3.6rem`), lifted in the still tier.
    - When the panel holding keyboard focus goes inactive (keyed on the lit index) `Worlds` blurs it, so Enter cannot open a case that is not on screen. Tab from an Orbit panel skips Worlds until the scroll position is inside it (every Worlds link is `tabindex -1` outside its hold — the same design as `Process`).
    - The planet surface is lit by the direction to the star, so the visible face is mostly the night side (the star is behind and to the left): `PLANET_NIGHT_FLOOR = 0.12` keeps the noise readable, and the storm band glows a little on its own.
    - `Worlds` labels its section `aria-label="Work"` (the dock link's name), its decorative `CASE 01` ordinal is `aria-hidden`, and each link's accessible name is "Read the case study: <title>" so three identical links can be told apart.
    - One new client event, `scene.compile_failed`; `useHashArrival(tier)` is a hook in its own file (so the one-shot / StrictMode / unknown-hash behaviour is unit-tested), not an inline effect.
16. **Commit trailer** on every commit: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Execution amendments

*(Recorded after the browser review. Where a bullet below contradicts the Decisions section or a task's code, the bullet is what shipped.)*

- **Tasks 1–7:** executed as written; the task reports record no deviation from the brief. Full-suite counts on the merged branch at each commit: `e102143` 516 / 41 files (baseline) → T1 `adfc4d8` 520 / 41 → T2 `8af8d1e` 544 / 42 → T3 `a37348c` 566 / 44 → T4 `782c728` 586 / 46 → T5 `21deefb` 626 / 47 → T6 `a9396b7` 659 / 48 → T7 `0a96f0b` 685 / 51 (the plan's expected 685 / 51). The per-worktree counts in the individual task reports (542, 540, 619, …) are lower because each ran without the other wave members' files.
- **Task 8, retune (`319ab0a`):** `PLANET_RADIUS` 2.5 → 2.2 and `PLANET_TARGET_LANDSCAPE.x` 0.40 → 0.50. At 1440×900 case 1's ring ran into the star's halo and the planet (~110 px radius) outweighed the star; by case 3 the growing halo lapped the planet's limb. Supersedes the A6 values in Global Constraints.
- **Task 8, staged panel swap (`b21e3a8`):** `.world-panel` opacity runs 0.32 s with a 0.16 s delay, and `[data-solo-off]` opacity runs 0.16 s with no delay, pinned in `voyageCss`. The task 6 CSS had one simultaneous 0.45 s cross-fade, which superimposed two three-column panels' text at about 50 % each (unreadable, frozen mid-transition under the Web Animations API).
- **Task 8, hash arrival is three layers, not one (supersedes A9):** `adbe339` (F3) makes `useHashArrival` clear the fragment after the jump with `history.replaceState(history.state, "", path + search)`; `b4333b8` adds `.chapter--worlds { scroll-margin-top: -1.625vh }` (`HASH_ARRIVAL_EPS` × `VOYAGE_SCROLL_VH`, pinned in `voyageCss`) and corrects the `worldsSchedule` header comment. Even after F3, one cold dev load kept the hash and landed on the section top (0.35385, every panel dark), because a native fragment scroll, from the browser or the Next router, ran after our jump. With the margin a cold hard load lands on 0.35484, lit, hash cleared. Cost: a reload or copied URL after arriving no longer deep-links to `#worlds`.
- **Task 8, a third planet target (`7a6ca3b`, F2; supersedes Decision 15's accepted portrait tablet and the matching "Deferred / carried" item):** `PLANET_TARGET_PORTRAIT_WIDE = (0.5, −0.55)` for a portrait window wider than `PHONE_MAX_WIDTH` (767), selected by the new `FrameContext.viewportWidth` (set from `window.innerWidth` in `SceneRoot`, updated on resize); `planetTarget` / `planetPosition` take a `wide` flag and re-place when the aspect or the flag changes. At 768×1024 the planet took the phone target and sat half behind the desktop panel; the plan's suggested fallback, the landscape target, would have put it over the star.
- **Task 8, the planet swap is a timed trigger (`da5aee9`, F1; supersedes A6's `planetWeight` and the Architecture paragraph's "the per-planet cross-fade stays scrubbed"):** each planet's visibility follows its panel's 0/1 `caseTarget` through a per-planet `dt`-eased `swap` follower, staged so the outgoing planet clears below `PLANET_SWAP_CLEAR` (0.02) before the incoming one rises (`PLANET_SWAP_OUT_RATE` 20, `PLANET_SWAP_IN_RATE` 8; the swaps snap while the group is hidden so an arrival lands on the lit planet). `planetWeight` and the scroll-scrubbed per-planet cross-fade are deleted; planet opacity is now `shown × planetFadeOut × swap[k] × ignite`. Only the last planet's long fade-out still follows scroll. At rest just past a slot boundary the scrubbed version showed two half-transparent planets (see-through ghosting). User decision: "swap on a timer", which extends the no-partial-rest-frames rule to anything that dissolves one subject into another (a trigger plus a timed fade; camera motion and placement may still follow scroll).
- **Task 8, other findings against the plan's text:** the plan expected the diagram upload to leave the panels' shared grid cell "unchanged"; it grows from 507 to 556 px (the box is the tallest panel), which is harmless. `renderer.compile` is free at mount but bought nothing visible: the slice-4 first-entry hitch did not reproduce with or without it. Phones at 390×740 and 375×667 clip the excerpts by 23 / 48 px by design (the link stays whole), so a "no clipped copy" check holds at 1440, 1024 and 390×844 only. Baselines: 29 PNGs in `screenshots/voyage/slice-5/` (`810639f`).
- **Task 8, seeding for the review:** only the three placeholders were seeded, through `seedPlaceholdersIfAllowed` from a scratch script, with no wipe of the other local collections; the plan's `npm run seed` would also have reset projects, skills, settings, services and steps.
- **Final-review fix wave (supersedes the A6 / Decision 7 text on the last planet's fade-out and the `PLANET_FADE_OUT_END` sentence in Global Constraints):** four commits, 704 → **727 passed / 51 files**, `tsc` clean, `eslint src/scene src/components/voyage src/app/voyage` 0 errors, 0 warnings.
  - **I1, `291ea32` (+ M8):** the desktop Worlds panel was unbounded, so at width ≥ 768 px and a short height the centred pin overflowed and the case link fell off-screen (measured at 1024×600, 960×540, 932×430, 844×390). `.worlds` is now bounded to `max-height: calc(100vh - 2 * 4.5rem - 2.652rem)`: the pin is 100vh and centres the label and the box, so label + box sit between two margins of 4.5rem (the dock clearance the phone pins already use; dock bottom = 20 + 36 + 11.2 + 2 = 69.2 px), and the label block is 0.72rem × the body's 1.6 line-height + 1.5rem margin = 2.652rem (42.4 px). So the box is at most 100vh − 186.4 px (713 px at 900, 414 at 600, 354 at 540, 244 at 430, 204 at 390). The grid row is `minmax(0, 1fr)` and the panel inherits the `max-height`; the excerpt block (`.world-panel__cols`, `flex: 0 1 auto; min-height: 0; overflow: hidden`) is the only shrinking child (shrink-only, not the phone's `1 1 0`, because the desktop box has no definite height and a zero basis would collapse it). The phone rule and the still tier reset `max-height`. Below that bound the full panel still does not fit (index + title + meta + chips + link is about 300 px, which is more than 244 or 204), so a compact tier, `@media (min-width: 768px) and (max-height: 560px)`, takes the phone box's values: foot hidden, title 2 lines, meta 1 line with an ellipsis, excerpts 2 lines, the phone padding and type scale. Compact content is about 135 px plus the excerpts, so the link fits down to a viewport about 320 px tall. The compact rules are scoped `:not([data-static="true"])`, so the still tier is never compacted. Pinned in `voyageCss.test.ts` (the vacuous link `flex-shrink` pin was dropped and the phone-box test title corrected, M8).
  - **M1, `fb22052`:** `useHashArrival` now verifies the landing on the next frame and after 300 ms (store progress within `PROGRAMMATIC_EPS` of the target) and repeats the immediate scroll, at most twice; the fragment is still cleared immediately (the retries make a miss recoverable and `scroll-margin-top` already makes a late native scroll safe); the checks are cancelled on unmount and survive StrictMode's simulated unmount without re-scrolling.
  - **M2, `cf07937` (user decision 2026-10-14, "timed fade + safety cut"):** the last planet's leave is a 0/1 target (`planetLeaveTarget`, 1 inside Worlds while cp < `PLANET_LEAVE_AT` = 0.80) eased by a `dt` follower at `PLANET_LEAVE_RATE` = 12 (≤ 0.05 left within 0.3 s at 60 and at 30 fps), snapping while the group is hidden; cp ≥ `PLANET_FADE_OUT_END` (0.90) stays a positional cut. The desktop pin releases at 0.778, so the planet is still up there; the phone pin releases at 0.858, after the leave, so on a phone the planet is gone by then (accepted trade-off, "last planet still shows at both pin releases" now asserts it). `planetFadeOut` was renamed `planetLeaveTarget`.
  - **Baselines re-shot in `fc3a72d`:** `mobile-pin-release.png` (the phone's pin release now shows the panel with no planet, per M2) and `desktop-1024-case2.png` (the I1 bound changed the panel box) were re-shot after the fix wave; the Task 8 caption "planet 3 ≈ 25 % shown" at the mobile pin release is superseded by M2.
  - **M3 + M7 (the docs commit):** `Worlds` trims title, client and context (a whitespace-only title renders no `<h2>`); a comment at the `useHashArrival` call site in `VoyageRoot` says it must stay before `useJumpBeat`; Decision 9 and A11 above were aligned with what shipped.
- **Test count after the fix wave:** 685 → **704 passed / 51 files** (`b21e3a8` +1, `adbe339` +2, `7a6ca3b` +5, `da5aee9` +10, `b4333b8` +1); the plan's 685 is the count after Task 7.
- **Task 9, build:** `npm run build` ran in a throwaway worktree (`git worktree add ../portfolio-s5-build`, then removed and pruned), not in this checkout, because a real-tree `next build` earlier hung the live dev server. A symlinked `node_modules` is rejected by Turbopack (`Symlink node_modules is invalid, it points out of the filesystem root`); an APFS clone (`cp -c -R`) worked. `.env.local` was symlinked and never printed. `slice5-global-constraints.md` under `.superpowers/sdd/` is gitignored and was not updated; this plan's Global Constraints are the maintained copy.

## Deferred / carried (not in this slice)

Belt, Dark Passage and Constellation are slice 6; making the chapter table data-dependent (spec §5's hide-and-drop rule) and a redesign of `/work/[slug]` are out of scope; real case-study copy is the owner's. Carried and still open: `Launch.tsx` has no `useReducedMotion()` guard; Playwright integration tests are deferred to slice 8; `Services`, `Process` and now `Worlds` re-render on every store emit (add a selector when slice 8 measures it); the scroll-region `tabIndex` fix is for `Process` only; spec §5:129 (empty data hides the chapter and drops its waypoint) is still not implemented anywhere; `getVoyageContent` still fetches `testimonials`, which slice 6 will finally use; mid-tier blur cost at ≥ 768 px coarse pointer; the Safari / Firefox late-scroll-restoration spurious beat; browser **Back** restoring a scroll position into `/voyage` shares the hash-arrival root cause (a restored position is applied before the boot gate lifts) and is not fixed here; the existing seed wipes five collections without a guard (pre-existing, documented, not widened); a portrait tablet (≥ 768 px wide, aspect < 1) gets the portrait planet target with the desktop panel; `still`-tier Worlds overflows the fixed 450vh section once five or more long cases stack on a phone — the same class of limit Services (150vh) and Process (300vh) have.

## Parallelism (which tasks may run in parallel worktrees)

| Wave | Tasks | File ownership (nothing is shared inside a wave) |
|---|---|---|
| 0 | **T1** alone | `src/scene/camera/flightPath.ts`, `src/scene/camera/flightPath.test.ts`. Changes the table and the star clock; everything else reads them. |
| 1 | **T2** ∥ **T3** ∥ **T4** | **T2:** new `src/scene/chapters/worldsSchedule.ts` + `.test.ts`. **T3:** `src/lib/markdown.ts` + `.test.ts`, new `src/lib/planetFeature.ts` + `.test.ts`, new `src/lib/worldCase.ts` + `.test.ts`, `src/app/voyage/page.tsx`, `src/components/voyage/VoyageRoot.tsx`. **T4:** new `src/lib/seedGuard.ts` + `.test.ts`, new `src/lib/placeholderCases.ts` + `.test.ts`, `scripts/seed.ts`. All three need only T1 merged. |
| 2 | **T5** ∥ **T6** | **T5:** new `src/scene/chapters/Planet.ts` + `.test.ts`, `src/scene/quality.ts` + `.test.ts` (consumes T2's `worldsSchedule` and T3's `planetFeature`). **T6:** new `src/components/voyage/Worlds.tsx` + `.test.tsx`, `src/app/voyage/voyage.css`, `src/app/voyage/voyageCss.test.ts` (consumes T2's `caseTarget` / holds and T3's `WorldCase`). Both need Waves 0–1 merged; neither touches the other's files. |
| 3 | **T7** alone | `src/scene/SceneRoot.tsx`, new `src/scene/shaderLog.ts` + `.test.ts`, `src/scene/chapters/Starfield.ts` + `.test.ts`, `src/components/voyage/VoyageRoot.tsx`, `src/scene/scroll/voyageStore.ts` + `.test.ts`, `src/scene/scroll/VoyageScroll.tsx`, new `src/components/voyage/chapterHash.ts` + `.test.ts`, new `src/components/voyage/useHashArrival.ts` + `.test.tsx`, `src/lib/clientLog.ts`, `src/app/api/logs/route.test.ts`. Consumes everything above. |
| 4 | **T8**, then **T9** | T8 is the controller's browser review; T9 is docs + closing verification. |

**Test counts.** Every "Expected" line gives the new per-file totals, which are absolute. Whole-suite totals depend on merge order; the baseline at `e102143` is **516 passed / 41 files**, and run in the order T1 → T7 the suite reads **520** (T1), **544** (T2), **566** (T3), **586** (T4), **626** (T5), **659** (T6), **685** (T7) — **685 passed / 51 files** in all (+169 tests, +10 files).

---

## File Structure

| Path | Responsibility | New / Modified |
|---|---|---|
| `src/scene/camera/flightPath.ts` | `worlds.spanVh` 450, `VOYAGE_SCROLL_VH = 1625`, `starClock` behind `starScale` / `distanceAU` | Modified |
| `src/scene/camera/flightPath.test.ts` | Table pins (1625 / 450), golden star values from the slice-4 tree, star-clock tests | Modified |
| `src/scene/chapters/worldsSchedule.ts` | Pure shared schedule: `WORLDS_WINDOW`, `worldsPresence`, `worldsCursor`, `caseTarget`, `caseCentre`, derived holds | **New** |
| `src/scene/chapters/worldsSchedule.test.ts` | Exhaustive N = 0/1/2/3/4/6/12 schedule tests | **New** |
| `src/lib/markdown.ts` / `.test.ts` | `caseExcerpt` (server-side plain-text excerpt) beside `renderMarkdown` | Modified |
| `src/lib/planetFeature.ts` / `.test.ts` | Pure `PlanetFeature` type + `toPlanetFeature` guard | **New** |
| `src/lib/worldCase.ts` / `.test.ts` | `WorldCase` DTO + `toWorldCase` (server-side mapper) | **New** |
| `src/app/voyage/page.tsx` | Maps `caseStudies` → `WorldCase[]` and passes `worlds` | Modified |
| `src/lib/seedGuard.ts` / `.test.ts` | `canSeedPlaceholders(uri, argv)` — fail-closed local-database guard | **New** |
| `src/lib/placeholderCases.ts` / `.test.ts` | Three placeholder cases (ring / moon / storm), idempotent `seedPlaceholderCases`, and the guarded, logged `seedPlaceholdersIfAllowed` | **New** |
| `scripts/seed.ts` | Pre-wipe refusal notice; guarded placeholder step (`ran === false` → exit code 1) | Modified |
| `src/scene/quality.ts` / `quality.test.ts` | `TierSettings.planetSegments` (64 / 32 / 0) | Modified |
| `src/scene/chapters/Planet.ts` / `.test.ts` | Chapter-05 set piece: N planets, nebula-noise surface shader, ring / moon / storm, placement, dt-eased fade-in follower + scrubbed fades, key helpers | **New** |
| `src/components/voyage/Worlds.tsx` / `.test.tsx` | Chapter 05 DOM: one glass case panel at a time, empty state, a11y, still tier, owns `id="worlds"` | **New** |
| `src/app/voyage/voyage.css` | `.worlds*` / `.world-panel*` styles, phone box (excerpt block gives way, link never clipped), 768–1099 stacking, bounded stack chips, still-tier rules | Modified |
| `src/app/voyage/voyageCss.test.ts` | Pins the Worlds CSS no jsdom test can see | Modified |
| `src/scene/chapters/Starfield.ts` / `.test.ts` | `worldsSoften` + `WORLDS_SOFTEN_PEAK`; `chapterSoften` dispatches to Worlds | Modified |
| `src/scene/scroll/voyageStore.ts` / `.test.ts`, `VoyageScroll.tsx` | `scrollTo(p, { immediate })` and the scrollers that honour it | Modified |
| `src/components/voyage/chapterHash.ts` / `.test.ts` | Pure `chapterForHash` / `hashArrivalProgress` | **New** |
| `src/lib/clientLog.ts`, `src/app/api/logs/route.test.ts` | `scene.compile_failed` event | Modified |
| `src/scene/SceneRoot.tsx` | `planets` prop + stable key, `new Planet(...)` in `pieces`, `renderer.compile` with `onShaderError` logging | Modified |
| `src/scene/shaderLog.ts` / `.test.ts` | Pure `shaderErrorMessage`: a truncated GLSL info log for `scene.compile_failed` | **New** |
| `src/components/voyage/useHashArrival.ts` / `.test.tsx` | One-shot, ref-guarded hash-arrival hook (jsdom `renderHook` tests) | **New** |
| `src/components/voyage/VoyageRoot.tsx` | `worlds` prop; mounts `<Worlds>`; `planets` to `SceneRoot`; calls `useHashArrival`; `worlds` leaves the placeholders | Modified |
| `screenshots/voyage/slice-5/*.png` | Visual baselines | **New** (T8) |
| `worklog.md` / `insights.md` / `design.md` / `README.md` / `docs/superpowers/specs/2026-09-14-consulting-content-model-design.md` | Slice-5 record; the seed paragraph; stale `1400` notes | Modified (T9) |

---
### Task 1: Chapter table at 1625vh and the star clock (A1)

**Runs alone, first. Everything else rebases on it.**

**Files:**
- Modify: `src/scene/camera/flightPath.ts` (`VOYAGE_SCROLL_VH`, `worlds.spanVh`, new `starClock`, `starScale` / `distanceAU`)
- Test: `src/scene/camera/flightPath.test.ts` (the two table literals; golden star values; star-clock tests)

**Interfaces:**
- Consumes: nothing new.
- Produces (every later task relies on these exact names):
  ```ts
  // flightPath.ts
  export const VOYAGE_SCROLL_VH = 1625;
  // CHAPTERS: worlds.spanVh === 450; every other span unchanged; start/end derived, bit-exact contiguity
  export function starClock(progress: number): number;   // 0..1, exactly 1 from The Pilot's start; Worlds counts as its old 225vh
  export function starScale(progress: number): number;   // same curve as slice 4 at every (chapter, chapterProgress) outside Worlds
  export function distanceAU(progress: number): number;  // ditto
  ```

**Why the goldens come first.** The map measured that changing the table alone fails exactly one existing test (`expected 1625 to be 1400`; its sibling spans-table literal sits in the same `it`) but silently shrinks the star 10–21 % at Approach and Orbit. The golden values below were captured at 17 digits from the **slice-4 tree** (`VOYAGE_SCROLL_VH` 1400) at the slice-3/4 capture points, keyed by `(chapter, chapterProgress)`; they pass against the old code and must still pass after the swap — that is what "pixel-identical star outside Worlds" means. They are written into the test file in the same step as the table pins, so the red is only the table pins and the new `starClock` export.

- [ ] **Step 1: Write the failing tests**

In `src/scene/camera/flightPath.test.ts`, replace:

```ts
import {
  CHAPTERS, CONTENT_CHAPTERS, chapterAt, getCameraPose, distanceAU, starScale,
  fovForVelocity, FOV_MIN, FOV_MAX, STAR_POSITION, LAUNCH_LOOK_OFFSET,
  CAMERA_WAYPOINTS, progressToCurveT, sectionHeightVh, VOYAGE_SCROLL_VH, VOYAGE_TAIL_VH,
  progressAt, bankForProgress, BANK_MAX,
} from "./flightPath";

const STEPS = 400;
```

with:

```ts
import {
  CHAPTERS, CONTENT_CHAPTERS, chapterAt, getCameraPose, distanceAU, starScale,
  fovForVelocity, FOV_MIN, FOV_MAX, STAR_POSITION, LAUNCH_LOOK_OFFSET,
  CAMERA_WAYPOINTS, progressToCurveT, sectionHeightVh, VOYAGE_SCROLL_VH, VOYAGE_TAIL_VH, type ChapterId,
  progressAt, bankForProgress, BANK_MAX, starClock,
} from "./flightPath";

const STEPS = 400;
```

In `src/scene/camera/flightPath.test.ts`, replace:

```ts
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
```

with:

```ts
    }
  });
  it("declares its spans in vh and derives every fraction from one cumulative sum", () => {
    expect(VOYAGE_SCROLL_VH).toBe(1625);
    // The user's pacing decisions, pinned: Orbit grew (150 → 300, slice 4) and Worlds grew (225 → 450, slice 5).
    expect(CHAPTERS.map((c) => [c.id, c.spanVh])).toEqual([
      ["launch", 100], ["approach", 150], ["jump", 25], ["orbit", 300], ["worlds", 450],
      ["belt", 100], ["passage", 37.5], ["constellation", 137.5], ["pilot", 125],
      ["landing", 137.5], ["surface", 62.5],
    ]);
```

In `src/scene/camera/flightPath.test.ts`, replace:

```ts
  });
});

describe("curves", () => {
  it("distanceAU is monotonically non-increasing and 0 from pilot onward", () => {
    let prev = Infinity;
```

with:

```ts
  });
});

// Slice 5 (A1). Worlds grew 225 → 450vh, which would have divided every pre-Worlds position by a
// longer "vh to The Pilot" and shrunk the star 10-21% at Approach / Orbit. starScale and distanceAU
// are therefore keyed by (chapter, chapterProgress) through starClock, with Worlds counted as its
// slice-4 225vh. These values were captured at 17 digits from the slice-4 tree (VOYAGE_SCROLL_VH
// 1400), i.e. they ARE the slice-3/4 baselines the screenshots were taken against.
const STAR_GOLDEN: readonly (readonly [ChapterId, number, number, number])[] = [
  // [chapter, chapterProgress, starScale, distanceAU]
  ["launch", 0, 0.25, 9.4],
  ["launch", 0.625, 0.2709572742022715, 8.853488372093023],
  ["approach", 1 / 3, 0.363899405083829, 8.088372093023256],
  ["approach", 0.96, 0.5320119537047051, 7.266418604651164],
  ["jump", 0.5, 0.571984856679286, 7.104651162790698],
  ["orbit", 0, 0.6001081665765278, 6.995348837209303],
  ["orbit", 0.11249999999999999, 0.6801810911303408, 6.700232558139535],
  ["orbit", 0.25749999999999995, 0.7912548145484044, 6.319860465116279],
  ["orbit", 0.40249999999999997, 0.9096085323418064, 5.939488372093024],
  ["orbit", 0.5475, 1.0335327721471064, 5.559116279069768],
  ["orbit", 0.999, 1.4364218146959438, 4.374716279069768],
  ["worlds", 0, 1.4373174689021091, 4.372093023255814],
  ["worlds", 0.5, 1.7633180097349916, 3.388372093023257],
  ["worlds", 0.999, 2.0493776878977283, 2.4066186046511637],
  ["belt", 0, 2.0498918334234717, 2.404651162790699],
  ["belt", 0.5, 2.1568685776095187, 1.9674418604651156],
  ["constellation", 0, 2.303474851270957, 1.20232558139535],
  ["constellation", 0.5, 2.374743949432125, 0.6011627906976744],
  ["pilot", 0, 2.4, 0],
  ["pilot", 0.5, 2.4, 0],
  ["landing", 0.5, 2.4, 0],
  ["surface", 0.5, 2.4, 0],
];

describe("star clock (slice 5, A1)", () => {
  it("keeps starScale and distanceAU at their slice-4 values at every capture point, whatever the table's length", () => {
    for (const [id, t, scale, au] of STAR_GOLDEN) {
      expect(starScale(progressAt(id, t)), `starScale ${id} ${t}`).toBeCloseTo(scale, 12);
      expect(distanceAU(progressAt(id, t)), `distanceAU ${id} ${t}`).toBeCloseTo(au, 12);
    }
  });

  it("counts Worlds as its old 225vh: Worlds' own growth is spread over its 450vh", () => {
    // cumulative star-clock vh before Worlds = 575, Worlds = 225, up to The Pilot = 1075.
    expect(starClock(progressAt("worlds", 0))).toBeCloseTo(575 / 1075, 12);
    expect(starClock(progressAt("worlds", 0.5))).toBeCloseTo(687.5 / 1075, 12);
    expect(starClock(progressAt("belt", 0))).toBeCloseTo(800 / 1075, 12);
    // Star-clock units gained per scroll-vh: 1/1075 in every chapter that keeps its length (Orbit
    // here), and half of that inside Worlds — the same star growth now takes twice the scroll.
    const perVh = (a: number, b: number) => (starClock(b) - starClock(a)) / ((b - a) * VOYAGE_SCROLL_VH);
    expect(perVh(progressAt("orbit", 0.25), progressAt("orbit", 0.75)) * 1075).toBeCloseTo(1, 9);
    expect(perVh(progressAt("worlds", 0.25), progressAt("worlds", 0.75)) * 1075).toBeCloseTo(0.5, 9);
  });

  it("is 0 at the start, exactly 1 from The Pilot on, and continuous across every chapter boundary", () => {
    const pilot = CHAPTERS.find((c) => c.id === "pilot")!;
    expect(starClock(0)).toBe(0);
    expect(starClock(pilot.start)).toBe(1);
    expect(starClock(1)).toBe(1);
    for (let i = 1; i < CHAPTERS.length; i++) {
      const b = CHAPTERS[i].start;
      expect(starClock(b * (1 - 1e-9))).toBeCloseTo(starClock(b), 6);
    }
  });

  it("never decreases along the whole voyage, and starScale / distanceAU follow it", () => {
    let prev = -Infinity;
    let prevScale = -Infinity;
    let prevAU = Infinity;
    for (let k = 0; k <= 20000; k++) {
      const p = k / 20000;
      const c = starClock(p);
      expect(c).toBeGreaterThanOrEqual(prev - 1e-12);
      expect(starScale(p)).toBeGreaterThanOrEqual(prevScale - 1e-12);
      expect(distanceAU(p)).toBeLessThanOrEqual(prevAU + 1e-12);
      prev = c;
      prevScale = starScale(p);
      prevAU = distanceAU(p);
    }
  });
});

describe("curves", () => {
  it("distanceAU is monotonically non-increasing and 0 from pilot onward", () => {
    let prev = Infinity;
```

In `src/scene/camera/flightPath.test.ts`, replace:

```ts
    }
    expect(starScale(0)).toBeCloseTo(0.25, 5);
    expect(starScale(1)).toBeCloseTo(2.4, 5);
    // PILOT_START is derived from the table, so the growth ends exactly where The Pilot starts.
    const pilot = CHAPTERS.find((c) => c.id === "pilot")!;
    expect(starScale(pilot.start)).toBeCloseTo(2.4, 5);
    expect(starScale(pilot.start * 0.99)).toBeLessThan(2.4);
```

with:

```ts
    }
    expect(starScale(0)).toBeCloseTo(0.25, 5);
    expect(starScale(1)).toBeCloseTo(2.4, 5);
    // The star clock is derived from the table, so the growth ends exactly where The Pilot starts.
    const pilot = CHAPTERS.find((c) => c.id === "pilot")!;
    expect(starScale(pilot.start)).toBeCloseTo(2.4, 5);
    expect(starScale(pilot.start * 0.99)).toBeLessThan(2.4);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scene/camera/flightPath.test.ts`
Expected: FAIL — the table test fails with `expected 1400 to be 1625`, and the three star-clock tests fail with `TypeError: starClock is not a function` (vitest 5 imports a not-yet-exported name as `undefined`, so the file still collects). The golden test **passes** against the old code: that is the point. Summary line: `Tests  4 failed | 32 passed (36)`.

- [ ] **Step 3: Implement the table change and the star clock**

In `src/scene/camera/flightPath.ts`, replace:

```ts
/** Scrollable range of the voyage in vh — the denominator the store's progress divides by.
 *  Every chapter span below sums to it (pinned by a test). Spans, not fractions, are what is
 *  declared: the smallest content chapters (Launch, Belt) are 100vh, exactly the 100vh sticky
 *  `.chapter__pin`, so their pin hold is 0 but they still clear it; total travel = 14
 *  viewports + 1 tail. Declared before CHAPTERS because the table reads it at module load. */
export const VOYAGE_SCROLL_VH = 1400;

type ChapterDef = Omit<Chapter, "start" | "end">;
```

with:

```ts
/** Scrollable range of the voyage in vh — the denominator the store's progress divides by.
 *  Every chapter span below sums to it (pinned by a test). Spans, not fractions, are what is
 *  declared: the smallest content chapters (Launch, Belt) are 100vh, exactly the 100vh sticky
 *  `.chapter__pin`, so their pin hold is 0 but they still clear it; total travel = 16.25
 *  viewports + 1 tail. Declared before CHAPTERS because the table reads it at module load. */
export const VOYAGE_SCROLL_VH = 1625;

type ChapterDef = Omit<Chapter, "start" | "end">;
```

In `src/scene/camera/flightPath.ts`, replace:

```ts
  { id: "approach",      label: "APPROACH VECTOR", index: "02", spanVh: 150,   micro: false },
  { id: "jump",          label: "JUMP",            index: "03", spanVh: 25,    micro: true  },
  { id: "orbit",         label: "ORBIT",           index: "04", spanVh: 300,   micro: false },
  { id: "worlds",        label: "WORLDS",          index: "05", spanVh: 225,   micro: false },
  { id: "belt",          label: "THE BELT",        index: "06", spanVh: 100,   micro: false },
  { id: "passage",       label: "DARK PASSAGE",    index: "07", spanVh: 37.5,  micro: true  },
  { id: "constellation", label: "CONSTELLATION",   index: "08", spanVh: 137.5, micro: false },
```

with:

```ts
  { id: "approach",      label: "APPROACH VECTOR", index: "02", spanVh: 150,   micro: false },
  { id: "jump",          label: "JUMP",            index: "03", spanVh: 25,    micro: true  },
  { id: "orbit",         label: "ORBIT",           index: "04", spanVh: 300,   micro: false },
  { id: "worlds",        label: "WORLDS",          index: "05", spanVh: 450,   micro: false },
  { id: "belt",          label: "THE BELT",        index: "06", spanVh: 100,   micro: false },
  { id: "passage",       label: "DARK PASSAGE",    index: "07", spanVh: 37.5,  micro: true  },
  { id: "constellation", label: "CONSTELLATION",   index: "08", spanVh: 137.5, micro: false },
```

In `src/scene/camera/flightPath.ts`, replace:

```ts
  return pose;
}

const PILOT_START = CHAPTERS.find((c) => c.id === "pilot")!.start;

const smooth = (t: number) => t * t * (3 - 2 * t);

/** The camera approach already magnifies the star ~6x, and The Pilot's glare does the
 *  "fills the frame" beat — so the geometric scale only needs to reach 2.4. */
```

with:

```ts
  return pose;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** The star's growth is paced on a "star clock" in which Worlds counts as its slice-4 length
 *  (225vh), however long its section is. starScale / distanceAU used to divide ABSOLUTE progress
 *  by The Pilot's start, so lengthening Worlds (225 → 450vh, slice 5) would have pushed that
 *  start out and shrunk the star 10-21% at Approach and Orbit. Keyed by (chapter,
 *  chapterProgress) instead, every position outside Worlds keeps its slice-3/4 size exactly
 *  (pinned by golden values in flightPath.test.ts); inside Worlds the star grows at half the
 *  old rate per scroll-vh (accepted: Worlds is twice as long for the same growth). */
const STAR_CLOCK_WORLDS_VH = 225;
const starClockVh = (c: Chapter) => (c.id === "worlds" ? STAR_CLOCK_WORLDS_VH : c.spanVh);
/** Star-clock vh before each chapter; the last entry is the total. Spans are multiples of
 *  12.5, so every running sum is exact. */
const starClockStartVh: number[] = CHAPTERS.reduce(
  (acc, c) => [...acc, acc[acc.length - 1] + starClockVh(c)],
  [0],
);
const PILOT_INDEX = CHAPTERS.findIndex((c) => c.id === "pilot");
/** Star-clock vh at which The Pilot starts — the old `PILOT_START`, on the star clock. */
const STAR_CLOCK_PILOT_VH = starClockStartVh[PILOT_INDEX];

/** 0..1 position on the star clock (1 from The Pilot's start on): the shared helper behind
 *  starScale and distanceAU. Exported for tests. */
export function starClock(progress: number): number {
  const { chapter, chapterProgress } = chapterAt(progress);
  const i = CHAPTERS.indexOf(chapter);
  return clamp01((starClockStartVh[i] + chapterProgress * starClockVh(chapter)) / STAR_CLOCK_PILOT_VH);
}

/** The camera approach already magnifies the star ~6x, and The Pilot's glare does the
 *  "fills the frame" beat — so the geometric scale only needs to reach 2.4. */
```

In `src/scene/camera/flightPath.ts`, replace:

```ts

/** 0.25 (a distant point) → 2.4 by the start of The Pilot, then holds. */
export function starScale(progress: number): number {
  const t = clamp01(progress / PILOT_START);
  return 0.25 + (STAR_SCALE_MAX - 0.25) * smooth(t);
}

/** 9.4 AU at launch → 0.0 at The Pilot ("ARRIVED"), then 0. */
export function distanceAU(progress: number): number {
  const t = clamp01(progress / PILOT_START);
  if (t >= 1) return 0;
  return 9.4 * (1 - t);
}
```

with:

```ts

/** 0.25 (a distant point) → 2.4 by the start of The Pilot, then holds. */
export function starScale(progress: number): number {
  const t = starClock(progress);
  return 0.25 + (STAR_SCALE_MAX - 0.25) * smooth(t);
}

/** 9.4 AU at launch → 0.0 at The Pilot ("ARRIVED"), then 0. */
export function distanceAU(progress: number): number {
  const t = starClock(progress);
  if (t >= 1) return 0;
  return 9.4 * (1 - t);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/scene/camera/flightPath.test.ts`
Expected: PASS — `Tests  36 passed (36)`. If the golden test fails by more than `1e-12`, the star clock does not reproduce the old curve — fix `starClock`, never the goldens.

- [ ] **Step 5: Run the whole suite and the typechecker**

Run: `npx vitest run`
Expected: PASS — `Test Files  41 passed (41)`, `Tests  520 passed (520)` (516 + 4). Slice 4's `progressAt` migration means nothing else in the suite is keyed to an absolute progress; if anything else is red, a test still holds a literal — convert it to `progressAt`, never loosen an assertion.

Run: `npx tsc --noEmit`
Expected: no output (0 errors).

- [ ] **Step 6: Commit**

```bash
git add src/scene/camera/flightPath.ts src/scene/camera/flightPath.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): chapter table at 1625vh and a star clock that keeps the slice 3-4 star

Worlds grows 225 -> 450vh (VOYAGE_SCROLL_VH 1400 -> 1625). starScale and
distanceAU used to divide absolute progress by The Pilot's start, which would
shrink the star 10-21% at Approach and Orbit; they now run on starClock, which
counts Worlds as its old 225vh. Golden values captured from the slice-4 tree
pin every capture point outside Worlds.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push -u origin feat/voyage-slice-5
```

---

### Task 2: `worldsSchedule.ts` — the one clock for panels, planets and the starfield

**Wave 1 (parallel with Tasks 3 and 4). Needs Task 1 merged. Owns only the two files below.**

**Files:**
- Create: `src/scene/chapters/worldsSchedule.ts`
- Test: `src/scene/chapters/worldsSchedule.test.ts`

**Interfaces:**
- Consumes: `CHAPTERS` from `@/scene/camera/flightPath` (Task 1's 450vh Worlds).
- Produces (Tasks 5, 6, 7 rely on these exact names; they mirror `orbitSchedule.ts`):
  ```ts
  export const WORLDS_HOLD_DESKTOP: number;   // (450 - 100) / 450 = 0.7778
  export const WORLDS_HOLD_MOBILE: number;    // (450 - 64) / 450  = 0.8578
  export const WORLDS_WINDOW: readonly [number, number];   // [0.04, 0.73]
  export const WORLDS_EDGE_FADE: number;      // 0.04
  export const WORLDS_PRESENCE_END: number;   // WORLDS_WINDOW[1] + WORLDS_EDGE_FADE = 0.77
  export const CASE_TRAVEL: number;           // 0.3 of a slot
  export function worldsPresence(chapterProgress: number): number;       // 0 -> 1 -> 0 envelope (planets' fade-in, starfield pull)
  export function worldsCursor(chapterProgress: number, n: number): number;   // continuous case index in [0, n-1]
  export function caseTarget(i: number, n: number, chapterProgress: number): number;  // a panel's target: exactly 0 or 1
  export function caseCentre(i: number, n: number): number;              // chapterProgress where the cursor rests on case i
  ```

**Why one window for every device.** Worlds' section is 450vh; `.chapter__pin` is stationary for `450 − 100 = 350vh` on desktop (chapterProgress 0 … 0.7778) and `450 − 64 = 386vh` on a phone (0 … 0.8578). The planets are WebGL and cannot be media-query-aware, so the schedule is sized to the smaller (desktop) hold; on a phone the last case simply dwells until its pin releases. `0.73 + 0.04 = 0.77 < 0.7778` — the draft window end of 0.74 would have put the edge fade past the pin release, and a test pins the margin.

- [ ] **Step 1: Write the failing tests**

Create `src/scene/chapters/worldsSchedule.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CHAPTERS, progressAt, chapterAt } from "@/scene/camera/flightPath";
import {
  WORLDS_WINDOW, WORLDS_EDGE_FADE, WORLDS_PRESENCE_END, WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE,
  CASE_TRAVEL, worldsPresence, worldsCursor, caseTarget, caseCentre,
} from "./worldsSchedule";

const [W0, W1] = WORLDS_WINDOW;
const COUNTS = [1, 2, 3, 4, 6, 12];
/** chapterProgress at the boundary between case `b - 1` and case `b`. */
const boundary = (b: number, n: number) => W0 + (b / n) * (W1 - W0);
const sweep = (from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, k) => from + ((to - from) * k) / steps);
/** Every case's target at `cp`, in order. */
const targets = (n: number, cp: number) => Array.from({ length: n }, (_, i) => caseTarget(i, n, cp));

describe("schedule constants", () => {
  it("derive the pin holds from Worlds' 450vh section", () => {
    expect(WORLDS_HOLD_DESKTOP).toBeCloseTo(350 / 450, 10);   // (450 - 100) / 450
    expect(WORLDS_HOLD_MOBILE).toBeCloseTo(386 / 450, 10);    // (450 - 64) / 450
  });

  it("keeps the window and both edge fades inside the desktop hold", () => {
    expect(W0).toBeGreaterThan(0);
    expect(W1).toBeGreaterThan(W0);
    expect(WORLDS_PRESENCE_END).toBeCloseTo(W1 + WORLDS_EDGE_FADE, 12);
    // 0.73 + 0.04 = 0.77 < 0.7778: the draft window [0.04, 0.74] would have put the fade past the pin release.
    expect(WORLDS_PRESENCE_END).toBeLessThanOrEqual(WORLDS_HOLD_DESKTOP);
    expect(WORLDS_PRESENCE_END).toBeLessThanOrEqual(WORLDS_HOLD_MOBILE);
    expect(WORLDS_EDGE_FADE).toBeLessThanOrEqual(W0);          // the fade-in fits before the window
    expect(CASE_TRAVEL).toBeGreaterThan(0);
    expect(CASE_TRAVEL).toBeLessThan(1);
  });
});

describe("caseCentre", () => {
  it("puts each case's dwell at the middle of its equal slot of the window", () => {
    expect(caseCentre(0, 3)).toBeCloseTo(0.155, 12);
    expect(caseCentre(1, 3)).toBeCloseTo(0.385, 12);
    expect(caseCentre(2, 3)).toBeCloseTo(0.615, 12);
    expect(caseCentre(0, 1)).toBeCloseTo((W0 + W1) / 2, 12);
  });

  it("is where the cursor rests exactly on that case", () => {
    for (const n of [2, 3, 4, 6]) {
      for (let i = 0; i < n; i++) expect(worldsCursor(caseCentre(i, n), n)).toBe(i);
    }
  });

  it("clamps an out-of-range index and a nonsense count to the window start, never NaN", () => {
    expect(caseCentre(-2, 3)).toBe(caseCentre(0, 3));
    expect(caseCentre(9, 3)).toBe(caseCentre(2, 3));
    for (const n of [0, -1, NaN, Infinity]) expect(caseCentre(0, n)).toBe(W0);
  });
});

describe("worldsPresence", () => {
  it("is 0 at the chapter start, 1 across the window, 0 from the presence end on", () => {
    expect(worldsPresence(0)).toBe(0);
    expect(worldsPresence(W0)).toBe(1);
    expect(worldsPresence((W0 + W1) / 2)).toBe(1);
    expect(worldsPresence(W1)).toBe(1);
    expect(worldsPresence(WORLDS_PRESENCE_END)).toBe(0);
    expect(worldsPresence(WORLDS_HOLD_DESKTOP)).toBe(0);
    expect(worldsPresence(1)).toBe(0);
  });

  it("ramps monotonically up before the window and down after it", () => {
    let prev = -1;
    for (const cp of sweep(0, W0, 40)) {
      const v = worldsPresence(cp);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    prev = 2;
    for (const cp of sweep(W1, WORLDS_PRESENCE_END, 40)) {
      const v = worldsPresence(cp);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it("clamps out-of-range input and treats NaN as the chapter start", () => {
    expect(worldsPresence(-5)).toBe(0);
    expect(worldsPresence(9)).toBe(0);
    expect(worldsPresence(NaN)).toBe(0);
  });
});

describe("worldsCursor", () => {
  it("is 0 for no cases, one case, and nonsense counts, at every progress", () => {
    for (const n of [0, 1, -3, NaN, Infinity, 0.9]) {
      for (const cp of sweep(0, 1, 20)) expect(worldsCursor(cp, n)).toBe(0);
    }
  });

  it("is halfway between two cases in the middle of their cross-fade", () => {
    for (const n of [2, 3, 4, 6]) {
      for (let b = 1; b < n; b++) expect(worldsCursor(boundary(b, n), n)).toBeCloseTo(b - 0.5, 10);
    }
  });

  it("holds case 0 before the window and the last case after it", () => {
    for (const n of [2, 3, 4, 6]) {
      expect(worldsCursor(0, n)).toBe(0);
      expect(worldsCursor(W0, n)).toBe(0);
      expect(worldsCursor(W1, n)).toBe(n - 1);
      expect(worldsCursor(1, n)).toBe(n - 1);
    }
  });

  it("never decreases and stays inside [0, n - 1]", () => {
    for (const n of [2, 3, 4, 6, 12]) {
      let prev = -1;
      for (const cp of sweep(0, 1, 2000)) {
        const c = worldsCursor(cp, n);
        expect(c).toBeGreaterThanOrEqual(prev);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(n - 1);
        prev = c;
      }
    }
  });

  it("treats NaN progress as the chapter start and fractional counts as their floor", () => {
    expect(worldsCursor(NaN, 4)).toBe(0);
    expect(worldsCursor(W1, 4.9)).toBe(3);
  });

  it("is driven by the real chapter: Worlds' own progress, never another chapter's", () => {
    const hit = chapterAt(progressAt("worlds", caseCentre(2, 3)));
    expect(hit.chapter.id).toBe("worlds");
    expect(worldsCursor(hit.chapterProgress, 3)).toBe(2);
  });

  // "Each case dwells": a hard cut (CASE_TRAVEL → 0) or a cursor that never rests
  // (CASE_TRAVEL → 1) would pass every other test here, so the plateau is pinned directly.
  it("rests on case i for at least ±0.25 of a slot around each centre, and travels over at least ±0.1 of a slot at each boundary", () => {
    const n = 3, slot = (W1 - W0) / n;
    for (let i = 0; i < n; i++) {
      for (const d of [-0.25, -0.1, 0, 0.1, 0.25]) expect(worldsCursor(caseCentre(i, n) + d * slot, n)).toBeCloseTo(i, 9);
    }
    for (let b = 1; b < n; b++) {
      for (const d of [-0.1, 0.1]) {
        const c = worldsCursor(boundary(b, n) + d * slot, n);
        expect(c).toBeGreaterThan(b - 1);
        expect(c).toBeLessThan(b);
      }
    }
  });
});

// Slice 4's standing rule: panels take a 0/1 TARGET and a CSS transition is the cross-fade, so
// no scroll position can rest on two half-faded panels. (The planets stay scroll-scrubbed.)
describe("caseTarget", () => {
  it("is exactly 0 or 1, with exactly one case lit everywhere past the chapter start", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(0, 1, 1000).slice(1)) {
        const t = targets(n, cp);
        for (const v of t) expect([0, 1]).toContain(v);
        expect(t.reduce((a, b) => a + b, 0)).toBe(1);
      }
    }
  });

  it("is dark at the chapter start, for every case", () => {
    for (const n of COUNTS) expect(targets(n, 0)).toEqual(Array(n).fill(0));
  });

  it("lights the first case from the chapter's first pixel, including a nav arrival at start + 0.001", () => {
    expect(targets(3, 0.001)).toEqual([1, 0, 0]);
    expect(targets(3, W0 / 2)).toEqual([1, 0, 0]);
    // Dock / rail / CTA arrivals land at the chapter's start + 0.001 of ABSOLUTE progress,
    // which is ~0.0036 of the way into Worlds at 1625vh.
    const worlds = CHAPTERS.find((c) => c.id === "worlds")!;
    const arrival = chapterAt(worlds.start + 0.001);
    expect(arrival.chapter.id).toBe("worlds");
    expect(arrival.chapterProgress).toBeGreaterThan(0);
    expect(targets(3, arrival.chapterProgress)).toEqual([1, 0, 0]);
  });

  it("lights case i at the centre of its slot", () => {
    for (const n of [1, 2, 3, 6]) {
      for (let i = 0; i < n; i++) {
        expect(targets(n, caseCentre(i, n))).toEqual([...Array(n)].map((_, j) => (j === i ? 1 : 0)));
      }
    }
  });

  it("switches at the middle of the planets' travel: the lit case is the nearest whole cursor", () => {
    for (const n of [2, 3, 6]) {
      for (const cp of sweep(W0, W1, 400)) {
        const lit = targets(n, cp).indexOf(1);
        expect(Math.abs(lit - worldsCursor(cp, n))).toBeLessThanOrEqual(0.5);
      }
      const slot = (W1 - W0) / n;
      for (let b = 1; b < n; b++) {
        expect(targets(n, boundary(b, n) - 0.01 * slot).indexOf(1)).toBe(b - 1);
        expect(targets(n, boundary(b, n) + 0.01 * slot).indexOf(1)).toBe(b);
      }
    }
  });

  it("never moves backwards as the reader scrolls forward", () => {
    for (const n of COUNTS) {
      let prev = 0;
      for (const cp of sweep(0.0005, 1, 1000)) {
        const lit = targets(n, cp).indexOf(1);
        expect(lit).toBeGreaterThanOrEqual(prev);
        prev = lit;
      }
    }
  });

  // One schedule for every device: on a phone (pin held to WORLDS_HOLD_MOBILE) the last case
  // simply dwells; on desktop it leaves with the pin.
  it("keeps the last case lit from the window end through the mobile pin release, and no other", () => {
    for (const n of COUNTS) {
      for (const cp of sweep(W1, WORLDS_HOLD_MOBILE, 50)) {
        expect(targets(n, cp)).toEqual([...Array(n)].map((_, i) => (i === n - 1 ? 1 : 0)));
      }
    }
  });

  it("is 0 for no cases, an out-of-range index, or a non-integer index, and NaN progress is the start", () => {
    expect(caseTarget(0, 0, caseCentre(0, 1))).toBe(0);
    expect(caseTarget(0, NaN, 0.3)).toBe(0);
    expect(caseTarget(-1, 3, 0.3)).toBe(0);
    expect(caseTarget(3, 3, 0.3)).toBe(0);
    expect(caseTarget(0.5, 3, 0.3)).toBe(0);
    expect(caseTarget(0, 3, NaN)).toBe(0);
  });

  it("gives a lone case the whole chapter past its start", () => {
    for (const cp of sweep(0.001, 1, 50)) expect(caseTarget(0, 1, cp)).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scene/chapters/worldsSchedule.test.ts`
Expected: FAIL — the suite cannot load: `Cannot find module './worldsSchedule'` (a missing *module* fails the whole file; the summary reads `Tests  no tests`).

- [ ] **Step 3: Implement the schedule**

Create `src/scene/chapters/worldsSchedule.ts`:

```ts
/* Pure schedule for chapter 05 (Worlds), shared by the DOM panels (Worlds.tsx), the planets
 * (Planet.ts) and the starfield focus pull (Starfield.ts). No React, no three, no DOM. It mirrors
 * orbitSchedule.ts exactly in shape — the two are deliberately duplicated, not abstracted, until a
 * third chapter needs the same maths (YAGNI); read orbitSchedule.ts first.
 *
 * Pin arithmetic (derived, not typed): Worlds' section is 450vh and `.chapter__pin` is stationary
 * for `section - pin`: 350vh on desktop (100vh pin) = chapterProgress 0..0.7778, and 386vh on
 * mobile (64vh pin) = 0..0.8578. ONE schedule serves both and every device: the planets are WebGL
 * and cannot be media-query-aware, so the schedule is sized to the smaller (desktop) hold. The
 * panels never fade out: the last case stays lit until the pin releases, so a phone dwells on it
 * for its extra 0.08 and the pin's own release is the panel's exit. The panels take a 0/1 target
 * (caseTarget) and CSS animates it; the planets' cursor is scrubbed.
 *
 * Layout of chapterProgress (cp); the pin is stationary for cp 0 .. 0.778 (desktop) / 0.858 (mobile):
 *   0 ......... 0.04 ........................ 0.73 ........ 0.77 .. 0.778 ........ 0.858
 *   [ fade in ][ window: planets carried past ][ presence fades out ]
 *   panels: [ case 0 .. case n-1 (switch at each boundary) .. last case holds lit ...........]
 *
 * Inside WORLDS_WINDOW the N cases share the window in equal slots (~103vh each at N = 3). Around
 * each slot boundary the cursor travels between two cases over a short stretch centred on it, and
 * the panel switches at that stretch's midpoint, so a planet arrives in frame as its panel
 * replaces the previous one.
 */
import { CHAPTERS } from "@/scene/camera/flightPath";

// NaN reads as the chapter start; everything else clamps to 0..1.
const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));
const smooth = (t: number) => t * t * (3 - 2 * t);

const worlds = CHAPTERS.find((c) => c.id === "worlds")!;

/** Desktop pin height and the mobile pin height, in vh (voyage.css; same values as orbitSchedule). */
const PIN_DESKTOP_VH = 100;
const PIN_MOBILE_VH = 64;

/** Last chapterProgress at which the sticky pin is still stationary (hold = section - pin). */
export const WORLDS_HOLD_DESKTOP = (worlds.spanVh - PIN_DESKTOP_VH) / worlds.spanVh;
export const WORLDS_HOLD_MOBILE = (worlds.spanVh - PIN_MOBILE_VH) / worlds.spanVh;

/** Where the cases dwell, as chapterProgress `[start, end]`. Sits inside the desktop hold with
 *  margin for the edge fades: 0.73 + 0.04 = 0.77 < 0.7778 (the draft end of 0.74 would not fit).
 *  N = 3 gives slot centres 0.155 / 0.385 / 0.615. Browser-review tunable. */
export const WORLDS_WINDOW: readonly [number, number] = [0.04, 0.73];

/** Width of the fade-in before the window and the fade-out after it, in chapterProgress — the
 *  planets and the starfield only (the panels are lit by caseTarget and dwell until the pin
 *  releases). Both margins sit inside the desktop hold. */
export const WORLDS_EDGE_FADE = 0.04;

/** Last chapterProgress at which the planets' and the starfield pull's envelope still holds
 *  (0.77 < 0.7778); the last planet then finishes its own fade by PLANET_FADE_OUT_END. */
export const WORLDS_PRESENCE_END = WORLDS_WINDOW[1] + WORLDS_EDGE_FADE;

/** Width of the cursor's travel between two cases, as a fraction of one case's slot. */
export const CASE_TRAVEL = 0.3;

/** 0..1 presence of the PLANETS (their fade-in) and the STARFIELD pull: 0 at cp 0, ramps to 1 by
 *  the window start, holds through the window, ramps back to 0 by WORLDS_PRESENCE_END, 0 after. */
export function worldsPresence(chapterProgress: number): number {
  const t = clamp01(chapterProgress);
  const [start, end] = WORLDS_WINDOW;
  if (t < start) return smooth(t / start);
  if (t <= end) return 1;
  if (t < WORLDS_PRESENCE_END) return smooth(1 - (t - end) / WORLDS_EDGE_FADE);
  return 0;
}

/** Whole numbers only: the CMS may hold any count, and a non-finite or negative one is empty. */
function sanitizeCount(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Position inside the window measured in case slots: 0 at the window start, `count` at its end. */
function slotPosition(chapterProgress: number, count: number): number {
  const [start, end] = WORLDS_WINDOW;
  return clamp01((clamp01(chapterProgress) - start) / (end - start)) * count;
}

/** 0 → 1 across the cross-fade centred on slot boundary `b`. Two different boundaries are
 *  never active at once (the cross-fade is 0.3 of a slot wide, boundaries are 1 apart). */
function crossed(b: number, x: number): number {
  return smooth(clamp01((x - b) / CASE_TRAVEL + 0.5));
}

/**
 * chapterProgress at the middle of case `i`'s slot, where the cursor rests exactly on `i`. The
 * planets are placed from the camera pose here. `i` clamps into [0, n - 1] and a nonsense count
 * gives the window start, so the result is never NaN.
 */
export function caseCentre(i: number, n: number): number {
  const count = sanitizeCount(n);
  const [start, end] = WORLDS_WINDOW;
  if (count === 0) return start;
  const k = Math.min(count - 1, Math.max(0, Number.isFinite(i) ? Math.floor(i) : 0));
  return start + ((k + 0.5) / count) * (end - start);
}

/**
 * Continuous case index in [0, n-1]: it sits on an integer while a case dwells and moves
 * between two integers only across a cross-fade. Monotone non-decreasing in chapterProgress;
 * 0 for n <= 1; 0 before the window and n-1 after it.
 */
export function worldsCursor(chapterProgress: number, n: number): number {
  const count = sanitizeCount(n);
  if (count <= 1) return 0;
  const x = slotPosition(chapterProgress, count);
  let cursor = 0;
  for (let b = 1; b < count; b++) cursor += crossed(b, x);
  return cursor;
}

/**
 * 0/1 TARGET visibility of case `i` of `n` for the DOM panels — never in between: the CSS
 * transition on .world-panel is the cross-fade, so no scroll position can rest on two half-faded
 * panels (the slice-4 rule). The lit case is the nearest whole cursor, so a panel changes exactly
 * half-way through the planets' travel. Dark at chapterProgress 0, the first case from the
 * chapter's first pixel (nav arrivals land on start + 0.001), and the last case from the window
 * end until the chapter ends — the pin's release is its exit, so the caller (Worlds) must not
 * show any case outside Worlds. Out-of-range or non-integer `i`, and n <= 0, give 0; NaN progress
 * is the chapter start.
 */
export function caseTarget(i: number, n: number, chapterProgress: number): number {
  const count = sanitizeCount(n);
  if (!Number.isInteger(i) || i < 0 || i >= count) return 0;
  const t = clamp01(chapterProgress);
  if (t <= 0) return 0;
  return Math.round(worldsCursor(t, count)) === i ? 1 : 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/scene/chapters/worldsSchedule.test.ts`
Expected: PASS — `Tests  24 passed (24)`.

- [ ] **Step 5: Run the whole suite, the typechecker and the linter**

Run: `npx vitest run`
Expected: PASS — `Tests  544 passed (544)` and `Test Files  42 passed (42)` when run after Task 1 (520 + 24).

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npx eslint src/scene`
Expected: no output (0 problems).

- [ ] **Step 6: Commit**

```bash
git add src/scene/chapters/worldsSchedule.ts src/scene/chapters/worldsSchedule.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): worlds schedule, the one clock for case panels, planets and the starfield

Pure module mirroring orbitSchedule: derived pin holds (450vh section), the
[0.04, 0.73] window with a 0.04 edge fade inside the desktop hold, a cursor that
dwells on whole case indices, 0/1 panel targets (no partial rest frames) and
caseCentre for placing the planets.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push
```

---

### Task 3: `caseExcerpt`, `WorldCase` / `toWorldCase`, and the `page.tsx` → `VoyageRoot` plumbing

**Wave 1 (parallel with Tasks 2 and 4). Needs Task 1 merged. Owns the files below.** Nothing is rendered yet: `VoyageRoot` accepts the prop and holds it behind a one-line `void worlds;` guard (the slice-4 pattern) that Task 7 deletes.

**Files:**
- Modify: `src/lib/markdown.ts` (new `caseExcerpt`, `EXCERPT_MAX`), `src/lib/markdown.test.ts`
- Create: `src/lib/planetFeature.ts`, `src/lib/planetFeature.test.ts`, `src/lib/worldCase.ts`, `src/lib/worldCase.test.ts`
- Modify: `src/app/voyage/page.tsx`, `src/components/voyage/VoyageRoot.tsx`

**Interfaces:**
- Consumes: `marked.lexer`, `appendLog` (already in `markdown.ts`), the `Item` type, `PLANET_FEATURES` from `src/lib/collections/specs/caseStudies.ts`.
- Produces:
  ```ts
  // markdown.ts (server-only, like renderMarkdown)
  export const EXCERPT_MAX = 160;
  export function caseExcerpt(md: string, max?: number): string;   // plain text, <= max chars + "…"; never throws
  // planetFeature.ts (pure; safe for client AND server)
  export type PlanetFeature = "none" | "ring" | "moon" | "storm";
  export function toPlanetFeature(value: unknown): PlanetFeature;  // anything unknown -> "none"
  // worldCase.ts (server-side mapper; client files `import type` only)
  export interface WorldCase {
    id: string; slug: string; title: string; client: string; context: string;
    stack: string[]; diagram: string; planetFeature: PlanetFeature;
    excerpts: { problem: string; architecture: string; outcome: string };
  }
  export function toWorldCase(item: Item): WorldCase;
  // VoyageRoot: props gain  worlds: WorldCase[]
  ```

**Design notes.** `caseExcerpt` takes the first top-level paragraph that has text (falling back to the first list item, then a blockquote's first paragraph), flattens its inline tokens (emphasis / code / links / strikethrough keep their text, images and raw HTML tags are dropped, text between `<script>` / `<style>` tags is dropped, entities marked leaves in its text tokens are decoded), collapses whitespace, and cuts at the last space within `max` (a space exactly at `max` counts), dropping trailing punctuation, then appends `…`; a single over-long word is hard-cut without splitting a surrogate pair. It uses `marked.lexer`, not rendered HTML, so "first paragraph" is exact. The excerpt is rendered as a React text node (never `dangerouslySetInnerHTML`). `planetFeature.ts` is its own pure file so that `Planet.ts` (client), `worldCase.ts` (server) and `SceneRoot` can all use the type and the guard without making the client depend on `marked`, and so Wave 2 does not depend on this task's mapper.

- [ ] **Step 1: Write the failing `caseExcerpt` tests**

In `src/lib/markdown.test.ts`, replace:

```ts
// features plus the security allow-list (XSS-focused) behaviour it must enforce.
import { describe, it, expect, vi } from "vitest";
import { marked } from "marked";
import { renderMarkdown } from "./markdown";

// Mock the structured logger so the error-path test doesn't touch the real filesystem
// and so we can assert the catch block actually logs.
```

with:

```ts
// features plus the security allow-list (XSS-focused) behaviour it must enforce.
import { describe, it, expect, vi } from "vitest";
import { marked } from "marked";
import { renderMarkdown, caseExcerpt } from "./markdown";

// Mock the structured logger so the error-path test doesn't touch the real filesystem
// and so we can assert the catch block actually logs.
```

In `src/lib/markdown.test.ts`, replace:

```ts
  });
});
```

with:

````ts
  });
});

// Slice 5 (D3): the Worlds panels show a plain-text excerpt of each case-study section, built
// server-side so the client never receives the full markdown.
describe("caseExcerpt", () => {
  it("returns an empty string for empty, whitespace-only and non-string input", () => {
    expect(caseExcerpt("")).toBe("");
    expect(caseExcerpt("  \n\n \t")).toBe("");
    expect(caseExcerpt(undefined as unknown as string)).toBe("");
    expect(caseExcerpt(42 as unknown as string)).toBe("");
  });

  it("takes the first paragraph, skipping a leading heading, and ignores the rest", () => {
    expect(caseExcerpt("## Context\n\nFirst para.\n\nSecond para.")).toBe("First para.");
    expect(caseExcerpt("First para.\n\n- a list\n\n> a quote")).toBe("First para.");
  });

  it("reduces emphasis, code, links and strikethrough to their text, drops images, and joins soft line breaks", () => {
    const md = "A **bold** and _soft_ move with `code`, a [link](https://example.com) and ~~gone~~ text\nacross lines ![diagram](/a.png) end.";
    expect(caseExcerpt(md)).toBe("A bold and soft move with code, a link and gone text across lines end.");
  });

  it("strips raw HTML tags, keeps their text, and drops script and style content", () => {
    expect(caseExcerpt("Hello <b>big</b> <em>world</em>")).toBe("Hello big world");
    expect(caseExcerpt("Safe <script>alert(1)</script> text <style>p{color:red}</style>here")).toBe("Safe text here");
  });

  it("decodes the entities and escapes marked leaves in the text", () => {
    expect(caseExcerpt("Fish &amp; chips &lt;3 &quot;quoted&quot; \\*literal\\*")).toBe('Fish & chips <3 "quoted" *literal*');
  });

  it("falls back to the first list item, then to a blockquote, when there is no paragraph", () => {
    expect(caseExcerpt("## Notes\n\n- first **item**\n- second")).toBe("first item");
    expect(caseExcerpt("> quoted **claim**\n>\n> more")).toBe("quoted claim");
  });

  it("skips a paragraph that is only an image or markup and uses the next one with text", () => {
    expect(caseExcerpt("![only an image](/a.png)\n\nThe real text.")).toBe("The real text.");
  });

  it("returns an empty string when there is nothing to quote (heading only, code only, rule only)", () => {
    expect(caseExcerpt("# Just a heading")).toBe("");
    expect(caseExcerpt("```\nconst x = 1;\n```")).toBe("");
    expect(caseExcerpt("---")).toBe("");
  });

  it("returns short text whole, with no ellipsis, up to and including max characters", () => {
    expect(caseExcerpt("Short and sweet.")).toBe("Short and sweet.");
    const exact = "a".repeat(9) + " " + "b".repeat(10);          // 20 chars
    expect(caseExcerpt(exact, 20)).toBe(exact);
  });

  it("cuts at the last word boundary within max and appends an ellipsis, never mid-word", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta iota kappa";
    const out = caseExcerpt(text, 24);
    expect(out).toBe("alpha beta gamma delta…");
    // Property: the visible part is a prefix of the source, ends on a whole word, and is <= max.
    const head = out.slice(0, -1);
    expect(text.startsWith(head)).toBe(true);
    expect(text[head.length]).toBe(" ");
    expect(head.length).toBeLessThanOrEqual(24);
  });

  it("treats a space exactly at the cut as a boundary", () => {
    expect(caseExcerpt("12345 67890 abcde", 11)).toBe("12345 67890…");
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(caseExcerpt("First clause, second clause; third clause - fourth", 14)).toBe("First clause…");
    expect(caseExcerpt("Ends here. Then more words follow on", 12)).toBe("Ends here…");
  });

  it("hard-cuts a single over-long word at max, without splitting a surrogate pair", () => {
    expect(caseExcerpt("x".repeat(50), 10)).toBe("x".repeat(10) + "…");
    const emoji = "😀".repeat(20);                                 // 2 UTF-16 units each
    const out = caseExcerpt(emoji, 11);
    expect(out.endsWith("…")).toBe(true);
    expect(out.slice(0, -1)).toBe("😀".repeat(5));                   // 10 units: never a lone half
  });

  it("defaults to 160 characters and falls back to it for a nonsense max", () => {
    const long = "word ".repeat(80);                               // 400 chars
    for (const out of [caseExcerpt(long), caseExcerpt(long, NaN), caseExcerpt(long, 0), caseExcerpt(long, -5)]) {
      expect(out.endsWith("…")).toBe(true);
      expect(out.length).toBeGreaterThan(150);
      expect(out.length).toBeLessThanOrEqual(161);
    }
  });

  it("never throws: a lexer failure is logged (never the source) and gives an empty string", () => {
    vi.mocked(appendLog).mockClear();
    const spy = vi.spyOn(marked, "lexer").mockImplementationOnce(() => {
      throw new Error("lexer boom");
    });
    let out = "x";
    expect(() => {
      out = caseExcerpt("secret source text");
    }).not.toThrow();
    expect(out).toBe("");
    expect(appendLog).toHaveBeenCalledWith(
      "markdown",
      expect.objectContaining({ level: "error", message: expect.stringContaining("lexer boom") })
    );
    const [, record] = vi.mocked(appendLog).mock.calls[0] as [string, Record<string, unknown>];
    expect(JSON.stringify(record)).not.toContain("secret source text");
    spy.mockRestore();
  });
});
````

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/markdown.test.ts`
Expected: FAIL — all 15 new tests fail with `TypeError: caseExcerpt is not a function`; the 17 existing `renderMarkdown` tests pass. Summary line: `Tests  15 failed | 17 passed (32)`.

- [ ] **Step 3: Implement `caseExcerpt`**

In `src/lib/markdown.ts`, replace:

```ts
// Server-only markdown renderer for CMS-authored fields (problem/architecture/outcome).
// Not marked "server-only" package-wise (not in the brief's dependency list) — see
// task-6-report.md for the deviation note; callers must only import this from server code.
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { appendLog } from "./log";
```

with:

```ts
// Server-only markdown renderer for CMS-authored fields (problem/architecture/outcome).
// Not marked "server-only" package-wise (not in the brief's dependency list) — see
// task-6-report.md for the deviation note; callers must only import this from server code.
import { marked, type Token, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";
import { appendLog } from "./log";
```

In `src/lib/markdown.ts`, replace:

```ts
  }
}
```

with:

```ts
  }
}

/* ---- Plain-text excerpts (slice 5, D3) ---- */

/** Default length of a Worlds panel excerpt: ~3 lines in a 190px column. */
export const EXCERPT_MAX = 160;

const ELLIPSIS = "\u2026";

// marked leaves entities in its text tokens as written (`&amp;` stays `&amp;`), and the excerpt
// is rendered as a plain React text node, so the handful marked users actually write are decoded.
const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** Flattens inline tokens to their visible text: formatting, links and code keep their text,
 *  images and raw HTML tags are dropped, and whatever sits between <script>/<style> is dropped
 *  too (the tags are `html` tokens, the payload a `text` token). */
function inlineText(tokens: Token[]): string {
  let out = "";
  let hidden = false;
  for (const t of tokens) {
    if (t.type === "html") {
      const tag = /^<(\/?)(script|style)\b/i.exec(t.raw);
      if (tag) hidden = tag[1] === "";
      continue;
    }
    if (hidden || t.type === "image") continue;
    if (t.type === "br") out += " ";
    else if ("tokens" in t && Array.isArray(t.tokens) && t.tokens.length > 0) out += inlineText(t.tokens);
    else if ("text" in t && typeof t.text === "string") out += t.text;
  }
  return out;
}

const squash = (s: string) => decodeEntities(s).replace(/\s+/g, " ").trim();

/** The text of the first top-level paragraph that has any; else of the first list item; else of
 *  the first paragraph inside a blockquote. Headings, code, rules and tables are never quoted. */
function firstBlockText(tokens: Token[]): string {
  for (const t of tokens) {
    if (t.type !== "paragraph") continue;
    const text = squash(inlineText((t as Tokens.Paragraph).tokens));
    if (text) return text;
  }
  for (const t of tokens) {
    if (t.type !== "list") continue;
    for (const item of (t as Tokens.List).items) {
      const text = squash(inlineText(item.tokens));
      if (text) return text;
    }
  }
  for (const t of tokens) {
    if (t.type !== "blockquote") continue;
    const text = firstBlockText((t as Tokens.Blockquote).tokens);
    if (text) return text;
  }
  return "";
}

/** Cuts at the last space within `max` (a space exactly at `max` counts), drops trailing
 *  punctuation, and appends an ellipsis; a single word longer than `max` is hard-cut. */
function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const space = text.slice(0, max + 1).lastIndexOf(" ");
  let head = space > 0 ? text.slice(0, space).replace(/[\s.,;:!?\-\u2013\u2014]+$/, "") : "";
  if (head === "") {
    // Hard cut. Never leave half of a surrogate pair at the end.
    let end = max;
    const last = text.charCodeAt(end - 1);
    if (last >= 0xd800 && last <= 0xdbff) end -= 1;
    head = text.slice(0, end);
  }
  return head + ELLIPSIS;
}

/**
 * Markdown -> a one-paragraph plain-text excerpt for the Worlds panels. Server-side only (like
 * renderMarkdown): the client receives the excerpt, never the markdown. Never throws; an
 * unquotable or failing source gives "". A `max` that is not a positive finite number is the
 * default (160). The result is at most `max` characters plus the ellipsis.
 */
export function caseExcerpt(md: string, max: number = EXCERPT_MAX): string {
  if (typeof md !== "string" || !md.trim()) return "";
  const limit = Number.isFinite(max) && max >= 1 ? Math.floor(max) : EXCERPT_MAX;
  try {
    return cutAtWord(firstBlockText(marked.lexer(md)), limit);
  } catch (e) {
    // Same contract as renderMarkdown: log the failure (never the source), never throw.
    void appendLog("markdown", { level: "error", message: String(e) }).catch(() => {});
    return "";
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/markdown.test.ts`
Expected: PASS — `Tests  32 passed (32)`.

- [ ] **Step 5: Write the failing `planetFeature` and `worldCase` tests**

Create `src/lib/planetFeature.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PLANET_FEATURES } from "./collections/specs/caseStudies";
import { toPlanetFeature } from "./planetFeature";

describe("toPlanetFeature", () => {
  it("accepts every option the CMS select offers, so the type and the select cannot drift", () => {
    expect(PLANET_FEATURES.map((o) => o.value)).toEqual(["none", "ring", "moon", "storm"]);
    for (const o of PLANET_FEATURES) expect(toPlanetFeature(o.value)).toBe(o.value);
  });

  it("treats anything else as none: unknown strings, other types, nullish values", () => {
    for (const v of ["", "Ring", "rings", "comet", " ring", 3, null, undefined, {}, ["ring"], true]) {
      expect(toPlanetFeature(v)).toBe("none");
    }
  });
});
```

Create `src/lib/worldCase.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Item } from "./collections/defineCollection";
import { toWorldCase } from "./worldCase";

const item = (extra: Record<string, unknown> = {}): Item =>
  ({
    id: "case_1", order: 3, createdAt: "2026-01-01T00:00:00.000Z",
    slug: "ledger", title: "Ledger migration", client: "Acme", context: "Moving a ledger off a monolith",
    problem: "## Problem\n\nThe ledger could not scale past **40 tps**.\n\nMore detail nobody needs here.",
    architecture: "An event-sourced core with `Kafka` and [Postgres](https://example.com).",
    outcome: "- p95 down to 120 ms\n- zero incidents",
    stack: ["Go", "Kafka", "Postgres"], metrics: ["p95 120ms"], diagram: "/api/media/abc123",
    planetFeature: "ring", published: true,
    ...extra,
  }) as Item;

describe("toWorldCase", () => {
  it("maps a published case study to the slim DTO, excerpts included", () => {
    expect(toWorldCase(item())).toEqual({
      id: "case_1", slug: "ledger", title: "Ledger migration", client: "Acme",
      context: "Moving a ledger off a monolith",
      stack: ["Go", "Kafka", "Postgres"], diagram: "/api/media/abc123", planetFeature: "ring",
      excerpts: {
        problem: "The ledger could not scale past 40 tps.",
        architecture: "An event-sourced core with Kafka and Postgres.",
        outcome: "p95 down to 120 ms",
      },
    });
  });

  it("carries no markdown body, metrics, order, timestamp or published flag to the client", () => {
    expect(Object.keys(toWorldCase(item())).sort()).toEqual(
      ["client", "context", "diagram", "excerpts", "id", "planetFeature", "slug", "stack", "title"],
    );
    expect(Object.keys(toWorldCase(item()).excerpts).sort()).toEqual(["architecture", "outcome", "problem"]);
  });

  it("narrows every field at the leaf: non-string CMS values become empty, a bad planet feature becomes none", () => {
    const w = toWorldCase(item({
      slug: 7, title: null, client: ["x"], context: 1, problem: 5, architecture: undefined, outcome: {},
      stack: ["Go", 3, null, "Kafka"], diagram: false, planetFeature: "comet",
    }));
    expect(w).toEqual({
      id: "case_1", slug: "", title: "", client: "", context: "",
      stack: ["Go", "Kafka"], diagram: "", planetFeature: "none",
      excerpts: { problem: "", architecture: "", outcome: "" },
    });
  });

  it("treats a missing stack as an empty one", () => {
    expect(toWorldCase(item({ stack: "Go" })).stack).toEqual([]);
    expect(toWorldCase(item({ stack: undefined })).stack).toEqual([]);
  });

  it("keeps the worst-case payload small: three 6000-char sections become three short excerpts", () => {
    const body = "word ".repeat(1200);                    // 6000 chars
    const w = toWorldCase(item({
      problem: body, architecture: body, outcome: body,
      title: "t".repeat(120), client: "c".repeat(80), context: "x".repeat(200), slug: "s".repeat(80),
      stack: Array.from({ length: 12 }, () => "k".repeat(40)), diagram: "/api/media/" + "a".repeat(60),
    }));
    for (const e of Object.values(w.excerpts)) expect(e.length).toBeLessThanOrEqual(161);
    expect(JSON.stringify(w).length).toBeLessThan(2000);
  });
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `npx vitest run src/lib/planetFeature.test.ts src/lib/worldCase.test.ts`
Expected: FAIL — both files fail to load: `Cannot find module './planetFeature'` and `Cannot find module './worldCase'` (`Test Files  2 failed (2)`).

- [ ] **Step 7: Implement them**

Create `src/lib/planetFeature.ts`:

```ts
// The planet feature a case study asks for (slice 5). Pure on purpose: the scene (client) and
// worldCase.ts (server) both import it, so it must not pull in mongoose, marked or the logger.
import { PLANET_FEATURES } from "./collections/specs/caseStudies";

export type PlanetFeature = "none" | "ring" | "moon" | "storm";

// Derived from the CMS select's own option list, so a value added there is known here.
const KNOWN: readonly string[] = PLANET_FEATURES.map((o) => o.value);

/** Narrows an untrusted CMS value; anything that is not a known feature is `none` (spec §6). */
export function toPlanetFeature(value: unknown): PlanetFeature {
  return typeof value === "string" && KNOWN.includes(value) ? (value as PlanetFeature) : "none";
}
```

Create `src/lib/worldCase.ts`:

```ts
// Server-side mapper from a published case-study Item to the slim DTO the /voyage client
// receives (slice 5). It imports markdown.ts (marked, sanitize-html, the logger) as a VALUE, so
// it is server-only: client components may only `import type { WorldCase }` from here — the
// established pattern, erased at compile time. The client never receives a full markdown body.
import type { Item } from "./collections/defineCollection";
import { caseExcerpt, EXCERPT_MAX } from "./markdown";
import { toPlanetFeature, type PlanetFeature } from "./planetFeature";

export interface WorldCase {
  id: string;
  slug: string;
  title: string;
  client: string;
  context: string;
  stack: string[];
  /** Image URL (`/api/media/<id>` or a static path); empty when the case has no diagram. */
  diagram: string;
  planetFeature: PlanetFeature;
  /** First paragraph of each markdown section as plain text, cut at a word boundary. */
  excerpts: { problem: string; architecture: string; outcome: string };
}

// `Item` is untyped past its three base fields, and the CMS is data: narrow every read.
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function toWorldCase(item: Item): WorldCase {
  return {
    id: item.id,
    slug: str(item.slug),
    title: str(item.title),
    client: str(item.client),
    context: str(item.context),
    stack: Array.isArray(item.stack) ? item.stack.filter((s): s is string => typeof s === "string") : [],
    diagram: str(item.diagram),
    planetFeature: toPlanetFeature(item.planetFeature),
    excerpts: {
      problem: caseExcerpt(str(item.problem), EXCERPT_MAX),
      architecture: caseExcerpt(str(item.architecture), EXCERPT_MAX),
      outcome: caseExcerpt(str(item.outcome), EXCERPT_MAX),
    },
  };
}
```

- [ ] **Step 8: Run them to verify they pass**

Run: `npx vitest run src/lib/planetFeature.test.ts src/lib/worldCase.test.ts`
Expected: PASS — `Test Files  2 passed (2)`, `Tests  7 passed (7)` (2 + 5).

- [ ] **Step 9: Thread `worlds` through the page and `VoyageRoot`**

There is no unit test for these two (no harness exists for the server page or for `VoyageRoot`); the typechecker supplies the red and the green: after the `VoyageRoot` edit alone `tsc` is red at `page.tsx` (missing prop), after the `page.tsx` edit it is green. The server component maps the case studies, so the markdown never reaches the client.

In `src/app/voyage/page.tsx`, replace:

```tsx
import type { Metadata } from "next";
import { getVoyageContent } from "@/lib/data";
import VoyageRoot from "@/components/voyage/VoyageRoot";
import "./voyage.css";
```

with:

```tsx
import type { Metadata } from "next";
import { getVoyageContent } from "@/lib/data";
import { toWorldCase } from "@/lib/worldCase";
import VoyageRoot from "@/components/voyage/VoyageRoot";
import "./voyage.css";
```

In `src/app/voyage/page.tsx`, replace:

```tsx

export default async function VoyagePage() {
  // One Promise.all for everything /voyage renders; servicesDef.revalidate and
  // processStepsDef.revalidate already target this route on a CMS write. `services` (ch. 02)
  // and `process` (ch. 04) are threaded through — later slices add their own prop rather than
  // carrying unused ones. Destructured as `steps` so it never shadows Node's `process` global.
  const { services, process: steps, settings } = await getVoyageContent();
  return <VoyageRoot settings={settings} services={services} process={steps} />;
}
```

with:

```tsx

export default async function VoyagePage() {
  // One Promise.all for everything /voyage renders; servicesDef.revalidate and
  // processStepsDef.revalidate already target this route on a CMS write. `services` (ch. 02),
  // `process` (ch. 04) and `worlds` (ch. 05) are threaded through — later slices add their own
  // prop rather than carrying unused ones. Destructured as `steps` so it never shadows Node's
  // `process` global. The case studies are mapped to the slim WorldCase HERE, on the server: the
  // client never receives a full markdown body (the three excerpts replace up to 18 000 chars).
  const { services, process: steps, caseStudies, settings } = await getVoyageContent();
  const worlds = caseStudies.map(toWorldCase);
  return <VoyageRoot settings={settings} services={services} process={steps} worlds={worlds} />;
}
```

In `src/components/voyage/VoyageRoot.tsx`, replace:

```tsx
import type { Settings } from "@/lib/data";
// Type-only (erased at compile time) — keeps mongoose out of the client bundle.
import type { Item } from "@/lib/collections/defineCollection";
import { CHAPTERS, VOYAGE_SCROLL_VH, VOYAGE_TAIL_VH, sectionHeightVh } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import VoyageScroll from "@/scene/scroll/VoyageScroll";
```

with:

```tsx
import type { Settings } from "@/lib/data";
// Type-only (erased at compile time) — keeps mongoose out of the client bundle.
import type { Item } from "@/lib/collections/defineCollection";
import type { WorldCase } from "@/lib/worldCase";
import { CHAPTERS, VOYAGE_SCROLL_VH, VOYAGE_TAIL_VH, sectionHeightVh } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import VoyageScroll from "@/scene/scroll/VoyageScroll";
```

In `src/components/voyage/VoyageRoot.tsx`, replace:

```tsx
  services: Item[];
  /** Chapter 04's steps. Untyped past Item's three base fields — narrowed in Process. */
  process: Item[];
}

// The prop is named `process` (the content key); it is destructured as `steps` so it never
// shadows Node's `process` global inside this module.
export default function VoyageRoot({ settings, services, process: steps }: VoyageRootProps) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [ignited, setIgnited] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
```

with:

```tsx
  services: Item[];
  /** Chapter 04's steps. Untyped past Item's three base fields — narrowed in Process. */
  process: Item[];
  /** Chapter 05's published case studies, already slimmed server-side (see page.tsx). */
  worlds: WorldCase[];
}

// The prop is named `process` (the content key); it is destructured as `steps` so it never
// shadows Node's `process` global inside this module.
export default function VoyageRoot({ settings, services, process: steps, worlds }: VoyageRootProps) {
  // Plumbed in slice 5 task 3; chapter 05 mounts it in task 7, which deletes this line.
  void worlds;
  const [tier, setTier] = useState<Tier | null>(null);
  const [ignited, setIgnited] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
```

- [ ] **Step 10: Run the typechecker, the linter and the whole suite**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npx eslint src/lib src/app/voyage src/components/voyage`
Expected: 0 errors; only the two pre-existing warnings (`src/lib/auth.ts` unused `result`, `src/lib/mongodb.ts` unused directive).

Run: `npx vitest run`
Expected: PASS — `Test Files  44 passed (44)`, `Tests  566 passed (566)` when run after Tasks 1–2 (544 + 15 + 7). In the Wave-1 worktree on its own (Task 1 only) the totals are 520 + 22 = 542 / 43 files.

- [ ] **Step 11: Commit**

```bash
git add src/lib/markdown.ts src/lib/markdown.test.ts src/lib/planetFeature.ts src/lib/planetFeature.test.ts src/lib/worldCase.ts src/lib/worldCase.test.ts src/app/voyage/page.tsx src/components/voyage/VoyageRoot.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): case-study excerpts and the slim WorldCase handed to /voyage

caseExcerpt turns the first paragraph of a markdown section into ~160 characters
of plain text (word-boundary cut, ellipsis, never throws). toWorldCase maps a
published case study to a slim DTO on the server, so the client never receives a
markdown body; planetFeature is a pure guard shared by scene and server. page.tsx
passes the DTOs to VoyageRoot, which holds them until chapter 05 mounts.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push
```

---

### Task 4: Placeholder case studies, the seed guard, and the seed step

**Wave 1 (parallel with Tasks 2 and 3). Needs Task 1 merged. Owns the files below.**

**Files:**
- Create: `src/lib/seedGuard.ts`, `src/lib/seedGuard.test.ts`, `src/lib/placeholderCases.ts`, `src/lib/placeholderCases.test.ts`
- Modify: `scripts/seed.ts`

**Interfaces:**
- Consumes: `caseStudies` (the collection singleton), the `Collection` / `FieldValue` types, `appendLog`.
- Produces:
  ```ts
  // seedGuard.ts (pure, fail-closed)
  export const PLACEHOLDERS_FLAG = "--placeholders";
  export function canSeedPlaceholders(uri: string | undefined, argv: readonly string[]): boolean;
  // placeholderCases.ts
  export type PlaceholderCase = Record<string, FieldValue>;
  export const PLACEHOLDER_CASES: readonly PlaceholderCase[];          // ledger (ring), routing (moon), telemetry (storm); published: true
  export type CaseStore = Pick<Collection, "validate" | "getBySlug" | "create" | "update">;
  export interface PlaceholderSeedResult { created: string[]; updated: string[] }
  export function seedPlaceholderCases(store: CaseStore, cases?: readonly PlaceholderCase[]): Promise<PlaceholderSeedResult>;
  export interface PlaceholderSeedOutcome { ran: boolean; result?: PlaceholderSeedResult }    // ran === false: the guard refused, nothing read or written
  export function seedPlaceholdersIfAllowed(opts: {
    uri: string | undefined; argv: readonly string[]; store: CaseStore;
    log: (record: Record<string, unknown>) => Promise<void>; cases?: readonly PlaceholderCase[];
  }): Promise<PlaceholderSeedOutcome>;
  ```

**Why this lives under `src/lib`.** vitest's `include` is `src/**/*.test.ts(x)`, so a test beside `scripts/seed.ts` would never run. The guard and the seeding function are plain modules under `src/`, imported by the script with **relative** paths (tsx runs the script; the existing imports are relative too).

**Guard semantics (A10).** The placeholders are *published*, so they must not reach a real database by accident. `canSeedPlaceholders` is true when `--placeholders` is in `argv`, or when **every** host of a plain `mongodb://` URI is `localhost` / `127.0.0.1` / `[::1]`. It fails closed: an absent, empty or unparsable URI, any `mongodb+srv://` URI, a mixed host list, `localhost.` (trailing dot), `0.0.0.0` and look-alikes (`localhost.evil.com`, `127.0.0.1.nip.io`, `localhost@evil.com`) are all refused. The **decision** — guard check, refusal vs seeding, the structured log lines — lives in `seedPlaceholdersIfAllowed`, not inline in the script, so inverting its condition fails a test (a refused URI reads and writes nothing and returns `{ ran: false }`; an allowed one seeds and logs). The script only maps `ran === false` to `process.exitCode = 1`. A refusal writes **no case studies** — but the pre-existing seeding (which already wipes projects, skills, settings, services and process steps without any guard) is deliberately not widened (Decision 11), so the script evaluates the guard **before** that wipe as well and logs "case studies will be skipped; the rest of the seed will still run" there: an operator who sees `exit=1` must not believe nothing was written.

- [ ] **Step 1: Write the failing guard tests**

Create `src/lib/seedGuard.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canSeedPlaceholders, PLACEHOLDERS_FLAG } from "./seedGuard";

const NO_FLAGS: string[] = ["node", "scripts/seed.ts"];

describe("canSeedPlaceholders — local databases", () => {
  it("allows localhost, 127.0.0.1 and [::1], with and without a port, a database and options", () => {
    for (const uri of [
      "mongodb://localhost",
      "mongodb://localhost:27018/portfolio",
      "mongodb://127.0.0.1:27017/portfolio?retryWrites=true",
      "mongodb://[::1]/portfolio",
      "mongodb://[::1]:27018/portfolio",
      "MONGODB://LOCALHOST:27018/portfolio",
      "  mongodb://localhost:27018/portfolio  ",
    ]) {
      expect(canSeedPlaceholders(uri, NO_FLAGS), uri).toBe(true);
    }
  });

  it("allows credentials in front of a local host and a replica set made only of local hosts", () => {
    expect(canSeedPlaceholders("mongodb://user:p%40ss@localhost:27018/db", NO_FLAGS)).toBe(true);
    expect(canSeedPlaceholders("mongodb://localhost:27017,127.0.0.1:27018/db", NO_FLAGS)).toBe(true);
  });
});

describe("canSeedPlaceholders — fails closed", () => {
  it("refuses remote hosts and look-alikes", () => {
    for (const uri of [
      "mongodb://cluster0.abcde.mongodb.net/portfolio",
      "mongodb://containers-us-west-1.railway.app:7000/portfolio",
      "mongodb://localhost.evil.com/portfolio",
      "mongodb://127.0.0.1.nip.io/portfolio",
      "mongodb://evil.com/localhost",
      "mongodb://evil.com/?host=localhost",
      "mongodb://localhost@evil.com/portfolio",
      "mongodb://user:pa@ss@evil.com/portfolio",
      "mongodb://localhost./portfolio",
      "mongodb://0.0.0.0:27017/portfolio",
      "mongodb://10.0.0.5:27017/portfolio",
    ]) {
      expect(canSeedPlaceholders(uri, NO_FLAGS), uri).toBe(false);
    }
  });

  it("refuses a host list that mixes local and remote hosts", () => {
    expect(canSeedPlaceholders("mongodb://localhost:27017,evil.com:27017/db", NO_FLAGS)).toBe(false);
    expect(canSeedPlaceholders("mongodb://evil.com,localhost/db", NO_FLAGS)).toBe(false);
  });

  it("refuses mongodb+srv (SRV hosts are never local) and every unparsable or absent URI", () => {
    for (const uri of [
      "mongodb+srv://localhost/portfolio",
      "mongodb+srv://cluster0.abcde.mongodb.net/portfolio",
      "localhost:27018/portfolio",
      "http://localhost/portfolio",
      "mongodb://",
      "mongodb:///portfolio",
      "mongodb://::1/portfolio",
      "not a uri",
      "",
      undefined,
    ]) {
      expect(canSeedPlaceholders(uri, NO_FLAGS), String(uri)).toBe(false);
    }
  });
});

describe("canSeedPlaceholders — the explicit flag", () => {
  it("allows a remote database only with exactly --placeholders", () => {
    const remote = "mongodb+srv://cluster0.abcde.mongodb.net/portfolio";
    expect(PLACEHOLDERS_FLAG).toBe("--placeholders");
    expect(canSeedPlaceholders(remote, [...NO_FLAGS, "--placeholders"])).toBe(true);
    expect(canSeedPlaceholders(undefined, ["--placeholders"])).toBe(true);
    for (const near of ["--placeholder", "--placeholders=true", "placeholders", "-placeholders", "--Placeholders"]) {
      expect(canSeedPlaceholders(remote, [...NO_FLAGS, near]), near).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/seedGuard.test.ts`
Expected: FAIL — `Cannot find module './seedGuard'` (`Test Files  1 failed (1)`).

- [ ] **Step 3: Implement the guard**

Create `src/lib/seedGuard.ts`:

```ts
// Seed guard (slice 5). The placeholder case studies are PUBLISHED, so they must never reach a
// real database by accident. Pure, and under src/ (not scripts/) so vitest collects its tests;
// scripts/seed.ts imports it. Relative imports only: tsx runs the script.

/** The only hosts that count as "this machine". Anything else — including `localhost.` with a
 *  trailing dot, `127.0.0.1.nip.io`, `0.0.0.0` — is remote on purpose (fail closed). */
const LOCAL_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The explicit opt-in for seeding the placeholders into a non-local database. */
export const PLACEHOLDERS_FLAG = "--placeholders";

/**
 * May the seed write the published placeholder case studies? True when `--placeholders` is in
 * `argv`, or when EVERY host in a plain `mongodb://` URI is local. Fails closed: an absent,
 * empty or unparsable URI, a `mongodb+srv://` URI (SRV hosts are never local) and a host list
 * that mixes local and remote hosts are all false.
 *
 * The host list is `host[:port][,host[:port]...]` after optional `user:password@`. Credentials
 * must be percent-encoded in a valid URI, so the first `@` ends them; a raw `@` in a password
 * therefore just makes the "host" something non-local, which is false.
 */
export function canSeedPlaceholders(uri: string | undefined, argv: readonly string[]): boolean {
  if (argv.includes(PLACEHOLDERS_FLAG)) return true;
  if (typeof uri !== "string") return false;
  const match = /^mongodb:\/\/(?:[^@/?#]*@)?([^/?#]+)/i.exec(uri.trim());
  if (!match) return false;
  return match[1].split(",").every((host) => LOCAL_HOSTS.has(host.replace(/:\d+$/, "").toLowerCase()));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/seedGuard.test.ts`
Expected: PASS — `Tests  6 passed (6)`.

- [ ] **Step 5: Write the failing placeholder tests**

The test imports the REAL case-study validator (`caseStudies.validate`) and drives `seedPlaceholderCases` and `seedPlaceholdersIfAllowed` through an in-memory store, so a literal that drifts from the spec fails here, not in the database, and the refused / allowed branch is covered. One case is discriminating for update mode: a literal that omits the defaulted fields `planetFeature` and `published` must not rewrite them on an existing case (create mode would), while a new case gets their defaults. (It also checks that every Problem / Architecture first paragraph is longer than 160 characters, so the Worlds excerpt cut is exercised; it needs nothing from Task 3.)

Create `src/lib/placeholderCases.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { caseStudies } from "./collections";
import type { Item } from "./collections/defineCollection";
import { PLANET_FEATURES } from "./collections/specs/caseStudies";
import { PLACEHOLDER_CASES, seedPlaceholderCases, seedPlaceholdersIfAllowed, type CaseStore } from "./placeholderCases";

/** An in-memory store: the REAL validator, a fake database. */
function fakeStore(preexisting: Record<string, Partial<Item>> = {}) {
  const docs = new Map<string, Record<string, unknown>>(
    Object.entries(preexisting).map(([slug, d]) => [slug, { id: `case_${slug}`, slug, ...d }]),
  );
  const calls = { create: [] as Record<string, unknown>[], update: [] as [string, Record<string, unknown>][], lookups: 0 };
  const store: CaseStore = {
    validate: (body, mode) => caseStudies.validate(body, mode),
    getBySlug: async (slug) => {
      calls.lookups++;
      return (docs.get(slug) as Item | undefined) ?? null;
    },
    create: async (value) => {
      calls.create.push(value);
      return { id: `case_${String(value.slug)}`, order: 0, createdAt: "", ...value } as Item;
    },
    update: async (id, value) => {
      calls.update.push([id, value]);
      return { id, order: 0, createdAt: "", ...value } as Item;
    },
  };
  return { store, calls };
}

describe("PLACEHOLDER_CASES", () => {
  it("are three published cases, one per planet feature, in ring / moon / storm order", () => {
    expect(PLACEHOLDER_CASES).toHaveLength(3);
    expect(PLACEHOLDER_CASES.map((c) => c.planetFeature)).toEqual(["ring", "moon", "storm"]);
    for (const c of PLACEHOLDER_CASES) {
      expect(c.published).toBe(true);
      expect(PLANET_FEATURES.map((o) => o.value)).toContain(c.planetFeature);
    }
  });

  it("are unmistakably placeholders: slug prefix, a title that says so, unique slugs", () => {
    for (const c of PLACEHOLDER_CASES) {
      expect(String(c.slug)).toMatch(/^placeholder-/);
      expect(String(c.title)).toMatch(/^Placeholder/);
    }
    expect(new Set(PLACEHOLDER_CASES.map((c) => c.slug)).size).toBe(3);
  });

  it("pass the real case-study validator in create mode (a drifting literal must fail here, not in the database)", () => {
    for (const c of PLACEHOLDER_CASES) {
      const v = caseStudies.validate(c, "create");
      expect(v.ok, `${String(c.slug)}: ${v.ok ? "" : v.error}`).toBe(true);
    }
  });

  it("carry 2-4 paragraphs per section and a first paragraph long enough to exercise the excerpt cut", () => {
    for (const c of PLACEHOLDER_CASES) {
      for (const section of ["problem", "architecture", "outcome"]) {
        const paragraphs = String(c[section]).split("\n\n");
        expect(paragraphs.length, `${String(c.slug)} ${section}`).toBeGreaterThanOrEqual(2);
        expect(paragraphs.length, `${String(c.slug)} ${section}`).toBeLessThanOrEqual(4);
        if (section !== "outcome") expect(paragraphs[0].length, `${String(c.slug)} ${section} first paragraph`).toBeGreaterThan(160);
      }
      expect((c.stack as string[]).length).toBeGreaterThanOrEqual(3);
      expect((c.metrics as string[]).length).toBeGreaterThanOrEqual(2);
    }
  });

  // `diagram` has no default in the case-study spec, so neither validation mode ever writes it:
  // leaving it out of the literals is what keeps an /admin upload safe from a reseed.
  it("do not carry a diagram key, so one uploaded through /admin is never touched", () => {
    for (const c of PLACEHOLDER_CASES) expect("diagram" in c).toBe(false);
  });
});

describe("seedPlaceholderCases", () => {
  it("creates all three on an empty database, published", async () => {
    const { store, calls } = fakeStore();
    const result = await seedPlaceholderCases(store);
    expect(result).toEqual({ created: ["placeholder-ledger", "placeholder-routing", "placeholder-telemetry"], updated: [] });
    expect(calls.create).toHaveLength(3);
    expect(calls.update).toHaveLength(0);
    for (const value of calls.create) expect(value.published).toBe(true);
  });

  it("is re-runnable: existing slugs are updated in place, only missing ones are created", async () => {
    const { store, calls } = fakeStore({ "placeholder-routing": { title: "old" } });
    const result = await seedPlaceholderCases(store);
    expect(result).toEqual({
      created: ["placeholder-ledger", "placeholder-telemetry"],
      updated: ["placeholder-routing"],
    });
    expect(calls.update.map(([id]) => id)).toEqual(["case_placeholder-routing"]);
  });

  it("does not write a diagram key on an update, so an upload through /admin survives a reseed", async () => {
    const { store, calls } = fakeStore({ "placeholder-ledger": { diagram: "/api/media/uploaded" } });
    await seedPlaceholderCases(store);
    const [, value] = calls.update[0];
    expect("diagram" in value).toBe(false);
    expect(value.published).toBe(true);
  });

  // The discriminating case for "update" mode: it validates only the keys PRESENT, so a field the
  // literal omits but that has a spec default (planetFeature "none", published false) is never
  // rewritten on an existing case, while a brand-new case gets those defaults. Validating an
  // existing case in create mode would clobber a hand-edited planetFeature / published flag.
  it("validates an existing case in update mode: a defaulted field the literal omits is not rewritten, a new case gets its defaults", async () => {
    const minimal = [{ slug: "placeholder-minimal", title: "Placeholder minimal" }];
    const existing = fakeStore({ "placeholder-minimal": { planetFeature: "storm", published: true } });
    await seedPlaceholderCases(existing.store, minimal);
    const [, updateValue] = existing.calls.update[0];
    expect(updateValue).toEqual({ slug: "placeholder-minimal", title: "Placeholder minimal" });
    const fresh = fakeStore();
    await seedPlaceholderCases(fresh.store, minimal);
    expect(fresh.calls.create[0]).toMatchObject({ slug: "placeholder-minimal", planetFeature: "none", published: false });
  });

  it("validates everything before writing anything: one bad literal leaves the database untouched", async () => {
    const { store, calls } = fakeStore();
    const bad = [...PLACEHOLDER_CASES.slice(0, 2), { ...PLACEHOLDER_CASES[2], planetFeature: "comet" }];
    await expect(seedPlaceholderCases(store, bad)).rejects.toThrow(/placeholder-telemetry.*invalid/);
    expect(calls.create).toHaveLength(0);
    expect(calls.update).toHaveLength(0);
  });
});

// The branch that decides whether PUBLISHED placeholders reach a database used to live inline in
// scripts/seed.ts, where nothing tested it: inverting its condition passed every unit test. It is
// a function now; the script only maps `ran === false` to a non-zero exit code.
describe("seedPlaceholdersIfAllowed", () => {
  const logs = () => {
    const records: Record<string, unknown>[] = [];
    return { records, log: async (r: Record<string, unknown>) => void records.push(r) };
  };

  it("refuses a remote database: nothing is read or written, an error is logged, ran is false", async () => {
    const { store, calls } = fakeStore();
    const { records, log } = logs();
    for (const uri of ["mongodb+srv://cluster0.abcde.mongodb.net/portfolio", "mongodb://db.example.com:27017/portfolio", undefined]) {
      const outcome = await seedPlaceholdersIfAllowed({ uri, argv: ["node", "seed.ts"], store, log });
      expect(outcome).toEqual({ ran: false });
    }
    expect(calls.lookups).toBe(0);
    expect(calls.create).toHaveLength(0);
    expect(calls.update).toHaveLength(0);
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.level).toBe("error");
      expect(String(r.message)).toMatch(/refused/);
    }
  });

  it("seeds a local database, logs the result at info level, and reports ran", async () => {
    const { store, calls } = fakeStore();
    const { records, log } = logs();
    const outcome = await seedPlaceholdersIfAllowed({ uri: "mongodb://localhost:27018/portfolio", argv: [], store, log });
    expect(outcome.ran).toBe(true);
    expect(outcome.result?.created).toHaveLength(3);
    expect(calls.create).toHaveLength(3);
    expect(records).toEqual([expect.objectContaining({ level: "info", created: outcome.result!.created, updated: [] })]);
  });

  it("seeds a remote database only with exactly --placeholders", async () => {
    const uri = "mongodb+srv://cluster0.abcde.mongodb.net/portfolio";
    const refused = fakeStore();
    expect(await seedPlaceholdersIfAllowed({ uri, argv: ["--placeholder"], store: refused.store, log: logs().log })).toEqual({ ran: false });
    const allowed = fakeStore();
    const outcome = await seedPlaceholdersIfAllowed({ uri, argv: ["--placeholders"], store: allowed.store, log: logs().log });
    expect(outcome.ran).toBe(true);
    expect(allowed.calls.create).toHaveLength(3);
  });

  it("lets a store failure propagate (the script's own catch exits non-zero) instead of reporting ran", async () => {
    const { store } = fakeStore();
    store.getBySlug = async () => {
      throw new Error("db down");
    };
    await expect(
      seedPlaceholdersIfAllowed({ uri: "mongodb://127.0.0.1/portfolio", argv: [], store, log: logs().log }),
    ).rejects.toThrow("db down");
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/lib/placeholderCases.test.ts`
Expected: FAIL — `Cannot find module './placeholderCases'`.

- [ ] **Step 7: Implement the placeholders, the idempotent seeding function and the guarded entry**

The copy is deliberately generic and unmistakable: slugs start `placeholder-`, titles start `Placeholder`, clients say so. The owner replaces all three through `/admin`. An existing case is validated in `"update"` mode: only the keys the literal lists are written, so a defaulted field it omits (`planetFeature`, `published`) is never rewritten; `diagram` has no spec default, so it is untouched in either mode — the literals simply omit it, which is what keeps an `/admin` upload safe from a reseed.

Create `src/lib/placeholderCases.ts`:

```ts
// Placeholder case studies (slice 5, D1). Chapter 05 is built and reviewed against these three —
// one per planet feature — until the owner replaces them through /admin. They are PUBLISHED, so
// scripts/seed.ts only writes them behind seedGuard.canSeedPlaceholders. Every slug starts with
// `placeholder-` and every title says so, so a stray one is unmistakable on a live site.
// Pure data plus one function; relative imports only because tsx runs the seed script.
import type { Collection } from "./collections/defineCollection";
import type { FieldValue } from "./collections/fieldSpec";
import { canSeedPlaceholders } from "./seedGuard";

export type PlaceholderCase = Record<string, FieldValue>;

/** Markdown sections are written as paragraphs joined by a blank line. */
const md = (...paragraphs: string[]) => paragraphs.join("\n\n");

export const PLACEHOLDER_CASES: readonly PlaceholderCase[] = [
  {
    slug: "placeholder-ledger",
    title: "Placeholder: a payments ledger without the monolith",
    client: "Placeholder client (fintech)",
    context: "Moving a payments ledger out of a shared database with no downtime and no double postings.",
    problem: md(
      "The ledger was a set of tables inside the main application database. Every feature team wrote to it directly, so a schema change was a company-wide release and a slow query anywhere could stall postings everywhere. At roughly 40 transactions per second it had no headroom left, and month-end reconciliation took two engineers most of a week.",
      "The brief was strict: **no downtime**, no double postings, and an audit trail a regulator could replay. A one-shot rewrite was ruled out in the first meeting. The migration had to be something the team could stop, inspect and resume at any point.",
      "Success meant one owner for ledger writes, a measurable drop in posting latency, and a reconciliation that finished before the finance team arrived on Monday.",
    ),
    architecture: md(
      "An append-only event log became the ledger's source of truth, with balances and statements as projections rebuilt from it. Writes go through a single posting service that checks the double-entry invariants before anything is committed.",
      "The cutover used a dual-write phase with a comparator: every posting was written to both systems and diffed, and the old path stayed authoritative until the diff had been empty for 14 days. Projections are idempotent consumers, so replaying a day of events is always safe.",
      "Backpressure and retries are explicit. A poison event parks in a dead-letter stream with its full context instead of blocking a partition, and an on-call runbook says how to release it.",
    ),
    outcome: md(
      "Posting p95 fell from 480 ms to 120 ms and the ledger now carries ten times the old peak without tuning. Reconciliation runs nightly and finishes in minutes, so month-end is a review rather than a project.",
      "The team has shipped four schema changes to the ledger since the cutover without a release freeze.",
    ),
    stack: ["Go", "Kafka", "Postgres", "Kubernetes", "OpenTelemetry"],
    metrics: ["p95 480 to 120 ms", "10x peak headroom", "0 double postings"],
    planetFeature: "ring",
    published: true,
  },
  {
    slug: "placeholder-routing",
    title: "Placeholder: dispatch routing that survives a bad day",
    client: "Placeholder client (logistics)",
    context: "Rebuilding a route-planning service so one failed depot no longer stalls the whole fleet.",
    problem: md(
      "Route planning ran as one nightly batch job against a single solver. When a depot lost its connection, or a driver called in sick, the plan was stale until the next run, and dispatchers fixed it by hand in a spreadsheet. On a bad day that meant two hours of phone calls before the first van left.",
      "The business wanted plans that adapted in minutes, a dispatcher who could see why the solver made a choice, and no new single point of failure.",
    ),
    architecture: md(
      "Planning became an event-driven service: depots, vehicles and orders are streams, and a re-plan is triggered by a change rather than by the clock. Each depot is solved as an independent region, so a failure is contained to the region that owns it.",
      "The solver is wrapped behind a time budget. It returns the best feasible plan it has at the deadline together with a short explanation of the constraints that bound it, which the dispatcher UI shows next to the route.",
      "A read-only replica of the planning state sits beside the live service, so the support team can query routes and the reasons behind them without touching the solver.",
    ),
    outcome: md(
      "Re-planning after a depot outage dropped from about two hours to under four minutes. Dispatchers override the solver far less often, and when they do the override is recorded with a reason, which has already improved the cost model twice.",
      "The service has run through three regional outages without a manual spreadsheet.",
    ),
    stack: ["TypeScript", "Node.js", "Redis Streams", "OR-Tools", "PostgreSQL", "Grafana"],
    metrics: ["2 h to 4 min re-plan", "3 outages absorbed", "-38% manual overrides"],
    planetFeature: "moon",
    published: true,
  },
  {
    slug: "placeholder-telemetry",
    title: "Placeholder: a telemetry pipeline for a noisy fleet",
    client: "Placeholder client (industrial IoT)",
    context: "Taming two million sensor messages a minute so that an alert finally means something.",
    problem: md(
      "Forty thousand devices reported every few seconds, and the monitoring stack alerted on every threshold crossing. Operators had learned to ignore the pager, which is exactly when a real fault slips through. Storage costs were also doubling every quarter.",
      "The goal was a pipeline that kept full fidelity for anything anomalous, summarised everything else, and produced alerts that a person could act on.",
    ),
    architecture: md(
      "Ingestion is a thin gateway that authenticates devices, rejects malformed frames at the edge and writes to a partitioned log. A stream processor keeps a rolling baseline per device and per site, and emits an event only when a reading leaves its own baseline, not a global threshold.",
      "Raw data lands in cheap object storage for 30 days and is downsampled after that. Alerts are grouped by probable cause, so one failed gateway raises one incident instead of four hundred.",
      "Every stage exposes its own lag and drop counters, so the pipeline's health is visible on the same dashboards as the fleet it watches.",
    ),
    outcome: md(
      "Alert volume fell by 94 percent while time to detect a real fault improved from hours to minutes. Storage growth flattened, and the on-call rotation went from dreaded to boring, which was the point.",
      "The baselines have since been reused for capacity planning, a use nobody had asked for at the start.",
    ),
    stack: ["Rust", "Kafka", "ClickHouse", "S3", "Prometheus", "Terraform"],
    metrics: ["-94% alerts", "2M msgs/min", "hours to minutes detection"],
    planetFeature: "storm",
    published: true,
  },
];

/** The slice of a Collection the seeding needs; a fake satisfies it in tests. */
export type CaseStore = Pick<Collection, "validate" | "getBySlug" | "create" | "update">;

export interface PlaceholderSeedResult {
  created: string[];
  updated: string[];
}

/**
 * Upserts the placeholders by slug, so the seed can be re-run: a missing slug is created, an
 * existing one is updated in place (its order is kept — a reseed never reorders). Everything is
 * validated before anything is written, so one bad literal fails the run with nothing half-done.
 * An existing document is validated in "update" mode, which only carries the keys the literal
 * lists: a field the literal omits is never rewritten, so a defaulted one (planetFeature, published)
 * that an owner edited through /admin keeps its value, where create mode would reset it to its
 * default. `diagram` has no spec default, so it is untouched in EITHER mode — the literals simply
 * omit it. Throws on an invalid literal. `published: true` is explicit: the synthesized toggle defaults
 * to false, and the voyage only reads published cases.
 */
export async function seedPlaceholderCases(
  store: CaseStore,
  cases: readonly PlaceholderCase[] = PLACEHOLDER_CASES,
): Promise<PlaceholderSeedResult> {
  const plan: { slug: string; existingId: string | null; value: Record<string, FieldValue> }[] = [];
  for (const doc of cases) {
    const slug = String(doc.slug);
    const existing = await store.getBySlug(slug);
    const v = store.validate(doc, existing ? "update" : "create");
    // The same validator the API uses: a literal that drifts from the spec must fail the seed.
    if (!v.ok) throw new Error(`placeholder case "${slug}" invalid: ${v.error}`);
    plan.push({ slug, existingId: existing ? existing.id : null, value: v.value });
  }
  const result: PlaceholderSeedResult = { created: [], updated: [] };
  for (const step of plan) {
    if (step.existingId) {
      await store.update(step.existingId, step.value);
      result.updated.push(step.slug);
    } else {
      await store.create(step.value);
      result.created.push(step.slug);
    }
  }
  return result;
}

export interface PlaceholderSeedOutcome {
  /** false when the guard refused: nothing was read or written. */
  ran: boolean;
  result?: PlaceholderSeedResult;
}

/**
 * The guarded entry the seed script calls: seeds the placeholders only when
 * `canSeedPlaceholders(uri, argv)` allows it, and says what it did through `log` (the script passes
 * `appendLog("seed", …)`). A refusal reads and writes nothing, logs an error and returns
 * `{ ran: false }` — the script maps that to a non-zero exit code. Store failures propagate.
 */
export async function seedPlaceholdersIfAllowed(opts: {
  uri: string | undefined;
  argv: readonly string[];
  store: CaseStore;
  log: (record: Record<string, unknown>) => Promise<void>;
  cases?: readonly PlaceholderCase[];
}): Promise<PlaceholderSeedOutcome> {
  if (!canSeedPlaceholders(opts.uri, opts.argv)) {
    await opts.log({
      level: "error",
      message: "refused to seed published placeholder case studies into a non-local database",
      hint: "target localhost / 127.0.0.1, or pass --placeholders to opt in",
    });
    return { ran: false };
  }
  const result = await seedPlaceholderCases(opts.store, opts.cases);
  await opts.log({ level: "info", message: "placeholder case studies seeded", ...result });
  return { ran: true, result };
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/lib/placeholderCases.test.ts`
Expected: PASS — `Tests  14 passed (14)`.

- [ ] **Step 9: Wire the guarded step into the seed script**

The script keeps no decision of its own: it announces a refusal before the wipe (`canSeedPlaceholders`, a `warn` line), and after the existing seeding hands the store to `seedPlaceholdersIfAllowed`, mapping `ran === false` to `process.exitCode = 1`.

In `scripts/seed.ts`, replace:

```ts
import mongoose from "mongoose";
import { Project, Skill, Settings } from "../src/lib/models";
// Consulting collections (sub-project 2): seeded alongside the portfolio content.
import { services, processSteps } from "../src/lib/collections";
import projectsData from "../data/projects.json";
import skillsData from "../data/skills.json";
import settingsData from "../data/settings.json";
```

with:

```ts
import mongoose from "mongoose";
import { Project, Skill, Settings } from "../src/lib/models";
// Consulting collections (sub-project 2): seeded alongside the portfolio content.
import { services, processSteps, caseStudies } from "../src/lib/collections";
// Slice 5: three published placeholder case studies for chapter 05, behind a local-database guard.
import { appendLog } from "../src/lib/log";
import { canSeedPlaceholders } from "../src/lib/seedGuard";
import { seedPlaceholdersIfAllowed } from "../src/lib/placeholderCases";
import projectsData from "../data/projects.json";
import skillsData from "../data/skills.json";
import settingsData from "../data/settings.json";
```

In `scripts/seed.ts`, replace:

```ts
  if (!uri) {
    console.error("MONGODB_URI env variable is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
```

with:

```ts
  if (!uri) {
    console.error("MONGODB_URI env variable is required");
    process.exit(1);
  }

  // The placeholder guard is evaluated BEFORE the pre-existing wipe below, so the notice precedes
  // the destructive step: a refusal skips the case studies only, it does not stop the rest of
  // the seed (that wipe is pre-existing and unguarded; this guard deliberately does not widen it).
  if (!canSeedPlaceholders(uri, process.argv)) {
    await appendLog("seed", {
      level: "warn",
      message: "non-local database without --placeholders: case studies will be skipped; the rest of the seed will still run",
    });
  }

  await mongoose.connect(uri);
```

In `scripts/seed.ts`, replace:

```ts
  }
  console.log("Seeded 4 process steps");

  await mongoose.disconnect();
  console.log("Done! Disconnected from MongoDB");
}
```

with:

```ts
  }
  console.log("Seeded 4 process steps");

  // Placeholder case studies (slice 5). They are PUBLISHED, so they are only written to a local
  // database or when --placeholders is passed (the decision and its logging live in
  // seedPlaceholdersIfAllowed, where they are tested). A refusal writes no case studies and makes
  // the run exit non-zero, but it does not undo the seeding above.
  const placeholders = await seedPlaceholdersIfAllowed({
    uri,
    argv: process.argv,
    store: caseStudies,
    log: (record) => appendLog("seed", record),
  });
  if (!placeholders.ran) process.exitCode = 1;

  await mongoose.disconnect();
  console.log("Done! Disconnected from MongoDB");
}
```

- [ ] **Step 10: Run the typechecker, the linter and the whole suite**

Run: `npx tsc --noEmit`
Expected: no output (`scripts/` is inside the tsconfig include).

Run: `npx eslint scripts src/lib`
Expected: 0 errors; only the two pre-existing warnings (`src/lib/auth.ts`, `src/lib/mongodb.ts`).

Run: `npx vitest run`
Expected: PASS — `Test Files  46 passed (46)`, `Tests  586 passed (586)` when run after Tasks 1–3 (566 + 6 + 14). Task 4 alone on Task 1: 520 + 20 = 540 / 43 files.

- [ ] **Step 11: (Optional, needs the local Docker `mongo:7` on 27018) Prove the seed script end to end against a scratch database**

Use a throwaway database name so the real local data is never touched, run the seed twice (second run must update, not duplicate), show the refusal path with a host the guard treats as remote (`localhost.` with a trailing dot still resolves locally but is refused), then drop the scratch database:

```bash
MONGODB_URI=mongodb://localhost:27018/s5plan_scratch npx tsx scripts/seed.ts
MONGODB_URI=mongodb://localhost:27018/s5plan_scratch npx tsx scripts/seed.ts
MONGODB_URI=mongodb://localhost.:27018/s5plan_scratch npx tsx scripts/seed.ts; echo "exit=$?"
tail -3 logs/seed.jsonl
docker exec portfolio-mongo-local mongosh --quiet s5plan_scratch --eval 'db.casestudies.find({}, {slug:1, published:1, planetFeature:1, _id:0}).toArray()'
docker exec portfolio-mongo-local mongosh --quiet s5plan_scratch --eval 'db.dropDatabase()'
```
Expected: run 1 logs `"created":["placeholder-ledger","placeholder-routing","placeholder-telemetry"]`, run 2 logs `"updated":[…]` with `"created":[]`, run 3 prints `exit=1` and logs first (before the wipe) `case studies will be skipped; the rest of the seed will still run` and then `refused to seed published placeholder case studies into a non-local database`; the three documents show `published: true` with `ring` / `moon` / `storm`; `logs/seed.jsonl` is git-ignored (`logs/`). Re-running with `--placeholders` against the `localhost.` URI seeds again.

- [ ] **Step 12: Commit**

```bash
git add src/lib/seedGuard.ts src/lib/seedGuard.test.ts src/lib/placeholderCases.ts src/lib/placeholderCases.test.ts scripts/seed.ts
git commit -m "$(cat <<'EOF'
feat(voyage): three published placeholder case studies behind a local-database guard

One case per planet feature (ring / moon / storm), seeded idempotently by slug,
published explicitly, validated in the same validator the API uses. The guard
fails closed: only localhost / 127.0.0.1 / [::1] hosts, or --placeholders, may
receive published placeholders; the decision lives in seedPlaceholdersIfAllowed
(tested), a refusal is logged through appendLog and exits non-zero without
writing case studies.

Spec section 6's "writes nothing" therefore holds for the case studies only: the
pre-existing seed (which already wipes projects, skills, settings, services and
process steps with no guard) is deliberately not widened, so a refusal is
announced BEFORE that wipe ("case studies will be skipped; the rest of the seed
will still run") and the rest of the seed still runs.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push
```

---

### Task 5: The `Planet` set piece + `TierSettings.planetSegments`

**Wave 2 (parallel with Task 6). Needs Waves 0–1 merged. Owns the files below; does not touch `SceneRoot` (Task 7 wires it).**

**Files:**
- Modify: `src/scene/quality.ts`, `src/scene/quality.test.ts`
- Create: `src/scene/chapters/Planet.ts`, `src/scene/chapters/Planet.test.ts`

**Interfaces:**
- Consumes: Task 1 (`starScale`, `getCameraPose`, `progressAt`, `FOV_MIN`, `STAR_POSITION`), Task 2 (`caseCentre`, `worldsCursor`, `worldsPresence`, `WORLDS_WINDOW`, `WORLDS_PRESENCE_END`, the holds), Task 3 (`PlanetFeature`, `toPlanetFeature` from `@/lib/planetFeature`), `AMBER` from `EnergyOrb`.
- Produces (Task 7 and the tests rely on these exact names):
  ```ts
  // quality.ts
  TierSettings.planetSegments: number          // high 64 / mid 32 / still 0
  // Planet.ts — exported tunables (browser review)
  export const PLANET_RADIUS = 2.5, PLANET_DEPTH = 18, PLANET_FADE_OUT_END = 0.9, PLANET_FADE_IN_RATE = 8;
  export const PLANET_TARGET_LANDSCAPE = { x: 0.4, y: -0.05 }, PLANET_TARGET_PORTRAIT = { x: 0, y: -0.45 };
  export const PLANET_RING_INNER, PLANET_RING_OUTER, PLANET_RING_INCLINE, PLANET_RING_ROLL, PLANET_RING_OPACITY;
  export const MOON_RADIUS, MOON_ORBIT, MOON_TILT, MOON_ROLL, MOON_SPEED, PLANET_NIGHT_FLOOR;
  // Planet.ts — pure functions
  export function planetTarget(aspect: number): { readonly x: number; readonly y: number };
  export function planetPosition(k: number, n: number, aspect: number, out?: THREE.Vector3): THREE.Vector3;
  export function planetPresenceTarget(chapterId: ChapterId, chapterProgress: number): number;   // the fade-in TARGET: 1 past cp 0 inside Worlds, else 0
  export function planetFadeOut(chapterId: ChapterId, chapterProgress: number): number;          // scrubbed: 1 to 0.77, long tail to PLANET_FADE_OUT_END, 0 outside
  export function planetWeight(cursor: number, k: number): number;
  export function planetOpacity(chapterId: ChapterId, chapterProgress: number, k: number, n: number): number;
  export function planetsKey(features: readonly PlanetFeature[]): string;     // "" for []
  export function planetsFromKey(key: string): PlanetFeature[];
  // Planet.ts — the piece
  export class Planet implements SetPiece {
    constructor(features: readonly PlanetFeature[]);
    readonly features: readonly PlanetFeature[];   // sanitised
    get count(): number; get object(): THREE.Group | null; get planets(): readonly PlanetView[];
    build(scene: THREE.Scene, tier: Tier): void; update(ctx: FrameContext): void; dispose(): void;
  }
  ```

**Design notes.**
- **One piece owns N planets** (one `Group` each), like `OrbitRing` owns its nodes, so `SceneRoot` gains one piece. A planet is a `SphereGeometry` (segments from `TierSettings`, height half) with a `ShaderMaterial`: 3D value-noise fBm on the sphere's **object-space direction** (no UV seam, no pole pinch), a per-planet `uSeed`, lit by the direction from the planet to `STAR_POSITION` (a dark night side kept readable by `PLANET_NIGHT_FLOOR`, and a narrow **amber terminator band** — the one sanctioned amber outside the star). The attribution header names the nebula source and says exactly what was ported (Decision 12).
- **Features** (`planetFeature`): `ring` — a thin tilted additive grey `RingGeometry`, depth-tested against the sphere so its far half passes behind the planet; `moon` — a small lit sphere on a tilted, rolled, slow orbit driven by the scene clock (`ctx.t`, never scroll; the roll keeps the orbit from swinging across the star, which sits ~2 planet radii to the planet's left); `storm` — a brighter, more turbulent latitude band in the shader (`uStorm` 0/1, no extra mesh) that glows a little on its own so it still reads on the unlit face; unknown / `none` — plain.
- **Placement (D5)** is the pure `planetPosition`: `pose = getCameraPose(progressAt("worlds", caseCentre(k, n)))`, position = `pose.position` + the camera basis (`right = forward × up`, `up' = right × forward` — exactly what `Object3D.lookAt` gives a camera) × an offset derived from an NDC target and `PLANET_DEPTH` at the base FOV (60°). It is recomputed in `update()` only when `camera.aspect` changes (N vector ops, no rebuild, no per-frame allocation; scratch vectors are module-scope).
- **Visibility (A6, amended by ruling B-I2).** The live opacity of planet `k` is `shown × planetFadeOut × planetWeight(worldsCursor, k) × ignite`. `shown` is a private, allocation-free follower that `update()` eases toward `planetPresenceTarget` every frame (`shown += (target − shown) × min(1, dt × PLANET_FADE_IN_RATE)`; a NaN, zero or negative `dt` is no step, a huge `dt` lands exactly on the target; it runs before the visibility early-out so it keeps settling while hidden). This makes the planets' fade-in a TRIGGER like the panels' CSS transition: an arrival at `start + 0.001` (cp 0.0036) shows the planet at ≥ 95 % within 0.5 s instead of at 2 %. `planetFadeOut` (the last planet's long fade to `PLANET_FADE_OUT_END`, 0 outside Worlds) and `planetWeight` (the per-planet cross-fade) stay scroll-scrubbed (A6). `planetOpacity` is the pure steady-state product the clearance and gap tests sweep. A planet's group is hidden at ~0. `still` and zero cases build an empty hidden group.
- **Cost.** The storm band (three extra fBm calls) sits behind a uniform branch (`if (uStorm > 0.5)`): only the storm planet pays for it — 4 fBm per fragment (3 warp + 1 tone) for ring / moon / none, 7 for storm.

- [ ] **Step 1: Write the failing quality assertion**

In `src/scene/quality.test.ts`, replace:

```ts
    expect(TIER_SETTINGS.mid.ringSegments).toBe(64);
    expect(TIER_SETTINGS.mid.ringSegments).toBeLessThan(TIER_SETTINGS.high.ringSegments);
    expect(TIER_SETTINGS.still.ringSegments).toBe(0);
  });
});
```

with:

```ts
    expect(TIER_SETTINGS.mid.ringSegments).toBe(64);
    expect(TIER_SETTINGS.mid.ringSegments).toBeLessThan(TIER_SETTINGS.high.ringSegments);
    expect(TIER_SETTINGS.still.ringSegments).toBe(0);
    // Chapter 05's planet spheres: same shape, `still` never reaches GL.
    expect(TIER_SETTINGS.high.planetSegments).toBe(64);
    expect(TIER_SETTINGS.mid.planetSegments).toBe(32);
    expect(TIER_SETTINGS.mid.planetSegments).toBeLessThan(TIER_SETTINGS.high.planetSegments);
    expect(TIER_SETTINGS.still.planetSegments).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/scene/quality.test.ts`
Expected: FAIL — `expected undefined to be 64` (the field does not exist yet). Summary line: `Tests  1 failed | 11 passed (12)`.

- [ ] **Step 3: Add `planetSegments`**

In `src/scene/quality.ts`, replace:

```ts
  topologyNodes: number;
  /** Chapter 04's orbital ring: tubular segments of the torus (smoothness of the ellipse). */
  ringSegments: number;
}

// "still" never reaches the GL path at all — VoyageRoot renders StillSky instead of
// SceneRoot — so its zeroed counts are documentation, not a branch anything reads.
export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high:  { dpr: 1.5, starCount: 2400, streakCount: 260, topologyNodes: 42, ringSegments: 128 },
  mid:   { dpr: 1,   starCount: 1200, streakCount: 120, topologyNodes: 22, ringSegments: 64  },
  still: { dpr: 1,   starCount: 0,    streakCount: 0,   topologyNodes: 0,  ringSegments: 0   },
};

export interface QualityEnv {
```

with:

```ts
  topologyNodes: number;
  /** Chapter 04's orbital ring: tubular segments of the torus (smoothness of the ellipse). */
  ringSegments: number;
  /** Chapter 05's planets: width segments of each sphere (height is half). `still` builds none. */
  planetSegments: number;
}

// "still" never reaches the GL path at all — VoyageRoot renders StillSky instead of
// SceneRoot — so its zeroed counts are documentation, not a branch anything reads.
export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high:  { dpr: 1.5, starCount: 2400, streakCount: 260, topologyNodes: 42, ringSegments: 128, planetSegments: 64 },
  mid:   { dpr: 1,   starCount: 1200, streakCount: 120, topologyNodes: 22, ringSegments: 64,  planetSegments: 32 },
  still: { dpr: 1,   starCount: 0,    streakCount: 0,   topologyNodes: 0,  ringSegments: 0,   planetSegments: 0  },
};

export interface QualityEnv {
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/scene/quality.test.ts`
Expected: PASS — `Tests  12 passed (12)`.

- [ ] **Step 5: Write the failing `Planet` tests**

The tests are written against the real camera path: projections go through a real `THREE.PerspectiveCamera` placed at the real Worlds pose; clearance and motion sweep the real path; nothing re-implements the placement maths.

Create `src/scene/chapters/Planet.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import {
  Planet, planetPosition, planetTarget, planetPresenceTarget, planetFadeOut, planetWeight, planetOpacity,
  planetsKey, planetsFromKey,
  PLANET_RADIUS, PLANET_DEPTH, PLANET_TARGET_LANDSCAPE, PLANET_TARGET_PORTRAIT, PLANET_FADE_OUT_END,
  PLANET_FADE_IN_RATE, PLANET_RING_OPACITY, MOON_SPEED,
} from "./Planet";
import {
  WORLDS_WINDOW, WORLDS_PRESENCE_END, WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE, caseCentre, caseTarget, worldsCursor,
} from "./worldsSchedule";
import { TIER_SETTINGS } from "@/scene/quality";
import { AMBER } from "./EnergyOrb";
import { CHAPTERS, STAR_POSITION, getCameraPose, progressAt, starScale } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import type { PlanetFeature } from "@/lib/planetFeature";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

const [W0, W1] = WORLDS_WINDOW;
const scrollToWorlds = (cp: number) => voyageStore.setScroll(progressAt("worlds", cp), 0);
const FEATURES: PlanetFeature[] = ["ring", "moon", "storm"];

/** Viewports the browser review covers: landscape 16:10, 4:3, 16:9 and a phone. */
const VIEWPORTS: readonly (readonly [number, number])[] = [[1440, 900], [1024, 768], [1920, 1080], [390, 844]];

/** A camera placed exactly where the real one is at a Worlds chapterProgress (FOV 60, no parallax). */
function cameraAt(cp: number, w: number, h: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(60, w / h, 0.1, 400);
  const pose = getCameraPose(progressAt("worlds", cp));
  cam.position.copy(pose.position);
  cam.lookAt(pose.lookAt);
  cam.updateMatrixWorld();
  return cam;
}

/** Runs `frames` update() calls at `dt` (default 60 fps), re-reading the store each time, so the
 *  planets' dt-eased fade-in follower can settle. The follower is a trigger: it never reads scroll
 *  for its pace, only for its target. */
function settle(planet: Planet, frames = 90, extra: Partial<Parameters<typeof makeFrame>[0]> = {}) {
  for (let i = 0; i < frames; i++) planet.update(makeFrame({ dt: 1 / 60, ...extra }));
}

function built(features: PlanetFeature[] = FEATURES, tier: "high" | "mid" | "still" = "high") {
  const scene = new THREE.Scene();
  const planet = new Planet(features);
  planet.build(scene, tier);
  return { scene, planet };
}

describe("planetTarget", () => {
  it("is landscape from aspect 1 up and portrait below it", () => {
    expect(planetTarget(1.6)).toBe(PLANET_TARGET_LANDSCAPE);
    expect(planetTarget(1)).toBe(PLANET_TARGET_LANDSCAPE);
    expect(planetTarget(390 / 844)).toBe(PLANET_TARGET_PORTRAIT);
    expect(PLANET_TARGET_LANDSCAPE.x).toBeGreaterThanOrEqual(0.4);   // clear of a 4:3 star disc
    expect(PLANET_TARGET_PORTRAIT.x).toBe(0);                        // centred under the phone panel
  });
});

describe("planetPosition", () => {
  it("projects onto the NDC target at the centre of its own slot, for every viewport and count", () => {
    for (const [w, h] of VIEWPORTS) {
      const target = planetTarget(w / h);
      for (const n of [1, 3, 5]) {
        for (let k = 0; k < n; k++) {
          const ndc = planetPosition(k, n, w / h).project(cameraAt(caseCentre(k, n), w, h));
          expect(ndc.x, `${w}x${h} n${n} k${k} x`).toBeCloseTo(target.x, 6);
          expect(ndc.y, `${w}x${h} n${n} k${k} y`).toBeCloseTo(target.y, 6);
        }
      }
    }
  });

  it("sits PLANET_DEPTH in front of the camera along the view axis at that point", () => {
    const cam = cameraAt(caseCentre(1, 3), 1440, 900);
    const local = planetPosition(1, 3, 1440 / 900).applyMatrix4(cam.matrixWorldInverse);
    expect(-local.z).toBeCloseTo(PLANET_DEPTH, 6);
  });

  it("writes into the caller's vector without allocating, and never returns NaN for an empty or odd count", () => {
    const out = new THREE.Vector3();
    expect(planetPosition(0, 3, 1.6, out)).toBe(out);
    for (const n of [0, -1, NaN, 2.9]) {
      const p = planetPosition(0, n, 1.6);
      expect([p.x, p.y, p.z].every(Number.isFinite)).toBe(true);
    }
  });

  // The planet is in front of the star (it occludes the halo), so the disc must stay clear of it
  // everywhere it is mostly visible, not just at the slot centre: the camera drifts the planet
  // ~23 px toward the star by the edge of a slot at 4:3 (measured: 7 px of gap at 1024x768, k = 2).
  it("keeps a visible gap between the planet disc and the star disc across the whole slot, not only at its centre", () => {
    const n = 3;
    const slot = (W1 - W0) / n;
    for (const [w, h] of VIEWPORTS) {
      const focal = h / 2 / Math.tan(THREE.MathUtils.degToRad(30));
      for (let k = 0; k < n; k++) {
        const pos = planetPosition(k, n, w / h);
        let sampled = 0;
        for (const d of [-0.5, -0.4, -0.25, -0.1, 0, 0.1, 0.25, 0.4, 0.5]) {
          const cp = caseCentre(k, n) + d * slot;
          if (planetOpacity("worlds", cp, k, n) <= 0.5) continue;       // only where the planet is mostly shown
          sampled++;
          const cam = cameraAt(cp, w, h);
          const planetNdc = pos.clone().project(cam);
          const starNdc = STAR_POSITION.clone().project(cam);
          const separation = Math.hypot(((planetNdc.x - starNdc.x) * w) / 2, ((planetNdc.y - starNdc.y) * h) / 2);
          const planetR = (PLANET_RADIUS / pos.distanceTo(cam.position)) * focal;
          const starR = (starScale(progressAt("worlds", cp)) / STAR_POSITION.distanceTo(cam.position)) * focal;
          expect(separation - planetR - starR, `${w}x${h} k${k} d${d}`).toBeGreaterThan(0);
          // At the slot centre the margin is the composed one: 4:3 is the tightest landscape window.
          if (d === 0) expect(separation - planetR - starR, `${w}x${h} k${k} centre`).toBeGreaterThan(w < h ? 25 : 10);
        }
        expect(sampled, `${w}x${h} k${k} samples`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  // Landscape: real camera motion carries each planet left -> right across the frame (A5).
  it("moves right on screen through its whole slot in landscape, by a visible amount", () => {
    const [w, h] = [1440, 900];
    const slot = (W1 - W0) / 3;
    for (let k = 0; k < 3; k++) {
      const pos = planetPosition(k, 3, w / h);
      const xs = Array.from({ length: 21 }, (_, i) => pos.clone().project(cameraAt(W0 + k * slot + (slot * i) / 20, w, h)).x);
      for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
      expect(xs[20] - xs[0]).toBeGreaterThan(0.05);                  // ~0.09 NDC, about 60 px at 1440
    }
  });

  // Portrait: the planet drops down the frame instead, and barely moves sideways (A5).
  it("moves down on screen through its slot in portrait, and stays centred sideways", () => {
    const [w, h] = [390, 844];
    const slot = (W1 - W0) / 3;
    for (let k = 0; k < 3; k++) {
      const pos = planetPosition(k, 3, w / h);
      const pts = Array.from({ length: 21 }, (_, i) => pos.clone().project(cameraAt(W0 + k * slot + (slot * i) / 20, w, h)));
      for (let i = 1; i < pts.length; i++) expect(pts[i].y).toBeLessThan(pts[i - 1].y);
      for (const p of pts) expect(Math.abs(p.x)).toBeLessThan(0.05);
    }
  });

  // The corridor after Worlds passes within ~4 units of this spot, so a planet that stays drawn
  // there would swallow the camera: clearance is only required while it is visible (A6).
  it("keeps the camera at least 3 units off the surface for as long as each planet is visible", () => {
    for (const aspect of [1.6, 4 / 3, 390 / 844]) {
      for (const n of [3, 6, 8]) {
        for (let k = 0; k < n; k++) {
          const pos = planetPosition(k, n, aspect);
          for (let i = 0; i <= 400; i++) {
            const cp = (0.9 * i) / 400;
            if (planetOpacity("worlds", cp, k, n) <= 0.001) continue;
            const camPos = getCameraPose(progressAt("worlds", cp)).position;
            expect(pos.distanceTo(camPos) - PLANET_RADIUS, `aspect ${aspect.toFixed(2)} n${n} k${k} cp ${cp.toFixed(3)}`).toBeGreaterThanOrEqual(3);
          }
        }
      }
    }
  });
});

describe("planetPresenceTarget / planetFadeOut", () => {
  it("the fade-in target is 0 outside Worlds and at its first frame, 1 for any progress past it", () => {
    for (const id of ["launch", "approach", "jump", "orbit", "belt", "pilot", "surface"] as const) {
      expect(planetPresenceTarget(id, 0.4)).toBe(0);
    }
    expect(planetPresenceTarget("worlds", 0)).toBe(0);
    expect(planetPresenceTarget("worlds", NaN)).toBe(0);
    for (const cp of [0.0036, W0 / 2, 0.3, W1, WORLDS_HOLD_MOBILE, 0.95, 1]) expect(planetPresenceTarget("worlds", cp)).toBe(1);
  });

  it("the fade-out is 0 outside Worlds, 1 from its first frame through the window and its edge margin", () => {
    for (const id of ["launch", "approach", "jump", "orbit", "belt", "pilot", "surface"] as const) {
      expect(planetFadeOut(id, 0.4)).toBe(0);
    }
    for (const cp of [0, 0.0036, W0, 0.3, (W0 + W1) / 2, W1, WORLDS_PRESENCE_END]) expect(planetFadeOut("worlds", cp)).toBe(1);
  });

  it("is still showing when the desktop pin releases and when the phone's does, and gone by PLANET_FADE_OUT_END", () => {
    expect(planetFadeOut("worlds", WORLDS_HOLD_DESKTOP)).toBeGreaterThan(0.9);
    expect(planetFadeOut("worlds", WORLDS_HOLD_MOBILE)).toBeGreaterThan(0);          // the last planet, on a phone
    expect(planetFadeOut("worlds", WORLDS_HOLD_MOBILE)).toBeLessThan(1);
    for (const cp of [PLANET_FADE_OUT_END, 0.95, 1]) expect(planetFadeOut("worlds", cp)).toBe(0);
  });

  it("never rises while fading out", () => {
    let prev = 2;
    for (let k = 0; k <= 100; k++) {
      const v = planetFadeOut("worlds", WORLDS_PRESENCE_END + (k / 100) * (PLANET_FADE_OUT_END - WORLDS_PRESENCE_END));
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("planetWeight / planetOpacity", () => {
  it("shows exactly one planet while its case dwells, and none of the others", () => {
    for (const n of [2, 3, 6]) {
      for (let k = 0; k < n; k++) {
        const cp = caseCentre(k, n);
        const opacities = Array.from({ length: n }, (_, j) => planetOpacity("worlds", cp, j, n));
        expect(opacities[k]).toBe(1);
        expect(opacities.filter((o) => o > 0)).toHaveLength(1);
      }
    }
  });

  it("cross-fades only inside the cursor's travel: weights always sum to 1 and never show two full planets", () => {
    const n = 3;
    for (let i = 0; i <= 600; i++) {
      const cp = W0 + ((W1 - W0) * i) / 600;
      const w = Array.from({ length: n }, (_, k) => planetOpacity("worlds", cp, k, n));
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      expect(Math.max(...w)).toBeGreaterThanOrEqual(0.5);
    }
    expect(planetWeight(0.5, 0)).toBeCloseTo(0.5, 12);
    expect(planetWeight(0.5, 1)).toBeCloseTo(0.5, 12);
    expect(planetWeight(0, 2)).toBe(0);
  });

  // Planet and Worlds are each tested against caseCentre, but not against each other: a future edit
  // to either Math.round (panel) or planetWeight (planet) must not let them disagree about which
  // case is "current". Exact .5 ties (the middle of a cross-fade) have no single answer.
  it("shows the planet of the case whose panel is lit: the max-weight index equals the caseTarget-lit index", () => {
    for (const n of [2, 3, 6]) {
      for (let i = 1; i <= 600; i++) {
        const cp = i / 600;
        const cursor = worldsCursor(cp, n);
        const weights = Array.from({ length: n }, (_, k) => planetWeight(cursor, k));
        const max = Math.max(...weights);
        if (weights.filter((w) => Math.abs(w - max) < 1e-9).length > 1) continue;          // an exact tie
        const lit = Array.from({ length: n }, (_, k) => caseTarget(k, n, cp)).indexOf(1);
        expect(weights.indexOf(max), `n${n} cp ${cp.toFixed(4)}`).toBe(lit);
      }
    }
  });

  it("is 0 for every planet outside the chapter", () => {
    expect(planetOpacity("orbit", 0.4, 0, 3)).toBe(0);
    expect(planetOpacity("worlds", 0.95, 2, 3)).toBe(0);
  });
});

describe("planetsKey / planetsFromKey", () => {
  it("round-trips every list, and keeps an empty list apart from a one-planet list", () => {
    for (const list of [[], ["none"], ["ring"], ["ring", "moon", "storm"], ["none", "none"]] as PlanetFeature[][]) {
      expect(planetsFromKey(planetsKey(list))).toEqual(list);
    }
    expect(planetsKey([])).toBe("");
    expect(planetsKey(["none"])).toBe("none");
  });

  it("is a stable value: two equal lists give the same key, so SceneRoot does not rebuild the context", () => {
    expect(planetsKey(["ring", "moon"])).toBe(planetsKey(["ring", "moon"]));
    expect(planetsKey(["ring", "moon"])).not.toBe(planetsKey(["moon", "ring"]));
  });

  it("reads anything unknown as none", () => {
    expect(planetsFromKey("ring,comet,,storm")).toEqual(["ring", "none", "none", "storm"]);
  });
});

describe("Planet build", () => {
  it("builds one group per planet with the parts its feature asks for, in CMS order", () => {
    const { scene, planet } = built(["ring", "moon", "storm", "none"]);
    expect(scene.children).toHaveLength(1);
    const [ring, moon, storm, none] = planet.planets;
    expect(planet.count).toBe(4);
    expect(ring.ring).not.toBeNull();
    expect(ring.moon).toBeNull();
    expect(moon.moon).not.toBeNull();
    expect(moon.ring).toBeNull();
    expect(storm.material.uniforms.uStorm.value).toBe(1);
    for (const v of [ring, moon, none]) expect(v.material.uniforms.uStorm.value).toBe(0);
    expect(none.ring).toBeNull();
    expect(none.moon).toBeNull();
  });

  it("tessellates the spheres from the tier settings", () => {
    for (const tier of ["high", "mid"] as const) {
      const { planet } = built(["ring"], tier);
      expect(planet.planets[0].mesh.geometry.parameters.widthSegments).toBe(TIER_SETTINGS[tier].planetSegments);
    }
    expect(TIER_SETTINGS.high.planetSegments).toBeGreaterThan(TIER_SETTINGS.mid.planetSegments);
  });

  it("treats an unknown feature as none and never throws on one", () => {
    const { planet } = built(["comet" as unknown as PlanetFeature, "ring"]);
    expect(planet.features).toEqual(["none", "ring"]);
    expect(planet.planets[0].ring).toBeNull();
  });

  it("gives every planet its own surface seed, so no two surfaces match", () => {
    const { planet } = built(["none", "none", "none", "none"]);
    const seeds = planet.planets.map((p) => (p.material.uniforms.uSeed.value as THREE.Vector3).toArray().join());
    expect(new Set(seeds).size).toBe(4);
  });

  it("is monochrome except the terminator: the only colour a surface carries is the star's amber", () => {
    const { planet } = built(["ring"]);
    const v = planet.planets[0];
    expect((v.material.uniforms.uAmber.value as THREE.Color).getHex()).toBe(AMBER);
    expect(v.material.transparent).toBe(true);
    expect(v.ring!.material.color.getHex()).toBe(0xffffff);           // grey/white ring, additive
    expect(v.ring!.material.blending).toBe(THREE.AdditiveBlending);
    expect(v.ring!.material.depthWrite).toBe(false);
  });

  it("builds nothing for no cases or the still tier (no GPU resources for nothing)", () => {
    for (const { planet } of [built([]), built(FEATURES, "still")]) {
      expect(planet.object!.children).toHaveLength(0);
      expect(planet.planets).toHaveLength(0);
      scrollToWorlds(0.3);
      expect(() => planet.update(makeFrame())).not.toThrow();
      expect(planet.object!.visible).toBe(false);
    }
  });

  it("places each planet at its world position and lights it from the star", () => {
    const { planet } = built();
    planet.planets.forEach((v, k) => {
      expect(v.group.position.distanceTo(planetPosition(k, 3, 16 / 10))).toBeLessThan(1e-9);
      const toStar = STAR_POSITION.clone().sub(v.group.position).normalize();
      expect((v.material.uniforms.uLightDir.value as THREE.Vector3).distanceTo(toStar)).toBeLessThan(1e-9);
    });
  });
});

describe("Planet update", () => {
  it("is a no-op before build() and after dispose()", () => {
    const planet = new Planet(FEATURES);
    expect(() => planet.update(makeFrame())).not.toThrow();
    const { planet: b } = built();
    b.dispose();
    expect(() => b.update(makeFrame())).not.toThrow();
  });

  it("is hidden outside Worlds and once its fade has finished, visible between", () => {
    const { planet } = built();
    settle(planet, 5);                                                // launch
    expect(planet.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("orbit", 0.9), 0);
    settle(planet, 5);
    expect(planet.object!.visible).toBe(false);
    scrollToWorlds(caseCentre(0, 3));
    settle(planet);
    expect(planet.object!.visible).toBe(true);
    scrollToWorlds(PLANET_FADE_OUT_END);
    settle(planet, 5);
    expect(planet.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("belt", 0.1), 0);
    settle(planet, 5);
    expect(planet.object!.visible).toBe(false);
  });

  it("shows exactly the planet whose case is lit at each slot centre", () => {
    const { planet } = built();
    for (let k = 0; k < 3; k++) {
      scrollToWorlds(caseCentre(k, 3));
      settle(planet);
      expect(planet.planets.map((v) => v.group.visible)).toEqual([0, 1, 2].map((j) => j === k));
      expect(planet.planets[k].material.uniforms.uOpacity.value).toBeCloseTo(1, 4);
    }
  });

  it("keeps the last planet up through the desktop and phone pin releases (A6)", () => {
    const { planet } = built();
    for (const cp of [WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE]) {
      scrollToWorlds(cp);
      settle(planet);
      expect(planet.planets.map((v) => v.group.visible)).toEqual([false, false, true]);
    }
  });

  it("scales the surface, ring and moon opacity by the fade and by the ignition curtain", () => {
    const { planet } = built(["ring", "moon"]);
    scrollToWorlds(caseCentre(0, 2));
    settle(planet, 90, { ignite: 0.5 });
    expect(planet.planets[0].material.uniforms.uOpacity.value).toBeCloseTo(0.5, 4);
    expect(planet.planets[0].ring!.material.opacity).toBeCloseTo(PLANET_RING_OPACITY * 0.5, 4);
    scrollToWorlds(caseCentre(1, 2));
    settle(planet, 90, { ignite: 0.5 });
    expect(planet.planets[1].moon!.mesh.material.uniforms.uOpacity.value).toBeCloseTo(0.5, 4);
  });

  it("re-places every planet when the camera's aspect changes, without rebuilding", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    settle(planet, 5);
    const sphere = planet.planets[0].mesh.geometry;
    const landscape = planet.planets[0].group.position.clone();
    const portrait = new THREE.PerspectiveCamera(60, 390 / 844);
    planet.update(makeFrame({ camera: portrait }));
    expect(planet.planets[0].group.position.distanceTo(planetPosition(0, 3, 390 / 844))).toBeLessThan(1e-9);
    expect(planet.planets[0].group.position.distanceTo(landscape)).toBeGreaterThan(1);
    expect(planet.planets[0].mesh.geometry).toBe(sphere);
    // A non-finite aspect (a zero-height window mid-resize) leaves the placement alone.
    const before = planet.planets[0].group.position.clone();
    const broken = new THREE.PerspectiveCamera(60, 1);
    broken.aspect = NaN;
    planet.update(makeFrame({ camera: broken }));
    expect(planet.planets[0].group.position.equals(before)).toBe(true);
  });

  it("orbits the moon off the scene clock, not off scroll", () => {
    const { planet } = built(["moon"]);
    scrollToWorlds(caseCentre(0, 1));
    settle(planet, 5);                                                // the planet must be up for the moon to move
    planet.update(makeFrame({ t: 2 }));
    const a = planet.planets[0].moon!.pivot.rotation.y;
    planet.update(makeFrame({ t: 6 }));
    expect(planet.planets[0].moon!.pivot.rotation.y - a).toBeCloseTo(4 * MOON_SPEED, 9);
  });
});

// The planets' chapter-level fade-in is a TRIGGER eased by dt (the panels' CSS transition does the
// same for caseTarget): a nav / rail / back-link arrival lands at start + 0.001 and must show the
// planet at once, not after 18vh of scroll. The per-planet cross-fade and the last planet's long
// fade-out stay scroll-scrubbed.
describe("Planet update — the fade-in follower", () => {
  const opacity = (planet: Planet, k = 0) => planet.planets[k].material.uniforms.uOpacity.value as number;

  it("reaches 95% within half a second of an arrival at start + 0.001, and is not there yet on the first frame", () => {
    const { planet } = built();
    voyageStore.setScroll(CHAPTERS.find((c) => c.id === "worlds")!.start + 0.001, 0);
    expect(voyageStore.getState().chapter.id).toBe("worlds");
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(opacity(planet)).toBeLessThan(0.3);                         // eased in, not a pop
    settle(planet, 29);                                               // 30 frames = 0.5 s at 60 fps
    expect(opacity(planet)).toBeGreaterThanOrEqual(0.95);
    expect(PLANET_FADE_IN_RATE).toBeGreaterThan(0);
    expect(planet.planets[0].group.visible).toBe(true);
  });

  it("does not depend on the frame rate to arrive: 30 fps gets there in the same half second", () => {
    const { planet } = built();
    voyageStore.setScroll(CHAPTERS.find((c) => c.id === "worlds")!.start + 0.001, 0);
    settle(planet, 15, { dt: 1 / 30 });
    expect(opacity(planet)).toBeGreaterThanOrEqual(0.95);
  });

  it("converges to 0 at the chapter's first frame and outside Worlds, and comes back in from 0, not from a stale 1", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    settle(planet);
    expect(opacity(planet)).toBeGreaterThan(0.99);
    scrollToWorlds(0);                                                // back to cp 0 inside Worlds: target 0
    settle(planet);
    expect(planet.object!.visible).toBe(false);
    scrollToWorlds(caseCentre(0, 3));
    settle(planet);
    voyageStore.setScroll(progressAt("orbit", 0.5), 0);               // outside Worlds: hidden at once
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(planet.object!.visible).toBe(false);
    settle(planet);                                                   // ...and the follower settles to 0 while hidden
    voyageStore.setScroll(progressAt("worlds", caseCentre(0, 3)), 0);
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(opacity(planet)).toBeLessThan(0.3);
  });

  it("never overshoots on a huge dt (a resumed tab) and treats a NaN, zero or negative dt as no step", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    planet.update(makeFrame({ dt: 30 }));
    expect(opacity(planet)).toBe(1);                                  // lands on the target, no further
    const { planet: p2 } = built();
    scrollToWorlds(caseCentre(0, 3));
    for (const dt of [NaN, 0, -1]) p2.update(makeFrame({ dt }));
    expect(opacity(p2)).toBe(0);
    expect(Number.isFinite(opacity(p2))).toBe(true);
    expect(p2.object!.visible).toBe(false);
  });

  it("keeps the per-planet cross-fade and the last planet's fade-out scrubbed by scroll, not eased", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(2, 3));
    settle(planet);
    scrollToWorlds(WORLDS_HOLD_MOBILE);                                // 0.858: inside the scrubbed fade-out
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(opacity(planet, 2)).toBeCloseTo(planetOpacity("worlds", WORLDS_HOLD_MOBILE, 2, 3), 2);
    scrollToWorlds(PLANET_FADE_OUT_END);
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(planet.object!.visible).toBe(false);                        // gone the same frame
  });
});

describe("Planet lifecycle", () => {
  it("replaces the previous build when build() is called twice", () => {
    const scene = new THREE.Scene();
    const planet = new Planet(FEATURES);
    planet.build(scene, "high");
    const first = planet.planets[0].mesh.geometry;
    planet.build(scene, "high");
    expect(scene.children).toHaveLength(1);
    expect(planet.planets).toHaveLength(3);
    expect(planet.planets[0].mesh.geometry).not.toBe(first);
  });

  it("disposes idempotently, frees every GPU resource once (sphere, ring, ring material, surface and moon materials), and rebuilds after a dispose", () => {
    const scene = new THREE.Scene();
    const planet = new Planet(FEATURES);                               // ring, moon, storm
    planet.build(scene, "mid");
    const [ringPlanet, moonPlanet, stormPlanet] = planet.planets;
    const spies = {
      sphere: vi.fn(),
      ringGeometry: vi.fn(),
      ringMaterial: vi.fn(),
      ringSurface: vi.fn(),
      moonSurface: vi.fn(),
      moonMesh: vi.fn(),
      stormSurface: vi.fn(),
    };
    ringPlanet.mesh.geometry.addEventListener("dispose", spies.sphere);
    ringPlanet.ring!.geometry.addEventListener("dispose", spies.ringGeometry);
    ringPlanet.ring!.material.addEventListener("dispose", spies.ringMaterial);
    ringPlanet.material.addEventListener("dispose", spies.ringSurface);
    moonPlanet.material.addEventListener("dispose", spies.moonSurface);
    moonPlanet.moon!.mesh.material.addEventListener("dispose", spies.moonMesh);
    stormPlanet.material.addEventListener("dispose", spies.stormSurface);
    const sphere = ringPlanet.mesh.geometry;
    planet.dispose();
    for (const [name, spy] of Object.entries(spies)) expect(spy, name).toHaveBeenCalledTimes(1);
    expect(scene.children).toHaveLength(0);
    expect(planet.object).toBeNull();
    expect(() => planet.dispose()).not.toThrow();
    for (const [name, spy] of Object.entries(spies)) expect(spy, `${name} after a second dispose`).toHaveBeenCalledTimes(1);
    planet.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(planet.planets[0].mesh.geometry).not.toBe(sphere);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/scene/chapters/Planet.test.ts`
Expected: FAIL — `Cannot find module './Planet'` (`Test Files  1 failed (1)`).

- [ ] **Step 7: Implement `Planet.ts`**

Create `src/scene/chapters/Planet.ts`:

```ts
/*
 * Chapter 05's set piece: one planet per published case study, each carried across the frame
 * while its case panel is read.
 *
 * Surface shader — attribution. Taken from the "julian-vance-nebula" shader in MengTo/threeui
 * (src/shaders/neuform-isolated/sources/julian-vance-nebula.html, MIT,
 * https://github.com/MengTo/threeui): the fBm constants (four octaves, start amplitude 0.55,
 * gain 0.5, lacunarity 2.05) and the idea of a domain warp — offsetting the sample point by fBm
 * of itself. The warp here is NOT the source's: that one adds two fBm calls scaled by 0.35 to a
 * 2D point; this adds three, centred on their mean (value noise is not zero-mean) and scaled by
 * 0.7, to a 3D point. Not taken: the noise primitive (the source is 2D, screen-space simplex;
 * this is the 3D value noise EnergyOrb already uses, with EnergyOrb's per-octave `+ vec3(1.7)`
 * shift, sampled on the sphere's object-space direction so there is no UV seam or pole pinch).
 * Re-implemented against three@0.169; no source text was copied.
 */
import * as THREE from "three";
import { STAR_POSITION, FOV_MIN, getCameraPose, progressAt, type CameraPose, type ChapterId } from "@/scene/camera/flightPath";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import { toPlanetFeature, type PlanetFeature } from "@/lib/planetFeature";
import { AMBER } from "./EnergyOrb";
import { WORLDS_PRESENCE_END, caseCentre, worldsCursor } from "./worldsSchedule";
import type { FrameContext, SetPiece } from "./types";

const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));
const smooth = (t: number) => t * t * (3 - 2 * t);

/* ---- Browser-review tunables (spec §3). Exported so the review can retune a value without
 * touching any logic below. ---- */

/** World-space radius of a planet: ~108 px at 1440x900, ~24% of the viewport height. */
export const PLANET_RADIUS = 2.5;

/** Camera-space depth (along the view axis) at which a planet is placed at its slot centre. It
 *  sits in front of the star (25-37 units away there), so it occludes the star's halo. Smaller
 *  depths move the planet more across the frame but bring it within 3 units of the camera later
 *  in the voyage (the clearance test pins >= PLANET_RADIUS + 3 while visible). */
export const PLANET_DEPTH = 18;

/** Where a planet projects at the centre of its slot, in NDC (x right, y up). Landscape: centre-
 *  right, clear of the left panel and the star disc (x >= 0.40 keeps a 4:3 window clear of it);
 *  portrait: centred below the phone panel (no horizontal offset — the planet's motion there is
 *  vertical). */
export const PLANET_TARGET_LANDSCAPE = { x: 0.4, y: -0.05 } as const;
export const PLANET_TARGET_PORTRAIT = { x: 0, y: -0.45 } as const;

/** The last planet's fade-out runs from WORLDS_PRESENCE_END to here (like OrbitRing's ringFade),
 *  so a phone, whose pin holds to cp 0.858, still shows it. Clearance holds to this point. */
export const PLANET_FADE_OUT_END = 0.9;

/** Rate (1/s) of the planets' chapter-level fade-IN, a trigger like the panels: a nav, rail or
 *  back-link arrival at `start + 0.001` must land on a complete frame, so the planet cannot wait
 *  for scroll to bring it in. 8 reaches 95 % in ~0.37 s at 60 fps (a test pins <= 0.5 s). */
export const PLANET_FADE_IN_RATE = 8;

/** Ring (feature `ring`): inner / outer radius in planet radii, how far its plane is inclined
 *  toward the camera (radians) and its roll about the view axis. Additive grey. */
export const PLANET_RING_INNER = 1.4;
export const PLANET_RING_OUTER = 1.75;
export const PLANET_RING_INCLINE = (24 * Math.PI) / 180;
export const PLANET_RING_ROLL = (-16 * Math.PI) / 180;
export const PLANET_RING_OPACITY = 0.4;

/** Moon (feature `moon`): radius and orbit radius in planet radii, orbit-plane tilt and roll
 *  (radians) and angular speed (rad/s). Ambient motion off the scene clock — not scroll, and
 *  never in `still`. The roll stands the orbit's long axis nearly upright so the moon never
 *  swings left across the star (the star sits ~2 planet radii to the planet's left). */
export const MOON_RADIUS = 0.28;
export const MOON_ORBIT = 2.1;
export const MOON_TILT = (30 * Math.PI) / 180;
export const MOON_ROLL = (72 * Math.PI) / 180;
export const MOON_SPEED = 0.35;

/** Floor of the surface brightness on the night side, 0..1: the star lights a planet from behind
 *  and to the left, so most of the visible face is unlit and would otherwise be pure black. */
export const PLANET_NIGHT_FLOOR = 0.12;

/** Phase (radians) between the moons of different planets, so no two share an angle. */
const MOON_PHASE_STEP = 2.1;

/** Aspect the planets are first placed at, before the camera's real aspect is known. */
const DEFAULT_ASPECT = 16 / 10;

/** The NDC target for a viewport: portrait below aspect 1, landscape otherwise. (A portrait
 *  tablet >= 768 px wide gets the portrait target with the desktop panel layout: accepted, and
 *  outside the browser-review matrix.) */
export function planetTarget(aspect: number): { readonly x: number; readonly y: number } {
  return aspect < 1 ? PLANET_TARGET_PORTRAIT : PLANET_TARGET_LANDSCAPE;
}

// Scratch objects for planetPosition: it runs on an aspect change, never per frame.
const UP = new THREE.Vector3(0, 1, 0);
const scratchPose: CameraPose = { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
const scratchFwd = new THREE.Vector3();
const scratchRight = new THREE.Vector3();
const scratchUp = new THREE.Vector3();

/**
 * World position of planet `k` of `n` for a viewport `aspect`: the camera pose at the centre of
 * the planet's slot, plus the camera basis x (an offset derived from the NDC target and
 * PLANET_DEPTH). By construction the planet projects exactly onto the target at that scroll
 * position (at the base FOV, 60 degrees; wider FOV while the reader flicks pulls it toward the
 * centre), and real camera motion carries it across the frame either side of it.
 */
export function planetPosition(k: number, n: number, aspect: number, out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
  getCameraPose(progressAt("worlds", caseCentre(k, n)), scratchPose);
  // The basis Object3D.lookAt gives a camera: right = forward x up, up' = right x forward.
  scratchFwd.subVectors(scratchPose.lookAt, scratchPose.position).normalize();
  scratchRight.crossVectors(scratchFwd, UP).normalize();
  scratchUp.crossVectors(scratchRight, scratchFwd);
  const target = planetTarget(aspect);
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(FOV_MIN) / 2) * PLANET_DEPTH;
  return out
    .copy(scratchPose.position)
    .addScaledVector(scratchFwd, PLANET_DEPTH)
    .addScaledVector(scratchRight, target.x * halfHeight * aspect)
    .addScaledVector(scratchUp, target.y * halfHeight);
}

/**
 * The 0/1 TARGET of the planets' chapter-level fade-in: 1 for any chapterProgress past 0 inside
 * Worlds, 0 at its first frame and everywhere else. Planet.update eases a private follower toward
 * it with dt (never scroll), exactly as the panels' CSS transition eases caseTarget, so an arrival
 * at start + 0.001 shows the planet within ~0.4 s instead of waiting for 18vh of scroll.
 */
export function planetPresenceTarget(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "worlds") return 0;
  return clamp01(chapterProgress) > 0 ? 1 : 0;
}

/**
 * 0..1 SCROLL-SCRUBBED fade-out of the planets: 0 outside Worlds, 1 through the window and its
 * edge margin, then the LAST planet's long fade to PLANET_FADE_OUT_END (the schedule's own
 * presence ends at 0.77, but a phone's pin holds the last case to 0.858). The camera flies through
 * this region in the chapters that follow, so it is 0 from PLANET_FADE_OUT_END on — hiding the
 * planet there is load-bearing (the clearance test only covers the visible interval).
 */
export function planetFadeOut(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "worlds") return 0;
  const t = clamp01(chapterProgress);
  if (t >= PLANET_FADE_OUT_END) return 0;
  if (t <= WORLDS_PRESENCE_END) return 1;
  return smooth(1 - (t - WORLDS_PRESENCE_END) / (PLANET_FADE_OUT_END - WORLDS_PRESENCE_END));
}

/** How much of planet `k` shows for a cursor value: 1 while its case dwells, a straight
 *  cross-fade with its neighbour only inside the cursor's travel stretch, 0 otherwise. The
 *  weights of all planets sum to 1, so exactly one planet is ever fully shown. */
export function planetWeight(cursor: number, k: number): number {
  return clamp01(1 - Math.abs(cursor - k));
}

/** STEADY-STATE opacity of planet `k` of `n` (the fade-in follower fully settled, before the
 *  ignition curtain): presence target x scrubbed fade-out x its own weight. The pure function
 *  tests and the clearance sweep use; Planet.update multiplies the live follower in instead. */
export function planetOpacity(chapterId: ChapterId, chapterProgress: number, k: number, n: number): number {
  const fade = planetPresenceTarget(chapterId, chapterProgress) * planetFadeOut(chapterId, chapterProgress);
  if (fade <= 0) return 0;
  return fade * planetWeight(worldsCursor(chapterProgress, n), k);
}

/** SceneRoot's GL effect depends on this string, never on the `planets` array's identity: a new
 *  array every render would otherwise rebuild the WebGL context. `[]` is "" and `["none"]` is
 *  "none", so an empty list and a one-planet list never collide. */
export function planetsKey(features: readonly PlanetFeature[]): string {
  return features.join(",");
}

/** The inverse of planetsKey; anything that is not a known feature reads as `none`. */
export function planetsFromKey(key: string): PlanetFeature[] {
  return key === "" ? [] : key.split(",").map(toPlanetFeature);
}

const VERT = /* glsl */ `
  varying vec3 vObjDir;
  varying vec3 vWorldNormal;
  void main() {
    // The object-space direction drives the noise: a sphere has no UV seam to hide.
    vObjDir = normalize(position);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uSeed;
  uniform vec3 uLightDir;
  uniform vec3 uAmber;
  uniform float uStorm;
  uniform float uOpacity;
  varying vec3 vObjDir;
  varying vec3 vWorldNormal;

  // 3D value noise + fbm (the same idiom as EnergyOrb), with the nebula's constants.
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.55;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.05 + vec3(1.7); a *= 0.5; }
    return v;
  }

  void main() {
    vec3 p = vObjDir * 2.2 + uSeed;
    // Domain warp: the nebula's idiom, centred because value noise is not zero-mean.
    vec3 w = vec3(fbm(p + vec3(0.0, 3.1, 1.3)), fbm(p - vec3(2.7, 0.0, 4.2)), fbm(p + vec3(5.5, 1.9, 0.0)));
    p += (w - 0.52) * 0.7;
    float tone = smoothstep(0.22, 0.8, fbm(p));

    // Storm: a brighter, more turbulent latitude band (a uniform, not extra geometry).
    float lat = vObjDir.y;
    float d = (lat - 0.22) / 0.13;
    float band = exp(-d * d);
    float turb = 0.0;
    // A uniform branch: only a storm planet pays for the three extra fBm calls.
    if (uStorm > 0.5) {
      vec3 sp = vec3(vObjDir.x * 3.5, lat * 9.0, vObjDir.z * 3.5) + uSeed;
      turb = fbm(sp + 1.8 * vec3(fbm(sp * 1.7), fbm(sp * 1.7 + 4.1), 0.0));
      tone = mix(tone, clamp(tone * 0.55 + turb * 0.95 + 0.15, 0.0, 1.0), uStorm * band);
      tone = clamp(tone + uStorm * band * 0.2, 0.0, 1.0);
    }

    // Lit by the direction to the star: a dark night side and a narrow amber terminator band.
    float ndl = dot(normalize(vWorldNormal), normalize(uLightDir));
    float day = smoothstep(-0.02, 0.5, ndl);
    float e = ndl / 0.075;
    float terminator = exp(-e * e);
    vec3 col = vec3(tone) * (${PLANET_NIGHT_FLOOR.toFixed(3)} + (1.0 - ${PLANET_NIGHT_FLOOR.toFixed(3)}) * day) * 0.9;
    // The storm band glows a little on its own, so it still reads on the unlit face.
    col += vec3(uStorm * band * (0.10 + 0.22 * turb));
    col += uAmber * terminator * (0.25 + 0.75 * tone) * 0.55;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/** Exposed read-only for tests and debug overlays. */
export interface PlanetView {
  readonly feature: PlanetFeature;
  /** Positioned at the planet's world position; hidden while the planet's opacity is 0. */
  readonly group: THREE.Group;
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  readonly material: THREE.ShaderMaterial;
  /** Present for feature `ring` only. */
  readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null;
  /** Present for feature `moon` only: the orbit pivot and the moon on it. */
  readonly moon: { readonly pivot: THREE.Group; readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> } | null;
}

/** A deterministic seed per planet: no two surfaces match, and a reload never reshuffles them. */
const seedFor = (k: number, salt: number) =>
  new THREE.Vector3(Math.sin((k + 1) * 12.9898 + salt) * 43.7585, Math.sin((k + 1) * 78.233 + salt) * 24.1431, Math.sin((k + 1) * 37.719 + salt) * 31.6027);

function surfaceMaterial(seed: THREE.Vector3, storm: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    uniforms: {
      uSeed: { value: seed },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
      uAmber: { value: new THREE.Color(AMBER) },
      uStorm: { value: storm },
      uOpacity: { value: 0 },
    },
  });
}

/**
 * Owns every planet of chapter 05 (one Group each), the way OrbitRing owns its nodes, so
 * SceneRoot gains ONE piece. Everything is allocated in build(); update() only writes scalars
 * and, when the camera's aspect changes, re-places the N planets (no rebuild, no per-frame
 * allocation). Unknown features build as `none`; no cases, or the `still` tier, build an empty
 * hidden group with no GPU resources.
 */
export class Planet implements SetPiece {
  /** Sanitised, in CMS order: one entry per planet. */
  readonly features: readonly PlanetFeature[];
  private group: THREE.Group | null = null;
  private views: PlanetView[] = [];
  private sphereGeometry: THREE.SphereGeometry | null = null;
  private ringGeometry: THREE.RingGeometry | null = null;
  private ringMaterials: THREE.MeshBasicMaterial[] = [];
  private scene: THREE.Scene | null = null;
  private aspect = Number.NaN;
  /** The dt-eased chapter-level fade-in (0..1): eased toward planetPresenceTarget every frame. */
  private shown = 0;
  private readonly scratch = new THREE.Vector3();

  constructor(features: readonly PlanetFeature[]) {
    this.features = features.map(toPlanetFeature);
  }

  get count(): number {
    return this.features.length;
  }
  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.Group | null {
    return this.group;
  }
  get planets(): readonly PlanetView[] {
    return this.views;
  }

  build(scene: THREE.Scene, tier: Tier): void {
    // An unpaired second build() would leak the previous Group into the scene.
    if (this.group) this.dispose();
    this.group = new THREE.Group();
    this.group.visible = false;
    const segments = TIER_SETTINGS[tier].planetSegments;
    if (this.features.length > 0 && segments > 0) {
      this.sphereGeometry = new THREE.SphereGeometry(1, segments, Math.max(8, segments >> 1));
      if (this.features.includes("ring")) {
        this.ringGeometry = new THREE.RingGeometry(PLANET_RING_INNER, PLANET_RING_OUTER, Math.max(32, segments));
      }
      this.features.forEach((feature, k) => this.views.push(this.buildPlanet(feature, k)));
      this.place(DEFAULT_ASPECT);
    }
    this.scene = scene;
    scene.add(this.group);
  }

  private buildPlanet(feature: PlanetFeature, k: number): PlanetView {
    const group = new THREE.Group();
    group.visible = false;
    const material = surfaceMaterial(seedFor(k, 0), feature === "storm" ? 1 : 0);
    const mesh = new THREE.Mesh(this.sphereGeometry!, material);
    mesh.scale.setScalar(PLANET_RADIUS);
    group.add(mesh);

    let ring: PlanetView["ring"] = null;
    if (feature === "ring" && this.ringGeometry) {
      // Additive grey, depth-tested against the sphere (the planet writes depth) so the far
      // half of the ring passes behind it. Drawn after the sphere at equal distance.
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      this.ringMaterials.push(ringMaterial);
      ring = new THREE.Mesh(this.ringGeometry, ringMaterial);
      ring.scale.setScalar(PLANET_RADIUS);
      // RingGeometry lies in its local XY plane facing +z; lay it flat, then incline it toward the camera.
      ring.rotation.x = -Math.PI / 2 + PLANET_RING_INCLINE;
      ring.renderOrder = 1;
      const roll = new THREE.Group();
      roll.rotation.z = PLANET_RING_ROLL;
      roll.add(ring);
      group.add(roll);
    }

    let moon: PlanetView["moon"] = null;
    if (feature === "moon") {
      const tilt = new THREE.Group();
      tilt.rotation.set(MOON_TILT, 0, MOON_ROLL);
      const pivot = new THREE.Group();
      pivot.rotation.y = k * MOON_PHASE_STEP;
      const moonMesh = new THREE.Mesh(this.sphereGeometry!, surfaceMaterial(seedFor(k, 5.5), 0));
      moonMesh.scale.setScalar(PLANET_RADIUS * MOON_RADIUS);
      moonMesh.position.set(PLANET_RADIUS * MOON_ORBIT, 0, 0);
      pivot.add(moonMesh);
      tilt.add(pivot);
      group.add(tilt);
      moon = { pivot, mesh: moonMesh };
    }

    this.group!.add(group);
    return { feature, group, mesh, material, ring, moon };
  }

  /** Positions every planet for `aspect` and points each surface's light at the star. */
  private place(aspect: number): void {
    this.aspect = aspect;
    const n = this.views.length;
    this.views.forEach((view, k) => {
      planetPosition(k, n, aspect, view.group.position);
      const light = this.scratch.copy(STAR_POSITION).sub(view.group.position).normalize();
      (view.material.uniforms.uLightDir.value as THREE.Vector3).copy(light);
      if (view.moon) (view.moon.mesh.material.uniforms.uLightDir.value as THREE.Vector3).copy(light);
    });
  }

  update(ctx: FrameContext): void {
    // SceneRoot may tick before the build lands; an empty set has nothing to drive.
    if (!this.group || this.views.length === 0) return;
    const { chapter, chapterProgress } = ctx.voyage;
    // The follower runs BEFORE the visibility early-out so it keeps settling while hidden. A step
    // is clamped to 1 (a resumed tab's long dt lands on the target, never past it); a non-finite
    // or non-positive dt is a zero step, so NaN can never reach a uniform.
    const step = ctx.dt > 0 ? Math.min(1, ctx.dt * PLANET_FADE_IN_RATE) : 0;
    this.shown += (planetPresenceTarget(chapter.id, chapterProgress) - this.shown) * step;
    const fade = this.shown * planetFadeOut(chapter.id, chapterProgress);
    this.group.visible = fade > 0.001;
    if (!this.group.visible) return;
    const aspect = ctx.camera.aspect;
    if (Number.isFinite(aspect) && aspect > 0 && aspect !== this.aspect) this.place(aspect);
    const n = this.views.length;
    const cursor = worldsCursor(chapterProgress, n);
    for (let k = 0; k < n; k++) {
      const view = this.views[k];
      const opacity = fade * planetWeight(cursor, k) * ctx.ignite;
      view.group.visible = opacity > 0.001;
      if (!view.group.visible) continue;
      view.material.uniforms.uOpacity.value = opacity;
      if (view.ring) view.ring.material.opacity = PLANET_RING_OPACITY * opacity;
      if (view.moon) {
        view.moon.mesh.material.uniforms.uOpacity.value = opacity;
        view.moon.pivot.rotation.y = k * MOON_PHASE_STEP + ctx.t * MOON_SPEED;
      }
    }
  }

  dispose(): void {
    if (this.group && this.scene) this.scene.remove(this.group);
    this.sphereGeometry?.dispose();
    this.ringGeometry?.dispose();
    for (const view of this.views) {
      view.material.dispose();
      view.moon?.mesh.material.dispose();
    }
    for (const m of this.ringMaterials) m.dispose();
    this.sphereGeometry = null;
    this.ringGeometry = null;
    this.ringMaterials = [];
    this.views = [];
    this.group = null;
    this.scene = null;
    this.aspect = Number.NaN;
    this.shown = 0;
  }
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx vitest run src/scene/chapters/Planet.test.ts`
Expected: PASS — `Tests  40 passed (40)`.

- [ ] **Step 9: Compile the shader once in a real browser (the one thing no node test can do)**

Nothing in node compiles GLSL, and the shader is the least testable surface in this slice. Spend two minutes on a throwaway harness (it is never committed). Write `harness-entry.ts` at the repo root:

```ts
// Throwaway: renders one planet beside the star through the real Planet / EnergyOrb code.
import * as THREE from "three";
import { Planet } from "./src/scene/chapters/Planet";
import { EnergyOrb } from "./src/scene/chapters/EnergyOrb";
import { voyageStore } from "./src/scene/scroll/voyageStore";
import { getCameraPose, progressAt } from "./src/scene/camera/flightPath";
import { caseCentre } from "./src/scene/chapters/worldsSchedule";

(window as unknown as { run: (w: number, h: number, k: number) => string }).run = (w, h, k) => {
  document.body.innerHTML = "";
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 400);
  const planet = new Planet(["ring", "moon", "storm"]);
  planet.build(scene, "high");
  const orb = new EnergyOrb();
  orb.build(scene, "high");
  const cp = caseCentre(k, 3);
  voyageStore.setScroll(progressAt("worlds", cp), 0);
  const pose = getCameraPose(progressAt("worlds", cp));
  camera.position.copy(pose.position);
  camera.lookAt(pose.lookAt);
  const ctx = { t: 3, dt: 1 / 60, voyage: voyageStore.getState(), camera, audioEnergy: 0, ignite: 1 };
  for (let i = 0; i < 90; i++) planet.update(ctx); // the planets' fade-in is a dt-eased trigger: let it settle
  orb.update(ctx);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  return "ok";
};
```

Bundle it with the repo's own `rolldown` (it reads the `@/` paths from `tsconfig.json`; `npx esbuild` also works but is downloaded from the network on first use) and serve it with a pid-file server you can stop:

```sh
mkdir -p /tmp/s5-harness
node_modules/.bin/rolldown harness-entry.ts --format iife -o /tmp/s5-harness/bundle.js
echo '<html><body style="margin:0;background:#000"><script src="bundle.js"></script></body></html>' > /tmp/s5-harness/index.html
python3 -m http.server 8765 --directory /tmp/s5-harness >/dev/null 2>&1 &
echo $! > /tmp/s5-harness.pid
```

Open `http://localhost:8765/index.html` at 1440×900, call `window.run(1440, 900, k)` for `k` = 0, 1, 2 (ring, moon, storm) and once at 390×844, and screenshot. **Expected:** the console has no `THREE.WebGLProgram` error (a favicon 404 is fine); each frame shows the amber star, and to its right a dark planet with a thin amber terminator crescent on its star-facing limb and faint grey noise on the unlit face; case 0 has a grey ring whose far half passes behind the sphere, case 1 a small moon on a tilted orbit (at `t = 3` it sits below and slightly left of the planet; it must never cross the star), case 2 a brighter latitude band; at 390×844 the planet sits centred below the star. A blank or all-black planet means the shader failed — fix `FRAG` before going on. Then `rm harness-entry.ts`, stop only the server you started (`kill $(cat /tmp/s5-harness.pid)`; `lsof -ti tcp:8765` must then print nothing) and `rm -r /tmp/s5-harness /tmp/s5-harness.pid`. (This step was run during plan verification: no program errors, all three features and both viewports read as described.)

- [ ] **Step 10: Run the whole suite, the typechecker and the linter**

Run: `npx vitest run`
Expected: PASS — `Test Files  47 passed (47)`, `Tests  626 passed (626)` when run after Tasks 1–4 (586 + 40). Task 5 alone on Waves 0–1 is the same number; the quality assertion adds no test.

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npx eslint src/scene`
Expected: no output.

- [ ] **Step 11: Commit**

```bash
git add src/scene/quality.ts src/scene/quality.test.ts src/scene/chapters/Planet.ts src/scene/chapters/Planet.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): Planet set piece - nebula-noise worlds with a ring, a moon or a storm

One piece owns N planets: a sphere per case study with a 3D-fBm surface shader
(object-space noise, per-planet seed, lit toward the star with an amber
terminator band), placed from the camera pose at the centre of its slot plus a
camera-space offset so it sits at an exact screen target while its panel is
read, cross-faded by the worlds cursor, and hidden once the camera could reach
it. tier planetSegments 64 / 32 / 0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push
```

---

### Task 6: `Worlds.tsx` + the Worlds CSS

**Wave 2 (parallel with Task 5). Needs Waves 0–1 merged. Owns the files below; does not touch `VoyageRoot` (Task 7 mounts it).**

**Files:**
- Create: `src/components/voyage/Worlds.tsx`, `src/components/voyage/Worlds.test.tsx`
- Modify: `src/app/voyage/voyage.css` (a new "Worlds (ch. 05)" block before the CTA block), `src/app/voyage/voyageCss.test.ts`

**Interfaces:**
- Consumes: Task 1 (`CHAPTERS`, `sectionHeightVh`, `progressAt`), Task 2 (`caseTarget`, `WORLDS_HOLD_DESKTOP`, `WORLDS_HOLD_MOBILE`, `caseCentre`, `WORLDS_WINDOW`), Task 3 (`WorldCase` — type-only), the existing `useVoyage`, `useMediaQuery`, `.glass`, `.cta` / `.cta--ghost`, `.chapter__pin` / `.chapter__label`.
- Produces: `export default function Worlds({ cases, animated }: { cases: WorldCase[]; animated: boolean }): JSX.Element` rendering `section#worlds.chapter.chapter--worlds[aria-label="Work"][data-static?]` → `.chapter__pin` → label `05 / WORLDS` → either `.worlds-empty` or `.worlds` → N × `article.glass.world-panel[style="--solo: 0|1"][data-solo-off?]` (children: `.world-panel__index`, `h2.world-panel__title`, `.world-panel__meta`, `.world-panel__cols` > `.world-panel__col` > `span` + `p`, `.world-panel__foot` > `ul.world-panel__stack` + `img.world-panel__diagram`, `a.cta.cta--ghost.world-panel__link`). Task 7 mounts it as `<Worlds cases={worlds} animated={animated} />` after `<Process>`.

**Design notes.**
- **Trigger, not scrub (D6).** `caseTarget(i, n, chapterProgress)` gives each panel a 0/1 `--solo`; the `.world-panel` CSS transition (opacity 0.45 s / transform 0.6 s) is the cross-fade, so no scroll position can rest on two half-faded panels. Nothing shows outside Worlds (`solo = 0` unless `chapter.id === "worlds"`), because `caseTarget(last)` is 1 at the chapter's end and the panels have no fade-out of their own — the pin's release is their exit. Hidden panels drop their backdrop blur and pointer events through `data-solo-off` (`opacity: 0` does not skip a backdrop filter), with `-webkit-backdrop-filter` declared first.
- **Not scroll containers.** Unlike `Process`, a Worlds panel is `overflow: hidden` and its excerpts are line-clamped (the server already cut each at ~160 characters; the clamp is the backstop), so there is no panel tab stop: the **link is the only one**. Only the active panel's link is focusable (`tabIndex 0`), only while its pin is on screen (`useMediaQuery("(max-width: 767px)")` picks `WORLDS_HOLD_MOBILE` or `WORLDS_HOLD_DESKTOP`, so no off-screen link pulls the page back); every other animated link is `-1`; the still tier leaves `tabIndex` unset. Every panel stays in the accessibility tree. **Focus follows the lit case:** when the panel holding keyboard focus goes inactive (an effect keyed on the lit index) the focused link is blurred — otherwise a keyboard user who tabbed onto link 1 and then scrolled on would keep focus on an opacity-0, pointer-events-none panel and Enter would open a case that is not on screen. (Tab from an Orbit panel skips Worlds until the scroll position is inside it: every Worlds link is `-1` outside its hold — the same design as `Process`, recorded in `insights.md`.)
- **Layout (A3 / A4).** Desktop: panels share one grid cell, so the box is as tall as the tallest panel and no height needs tuning; width `var(--worlds-panel-w)` = `min(40rem, 44vw)` (right edge 722 px at 1440, 512 px at 1024; the star centre is at ≈ 795 / 575 px). Between 768 and 1099 px the three excerpt columns stack, four lines each. The stack chips are bounded to two rows (`max-height: 3.6rem`; the CMS allows 12 chips of 40 characters, which would wrap to many rows and grow the panel past the 100vh pin) and the still tier lifts the bound. Phone: the pin is 64vh (hold 386vh = chapterProgress 0..0.858), the panels overlap in a fixed `min(34vh, 18rem)` box under the dock pill (`padding-top: 4.5rem`), the title clamps to two lines, the context to one, excerpts to two, and the stack chips and diagram are dropped (the link stays); **the excerpt block is the only thing that gives way** (`.world-panel__cols { flex: 1 1 0; min-height: 0; overflow: hidden }`), so a short viewport (the box is 34vh) loses excerpt text at its bottom edge and never the link — the only route to `/work/<slug>`; the planet sits below the box. Still tier: every case is stacked and fully visible (diagram, chips, all excerpts, links in the normal tab order) inside the fixed 450vh section, `transition: none`.
- **Three CSS lessons recorded from the plan-verification run in a real browser.** (1) A flex column that overflows its clipped box shrinks `overflow: hidden` children to nothing — the phone box silently lost its context line until every panel child got `flex-shrink: 0`. (2) `.cta` is declared *later* in the file than the Worlds block, so `.world-panel__link { padding … }` lost the tie; the link rules use the doubled `.world-panel .world-panel__link`. (3) The first phone layout had no slack: the link was the LAST child of a fixed-height box, so any viewport shorter than ~740 px (the box is 34vh, the content is fixed in rem) cut the link off — found by plan review and re-verified live after the fix: with the excerpt block flexible, at 390×844 the box is 287 px, the link's bottom sits 13 px inside it and nothing clips; at 390×740 (box 252) the link is still inside and 23 px of excerpt text is clipped; at 375×667 (box 227) the link is inside and 48 px of excerpts are clipped.
- **Data.** Every field is narrowed at the leaf (`str`, array filters, a guarded `excerpts` object), as `Services` / `Process` do: a missing title renders no `<h2>`, an empty excerpt drops its label with it, no slug means no link, the slug is `encodeURIComponent`-ed into `/work/<slug>`. The empty list renders the label and "Case studies are being written up." only (D4).

- [ ] **Step 1: Write the failing component tests**

`next/link` and `next/image` render in jsdom without a router or config (checked in the plan-verification run), so neither is mocked. `useReducedMotion` is mocked so one test can flip it.

Create `src/components/voyage/Worlds.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/voyage/Worlds.test.tsx`
Expected: FAIL — the transform cannot resolve the import: `Failed to resolve import "./Worlds"` (`Test Files  1 failed (1)`, `Tests  no tests`).

- [ ] **Step 3: Implement `Worlds.tsx`**

Create `src/components/voyage/Worlds.tsx`:

```tsx
"use client";

import { useEffect, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
// Type-only: erased at compile time, so marked / sanitize-html never reach the client bundle.
import type { WorldCase } from "@/lib/worldCase";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { caseTarget, WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE } from "@/scene/chapters/worldsSchedule";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { useMediaQuery } from "./useMediaQuery";

interface WorldsProps {
  cases: WorldCase[];
  /** false in the `still` tier — every case renders stacked and fully visible, no scroll-derived motion. */
  animated: boolean;
}

const chapter = CHAPTERS.find((c) => c.id === "worlds")!;

/** The three excerpt columns, in reading order. */
const COLUMNS = [
  ["problem", "Problem"],
  ["architecture", "Architecture"],
  ["outcome", "Outcome"],
] as const;

/** CSS custom properties are not part of React's CSSProperties, so the one value CSS needs
 *  (a panel's target visibility, 0 or 1 — the CSS transition animates it) is handed over
 *  through this widened record. */
type SoloStyle = CSSProperties & Record<"--solo", number>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** The DTO is typed, but the CMS is data: every field is narrowed again here at the leaf, as
 *  Services and Process do, so a malformed case degrades to missing text and never throws. */
function readCase(c: WorldCase) {
  const excerpts: Record<string, unknown> =
    typeof c.excerpts === "object" && c.excerpts !== null ? (c.excerpts as unknown as Record<string, unknown>) : {};
  return {
    slug: str(c.slug),
    title: str(c.title),
    client: str(c.client),
    context: str(c.context),
    diagram: str(c.diagram),
    stack: Array.isArray(c.stack) ? c.stack.filter((s): s is string => typeof s === "string" && s !== "") : [],
    excerpts: COLUMNS.map(([key, label]) => ({ key, label, text: str(excerpts[key]) })).filter((e) => e.text !== ""),
  };
}

/** Chapter 05. One glass panel at a time on the left, replaced in place as the camera carries
 *  the next planet into frame. The schedule is shared with the planets (caseTarget switches at
 *  the middle of their travel), so panel and planet change together. */
export default function Worlds({ cases, animated }: WorldsProps) {
  const s = useVoyage();
  const reduce = useReducedMotion();
  // The same breakpoint voyage.css uses for the 64vh phone pin; false before hydration.
  const phone = useMediaQuery("(max-width: 767px)");
  const still = !animated || reduce === true;
  // The lit case's index (-1 when none is: outside Worlds, still tier, no cases).
  const lit = still || s.chapter.id !== "worlds" ? -1 : cases.findIndex((_, i) => caseTarget(i, cases.length, s.chapterProgress) === 1);
  // A keyboard user can Tab onto the active link and then scroll on: its panel goes opacity 0 and
  // pointer-events none, but the link would keep focus and Enter would open a case that is not on
  // screen. When the panel holding focus goes inactive (keyed on the lit index), it gives focus up.
  useEffect(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    const panel = active.closest(".world-panel");
    if (panel && panel.getAttribute("data-solo-off") === "true") active.blur();
  }, [lit]);

  return (
    <section
      id="worlds"
      className="chapter chapter--worlds"
      style={{ height: `${sectionHeightVh(chapter)}vh` }}
      aria-label="Work"
      data-static={still ? "true" : undefined}
    >
      <div className="chapter__pin">
        <p className="chapter__label">
          {chapter.index} / {chapter.label}
        </p>
        {cases.length === 0 && <p className="worlds-empty">Case studies are being written up.</p>}
        {cases.length > 0 && (
          <div className="worlds">
            {cases.map((item, i) => {
              const { slug, title, client, context, diagram, stack, excerpts } = readCase(item);
              // Outside Worlds nothing shows (caseTarget(last) is 1 at the chapter's end, and the
              // panels have no fade-out of their own: the pin's release is their exit).
              const solo = still ? 1 : s.chapter.id === "worlds" ? caseTarget(i, cases.length, s.chapterProgress) : 0;
              // `opacity: 0` does not skip a backdrop filter, so the CSS gates the blur and the
              // pointer events on this attribute (not on visibility, which would also pull the
              // panel out of the accessibility tree).
              const off = solo < 0.005;
              const style: SoloStyle = { "--solo": solo };
              const meta = [client, context].filter((t) => t !== "").join(" · ");
              return (
                <article key={item.id} className="glass world-panel" style={style} data-solo-off={off ? "true" : undefined}>
                  {/* Decorative ordinal: hidden so it is not read before every title. */}
                  <p className="world-panel__index" aria-hidden="true">CASE {String(i + 1).padStart(2, "0")}</p>
                  {/* No heading for a missing CMS title — an empty <h2> is an a11y violation. */}
                  {title !== "" && <h2 className="world-panel__title">{title}</h2>}
                  {meta !== "" && <p className="world-panel__meta">{meta}</p>}
                  {excerpts.length > 0 && (
                    <div className="world-panel__cols">
                      {excerpts.map((e) => (
                        <div key={e.key} className="world-panel__col">
                          <span>{e.label}</span>
                          <p>{e.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {(stack.length > 0 || diagram !== "") && (
                    <div className="world-panel__foot">
                      {stack.length > 0 && (
                        <ul className="world-panel__stack" aria-label="Stack">
                          {stack.map((t, j) => (
                            <li key={`${j}-${t}`}>{t}</li>
                          ))}
                        </ul>
                      )}
                      {diagram !== "" && (
                        // Decorative thumbnail of what /work/<slug> shows in full, so no alt text.
                        // Served by our own /api/media route or a static path: `unoptimized`.
                        <Image className="world-panel__diagram" src={diagram} alt="" width={160} height={100} unoptimized />
                      )}
                    </div>
                  )}
                  {slug !== "" && (
                    <Link
                      className="cta cta--ghost world-panel__link"
                      href={`/work/${encodeURIComponent(slug)}`}
                      aria-label={title !== "" ? `Read the case study: ${title}` : undefined}
                      // The panel is not a scroll container (overflow hidden, line-clamped), so this
                      // link is its ONLY tab stop. Only the ACTIVE panel's link is reachable, and only
                      // while its pin is on screen: the pin releases at WORLDS_HOLD_DESKTOP on desktop
                      // and WORLDS_HOLD_MOBILE on a phone, and past that the last panel is still at
                      // full solo while scrolling off, so an off-screen tab stop would pull the page
                      // back. Every other animated link is tabIndex -1 (it is also pointer-events:
                      // none while its panel is off). The still tier stacks everything visibly, so
                      // it takes the default tab order.
                      tabIndex={still ? undefined : solo >= 0.5 && s.chapterProgress < (phone ? WORLDS_HOLD_MOBILE : WORLDS_HOLD_DESKTOP) ? 0 : -1}
                    >
                      Read the case study <span className="cta__arrow" aria-hidden="true">{"→"}</span>
                    </Link>
                  )}
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/voyage/Worlds.test.tsx`
Expected: PASS — `Tests  20 passed (20)`.

- [ ] **Step 5: Write the failing CSS pins**

CSS has no other automated coverage (`voyageCss.test.ts` reads the stylesheet text). These pin the few declarations the Worlds behaviour depends on, including the phone box from A4.

In `src/app/voyage/voyageCss.test.ts`, replace:

```ts
    expect(css.slice(mobile, css.indexOf("}", mobile))).toMatch(/height:\s*min\(\s*34vh,\s*18rem\s*\)/);
  });
});
```

with:

```ts
    expect(css.slice(mobile, css.indexOf("}", mobile))).toMatch(/height:\s*min\(\s*34vh,\s*18rem\s*\)/);
  });
});

describe("voyage.css — Worlds", () => {
  // Desktop: the panels share ONE grid cell, so the box is as tall as the tallest panel and no
  // height has to be tuned; --solo (a 0/1 target, caseTarget) is each panel's opacity.
  it("stacks the case panels in one grid cell and drives each one's opacity from --solo", () => {
    expect(body(".worlds")).toMatch(/display:\s*grid/);
    const r = body(".world-panel");
    expect(r).toMatch(/grid-area:\s*1\s*\/\s*1/);
    expect(r).toMatch(/opacity:\s*var\(--solo\)/);
  });
  // --solo is a 0/1 target (worldsSchedule.caseTarget); this transition IS the cross-fade.
  it("cross-fades the panels with a CSS transition on opacity and transform", () => {
    const r = body(".world-panel");
    expect(r).toMatch(/transition:[^;]*opacity/);
    expect(r).toMatch(/transition:[^;]*transform/);
  });
  it("is not a scroll container: the panel clips (the excerpts are line-clamped), so the link is its only tab stop", () => {
    expect(body(".world-panel")).toMatch(/overflow:\s*hidden/);
    expect(body(".world-panel")).not.toMatch(/overflow(-y)?:\s*(auto|scroll)/);
    expect(body(".world-panel__col p")).toMatch(/-webkit-line-clamp:\s*\d+/);
  });
  it("gates the blur and the pointer events on a panel that is not showing, prefixed property first", () => {
    const r = body('.world-panel[data-solo-off="true"]');
    const prefixed = r.indexOf("-webkit-backdrop-filter: none");
    const standard = r.search(/[^-]backdrop-filter: none/);
    expect(prefixed).toBeGreaterThan(-1);
    expect(standard).toBeGreaterThan(prefixed);
    expect(r).toMatch(/pointer-events:\s*none/);
  });
  it("gives the link a visible focus ring", () => {
    expect(body(".world-panel__link:focus-visible")).toMatch(/outline:\s*2px solid/);
  });
  it("sizes the desktop panel to min(40rem, 44vw), so its right edge stays clear of the star at 1440 and 1024", () => {
    expect(body(".chapter--worlds")).toMatch(/--worlds-panel-w:\s*min\(\s*40rem,\s*44vw\s*\)/);
    expect(body(".worlds")).toMatch(/width:\s*var\(--worlds-panel-w\)/);
  });
  it("stacks every case statically in the still tier, with no transition", () => {
    const still = body('.chapter--worlds[data-static="true"] .world-panel');
    expect(still).toMatch(/position:\s*static/);
    expect(still).toMatch(/opacity:\s*1/);
    expect(still).toMatch(/transition:\s*none/);
    expect(body('.chapter--worlds[data-static="true"] .chapter__pin')).toMatch(/position:\s*static/);
  });
  // A4: a capped phone box like .process, so the star and the planet below it stay visible.
  it("caps the phone box at min(34vh, 18rem), clips it, clamps the excerpts to 2 lines and drops the chips and diagram", () => {
    // Every phone rule is read from the Worlds pin rule on, so the 768-1099px media block (which
    // also indents `.world-panel__col p`) cannot be mistaken for it.
    const pin = css.indexOf("\n  .chapter--worlds .chapter__pin {");
    expect(pin, "mobile Worlds pin rule").toBeGreaterThan(-1);
    expect(css.slice(pin, css.indexOf("}", pin))).toMatch(/height:\s*64vh/);
    const rule = (selector: string) => {
      const at = css.indexOf(`\n  ${selector} {`, pin);
      expect(at, `mobile ${selector} rule`).toBeGreaterThan(-1);
      return css.slice(at, css.indexOf("}", at));
    };
    expect(rule(".worlds")).toMatch(/height:\s*min\(\s*34vh,\s*18rem\s*\)/);
    expect(rule(".world-panel")).toMatch(/position:\s*absolute/);
    expect(rule(".world-panel__col p")).toMatch(/-webkit-line-clamp:\s*2\b/);
    expect(rule(".world-panel__foot")).toMatch(/display:\s*none/);
    // "Link kept" is DOM-covered (Worlds.test.tsx): the foot rule hides chips and diagram only.
  });

  // B-I1: on a short phone (the box is 34vh) the excerpt block must be what gives way, never the link.
  it("lets only the excerpt block shrink on a phone, so a short viewport clips text and never the case link", () => {
    const pin = css.indexOf("\n  .chapter--worlds .chapter__pin {");
    const rule = (selector: string) => {
      const at = css.indexOf(`\n  ${selector} {`, pin);
      expect(at, `mobile ${selector} rule`).toBeGreaterThan(-1);
      return css.slice(at, css.indexOf("}", at));
    };
    const cols = rule(".world-panel__cols");
    expect(cols).toMatch(/flex:\s*1 1 0/);
    expect(cols).toMatch(/min-height:\s*0/);
    expect(cols).toMatch(/overflow:\s*hidden/);
    expect(rule(".world-panel .world-panel__link")).not.toMatch(/flex-shrink:\s*[1-9]/);
    expect(rule(".world-panel__title")).toMatch(/-webkit-line-clamp:\s*2\b/);
  });
  it("keeps every panel child at its natural height (a flex column that overflows would shrink the clipped ones to nothing)", () => {
    expect(body(".world-panel > *")).toMatch(/flex-shrink:\s*0/);
  });
  it("keeps the phone context line to one row and the phone pin clear of the dock pill", () => {
    const pin = css.indexOf("\n  .chapter--worlds .chapter__pin {");
    expect(css.slice(pin, css.indexOf("}", pin))).toMatch(/padding-top:\s*4\.5rem/);
    const meta = css.indexOf("\n  .world-panel__meta {", pin);
    expect(meta, "mobile .world-panel__meta rule").toBeGreaterThan(-1);
    const rule = css.slice(meta, css.indexOf("}", meta));
    expect(rule).toMatch(/white-space:\s*nowrap/);
    expect(rule).toMatch(/overflow:\s*hidden/);
    expect(rule).toMatch(/text-overflow:\s*ellipsis/);
  });
  it("stacks the three excerpt columns between 768 and 1099px, where a 44vw panel is too narrow for three", () => {
    const at = css.indexOf("@media (min-width: 768px) and (max-width: 1099px) {");
    expect(at, "768-1099px block").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at));
    expect(block).toMatch(/\.world-panel__cols\s*{[^}]*grid-template-columns:\s*1fr/);
    expect(block).toMatch(/\.world-panel__col p\s*{[^}]*-webkit-line-clamp:\s*4/);
  });
  // B-M11: 12 chips x 40 characters would wrap to many rows and grow the panel past the 100vh pin.
  it("bounds the desktop stack chips to two rows, and lifts the bound in the still tier", () => {
    const r = body(".world-panel__stack");
    expect(r).toMatch(/max-height:\s*3\.6rem/);
    expect(r).toMatch(/overflow:\s*hidden/);
    expect(body('.chapter--worlds[data-static="true"] .world-panel__stack')).toMatch(/max-height:\s*none/);
  });
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `npx vitest run src/app/voyage/voyageCss.test.ts`
Expected: FAIL — the 13 new Worlds tests fail (the first reads `rule .worlds: expected -1 to be greater than -1`); the 9 existing Approach / Orbit tests pass. Summary line: `Tests  13 failed | 9 passed (22)`.

- [ ] **Step 7: Add the Worlds CSS**

In `src/app/voyage/voyage.css`, replace:

```css
  .chapter--orbit[data-static="true"] .process { flex: 0 0 auto; }
}

/* ====== CTA ====== */
.cta {
  display: inline-flex; align-items: center; gap: 0.6rem;
```

with:

```css
  .chapter--orbit[data-static="true"] .process { flex: 0 0 auto; }
}

/* ====== Worlds (ch. 05) ====== */
/* Worlds' section is 450vh and .chapter__pin (100vh) is stationary for 450 - 100 = 350vh =
   chapterProgress 0..0.778 (worldsSchedule.ts derives its window from exactly this). ONE panel is
   up at a time on every device: --solo (caseTarget, 0/1, animated by the transition below) is each
   panel's opacity, so the planet in frame and the panel change together. On desktop the panels
   share ONE grid cell, so the box is as tall as the tallest panel and nothing needs a fixed height.
   The layout knob is a custom property so the browser review can retune it without touching JS:
   the panel takes the left of the frame (right edge 722px at 1440, 512px at 1024), the planet and
   the star read centre-right. */
.chapter--worlds { --worlds-panel-w: min(40rem, 44vw); }
.worlds { display: grid; width: var(--worlds-panel-w); }
.world-panel {
  grid-area: 1 / 1; min-width: 0; overflow: hidden;
  display: flex; flex-direction: column;
  padding: clamp(1.25rem, 2vw, 2rem);
  opacity: var(--solo);
  transform: translateY(calc((1 - var(--solo)) * 14px));
  /* --solo is a 0/1 target (worldsSchedule.caseTarget), so this transition IS the cross-fade:
     no scroll position can rest on two half-faded panels (the slice-4 rule). */
  transition:
    opacity 0.45s cubic-bezier(0.2, 0.7, 0.2, 1),
    transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
}
/* All N panels overlap in one cell with only opacity separating them, and `opacity: 0` does NOT
   skip a backdrop filter (Blink re-samples an 18px blur of a canvas that repaints every frame),
   so a panel that is not showing drops its blur and stops swallowing touches.
   `-webkit-backdrop-filter` first: lightningcss drops the standard property when the prefixed
   one follows it. */
/* A flex column that overflows would otherwise shrink its clipped children to nothing (the
   phone box showed no context line until this): every child keeps its natural height. */
.world-panel > * { flex-shrink: 0; }
.world-panel[data-solo-off="true"] {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  pointer-events: none;
}
.world-panel__index {
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.62rem; letter-spacing: 0.2em;
  color: var(--gray-dark); margin: 0 0 0.9rem;
}
.world-panel__title {
  font-family: "Styrene A", var(--font-space-grotesk), sans-serif;
  font-size: clamp(1.25rem, 2vw, 1.8rem); font-weight: 500; letter-spacing: -0.01em;
  line-height: 1.15; margin: 0 0 0.5rem;
}
.world-panel__meta { margin: 0 0 1.1rem; font-size: 0.85rem; line-height: 1.4; color: var(--gray-mid); }
.world-panel__cols {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin: 0 0 1.1rem;
}
.world-panel__col span {
  display: block; margin-bottom: 0.3rem; text-transform: uppercase;
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.62rem; letter-spacing: 0.14em;
  color: var(--gray-dark);
}
/* The panel is not a scroll container (overflow hidden), so a long excerpt is clamped, never
   scrolled: the server already cuts each one at ~160 characters, this is the backstop. */
.world-panel__col p {
  margin: 0; font-size: 0.85rem; line-height: 1.5; color: var(--gray-light);
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 8; line-clamp: 8; overflow: hidden;
}
.world-panel__foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin: 0 0 1.1rem; }
/* Bounded to two chip rows (3.6rem): the CMS allows 12 chips of 40 characters, which would wrap to
   many rows and grow the panel past the 100vh pin. The still tier lifts the bound. */
.world-panel__stack {
  list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 0.4rem;
  max-height: 3.6rem; overflow: hidden;
}
.world-panel__stack li {
  padding: 0.25rem 0.6rem; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.14);
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.64rem; letter-spacing: 0.08em; color: var(--gray-light);
}
.world-panel__diagram {
  flex: 0 0 auto; width: 7.5rem; height: 4.7rem; object-fit: contain; border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03);
}
/* The link is the panel's only tab stop, so it needs a visible focus ring. The doubled class
   out-specifies .cta (declared later in this file), whose padding and font size would win a tie. */
.world-panel .world-panel__link {
  align-self: flex-start; margin-top: auto; padding: 0.7rem 1.2rem; font-size: 0.68rem; text-decoration: none;
}
.world-panel__link:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.6); outline-offset: 3px; }
.worlds-empty { margin: 0; font-size: 0.95rem; line-height: 1.6; color: var(--gray-mid); }

/* A narrow desktop window (768-1099px): a 44vw panel is ~340-480px, too tight for three columns,
   so the excerpts stack and each gets four lines. */
@media (min-width: 768px) and (max-width: 1099px) {
  .world-panel__cols { grid-template-columns: 1fr; gap: 0.6rem; }
  .world-panel__col p { -webkit-line-clamp: 4; line-clamp: 4; }
}

/* Mobile: a 64vh pin is stationary for 450 - 64 = 386vh (chapterProgress 0..0.858); the shared
   schedule's window ends at 0.73 and the last panel then holds (caseTarget stays 1), so a phone
   dwells on the last case until the pin releases.
   padding-top, NOT top: an inner inset keeps the sticky hold at 386vh (a `top` offset would cut
   it), and 4.5rem clears the fixed mobile dock exactly as Orbit's pin does. Top-anchored and
   capped at min(34vh, 18rem), the same box as .process, so the star and the planet below it
   stay visible; the box is fixed and the panels overlap in it. Excerpts clamp to two lines,
   the meta line to one, and the stack chips and the diagram are dropped (the link stays). */
@media (max-width: 767px) {
  .chapter--worlds .chapter__pin { height: 64vh; padding-top: 4.5rem; justify-content: flex-start; }
  .worlds { display: block; position: relative; flex: 0 0 auto; width: 100%; height: min(34vh, 18rem); }
  .world-panel { position: absolute; inset: 0; padding: 0.75rem 1.1rem; }
  .world-panel__index { margin-bottom: 0.2rem; line-height: 1; }
  .world-panel__title {
    font-size: 1rem; margin-bottom: 0.15rem;
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden;
  }
  .world-panel__meta { font-size: 0.74rem; margin-bottom: 0.35rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* The excerpt block is the ONLY thing that gives way: on a short viewport (the box is 34vh) it
     loses text at its bottom edge, never the link below it (the link is the panel's only way to
     /work/<slug>, and a clipped link also loses its focus ring). */
  .world-panel__cols { display: block; margin-bottom: 0.3rem; flex: 1 1 0; min-height: 0; overflow: hidden; }
  .world-panel__col { margin-bottom: 0.15rem; }
  .world-panel__col span { margin-bottom: 0.1rem; font-size: 0.56rem; line-height: 1; }
  .world-panel__col p { font-size: 0.74rem; line-height: 1.38; -webkit-line-clamp: 2; line-clamp: 2; }
  .world-panel__foot { display: none; }
  .world-panel .world-panel__link { padding: 0.45rem 0.9rem; font-size: 0.62rem; }
}

/* Reduced motion / still tier: no pin, no scroll-derived motion — the cases just flow, stacked,
   sized to their content (nothing clamped: every excerpt, the chips and the diagram show). The
   section height stays a fixed 450vh on every tier (VoyageScroll derives progress and drives
   scrollTo from `scrollHeight − innerHeight`, so `height: auto` would land every dock and rail
   link after Worlds short); three cases fit comfortably. */
.chapter--worlds[data-static="true"] .chapter__pin {
  position: static; height: auto; min-height: 100vh;
  padding-top: 2rem; padding-bottom: 2rem;
}
.chapter--worlds[data-static="true"] .worlds {
  display: flex; flex-direction: column; gap: 1rem; height: auto;
}
.chapter--worlds[data-static="true"] .world-panel {
  position: static; inset: auto; opacity: 1; transform: none; overflow: visible;
  /* Reduced motion: no cross-fade animation either. */
  transition: none;
}
.chapter--worlds[data-static="true"] .world-panel__col p {
  display: block; -webkit-line-clamp: unset; line-clamp: unset; overflow: visible;
}
.chapter--worlds[data-static="true"] .world-panel__stack { max-height: none; overflow: visible; }
@media (max-width: 767px) {
  .chapter--worlds[data-static="true"] .worlds { flex: 0 0 auto; }
  .chapter--worlds[data-static="true"] .world-panel__cols {
    display: grid; grid-template-columns: 1fr; gap: 0.6rem; flex: none; min-height: auto; overflow: visible;
  }
  .chapter--worlds[data-static="true"] .world-panel__title { display: block; -webkit-line-clamp: unset; line-clamp: unset; overflow: visible; }
  .chapter--worlds[data-static="true"] .world-panel__foot { display: flex; flex-direction: column; align-items: flex-start; }
}

/* ====== CTA ====== */
.cta {
  display: inline-flex; align-items: center; gap: 0.6rem;
```

- [ ] **Step 8: Run the CSS pins to verify they pass**

Run: `npx vitest run src/app/voyage/voyageCss.test.ts`
Expected: PASS — `Tests  22 passed (22)`.

- [ ] **Step 9: Run the whole suite, the typechecker and the linter**

Run: `npx vitest run`
Expected: PASS — `Test Files  48 passed (48)`, `Tests  659 passed (659)` when run after Tasks 1–5 (626 + 20 + 13).

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npx eslint src/components/voyage src/app/voyage`
Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add src/components/voyage/Worlds.tsx src/components/voyage/Worlds.test.tsx src/app/voyage/voyage.css src/app/voyage/voyageCss.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): Worlds chapter - one glass case panel at a time

Chapter 05's DOM: CASE 01 ordinal, title, client / context, Problem /
Architecture / Outcome excerpt columns, stack chips, a diagram thumbnail and a
link to /work/<slug>. Panels take the worlds schedule's 0/1 target and a CSS
transition is the cross-fade; the link is each panel's only tab stop and follows
the pin hold. Desktop panels share one grid cell, the phone gets the capped
min(34vh, 18rem) box, the still tier stacks everything, zero cases show the
label and one quiet line. Owns id="worlds".

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push
```

---

### Task 7: Wire it in — `SceneRoot`, the Worlds focus pull, `VoyageRoot`, and the `/voyage#worlds` arrival

**Wave 3, alone. Needs Waves 0–2 merged.** It is the only task that edits `SceneRoot.tsx`, `VoyageRoot.tsx` (again) and `voyageStore.ts`.

**Files:**
- Modify: `src/scene/chapters/Starfield.ts`, `src/scene/chapters/Starfield.test.ts`
- Modify: `src/scene/scroll/voyageStore.ts`, `src/scene/scroll/voyageStore.test.ts`, `src/scene/scroll/VoyageScroll.tsx`
- Create: `src/components/voyage/chapterHash.ts`, `src/components/voyage/chapterHash.test.ts`, `src/components/voyage/useHashArrival.ts`, `src/components/voyage/useHashArrival.test.tsx`, `src/scene/shaderLog.ts`, `src/scene/shaderLog.test.ts`
- Modify: `src/lib/clientLog.ts`, `src/app/api/logs/route.test.ts`
- Modify: `src/scene/SceneRoot.tsx`, `src/components/voyage/VoyageRoot.tsx`

**Interfaces:**
- Consumes: Task 2 (`worldsPresence`), Task 5 (`Planet`, `planetsKey`, `planetsFromKey`), Task 6 (`Worlds`), Task 3 (`PlanetFeature`, `VoyageRoot`'s `worlds` prop and its `void worlds` guard).
- Produces:
  ```ts
  // Starfield.ts
  export const WORLDS_SOFTEN_PEAK = 0.6;
  export function worldsSoften(chapterProgress: number): number;     // WORLDS_SOFTEN_PEAK * worldsPresence
  // chapterSoften(id, cp) now dispatches approach | orbit | worlds
  // voyageStore.ts
  scrollTo(progress: number, opts?: { immediate?: boolean }): void;  // immediate -> scroller(p, true); otherwise the unchanged one-argument call
  registerScroller(fn: (progress: number, immediate?: boolean) => void): void;
  // chapterHash.ts (pure)
  export const HASH_ARRIVAL_EPS = 0.001;
  export function chapterForHash(hash: string): ChapterId | null;           // content chapters only, exact, never throws
  export function hashArrivalProgress(hash: string): number | null;        // chapter.start + 0.001
  // useHashArrival.ts
  export function useHashArrival(tier: Tier | null): void;   // one-shot, ref-guarded; scrollTo(hashArrivalProgress(location.hash), { immediate: true }) once tier !== null
  // shaderLog.ts (pure)
  export const SHADER_LOG_MAX = 300, SHADER_ERROR_FALLBACK = "shader link or compile error";
  export function shaderErrorMessage(gl, program, vertexShader, fragmentShader): string;   // truncated GLSL info log; never throws
  // clientLog.ts: LOG_EVENTS gains "scene.compile_failed"
  // SceneRoot props gain  planets: readonly PlanetFeature[]   (required)
  ```

**Why these belong together.** (1) *Focus pull:* Worlds pulls the stars out of focus on the same clock as the planets (`WORLDS_SOFTEN_PEAK = 0.6`, a browser-review tunable). Three existing Starfield tests used Worlds as their "back in focus" / "inert" chapter — they are retargeted to The Belt (the next quiet chapter) and a new Worlds focus-pull test is added. (2) *Hash arrival (A9):* `id="worlds"` only exists after VoyageRoot's `tier === null` boot gate, so the "Back to the voyage" link on `/work/[slug]` (`/voyage#worlds`) landed at the top: neither the browser's fragment jump nor Next's post-navigation scroll can find the element. Once the tier resolves a one-shot, ref-guarded effect jumps to the named chapter's `start + 0.001` through `voyageStore.scrollTo(p, { immediate: true })` — still programmatic (the flag, target and deadline are armed as for a tween), so crossing the Jump band fires no beat; Lenis gets `{ immediate: true }`, the native scroller `behavior: "instant"` (`auto` defers to the page's `scroll-behavior: smooth`). Child effects run before their parent's in one commit, so `VoyageScroll` has registered its scroller by then. A plain `scrollTo` keeps the one-argument call so existing scrollers and assertions are untouched. (3) *The hook:* the arrival effect is its own hook, `useHashArrival(tier)`, so its behaviour — nothing while the tier is null, exactly one call when it resolves, no second call after an FPS-probe demotion or under StrictMode, nothing for an empty or unknown hash — is unit-tested with a jsdom `renderHook` instead of being an untested inline effect in `VoyageRoot`. (4) *Wiring:* `SceneRoot` takes `planets`, derives `planetsKey(planets)` during render and builds `new Planet(planetsFromKey(planetKey))` in its effect, which depends on the key string — never on the array — so a `VoyageRoot` re-render rebuilds nothing; after the pieces are built, `renderer.compile(scene, camera)` compiles every program up front (it walks hidden objects too), removing the slice-4 first-entry hitch (23.7 ms median / p95 40 ms into Orbit) and preventing a new one into Worlds. three@0.169 reports a GLSL compile or link ERROR through `renderer.debug.onShaderError` and `console.error`, not as an exception from `compile()`, so `SceneRoot` sets `renderer.debug.onShaderError` (before the compile call) to log `scene.compile_failed` with the pure `shaderErrorMessage` (a truncated info log — GLSL error text only, nothing else); the try/catch only guards the call itself. Neither may throw out of the effect — a failure only means programs compile lazily, as before.

- [ ] **Step 1: Write the failing Starfield tests (and retarget the three that assumed an inert Worlds)**

In `src/scene/chapters/Starfield.test.ts`, replace:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { Starfield, approachSoften, orbitSoften, chapterSoften, ORBIT_SOFTEN_PEAK } from "./Starfield";
import { ORBIT_WINDOW, ORBIT_PRESENCE_END } from "./orbitSchedule";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
```

with:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { Starfield, approachSoften, orbitSoften, worldsSoften, chapterSoften, ORBIT_SOFTEN_PEAK, WORLDS_SOFTEN_PEAK } from "./Starfield";
import { ORBIT_WINDOW, ORBIT_PRESENCE_END } from "./orbitSchedule";
import { WORLDS_WINDOW, WORLDS_PRESENCE_END } from "./worldsSchedule";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
```

In `src/scene/chapters/Starfield.test.ts`, replace:

```ts
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
```

with:

```ts
    expect(approachSoften("orbit", 0.3)).toBe(0);
  });

  it("is orbitSoften inside Orbit, worldsSoften inside Worlds, and zero everywhere else", () => {
    for (let k = 0; k <= 100; k++) {
      expect(chapterSoften("orbit", k / 100)).toBe(orbitSoften(k / 100));
      expect(chapterSoften("worlds", k / 100)).toBe(worldsSoften(k / 100));
    }
    for (const id of ["launch", "jump", "belt", "passage", "constellation", "pilot", "landing", "surface"] as const) {
      expect(chapterSoften(id, 0.5)).toBe(0);
    }
  });
});

// Slice 5: the focus pull reaches Worlds, on the same clock as the planets.
describe("worldsSoften", () => {
  it("is the schedule's presence scaled to WORLDS_SOFTEN_PEAK, so it matches WORLDS_WINDOW", () => {
    expect(worldsSoften(0)).toBe(0);
    expect(worldsSoften(WORLDS_WINDOW[0])).toBeCloseTo(WORLDS_SOFTEN_PEAK, 12);
    expect(worldsSoften((WORLDS_WINDOW[0] + WORLDS_WINDOW[1]) / 2)).toBeCloseTo(WORLDS_SOFTEN_PEAK, 12);
    expect(worldsSoften(WORLDS_WINDOW[1])).toBeCloseTo(WORLDS_SOFTEN_PEAK, 12);
    expect(worldsSoften(WORLDS_PRESENCE_END)).toBe(0);
    expect(worldsSoften(1)).toBe(0);
    expect(WORLDS_SOFTEN_PEAK).toBeGreaterThan(0);
    expect(WORLDS_SOFTEN_PEAK).toBeLessThanOrEqual(1);
  });

  it("ramps in and out inside the margins of the hold", () => {
    expect(worldsSoften(WORLDS_WINDOW[0] / 2)).toBeGreaterThan(0);
    expect(worldsSoften(WORLDS_WINDOW[0] / 2)).toBeLessThan(WORLDS_SOFTEN_PEAK);
    expect(worldsSoften((WORLDS_WINDOW[1] + WORLDS_PRESENCE_END) / 2)).toBeGreaterThan(0);
    expect(worldsSoften((WORLDS_WINDOW[1] + WORLDS_PRESENCE_END) / 2)).toBeLessThan(WORLDS_SOFTEN_PEAK);
  });
});

describe("Starfield — chapter 04 focus pull", () => {
  it("eases the field out of focus inside Orbit's window, and back in The Belt", () => {
    const field = new Starfield();
    field.build(new THREE.Scene(), "mid");
    field.applyControls(1);
```

In `src/scene/chapters/Starfield.test.ts`, replace:

```ts
    expect(field.material.size).toBeCloseTo(baseSize * (1 + ORBIT_SOFTEN_PEAK * 0.6), 3);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    voyageStore.setScroll(progressAt("worlds", 0.5), 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
```

with:

```ts
    expect(field.material.size).toBeCloseTo(baseSize * (1 + ORBIT_SOFTEN_PEAK * 0.6), 3);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    // Worlds pulls focus now (slice 5), so "back in focus" is The Belt, the next quiet chapter.
    voyageStore.setScroll(progressAt("belt", 0.5), 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
  });
});

describe("Starfield — chapter 05 focus pull", () => {
  it("eases the field out of focus inside Worlds' window, and back in The Belt", () => {
    const field = new Starfield();
    field.build(new THREE.Scene(), "mid");
    field.applyControls(1);
    const baseSize = field.material.size;
    const baseOpacity = field.material.opacity;

    voyageStore.setScroll(progressAt("worlds", 0.4), 0);
    expect(voyageStore.getState().chapter.id).toBe("worlds");
    for (let i = 0; i < 120; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize * (1 + WORLDS_SOFTEN_PEAK * 0.6), 3);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    voyageStore.setScroll(progressAt("belt", 0.5), 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
```

In `src/scene/chapters/Starfield.test.ts`, replace:

```ts
    expect(field.material.size).toBeGreaterThan(baseSize);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    voyageStore.setScroll(progressAt("worlds", 0.5), 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
```

with:

```ts
    expect(field.material.size).toBeGreaterThan(baseSize);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    voyageStore.setScroll(progressAt("belt", 0.5), 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/chapters/Starfield.test.ts`
Expected: FAIL — `TypeError: worldsSoften is not a function` (three tests) and one assertion failure in the new Worlds focus-pull test (the field never softens); the retargeted tests still pass against the old code. Summary line: `Tests  4 failed | 18 passed (22)`.

- [ ] **Step 3: Add `worldsSoften` and the dispatch**

In `src/scene/chapters/Starfield.ts`, replace:

```ts
// Chapter ids drive the Approach focus pull (slice 3).
import { type ChapterId } from "@/scene/camera/flightPath";
import { orbitPresence } from "./orbitSchedule";

const CORRIDOR_Z_NEAR = 20;
const CORRIDOR_Z_FAR = -220;
```

with:

```ts
// Chapter ids drive the Approach focus pull (slice 3).
import { type ChapterId } from "@/scene/camera/flightPath";
import { orbitPresence } from "./orbitSchedule";
import { worldsPresence } from "./worldsSchedule";

const CORRIDOR_Z_NEAR = 20;
const CORRIDOR_Z_FAR = -220;
```

In `src/scene/chapters/Starfield.ts`, replace:

```ts
  return ORBIT_SOFTEN_PEAK * orbitPresence(chapterProgress);
}

/** The focus pull for whichever chapter is current: Approach and Orbit pull, the rest don't.
 *  (Distinct from the `chapterSoften` instance field on `Starfield`, which is the eased value.) */
export function chapterSoften(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId === "approach") return approachSoften(chapterId, chapterProgress);
  if (chapterId === "orbit") return orbitSoften(chapterProgress);
  return 0;
}
```

with:

```ts
  return ORBIT_SOFTEN_PEAK * orbitPresence(chapterProgress);
}

/** How far the field is pulled out of focus while Worlds' planets are carried across the frame,
 *  at the peak of WORLDS_WINDOW. The planets and the case panel are the subject, so like Orbit it
 *  is lighter than Approach's 1.0. Browser-review tunable. */
export const WORLDS_SOFTEN_PEAK = 0.6;

/** 0..1 focus pull inside Worlds. Its window IS WORLDS_WINDOW (plus the schedule's edge fades),
 *  the same clock as the planets and the case panels, so the stars soften while a planet is up
 *  and sharpen back as the pin releases. */
export function worldsSoften(chapterProgress: number): number {
  return WORLDS_SOFTEN_PEAK * worldsPresence(chapterProgress);
}

/** The focus pull for whichever chapter is current: Approach, Orbit and Worlds pull, the rest
 *  don't. (Distinct from the `chapterSoften` instance field on `Starfield`, which is the eased
 *  value.) */
export function chapterSoften(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId === "approach") return approachSoften(chapterId, chapterProgress);
  if (chapterId === "orbit") return orbitSoften(chapterProgress);
  if (chapterId === "worlds") return worldsSoften(chapterProgress);
  return 0;
}
```

In `src/scene/chapters/Starfield.ts`, replace:

```ts

  update(ctx: FrameContext): void {
    if (!this.points) return;
    // Chapters 02 and 04 own the focus pull. Eased (tau ~0.33s) so a flick through either
    // blurs and recovers rather than strobing.
    const target = chapterSoften(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
    this.chapterSoften += (target - this.chapterSoften) * Math.min(1, ctx.dt * 3);
```

with:

```ts

  update(ctx: FrameContext): void {
    if (!this.points) return;
    // Chapters 02, 04 and 05 own the focus pull. Eased (tau ~0.33s) so a flick through either
    // blurs and recovers rather than strobing.
    const target = chapterSoften(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
    this.chapterSoften += (target - this.chapterSoften) * Math.min(1, ctx.dt * 3);
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/scene/chapters/Starfield.test.ts`
Expected: PASS — `Tests  22 passed (22)`.

- [ ] **Step 5: Write the failing store, log-event and hash tests**

In `src/scene/scroll/voyageStore.test.ts`, replace:

```ts
    voyageStore.scrollTo(3);
    expect(scroller).toHaveBeenNthCalledWith(1, 0.5);
    expect(scroller).toHaveBeenNthCalledWith(2, 1);
  });

  it("scrollTo is a no-op without a scroller", () => {
```

with:

```ts
    voyageStore.scrollTo(3);
    expect(scroller).toHaveBeenNthCalledWith(1, 0.5);
    expect(scroller).toHaveBeenNthCalledWith(2, 1);
  });

  // Slice 5 (A9): a hash arrival (/voyage#worlds) must land at once, not tween for 1.4s.
  it("scrollTo with { immediate: true } tells the scroller to skip the tween, and still clamps", () => {
    const scroller = vi.fn();
    voyageStore.registerScroller(scroller);
    voyageStore.scrollTo(0.5, { immediate: true });
    voyageStore.scrollTo(-2, { immediate: true });
    expect(scroller).toHaveBeenNthCalledWith(1, 0.5, true);
    expect(scroller).toHaveBeenNthCalledWith(2, 0, true);
  });

  it("scrollTo without options (or immediate: false) keeps the one-argument call the tween relies on", () => {
    const scroller = vi.fn();
    voyageStore.registerScroller(scroller);
    voyageStore.scrollTo(0.4, {});
    voyageStore.scrollTo(0.6, { immediate: false });
    expect(scroller.mock.calls).toEqual([[0.4], [0.6]]);
  });

  it("an immediate scrollTo is still programmatic, so crossing the Jump band fires no beat", () => {
    voyageStore.registerScroller(vi.fn());
    voyageStore.scrollTo(0.5, { immediate: true });
    expect(voyageStore.getState().programmatic).toBe(true);
    voyageStore.setScroll(0.5, 0);                                  // the scroll event lands on the target
    expect(voyageStore.getState().programmatic).toBe(false);
  });

  it("scrollTo is a no-op without a scroller", () => {
```

In `src/app/api/logs/route.test.ts`, replace:

```ts
    expect(res.status).toBe(204);
    expect(appendLog).toHaveBeenCalledWith("client", expect.objectContaining({ event: "voyage.jump" }));
  });
});
```

with:

```ts
    expect(res.status).toBe(204);
    expect(appendLog).toHaveBeenCalledWith("client", expect.objectContaining({ event: "voyage.jump" }));
  });

  // Slice 5: SceneRoot logs a failed shader precompile instead of throwing out of its effect.
  it("accepts the scene.compile_failed event SceneRoot emits", async () => {
    const res = await POST(post(JSON.stringify({ event: "scene.compile_failed", message: "boom" })));
    expect(res.status).toBe(204);
    expect(appendLog).toHaveBeenCalledWith("client", expect.objectContaining({ event: "scene.compile_failed" }));
  });
});
```

Create `src/components/voyage/chapterHash.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CHAPTERS, CONTENT_CHAPTERS, chapterAt } from "@/scene/camera/flightPath";
import { chapterForHash, hashArrivalProgress, HASH_ARRIVAL_EPS } from "./chapterHash";

describe("chapterForHash", () => {
  it("names every content chapter by its section id, with or without the leading #", () => {
    for (const c of CONTENT_CHAPTERS) {
      expect(chapterForHash(`#${c.id}`)).toBe(c.id);
      expect(chapterForHash(c.id)).toBe(c.id);
    }
    expect(chapterForHash("#worlds")).toBe("worlds");
  });

  it("is null for micro-beats (no pin, nothing to land on), unknown ids and empty hashes", () => {
    for (const hash of ["#jump", "#passage", "#nope", "#", "", "#worlds-extra", "#worlds?x=1", "#Worlds", "# worlds", "#worlds#again"]) {
      expect(chapterForHash(hash), hash).toBeNull();
    }
  });

  it("decodes a percent-encoded id and never throws on a malformed one", () => {
    expect(chapterForHash("#%77orlds")).toBe("worlds");
    expect(chapterForHash("#%E0%A4%A")).toBeNull();
    expect(chapterForHash("#%")).toBeNull();
  });

  it("is null for anything that is not a string", () => {
    expect(chapterForHash(undefined as unknown as string)).toBeNull();
    expect(chapterForHash(null as unknown as string)).toBeNull();
  });
});

describe("hashArrivalProgress", () => {
  it("is the chapter's start plus the same 0.001 every dock, rail and CTA arrival uses", () => {
    const worlds = CHAPTERS.find((c) => c.id === "worlds")!;
    expect(HASH_ARRIVAL_EPS).toBe(0.001);
    expect(hashArrivalProgress("#worlds")).toBe(worlds.start + 0.001);
  });

  it("lands inside the named chapter, for every content chapter", () => {
    for (const c of CONTENT_CHAPTERS) {
      const p = hashArrivalProgress(`#${c.id}`)!;
      expect(chapterAt(p).chapter.id).toBe(c.id);
    }
  });

  it("is null wherever chapterForHash is", () => {
    for (const hash of ["", "#", "#jump", "#nope"]) expect(hashArrivalProgress(hash)).toBeNull();
  });
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `npx vitest run src/scene/scroll/voyageStore.test.ts src/app/api/logs/route.test.ts src/components/voyage/chapterHash.test.ts`
Expected: FAIL — the immediate-mode test (`expected 1st "vi.fn()" call to have been called with [ 0.5, true ]`) and the `scene.compile_failed` test (`expected 400 to be 204`) fail, and `chapterHash.test.ts` cannot load: `Cannot find module './chapterHash'`. Two of the three new store tests (the no-options call and the programmatic flag) already hold and pin non-regression. Summary line: `Tests  2 failed | 34 passed (36)`.

- [ ] **Step 7: Implement the hash helpers, the immediate scroller, and the log event**

Create `src/components/voyage/chapterHash.ts`:

```ts
// Pure hash -> scroll-target mapping for a /voyage#<chapter> arrival (slice 5, A9). Kept out of
// VoyageRoot so it can be unit-tested: the elements it names (`id="worlds"`, ...) only exist
// after VoyageRoot's `tier === null` boot gate, so the browser's own fragment jump and Next's
// post-navigation scroll both miss them and the reader lands at the top. VoyageRoot calls this
// once, when the tier resolves, and scrolls there itself.
import { CONTENT_CHAPTERS, type ChapterId } from "@/scene/camera/flightPath";

/** Every dock, rail and CTA arrival lands this far past a chapter's start (absolute progress),
 *  so the pinned content is already up and the chapter's own beat has begun. */
export const HASH_ARRIVAL_EPS = 0.001;

/**
 * The content chapter a location hash names (`#worlds` or `worlds`), or null. Micro-beats
 * (Jump, Dark Passage) have no pin and nothing to land on, so they are null too; matching is
 * exact and case-sensitive, like the browser's own fragment lookup. A percent-encoded id is
 * decoded; a malformed one is null, never a throw.
 */
export function chapterForHash(hash: string): ChapterId | null {
  if (typeof hash !== "string") return null;
  let id = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  return CONTENT_CHAPTERS.find((c) => c.id === id)?.id ?? null;
}

/** Absolute progress to scroll to for a hash: the named chapter's start + HASH_ARRIVAL_EPS, or null. */
export function hashArrivalProgress(hash: string): number | null {
  const id = chapterForHash(hash);
  if (id === null) return null;
  return CONTENT_CHAPTERS.find((c) => c.id === id)!.start + HASH_ARRIVAL_EPS;
}
```

In `src/scene/scroll/voyageStore.ts`, replace:

```ts

let state: VoyageState = initialState();
const listeners = new Set<Listener>();
let scroller: ((progress: number) => void) | null = null;

function emit() {
  for (const l of listeners) l(state);
```

with:

```ts

let state: VoyageState = initialState();
const listeners = new Set<Listener>();
/** `immediate` is only ever passed as `true` (see scrollTo): a plain scrollTo keeps the
 *  one-argument call, so a scroller that ignores it behaves exactly as before. */
type Scroller = (progress: number, immediate?: boolean) => void;
let scroller: Scroller | null = null;

function emit() {
  for (const l of listeners) l(state);
```

In `src/scene/scroll/voyageStore.ts`, replace:

```ts
    emit();
  },

  registerScroller(fn: (progress: number) => void): void {
    scroller = fn;
  },
```

with:

```ts
    emit();
  },

  registerScroller(fn: Scroller): void {
    scroller = fn;
  },
```

In `src/scene/scroll/voyageStore.ts`, replace:

```ts
    scroller = null;
  },

  scrollTo(progress: number): void {
    // No scroller means nothing will move, so there is no programmatic travel to suppress.
    if (!scroller) return;
    const p = clamp01(progress);
    // Already there: no scroll event will fire, so nothing would ever clear the flag. This
    // call also replaces any earlier target, so disarm it (and emit) before re-asserting.
    if (Math.abs(p - state.progress) < PROGRAMMATIC_EPS) {
```

with:

```ts
    scroller = null;
  },

  /** `{ immediate: true }` asks the scroller to jump instead of tween (a /voyage#<chapter>
   *  arrival must land at once). It is still a programmatic scroll: the flag, the target and the
   *  deadline are armed exactly as for a tween, so crossing the Jump band fires no beat. */
  scrollTo(progress: number, opts?: { immediate?: boolean }): void {
    // No scroller means nothing will move, so there is no programmatic travel to suppress.
    if (!scroller) return;
    const p = clamp01(progress);
    const run = scroller;
    const drive = () => (opts?.immediate ? run(p, true) : run(p));
    // Already there: no scroll event will fire, so nothing would ever clear the flag. This
    // call also replaces any earlier target, so disarm it (and emit) before re-asserting.
    if (Math.abs(p - state.progress) < PROGRAMMATIC_EPS) {
```

In `src/scene/scroll/voyageStore.ts`, replace:

```ts
        state = { ...state, programmatic: false };
        emit();
      }
      scroller(p);
      return;
    }
    programmaticTarget = p;
```

with:

```ts
        state = { ...state, programmatic: false };
        emit();
      }
      drive();
      return;
    }
    programmaticTarget = p;
```

In `src/scene/scroll/voyageStore.ts`, replace:

```ts
      state = { ...state, programmatic: true };
      emit();
    }
    scroller(p);
  },

  /** Test-only: clears listeners as well as state. */
```

with:

```ts
      state = { ...state, programmatic: true };
      emit();
    }
    drive();
  },

  /** Test-only: clears listeners as well as state. */
```

In `src/scene/scroll/VoyageScroll.tsx`, replace:

```tsx
        if (!Number.isFinite(e.progress)) return;
        voyageStore.setScroll(e.progress, normalizeVelocity(e.velocity));
      });
      voyageStore.registerScroller((p) => lenis.scrollTo(p * maxScroll(), { duration: 1.4 }));
      return () => {
        clearInterval(tick);
        voyageStore.unregisterScroller();
```

with:

```tsx
        if (!Number.isFinite(e.progress)) return;
        voyageStore.setScroll(e.progress, normalizeVelocity(e.velocity));
      });
      // `immediate` (a /voyage#<chapter> arrival) skips the 1.4s tween.
      voyageStore.registerScroller((p, immediate) =>
        lenis.scrollTo(p * maxScroll(), immediate ? { immediate: true } : { duration: 1.4 }),
      );
      return () => {
        clearInterval(tick);
        voyageStore.unregisterScroller();
```

In `src/scene/scroll/VoyageScroll.tsx`, replace:

```tsx
      voyageStore.setScroll(progress, vel);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    voyageStore.registerScroller((p) => window.scrollTo({ top: p * maxScroll(), behavior: "auto" }));
    onScroll();
    return () => {
      clearInterval(tick);
```

with:

```tsx
      voyageStore.setScroll(progress, vel);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // "instant" for an arrival: `auto` defers to the page's `scroll-behavior: smooth` (globals.css).
    voyageStore.registerScroller((p, immediate) =>
      window.scrollTo({ top: p * maxScroll(), behavior: immediate ? "instant" : "auto" }),
    );
    onScroll();
    return () => {
      clearInterval(tick);
```

In `src/lib/clientLog.ts`, replace:

```ts
  // Slice 3: one line per Jump beat that actually fired, so the browser review can tell a
  // missed beat apart from a suppressed one.
  "voyage.jump",
] as const;

export type LogEvent = (typeof LOG_EVENTS)[number];
```

with:

```ts
  // Slice 3: one line per Jump beat that actually fired, so the browser review can tell a
  // missed beat apart from a suppressed one.
  "voyage.jump",
  // Slice 5: the shader precompile in SceneRoot threw; the scene still runs (programs compile
  // lazily on first draw), so this is a record, not a fallback.
  "scene.compile_failed",
] as const;

export type LogEvent = (typeof LOG_EVENTS)[number];
```

- [ ] **Step 8: Run them to verify they pass**

Run: `npx vitest run src/scene/scroll/voyageStore.test.ts src/app/api/logs/route.test.ts src/components/voyage/chapterHash.test.ts`
Expected: PASS — `Test Files  3 passed (3)`, `Tests  43 passed (43)`.

- [ ] **Step 9: Write the failing `useHashArrival` and `shaderLog` tests**

The hook is tested with a jsdom `renderHook` (the `@vitest-environment jsdom` pragma), a `vi.spyOn(voyageStore, "scrollTo")` and `history.replaceState` to set the hash: a null tier does nothing; `null → "high"` calls once with `(worlds.start + 0.001, { immediate: true })`; later tier changes do not call again; unknown, empty and micro-beat hashes never call; StrictMode (a mount with a null tier, and a mount that already has one) calls once; the hash is read when the tier resolves. `shaderErrorMessage` is tested against a fake `gl`.

Create `src/components/voyage/useHashArrival.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StrictMode } from "react";
import { renderHook, cleanup } from "@testing-library/react";
import { CHAPTERS } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import type { Tier } from "@/scene/quality";
import { useHashArrival } from "./useHashArrival";

const worlds = CHAPTERS.find((c) => c.id === "worlds")!;
const setHash = (hash: string) => window.history.replaceState(null, "", `/voyage${hash}`);

let scrollTo: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  voyageStore.reset();
  scrollTo = vi.spyOn(voyageStore, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setHash("");
});

describe("useHashArrival", () => {
  it("does nothing while the tier is unresolved (the sections it would land on are behind the boot gate)", () => {
    setHash("#worlds");
    renderHook(() => useHashArrival(null));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("jumps once, to the named chapter's start + 0.001, immediately, when the tier resolves", () => {
    setHash("#worlds");
    const { rerender } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
      initialProps: { tier: null as Tier | null },
    });
    expect(scrollTo).not.toHaveBeenCalled();
    rerender({ tier: "high" });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(worlds.start + 0.001, { immediate: true });
  });

  it("is one-shot: an FPS-probe demotion (a later tier change) must not re-scroll a reader who has moved on", () => {
    setHash("#worlds");
    const { rerender } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
      initialProps: { tier: null as Tier | null },
    });
    rerender({ tier: "high" });
    rerender({ tier: "mid" });
    rerender({ tier: "still" });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("never scrolls for an empty, unknown or micro-beat hash, and consumes its one shot doing nothing", () => {
    for (const hash of ["", "#", "#nope", "#jump", "#worlds-extra"]) {
      setHash(hash);
      const { rerender, unmount } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
        initialProps: { tier: null as Tier | null },
      });
      rerender({ tier: "high" });
      unmount();
    }
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("still calls once under React StrictMode's doubled effects", () => {
    setHash("#worlds");
    const { rerender } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
      wrapper: StrictMode,
      initialProps: { tier: null as Tier | null },
    });
    rerender({ tier: "high" });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("calls once even when StrictMode double-runs the effect on a mount that already has a tier", () => {
    setHash("#worlds");
    renderHook(() => useHashArrival("high"), { wrapper: StrictMode });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("reads the hash when the tier resolves, not when the hook mounts", () => {
    const { rerender } = renderHook(({ tier }: { tier: Tier | null }) => useHashArrival(tier), {
      initialProps: { tier: null as Tier | null },
    });
    setHash("#belt");                                              // a navigation landed while the voyage was booting
    rerender({ tier: "high" });
    expect(scrollTo).toHaveBeenCalledWith(CHAPTERS.find((c) => c.id === "belt")!.start + 0.001, { immediate: true });
  });
});
```

Create `src/scene/shaderLog.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shaderErrorMessage, SHADER_LOG_MAX, SHADER_ERROR_FALLBACK } from "./shaderLog";

/** A minimal stand-in for the bits of WebGLRenderingContext the helper reads. */
const fakeGl = (program: string | null, vertex: string | null, fragment: string | null) =>
  ({
    getProgramInfoLog: () => program,
    getShaderInfoLog: (shader: unknown) => (shader === "VS" ? vertex : fragment),
  }) as unknown as WebGLRenderingContext;
const call = (gl: WebGLRenderingContext) =>
  shaderErrorMessage(gl, {} as WebGLProgram, "VS" as unknown as WebGLShader, "FS" as unknown as WebGLShader);

describe("shaderErrorMessage", () => {
  it("joins the program, vertex and fragment info logs, labelled, on one line", () => {
    const msg = call(fakeGl("link failed\n", "0:12 error: foo", "0:30 error: bar\n0:31 error: baz"));
    expect(msg).toBe("program: link failed | vertex: 0:12 error: foo | fragment: 0:30 error: bar 0:31 error: baz");
  });

  it("skips empty and missing logs", () => {
    expect(call(fakeGl("", null, "only the fragment"))).toBe("fragment: only the fragment");
  });

  it("falls back to a fixed sentence when every log is empty", () => {
    expect(call(fakeGl("", "", ""))).toBe(SHADER_ERROR_FALLBACK);
    expect(call(fakeGl(null, null, null))).toBe(SHADER_ERROR_FALLBACK);
  });

  it("truncates a long log to SHADER_LOG_MAX characters plus an ellipsis", () => {
    const msg = call(fakeGl("x".repeat(5000), "", ""));
    expect(msg.length).toBe(SHADER_LOG_MAX + 1);
    expect(msg.endsWith("…")).toBe(true);
    expect(msg.startsWith("program: xxx")).toBe(true);
  });

  it("never throws, even if the context is lost mid-call", () => {
    const broken = {
      getProgramInfoLog: () => {
        throw new Error("context lost");
      },
      getShaderInfoLog: () => "ok",
    } as unknown as WebGLRenderingContext;
    expect(() => call(broken)).not.toThrow();
    expect(call(broken)).toBe(SHADER_ERROR_FALLBACK);
    expect(call(null as unknown as WebGLRenderingContext)).toBe(SHADER_ERROR_FALLBACK);
  });
});
```

- [ ] **Step 10: Run them to verify they fail**

Run: `npx vitest run src/components/voyage/useHashArrival.test.tsx src/scene/shaderLog.test.ts`
Expected: FAIL — both suites cannot load: `Failed to resolve import "./useHashArrival"` (the jsdom `.tsx` suite) and `Cannot find module './shaderLog'` (the node `.ts` suite) (`Test Files  2 failed (2)`).

- [ ] **Step 11: Implement them**

Create `src/components/voyage/useHashArrival.ts`:

```ts
"use client";

import { useEffect, useRef } from "react";
import type { Tier } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { hashArrivalProgress } from "./chapterHash";

/**
 * /voyage#<chapter> arrivals (the "Back to the voyage" link on /work/<slug> is /voyage#worlds).
 * The section ids only exist after VoyageRoot's `tier === null` boot gate, so neither the browser's
 * fragment jump nor Next's post-navigation scroll can find them: the reader would land at the top.
 * Once the tier resolves, jump to the named chapter ourselves. Child effects run before their
 * parent's in one commit, so VoyageScroll has registered its scroller by then; `immediate` skips
 * the 1.4s tween (and stays programmatic, so crossing the Jump band fires no beat).
 *
 * One-shot and ref-guarded: an FPS-probe demotion changes `tier` again and must not re-scroll a
 * reader who has since moved on. The shot is only consumed once the tier is resolved, so React
 * StrictMode's doubled effects on the (null-tier) first mount cannot spend it. The hash is read
 * when the tier resolves, not when the hook mounts.
 */
export function useHashArrival(tier: Tier | null): void {
  const handled = useRef(false);
  useEffect(() => {
    if (tier === null || handled.current) return;
    handled.current = true;
    const target = hashArrivalProgress(window.location.hash);
    if (target !== null) voyageStore.scrollTo(target, { immediate: true });
  }, [tier]);
}
```

Create `src/scene/shaderLog.ts`:

```ts
// Turns a failed shader / program into a short, loggable line (slice 5). three@0.169 reports a
// GLSL compile or link error through `renderer.debug.onShaderError` and console.error — NOT as an
// exception from `renderer.compile()` — so a try/catch around compile() alone almost never fires
// for the real failure (a planet silently invisible on one GPU). SceneRoot hooks this up to the
// `scene.compile_failed` client event. Pure and defensive: it only reads info logs (GLSL error
// text), never anything else, and it never throws.

/** Longest info-log text kept in a log line (the allow-listed /api/logs body is capped at ~2 KB). */
export const SHADER_LOG_MAX = 300;

/** What is logged when the driver gives no info log at all. */
export const SHADER_ERROR_FALLBACK = "shader link or compile error";

/** `onShaderError`'s arguments, in order: the context, the failed program and its two shaders. */
export function shaderErrorMessage(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): string {
  try {
    const parts: string[] = [];
    const add = (label: string, log: string | null | undefined) => {
      const text = (log ?? "").replace(/\s+/g, " ").trim();
      if (text) parts.push(`${label}: ${text}`);
    };
    add("program", gl.getProgramInfoLog(program));
    add("vertex", gl.getShaderInfoLog(vertexShader));
    add("fragment", gl.getShaderInfoLog(fragmentShader));
    const joined = parts.join(" | ");
    if (!joined) return SHADER_ERROR_FALLBACK;
    return joined.length > SHADER_LOG_MAX ? `${joined.slice(0, SHADER_LOG_MAX)}…` : joined;
  } catch {
    return SHADER_ERROR_FALLBACK;
  }
}
```

- [ ] **Step 12: Run them to verify they pass**

Run: `npx vitest run src/components/voyage/useHashArrival.test.tsx src/scene/shaderLog.test.ts`
Expected: PASS — `Test Files  2 passed (2)`, `Tests  12 passed (12)` (7 + 5).

- [ ] **Step 13: Wire `SceneRoot` and `VoyageRoot`**

Neither has a unit test (no harness exists for the GL effect or for `VoyageRoot`, as in slices 3–4; the logic they call is tested above): the typechecker supplies the red and the green, and Task 8 judges the result in a browser. After the `SceneRoot` edit alone `tsc` is red at `VoyageRoot` (missing required `planets`); after the `VoyageRoot` edit it is green. The `void worlds;` guard from Task 3 is deleted by this edit, and the inline hash effect is a one-line `useHashArrival(tier)` call.

In `src/scene/SceneRoot.tsx`, replace:

```tsx
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import { getCameraPose, bankForProgress, fovForVelocity, type CameraPose } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
```

with:

```tsx
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import { logClient } from "@/lib/clientLog";
import type { PlanetFeature } from "@/lib/planetFeature";
import { shaderErrorMessage } from "@/scene/shaderLog";
import { getCameraPose, bankForProgress, fovForVelocity, type CameraPose } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
```

In `src/scene/SceneRoot.tsx`, replace:

```tsx
import { EnergyOrb } from "@/scene/chapters/EnergyOrb";
import { WarpStreaks } from "@/scene/chapters/WarpStreaks";
import { Topology } from "@/scene/chapters/Topology";
// Chapter 04 ring.
import { OrbitRing } from "@/scene/chapters/OrbitRing";
import type { FrameContext, SetPiece } from "@/scene/chapters/types";

interface SceneRootProps {
```

with:

```tsx
import { EnergyOrb } from "@/scene/chapters/EnergyOrb";
import { WarpStreaks } from "@/scene/chapters/WarpStreaks";
import { Topology } from "@/scene/chapters/Topology";
// Chapter 04 ring, chapter 05 planets.
import { OrbitRing } from "@/scene/chapters/OrbitRing";
import { Planet, planetsKey, planetsFromKey } from "@/scene/chapters/Planet";
import type { FrameContext, SetPiece } from "@/scene/chapters/types";

interface SceneRootProps {
```

In `src/scene/SceneRoot.tsx`, replace:

```tsx
  /** Chapter 04's process-step count (one ring node each). Comes from the CMS: stable after
   *  load, never derived from scroll. 0 builds an empty, always-hidden ring. */
  stepCount: number;
}

const IGNITE_SECONDS = 1.2;
const POSE_LERP = 0.08;

/** Owns the single WebGL context. Reads voyageStore imperatively — no React re-renders per frame. */
export default function SceneRoot({ tier, ignite, onContextLost, stepCount }: SceneRootProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const igniteRef = useRef(ignite);
  // Layout effect, not a render-phase write (react-hooks/refs). No dep array so it re-syncs
  // every commit; the RAF loop reads igniteRef.current, always after the commit has landed.
```

with:

```tsx
  /** Chapter 04's process-step count (one ring node each). Comes from the CMS: stable after
   *  load, never derived from scroll. 0 builds an empty, always-hidden ring. */
  stepCount: number;
  /** Chapter 05's planet features, one per published case study, in CMS order. Like `stepCount`
   *  it is CMS data, stable after load. Pass any array: the GL effect depends on its VALUE
   *  (planetsKey), never on its identity, so a fresh array every render rebuilds nothing. */
  planets: readonly PlanetFeature[];
}

const IGNITE_SECONDS = 1.2;
const POSE_LERP = 0.08;

/** Owns the single WebGL context. Reads voyageStore imperatively — no React re-renders per frame. */
export default function SceneRoot({ tier, ignite, onContextLost, stepCount, planets }: SceneRootProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // The effect below depends on this string, not on `planets`: VoyageRoot re-renders on every
  // letterbox / ignite / tier change and would otherwise rebuild the WebGL context each time.
  const planetKey = planetsKey(planets);
  const igniteRef = useRef(ignite);
  // Layout effect, not a render-phase write (react-hooks/refs). No dep array so it re-syncs
  // every commit; the RAF loop reads igniteRef.current, always after the commit has landed.
```

In `src/scene/SceneRoot.tsx`, replace:

```tsx

    // Array order sets update() order only, not draw order: the orb's ShaderMaterial is opaque,
    // so three draws it first; the transparent pieces are depth-sorted after it.
    // OrbitRing (chapter 04) is transparent too: depth-sorted with the others, drawn after the orb.
    const pieces: SetPiece[] = [
      new Starfield(), new WarpStreaks(), new Topology(), new OrbitRing(stepCount), new EnergyOrb(),
    ];
    for (const p of pieces) p.build(scene, tier);

    const pose: CameraPose = { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
    const smoothPos = new THREE.Vector3();
```

with:

```tsx

    // Array order sets update() order only, not draw order: the orb's ShaderMaterial is opaque,
    // so three draws it first; the transparent pieces are depth-sorted after it.
    // OrbitRing (chapter 04) and Planet (chapter 05) are transparent too: depth-sorted with the
    // others, drawn after the orb (a planet in front of the star occludes its halo).
    const pieces: SetPiece[] = [
      new Starfield(), new WarpStreaks(), new Topology(), new OrbitRing(stepCount),
      new Planet(planetsFromKey(planetKey)), new EnergyOrb(),
    ];
    for (const p of pieces) p.build(scene, tier);
    // Compile every program now instead of on the first frame that draws it (the slice-4
    // first-entry hitch into Orbit: 23.7 ms median / p95 40 ms). On a first visit Ignition's
    // curtain is up and hides the block; on a repeat visit (sessionStorage says it played)
    // Ignition ends at mount, so the block lands before the first frame — Task 8 measures it.
    // It walks hidden objects too (scene.traverse), so the planets' and the ring's programs are
    // included. Synchronous on purpose: async would still stall the first render.
    // three reports a GLSL compile / link ERROR through renderer.debug.onShaderError (and
    // console.error), not as an exception, so that hook is what feeds the log; the try/catch only
    // guards the call itself. Neither may throw out of the effect — a failure only means programs
    // compile lazily, as before.
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      logClient("scene.compile_failed", { message: shaderErrorMessage(gl, program, vertexShader, fragmentShader) });
    };
    try {
      renderer.compile(scene, camera);
    } catch (e) {
      logClient("scene.compile_failed", { message: String(e).slice(0, 300) });
    }

    const pose: CameraPose = { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
    const smoothPos = new THREE.Vector3();
```

In `src/scene/SceneRoot.tsx`, replace:

```tsx
      renderer.dispose();
      if (host.contains(canvas)) host.removeChild(canvas);
    };
    // stepCount rebuilds the context if the CMS count ever changes under a live page (rare:
    // it is server-rendered with revalidate 300).
  }, [tier, onContextLost, stepCount]);

  return <div ref={hostRef} className="voyage-scene" aria-hidden="true" />;
}
```

with:

```tsx
      renderer.dispose();
      if (host.contains(canvas)) host.removeChild(canvas);
    };
    // stepCount and planetKey rebuild the context if the CMS data ever changes under a live page
    // (rare: it is server-rendered with revalidate 300).
  }, [tier, onContextLost, stepCount, planetKey]);

  return <div ref={hostRef} className="voyage-scene" aria-hidden="true" />;
}
```

In `src/components/voyage/VoyageRoot.tsx`, replace:

```tsx
import Ignition from "./Ignition";
import Launch from "./Launch";
// Slice 3: chapter 02's panels and chapter 03's beat. Slice 4: chapter 04's step panels.
import Services from "./Services";
import Process from "./Process";
import { useJumpBeat } from "./useJumpBeat";

const SceneRoot = dynamic(() => import("@/scene/SceneRoot"), { ssr: false });
```

with:

```tsx
import Ignition from "./Ignition";
import Launch from "./Launch";
// Slice 3: chapter 02's panels and chapter 03's beat. Slice 4: chapter 04's step panels.
// Slice 5: chapter 05's case panels and the /voyage#<chapter> arrival.
import Services from "./Services";
import Process from "./Process";
import Worlds from "./Worlds";
import { useHashArrival } from "./useHashArrival";
import { useJumpBeat } from "./useJumpBeat";

const SceneRoot = dynamic(() => import("@/scene/SceneRoot"), { ssr: false });
```

In `src/components/voyage/VoyageRoot.tsx`, replace:

```tsx
// The prop is named `process` (the content key); it is destructured as `steps` so it never
// shadows Node's `process` global inside this module.
export default function VoyageRoot({ settings, services, process: steps, worlds }: VoyageRootProps) {
  // Plumbed in slice 5 task 3; chapter 05 mounts it in task 7, which deletes this line.
  void worlds;
  const [tier, setTier] = useState<Tier | null>(null);
  const [ignited, setIgnited] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
```

with:

```tsx
// The prop is named `process` (the content key); it is destructured as `steps` so it never
// shadows Node's `process` global inside this module.
export default function VoyageRoot({ settings, services, process: steps, worlds }: VoyageRootProps) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [ignited, setIgnited] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
```

In `src/components/voyage/VoyageRoot.tsx`, replace:

```tsx
  }, []);
  const onIgnitionComplete = useCallback(() => setIgnited(true), []);

  // Chapters 01–04 own their own sections now; the rest are still placeholders.
  const placeholders = useMemo(
    () => CHAPTERS.filter((c) => c.id !== "launch" && c.id !== "approach" && c.id !== "jump" && c.id !== "orbit"),
    [],
  );
```

with:

```tsx
  }, []);
  const onIgnitionComplete = useCallback(() => setIgnited(true), []);

  // /voyage#<chapter> arrivals land here once the boot gate below has lifted (see the hook).
  useHashArrival(tier);

  // Chapters 01–05 own their own sections now; the rest are still placeholders. (`worlds` is
  // filtered out so its `id="worlds"` lives in <Worlds> alone — the dock and #worlds target it.)
  const placeholders = useMemo(
    () => CHAPTERS.filter((c) => c.id !== "launch" && c.id !== "approach" && c.id !== "jump" && c.id !== "orbit" && c.id !== "worlds"),
    [],
  );
```

In `src/components/voyage/VoyageRoot.tsx`, replace:

```tsx
      {/* Narrowed on the literal: SceneRoot takes Exclude<Tier, "still">, and `animated` is a
          plain boolean TypeScript cannot tie back to `tier`. */}
      {tier !== "still" ? (
        <SceneRoot tier={tier} ignite={ignited} onContextLost={onContextLost} stepCount={steps.length} />
      ) : (
        <StillSky />
      )}
```

with:

```tsx
      {/* Narrowed on the literal: SceneRoot takes Exclude<Tier, "still">, and `animated` is a
          plain boolean TypeScript cannot tie back to `tier`. */}
      {tier !== "still" ? (
        <SceneRoot
          tier={tier}
          ignite={ignited}
          onContextLost={onContextLost}
          stepCount={steps.length}
          planets={worlds.map((w) => w.planetFeature)}
        />
      ) : (
        <StillSky />
      )}
```

In `src/components/voyage/VoyageRoot.tsx`, replace:

```tsx
        {/* Chapter 04, in chapter order (DOM order is scroll order). Inside the boot gate for the
            same reason as Services: it calls useReducedMotion(). */}
        <Process steps={steps} animated={animated} />
        {placeholders.map((c) => (
          <section
            key={c.id}
```

with:

```tsx
        {/* Chapter 04, in chapter order (DOM order is scroll order). Inside the boot gate for the
            same reason as Services: it calls useReducedMotion(). */}
        <Process steps={steps} animated={animated} />
        {/* Chapter 05, same reason (useReducedMotion, useMediaQuery). Owns id="worlds". */}
        <Worlds cases={worlds} animated={animated} />
        {placeholders.map((c) => (
          <section
            key={c.id}
```

- [ ] **Step 14: Run the typechecker, the linter and the whole suite**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npx eslint src/scene src/components/voyage src/components/dock src/lib src/app/voyage scripts`
Expected: 0 errors; only the two pre-existing warnings (`src/lib/auth.ts`, `src/lib/mongodb.ts`).

Run: `npx vitest run`
Expected: PASS — `Test Files  51 passed (51)`, `Tests  685 passed (685)` when run after Tasks 1–6 (659 + 3 Starfield + 3 store + 1 route + 7 chapterHash + 7 useHashArrival + 5 shaderLog = 685).

- [ ] **Step 15: Commit**

```bash
git add src/scene/chapters/Starfield.ts src/scene/chapters/Starfield.test.ts src/scene/scroll/voyageStore.ts src/scene/scroll/voyageStore.test.ts src/scene/scroll/VoyageScroll.tsx src/components/voyage/chapterHash.ts src/components/voyage/chapterHash.test.ts src/components/voyage/useHashArrival.ts src/components/voyage/useHashArrival.test.tsx src/scene/shaderLog.ts src/scene/shaderLog.test.ts src/lib/clientLog.ts src/app/api/logs/route.test.ts src/scene/SceneRoot.tsx src/components/voyage/VoyageRoot.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): mount Worlds, wire the planets, and make /voyage#worlds land on Worlds

SceneRoot builds the Planet piece from a stable planets key and precompiles every
program after the build (logged, never thrown). Worlds pulls the starfield out of
focus on the planets' clock. VoyageRoot mounts <Worlds> (which owns id="worlds")
and, once the tier resolves, jumps to a #<chapter> hash through a new immediate
voyageStore.scrollTo (the one-shot useHashArrival hook), so the Back-to-the-voyage
link on /work/<slug> arrives at Worlds instead of the top. A GLSL error is logged
as scene.compile_failed through renderer.debug.onShaderError.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push
```

---

### Task 8: Browser review (controller-run)

**Files:**
- Create: `screenshots/voyage/slice-5/*.png` (29 files, listed below)
- Modify (only if the review says so): the exported tunables in `Planet.ts` (`PLANET_RADIUS`, `PLANET_DEPTH`, `PLANET_TARGET_*`, `PLANET_RING_*`, `MOON_*`, `PLANET_NIGHT_FLOOR`, `PLANET_FADE_OUT_END`), `worldsSchedule.ts` (`WORLDS_WINDOW`, `WORLDS_EDGE_FADE`, `CASE_TRAVEL`), `Starfield.ts` (`WORLDS_SOFTEN_PEAK`), `markdown.ts` (`EXCERPT_MAX`), the shader constants in `Planet.ts`'s `FRAG`, and the `--worlds-panel-w` custom property / the phone type scale in `voyage.css`

**Interfaces:**
- Consumes: everything Tasks 1–7 shipped, served at `http://localhost:3000/voyage` and `/work/placeholder-*`; `logs/client.jsonl` (the `quality.probe` line); the chrome-devtools MCP (`navigate_page`, `resize_page`, `emulate`, `evaluate_script`, `take_screenshot`, `list_console_messages`) with the Playwright MCP as the mobile / screenshot fallback.
- Produces: the 29 PNG baselines, the FPS readings, a verdict on each checklist item below, and the list of retuned constants with old and new values. All consumed by Task 9.

**This task is run by the controller, not a fresh implementer.** Spec §6 requires a browser review before the next slice, and per `insights.md` the screenshots are the only regression net for shaders, sprites and DOM. Four things in this slice have **no unit coverage at all** and are judged only here: the planet surface shader as drawn (the plan-verification run proved it compiles and renders — a one-planet harness frame — but nothing tuned it against the real page), the planets' composition against the star and the panel, the panel's real layout (clipping, line-clamps) at each viewport, and the frame cost of the new chapter.

**What the plan-verification run already established in a real browser** (so the review can start from known ground, not re-prove it): `/voyage` served from the seeded placeholders with no console errors beyond the pre-existing favicon 404 and the two `<link rel=preload>` warnings; at 1440×900 case 1 shows the ring planet right of the star with the panel on the left; at 390×844 the phone box is 287 px, every placeholder's link bottom sits 13 px inside it (388 vs 401) and nothing clips; at 390×740 (box 252 px) and 375×667 (box 227 px) the link is still inside and 23 px / 48 px of excerpt text is clipped instead (the excerpt block is the only thing that gives way); the planet sits below the star; at 1024×768 the stacked-column panel is ≈ 624 px tall (see checklist item 3); from `/work/placeholder-ledger` a client-side click on "Back to the voyage" lands at progress 0.35484 (= Worlds' start + 0.001) with `#worlds` at the top of the viewport, and so does a hard load of `/voyage#worlds` (panel 1 lit, planet 1 fully up after 2 s, HUD `DIST 4.4 AU`).

**Prerequisites.** The local Docker `mongo:7` on port 27018 and `.env.local` pointing at it. Seed the placeholders (note: the existing seed also resets the local projects, skills, settings, services and process steps — it always has):

```bash
cd /Users/admin/Codes-2/portfolio
MONGODB_URI=mongodb://localhost:27018/portfolio npm run seed
```
Then upload one architecture diagram (any SVG or PNG ≤ 1 MB) to `placeholder-ledger` through `/admin` (the seed leaves `diagram` empty on purpose: it exercises the upload path and the desktop thumbnail).

- [ ] **Step 1: Start the server and create the screenshot directory**

```bash
cd /Users/admin/Codes-2/portfolio
mkdir -p screenshots/voyage/slice-5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/voyage   # 200 means a dev server is already running: reuse it
```
If nothing answers, start one in the background (`npm run dev > logs/dev-server.out 2>&1 &`) so the shell stays free; never start a second server over a running one (they share `.next`), and stop only a server you started. Open `http://localhost:3000/voyage` with the chrome-devtools MCP (`navigate_page`). Let Ignition finish. Confirm the section order and that `id="worlds"` exists exactly once, inside `<Worlds>` (no placeholder duplicate):
```js
({
  order: [...document.querySelectorAll("main.voyage-track > section")].map((s) => s.id),
  worldsCount: document.querySelectorAll("#worlds").length,
  worldsIsWorlds: document.querySelector("#worlds").classList.contains("chapter--worlds"),
})
// expected: order = ["launch","approach","jump","orbit","worlds","belt","passage","constellation","pilot","landing","surface"], worldsCount 1, worldsIsWorlds true
```

- [ ] **Step 2: Compute every capture point from the code, not by hand**

Every progress value comes from `progressAt` / the schedule (the no-literal rule applies to captures too). Run once and keep the output beside you (`npx tsx` needs network on first use; the alternative is the same table printed from a throwaway `*.test.ts` that you delete afterwards):

```bash
cd /Users/admin/Codes-2/portfolio
npx tsx -e '
import { progressAt, CHAPTERS } from "./src/scene/camera/flightPath";
import { ORBIT_WINDOW } from "./src/scene/chapters/orbitSchedule";
import { WORLDS_WINDOW, WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE, caseCentre } from "./src/scene/chapters/worldsSchedule";
const [o0, o1] = ORBIT_WINDOW, [w0, w1] = WORLDS_WINDOW;
const orbitCentre = (i: number) => o0 + ((i + 0.5) / 4) * (o1 - o0);
const boundary = (b: number) => w0 + (b / 3) * (w1 - w0);
const worlds = CHAPTERS.find((c) => c.id === "worlds")!;
const rows: [string, number][] = [
  ["approach-docked", progressAt("approach", 1 / 3)],
  ["approach-prejump (cp 0.958)", progressAt("approach", 0.958)],
  ["jump-mid", progressAt("jump", 0.5)],
  ["orbit-entry", progressAt("orbit", 0.003)],
  ["orbit-step4 (N=4 centre)", progressAt("orbit", orbitCentre(3))],
  ["worlds-nav-arrival (start + 0.001)", worlds.start + 0.001],
  ["worlds-entry (cp 0.02)", progressAt("worlds", 0.02)],
  ["case1 centre", progressAt("worlds", caseCentre(0, 3))],
  ["case1|2 boundary", progressAt("worlds", boundary(1))],
  ["case2 centre", progressAt("worlds", caseCentre(1, 3))],
  ["case2|3 boundary", progressAt("worlds", boundary(2))],
  ["case3 centre", progressAt("worlds", caseCentre(2, 3))],
  ["desktop pin-release", progressAt("worlds", WORLDS_HOLD_DESKTOP)],
  ["mobile pin-release", progressAt("worlds", WORLDS_HOLD_MOBILE)],
  ["belt-entry (worlds exit)", progressAt("belt", 0.02)],
];
for (const [k, v] of rows) console.log(k.padEnd(38), v.toFixed(6));
'
```
Expected output (the fractions of this tree: worlds = 575/1625 → 1025/1625; the planets' slot centres are chapterProgress 0.155 / 0.385 / 0.615):
```
approach-docked                        0.092308
approach-prejump (cp 0.958)            0.149969
jump-mid                               0.161538
orbit-entry                            0.169785
orbit-step4 (N=4 centre)               0.270308
worlds-nav-arrival (start + 0.001)     0.354846
worlds-entry (cp 0.02)                 0.359385
case1 centre                           0.396769
case1|2 boundary                       0.428615
case2 centre                           0.460462
case2|3 boundary                       0.492308
case3 centre                           0.524154
desktop pin-release                    0.569231
mobile pin-release                     0.591385
belt-entry (worlds exit)               0.632000
```
(Any other chapter point: `progress = (startVh + spanVh × t) / 1625`, with Worlds at `startVh 575, spanVh 450`.) If your numbers differ, the chapter table drifted from Task 1 — stop and fix that first.

- [ ] **Step 3: Capture the desktop set at 1440×900**

Resize to 1440×900. For each row, run this in `evaluate_script` (substituting `P`), **wait ≥ 2 s** (the camera pose, the starfield's eased state and the panel transition all settle), then `take_screenshot`:

```js
// Native scrollTo, NOT voyageStore.scrollTo: the store's scrollTo sets the programmatic flag,
// which suppresses the very Jump beat the approach/jump captures exist to check.
(() => {
  const P = 0.396769; // ← from Step 2
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: P * max, behavior: "auto" });
  return { target: P, actual: Number((window.scrollY / max).toFixed(4)) };
})()
```
Require `actual` within ~0.002 of `target` before photographing (Lenis owns the scroll position; wait and re-read `window.scrollY / max` if it lags).

| File | Point | What it must show |
|---|---|---|
| `desktop-approach-docked.png` | approach-docked | **Regression** (compare `screenshots/voyage/slice-4/desktop-approach-docked.png`): three docked service panels, graph whole, star the same size, HUD `DIST 8.1 AU` |
| `desktop-approach-prejump.png` | approach-prejump | **Regression** (compare slice-4 `desktop-approach-prejump.png`): star ≈ 8.7 px across, HUD `DIST 7.3 AU` |
| `desktop-jump-mid.png` | jump-mid | **Regression** (compare slice-4 `desktop-jump-mid.png`): bars, tunnel, flare (step from `approach-prejump` to `jump-mid` in **one** `evaluate_script`) |
| `desktop-orbit-entry.png` | orbit-entry | **Regression** (compare slice-4 `desktop-orbit-entry.png`): star ≈ 13.3 px (it would read 11.1 px if the star clock were wrong), HUD `DIST 7.0 AU` |
| `desktop-orbit-step4.png` | orbit-step4 | **Regression** (compare slice-4 `desktop-step4.png`): star ≈ 30 px across with its limb darkening, ring node 4 front-centre, HUD `DIST 5.6 AU` |
| `desktop-worlds-nav-arrival.png` | worlds-nav-arrival | What a Dock "Work" click lands on (1.625vh into the chapter): case 1's panel already lit and the planet **eased in by `dt`, not by scroll** — a screenshot ≈ 0.6 s after the arrival must show planet 1 at (almost) full opacity beside the star, whatever the scroll position (see checklist item 5), HUD `DIST 4.4 AU`, no ring left over from Orbit |
| `desktop-worlds-entry.png` | worlds-entry | Case 1 lit, planet 1 up, stars softening, level horizon |
| `desktop-case1.png` | case1 centre | Ring planet centre-right at ≈ (0.40, −0.05) NDC, panel left, star disc clear of both, the other two panels invisible, no other planet |
| `desktop-case1-to-2.png` | case1\|2 boundary | **A transition frame, not a rest frame** (panels transition on a 0.45 s clock): scroll to just before the boundary, then step across it and screenshot within ~200 ms — the outgoing panel mid-fade and the incoming one rising; planets cross-fading. Judge it for **garbling** (checklist item 4): two three-column panels share one grid cell for ~0.3 s, so look for unreadable overlapping text; if it is a smear, delay the incoming panel's opacity transition or shorten the outgoing one (`[data-solo-off]`) — no CSS change unless the frame actually shows it. After 1 s a rest frame must show exactly one panel |
| `desktop-case2.png` | case2 centre | Moon planet; the moon never crosses the star disc |
| `desktop-case3.png` | case3 centre | Storm planet: the latitude band reads against the dark face |
| `desktop-pin-release.png` | desktop pin-release | Case 3 still lit as the 100vh pin releases (the last case dwells to here), planet 3 still ≈ 99 % shown (`planetFadeOut(0.7778) ≈ 0.99`) and about to fade, stars back in focus |
| `desktop-belt-entry.png` | belt-entry | No planet, no panel, nothing of Worlds left; star back to a plain disc; Belt placeholder label |
| `desktop-case1-diagram.png` | case1 centre (after the `/admin` diagram upload) | The diagram thumbnail bottom-right of the panel, `object-fit: contain`, not distorted, panel height unchanged |

Also resize to **1024×768** and capture **case 2** → `desktop-1024-case2.png`: the panel is the narrow stacked-column layout (excerpts one under another, four lines each), it clears the dock pill (top ≈ 93 px) and the viewport bottom, and the star and planet are clear of its right edge (512 px). Then resize to **768×1024** (a portrait tablet: aspect < 1, so the planet takes the **portrait** target with the **desktop** panel layout — Decision 15 accepts this) and capture **case 1** → `desktop-768x1024-case1.png` to record the accepted state: expect the planet low-centre (≈ y 740, r ≈ 120 px) and the left-hand panel ending near y 710, so they may touch at the panel's right edge; if that reads as broken, use the portrait target only when `window.innerWidth < 768` (pass the phone flag into `Planet`) and add a test. Finally open `http://localhost:3000/work/placeholder-ledger` at 1440×900 → `desktop-work-placeholder-ledger.png`: the case-study page reads end to end (header, metrics chips, stack, diagram, three sections, both back links).

- [ ] **Step 4: Capture the mobile set at 390×844**

`resize_page` clamps around ~500 px (`insights.md`), so it cannot reproduce a phone. Use the chrome-devtools `emulate` tool with device metrics width 390, height 844, deviceScaleFactor 3, mobile true (tier `mid`). If `emulate` is unavailable, drive these with the Playwright MCP (`browser_resize` + `browser_take_screenshot`) — Playwright as a *screenshot driver* is fine; the Playwright *test suite* is deferred to slice 8. Same `evaluate_script` as Step 3.

| File | Point | What it must show |
|---|---|---|
| `mobile-approach-docked.png` | approach-docked | **Regression** (compare slice-4 `mobile-approach-docked.png`): panel 2 alone, inside the 64vh pin, below the dock |
| `mobile-worlds-entry.png` | worlds-entry | Panel 1 top-anchored under the chapter label, clear of the dock pill; no horizontal overflow (`document.documentElement.scrollWidth === 390`) |
| `mobile-case1.png` … `mobile-case3.png` | case 1–3 centres | One panel alone in the `min(34vh, 18rem)` box (287 px); title on at most two lines, context on one line (ellipsis), excerpts on two lines each, the **link fully inside the box** (`link.getBoundingClientRect().bottom <= panel.getBoundingClientRect().bottom`; the plan-verification run measured 388 vs 401 for all three); the star disc is NOT covered by the panel, and the planet sits below the star, centred, ≈ 200 px across |
| `mobile-case1-390x740.png` | case 1 centre at **390×740** (Playwright `browser_resize`, or `emulate` with those metrics) | The box is 34vh = 252 px: the link is still fully inside it (bottom ≤ panel bottom), the excerpt block is clipped at its bottom edge instead (≈ 23 px of text on the placeholders), no horizontal overflow |
| `mobile-case1-375x667.png` | case 1 centre at **375×667** (iPhone SE class) | The box is 227 px: link fully inside, ≈ 48 px of excerpt text clipped (Problem and most of Architecture visible), the star clear of the box |
| `mobile-pin-release.png` | mobile pin-release | Case 3's panel still up at full opacity as the 64vh pin releases (hold to cp 0.858), ~~planet 3 ≈ 25 % shown (`planetFadeOut(0.8578) ≈ 0.25`: still visible, fading out)~~ **superseded in place by Execution amendment M2:** at the phone's pin release (cp 0.858 > `PLANET_LEAVE_AT` 0.80) planet 3 is gone and only the panel remains (accepted trade-off) |
| `mobile-belt-entry.png` | belt-entry | Nothing of Worlds left |
| `mobile-work-placeholder-ledger.png` | `/work/placeholder-ledger` | The case-study page at 390 px: no clipped copy, no horizontal overflow |

Also, still at 390×844: run the keyboard walk of checklist item 12.

- [ ] **Step 5: Capture the still tier (reduced motion)**

Keep the viewport, add `prefers-reduced-motion: reduce` (chrome-devtools `emulate`, or Playwright's `initScript` / media override so it applies before the first paint), reload, and photograph at the `case2` point once at 1440×900 (`desktop-still.png`) and once at 390×844 (`mobile-still.png`). Each must show `StillSky` (no WebGL canvas), all three cases stacked and fully visible — excerpts unclamped, stack chips and diagram shown, links in the normal tab order — sized to their content, nothing clipped, no horizontal scrollbar, label `05 / WORLDS`. The section is a fixed 450vh on every tier, so check that scrolling on lands on the Belt label (`#belt` top within a pixel of the viewport top when `scrollY / max` = Belt's start). **Stress once:** set one case's three markdown sections to 6000 characters through `/admin` (restore afterwards), reload with reduced motion at 390×844, and record whether the stacked cases overflow `#belt`; put the result in the worklog's `### Next`.

- [ ] **Step 6: Read the FPS probe and take the in-chapter readings**

```bash
cd /Users/admin/Codes-2/portfolio && grep '"quality.probe"' logs/client.jsonl | tail -3
```
Record `fps`, `from`, `to` in `worklog.md` (Task 9) as **baseline tier held through Launch** — the probe samples during Launch and cannot see chapter 05. Then take the two in-chapter readings the probe cannot: with this sampler running in `evaluate_script`, (a) **first entry** — reload, let Ignition finish, then scroll from approach-prejump through Orbit into Worlds over ~6 s, and (b) **steady state** — scroll case 1 → case 3 over ~5 s a second time:

```js
// rAF frame-time sampler: run it, scroll, then read window.__frames.
window.__frames = [];
(() => {
  let last = performance.now();
  const tick = (now) => { window.__frames.push(now - last); last = now; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();
// afterwards:
(() => {
  const f = [...window.__frames].sort((a, b) => a - b);
  return { n: f.length, median: f[Math.floor(f.length / 2)], p95: f[Math.floor(f.length * 0.95)], max: f[f.length - 1] };
})()
```
Take them at desktop and again with 4× CPU throttle plus mobile `emulate`. **Mount cost of the precompile.** `renderer.compile` now runs synchronously inside `SceneRoot`'s effect; on a repeat visit (Ignition skipped) nothing hides it, and on a mid device it can be a block of 100+ ms before the first frame. Measure canvas-added → first-frame at 4× throttle on a repeat visit, before and after the precompile: install this before the page loads (Playwright `addInitScript` / chrome-devtools `evaluateOnNewDocument`), reload, then read `window.__mount`:

```js
window.__mount = { longTasks: [] };
new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__mount.longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true });
new MutationObserver((records, obs) => {
  for (const r of records) for (const n of r.addedNodes) {
    if (n.id === "voyage-canvas") {
      window.__mount.canvasAt = performance.now();
      requestAnimationFrame(() => requestAnimationFrame(() => { window.__mount.firstFrame = performance.now() - window.__mount.canvasAt; obs.disconnect(); }));
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });
```

Run it once as shipped (`__mount.firstFrame` and the longest long task), and once with the `renderer.compile(scene, camera)` line temporarily commented out in `SceneRoot.tsx` (**never commit that**; restore it). The difference is the mount cost the precompile buys against the first-entry hitch; put both numbers in the worklog. A first-frame block over ~150 ms at 4× throttle is a finding for `### Next` (async `compileAsync` is the alternative). Compare with slice 4 (first entry into Orbit **before** the precompile: 23.7 ms median / p95 40 ms at 4× throttle; steady-state Orbit 10.1 ms median). **Expected:** first entry into Orbit and into Worlds no worse than steady state plus noise (the `renderer.compile` in `SceneRoot` is what is being measured); steady state ≤ 16.7 ms median at desktop. A first-entry spike that survives the precompile is a finding for the worklog's `### Next` (slice 8 owns Lighthouse / perf proper).

- [ ] **Step 7: Work the checklist**

Against the captures and the live page, write down a verdict (pass / retune + what) for each, ticking the bullets individually:
- [ ] **1. The planets read as planets.** A lit sphere with visible noise (not a flat grey disc), a *narrow* amber terminator band on the star-facing limb, a night side dark but not pure black. Retune `PLANET_NIGHT_FLOOR` (0.12; higher = more readable noise on the unlit face), the fBm frequency / `tone` smoothstep in `FRAG`, and the terminator width (`0.075`) / strength (`0.55`). The terminator is the **only** amber outside the star: if it reads as a second sun, narrow or dim it.
- [ ] **2. Each feature reads, distinctively.** `ring`: a thin tilted grey ring, far half passing behind the sphere, **not touching the star's halo at 1440** (retune `PLANET_RING_INNER` 1.4 / `PLANET_RING_OUTER` 1.75 / `PLANET_RING_OPACITY` 0.4 / `PLANET_RING_INCLINE` / `PLANET_RING_ROLL`); `moon`: a small lit sphere on a visible, slow orbit (`MOON_SPEED`), **never crossing the star** over a full orbit (watch ≥ 20 s: `MOON_ORBIT` 2.1 / `MOON_ROLL` 72° exist for this); `storm`: the latitude band is bright and turbulent enough to read on the dark face (`uStorm` terms in `FRAG`).
- [ ] **3. Composition against the star and the panel.** Planet centre-right, star disc clear of the planet and of the panel at **1440×900** (panel right edge ≈ 722 px, star centre ≈ 790–805 px, planet centre ≈ 1008 px), **1024×768** (512 / ≈ 575 / ≈ 717 px) and **390×844** (planet centred below the star, below the panel). If the planet crowds the star at 4:3, raise `PLANET_TARGET_LANDSCAPE.x` (0.40 is the pinned floor: the test requires ≥ 0.4 — change the assertion deliberately if you go below it). At 1024×768 the stacked-column panel is ≈ 624 px of 768: if it feels too tall or touches the dock, reduce the 768–1099 px clamp (4 lines) or its type size in `voyage.css`.
- [ ] **4. One panel at a time, cleanly.** At every rest frame exactly one panel is visible; the cross-fade on a boundary is the CSS transition (never two panels resting); the planet swaps in the same stretch (planets cross-fade over `CASE_TRAVEL` of a slot; the panel switches at its midpoint). Scrub slowly through each boundary, and look at the `desktop-case1-to-2.png` transition frame: **no garbled overlap** — two three-column panels share one grid cell for ~0.3 s (`[data-solo-off]` drops the outgoing panel's blur at once and the incoming one gains it at opacity 0); if the frame is an unreadable smear, give the incoming panel's opacity a short `transition-delay` and keep the outgoing one's at 0 (and re-pin it in `voyageCss.test.ts`); otherwise leave the CSS alone.
- [ ] **5. Nav arrival lands on a complete frame.** The Dock's "Work" link, the flight-rail Worlds tick and the "Back to the voyage" link all arrive at `start + 0.001` (chapterProgress ≈ 0.0036): panel 1 is lit by its 0/1 target **and the planet is eased in by `dt`** (`PLANET_FADE_IN_RATE` 8: ≥ 95 % within 0.5 s), so a screenshot ≈ 0.6 s after the click shows planet 1 beside the star with no scrolling. Check all three entry points and both viewports; the planet must also fade out at once when you scroll back above the chapter. If the ease feels slow or snappy, retune `PLANET_FADE_IN_RATE` (the test pins ≥ 95 % within 0.5 s at 60 fps and at 30 fps).
- [ ] **6. The slice-3/4 frames are unchanged where they must be.** Compare the five regression captures against the slice-4 baselines: star diameter and DIST identical (the star clock, A1). The HUD / chrome that *did* move, as accepted in the map: the flight-rail ticks (Approach 6.15 %, Orbit 16.92 %, Worlds 35.38 %, Belt 63.08 %, Pilot 80.00 %), the nav-arrival depth (1.625vh into a chapter). Inside Worlds the star grows at half the old rate per vh: check it does not look like it stalls.
- [ ] **7. `/work/placeholder-*` at desktop and mobile.** The page reads end to end with the three placeholders (and the uploaded diagram on the ledger case); no clipped copy at 390 px; both "← Back to the voyage" links present. No redesign of the page is in scope — only a break found here is fixed.
- [ ] **8. The back link lands on Worlds.** **Pass condition, stated exactly:** after 2 s, `window.scrollY / (scrollHeight − innerHeight)` reads **0.35484** (Worlds' start + 0.001) — *not* 0.35385 (the section top, which is where the browser's own fragment scroll would put it) — panel 1 is lit (`--solo: 1`), planet 1 is fully up, and there was no letterbox beat and no visible scroll tween. Run it from `/work/placeholder-ledger` by clicking "← Back to the voyage" (top and bottom links; a client-side navigation), then by a **hard load** of `/voyage#worlds` (type the URL after `about:blank`; this one can lose a race to the browser's late fragment scroll) and a reload at `#worlds`, at 1440 and at 390. The plan-verification run passed the click and the hard load at 1440. **If the hard load fails** (it reads 0.35385 or panel 1 is dark): add `history.replaceState(null, "", location.pathname + location.search)` inside `useHashArrival`'s effect right after the `scrollTo` call (so the browser has no fragment left to re-apply), re-run, and add a test asserting the hash is cleared. Browser **Back** from `/work` restoring a scroll position is a known, separate, pre-existing limit (Deferred).
- [ ] **9. The link is never clipped; the excerpts give way.** On every `.world-panel` at **390×844, 390×740 and 375×667** (and 1440 / 1024): `link.getBoundingClientRect().bottom <= panel.getBoundingClientRect().bottom` (run it for all three cases; it is the only route to `/work/<slug>`), the title is at most two lines, and on the desktop layouts nothing is clipped (`scrollHeight === clientHeight`). On a short phone the **excerpt block** (`.world-panel__cols`) clips at its bottom edge — expected, record how much (the plan-verification run: 23 px at 390×740, 48 px at 375×667). If a real, longer title or context pushes the link out anyway, the phone type scale in `voyage.css` is the knob (do not raise the `min(34vh, 18rem)` cap, which keeps the star clear).
- [ ] **10. No judder, and the precompile pays off.** The FPS readings from Step 6 against slice 4's numbers. First suspects if steady state is slow: the panel `backdrop-filter` (inspect `getComputedStyle(panel).backdropFilter` on a `[data-solo-off]` panel — it must be `none`), then the planets' fragment cost: 4 fBm calls per fragment (three warp + one tone, four octaves each) for ring, moon and plain planets and 7 for the storm planet (its extra three sit behind a uniform branch, `if (uStorm > 0.5)`), over ≈ 24 % of the viewport height each; cap the warp octaves on `mid` if needed.
- [ ] **11. Console clean.** `list_console_messages` → zero errors and zero warnings from app code over a full scroll (the pre-existing favicon 404 and the two `<link rel=preload>` type warnings are not this slice). A `THREE.WebGLProgram` error here means a typo in `Planet.ts`'s GLSL.
- [ ] **12. Tab stops and focus.** Exactly one `.world-panel__link` has `tabindex="0"` at each rest frame inside the hold, none outside Worlds, none on the last link after the pin has released (desktop past cp 0.778, phone past 0.858); the focus ring is visible on the link; the still tier leaves every link in the natural tab order. **Keyboard-only walk** (no mouse): focus the Dock's "Work" link and press Enter (the arrival lands on Worlds), then `Tab` until a Worlds link is focused — it must be case 1's link with a visible ring; press Space / ArrowDown to scroll to case 2: case 1's link must **lose focus** (`document.activeElement` is not inside the now-dark panel) and `Tab` must reach case 2's link, never a hidden one. Also record the accepted limit: `Tab` from an Orbit panel **skips Worlds entirely** until the scroll position is inside it (every Worlds link is `tabindex -1` outside its hold) — the same design as `Process`; reaching a Worlds link by keyboard needs the Dock or a scroll first.
- [ ] **13. Edge data** (through `/admin`, restoring exactly what you changed): unpublish all three cases → the section stays 450vh with the label and "Case studies are being written up.", no planets, no panels, the camera fly-by still plays; one case → one panel, one planet, lit from the first pixel to the pin release; two cases → half the window each; a case with no stack, no diagram, no client and one empty section renders without gaps or empty headings.
- [ ] **14. Reduced motion / still tier** (Step 5) legible and complete.

- [ ] **Step 8: Commit the captures, then any tuning separately**

```bash
cd /Users/admin/Codes-2/portfolio
git add screenshots/voyage/slice-5
git commit -m "$(cat <<'EOF'
chore(voyage): slice 5 screenshot baselines

Desktop 1440x900 and mobile 390x844 at Worlds entry, each of the three cases in
frame, a transition frame, pin release and Belt entry, a 1024x768 case, the
/work/placeholder-ledger page at both sizes, both still-tier layouts, and the
slice 3-4 regression frames (approach docked, pre-jump, jump mid, orbit entry,
orbit step 4) re-shot at the 1625vh table to show the star is unchanged.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push
```

If the checklist produced tuning changes, commit them **separately** from the captures, re-capture the affected screenshots, and `git add` the tuned source files you edited plus `screenshots/voyage/slice-5`. Title each commit `fix(voyage): retune` followed by the name of the constant, with one body paragraph naming the capture that motivated it and saying what the new value does, ending with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Retuning constraints the unit tests enforce (so a change must update the assertion **deliberately**, never to make a test pass): `WORLDS_WINDOW` and `WORLDS_EDGE_FADE` (window + fade must sit inside the desktop hold 0.7778 and the fade inside the window start; the slot centres 0.155 / 0.385 / 0.615 are pinned), `PLANET_TARGET_LANDSCAPE.x` ≥ 0.4 and `PLANET_TARGET_PORTRAIT.x` = 0, `PLANET_DEPTH` / `PLANET_RADIUS` (the camera clearance ≥ `PLANET_RADIUS + 3` while visible, N ≤ 8, and the star-gap tests), `PLANET_FADE_OUT_END` (the last planet must still show at both pin releases), the `min(34vh, 18rem)` phone box, `min(40rem, 44vw)` and the CSS ordering rules in `voyageCss.test.ts`, and the golden star values (never retune the star here — it belongs to slices 3–4).

---

### Task 9: Docs + closing verification

**Files:**
- Modify: `worklog.md`, `insights.md`, `design.md`, `README.md` (the seed paragraph)
- Modify: `docs/superpowers/specs/2026-09-14-consulting-content-model-design.md:20` (stale pacing note)
- Modify: this plan's own "Execution amendments" section (record whatever the controller changed during execution and Task 8)

**Interfaces:**
- Consumes: everything Tasks 1–8 produced — the verification output of Step 1, Task 8's captures, FPS readings, checklist verdicts and retuned-constants list.
- Produces: the slice-5 sections of `worklog.md`, `insights.md` and `design.md`; the corrected stale pacing notes; the pushed branch. Merging is **not** part of this plan: the controller asks the user first.

- [ ] **Step 1: Run the whole verification set and capture the real numbers**

```bash
cd /Users/admin/Codes-2/portfolio
npx tsc --noEmit
npx vitest run
npx eslint .
npx eslint src/scene src/components/voyage src/components/dock src/lib src/app/voyage scripts
npm run build
```
Expected: `tsc` 0 errors. `vitest` green — **685 passed / 51 files** if no Task 8 retune touched a test (baseline at `e102143`: 516 / 41; slice 5 adds +169 tests and +10 files: `worldsSchedule.test.ts`, `planetFeature.test.ts`, `worldCase.test.ts`, `seedGuard.test.ts`, `placeholderCases.test.ts`, `Planet.test.ts`, `Worlds.test.tsx`, `chapterHash.test.ts`, `useHashArrival.test.tsx`, `shaderLog.test.ts`) — record the exact counts. `npx eslint .` still reports the **16 pre-existing problems (10 errors, 6 warnings)** in files this branch never touched (verified identical before and after the slice in the plan-verification run), and the second, targeted run reports **0 errors** (only the two pre-existing warnings in `src/lib/auth.ts` and `src/lib/mongodb.ts`). `npm run build` succeeds with `/voyage` and `/work/[slug]` in the route table.

- [ ] **Step 2: Append the slice-5 section to `worklog.md`**

Under a new `## Slice 5 — Worlds / chapter 05 + /work/[slug] (feat/voyage-slice-5)` heading, one bullet per task (T1 table + star clock, T2 schedule, T3 excerpts + DTO, T4 placeholders + seed guard, T5 Planet, T6 Worlds + CSS, T7 wiring + hash arrival, T8 review, T9 docs), plus:
- the FPS probe values from Task 8 Step 6, labelled **baseline tier held through Launch**, and the in-chapter first-entry / steady-state readings against slice 4's (23.7 ms median / p95 40 ms first entry into Orbit, 10.1 ms steady) — i.e. whether `renderer.compile` removed the hitch — and the mount-to-first-frame cost of the compile (with and without it, 4× throttle, repeat visit);
- the Task 8 verdict on each of the 14 checklist items, in particular 1–5 (planet read, features, composition, one panel at a time, nav arrival) and 8 (the back link);
- every constant retuned in the browser review, with old and new value;
- the verification numbers from Step 1;
- a `### Next` block naming slice 6 (Belt, Dark Passage, Constellation) and carrying forward the tuned constants (`WORLDS_WINDOW` [0.04, 0.73], `WORLDS_EDGE_FADE` 0.04, `CASE_TRAVEL` 0.3, `WORLDS_SOFTEN_PEAK` 0.6, `PLANET_RADIUS` 2.5, `PLANET_DEPTH` 18, `PLANET_TARGET_LANDSCAPE` (0.40, −0.05), `PLANET_TARGET_PORTRAIT` (0, −0.45), `PLANET_FADE_OUT_END` 0.9, `PLANET_RING_*`, `MOON_*`, `PLANET_NIGHT_FLOOR` 0.12, `EXCERPT_MAX` 160, `--worlds-panel-w` `min(40rem, 44vw)`) plus the open follow-ups listed under "Deferred / carried" in this plan, the stress-test result from Task 8 Step 5, and: the placeholder case studies are in the local database only — the owner replaces them through `/admin`; flip `/voyage` and `/work` to indexable together at launch.

- [ ] **Step 3: Append the slice-5 findings to `insights.md`**

Under `## 2026-10-14 — Voyage slice 5 (Worlds)`. Write what actually happened; the findings worth keeping:
- **A longer chapter silently re-times everything keyed to absolute progress — find those consumers before changing the table.** Growing Worlds 225 → 450vh failed exactly one test loudly and shrank the star 10–21 % at Approach and Orbit without failing any: `starScale` / `distanceAU` divided *absolute* progress by The Pilot's start. The fix is to key them by `(chapter, chapterProgress)` (the star clock); the safety net is a golden table captured from the OLD tree at 17 digits *before* touching the table, keyed by chapter, so the new code is held to the old numbers.
- **Test clearance over the interval a thing is visible, not over the whole path.** The corridor after Worlds passes within ~4 units of where a planet sits, so "keep ≥ R + 3 from the camera" is false over the whole path (the map measured 1.7–4.3) and true over the planet's visible interval (11.7+ measured). `visible = false` after the fade is therefore load-bearing, and the test asserts the visible interval only.
- **Hybrid placement makes composition testable.** Placing a planet from the camera pose at its slot centre plus a camera-basis offset makes its screen position at the dwell an exact projection (tested to 6 decimals through a real `PerspectiveCamera`), and real camera motion supplies the "carried across" feel — landscape drifts right, portrait drops down, which is why the portrait test asserts y, not x.
- **A fixed-height box shared by N overlapping panels is a tuning treadmill; a one-cell grid is not.** On desktop the panels share one grid cell and the box is as tall as the tallest; only the phone needs a fixed cap.
- **A flex column that overflows a clipped box shrinks `overflow: hidden` children to nothing.** The phone panel silently lost its context line until every child got `flex-shrink: 0`. Measure `scrollHeight` vs `clientHeight` in a real browser; a screenshot of one case would not have shown a missing line.
- **A class declared later in the file wins a specificity tie.** `.cta`'s padding and font size beat `.world-panel__link` until the selector was doubled. Check the computed value, not the rule.
- **A hash arrival to an element behind a client-only boot gate cannot work natively.** `/voyage#worlds` landed at the top because `id="worlds"` only exists after `tier` resolves; neither the browser's fragment jump nor Next's post-navigation scroll can find it. The fix is a pure hash → progress function plus a one-shot, ref-guarded effect after the gate, through an immediate mode on the store's scroller (Lenis `{ immediate: true }`; native `behavior: "instant"`, because `auto` defers to the page's `scroll-behavior: smooth`). It must stay programmatic so crossing Jump fires no beat.
- **Make the effect depend on a value, not an array.** `SceneRoot`'s GL effect depends on `planetsKey(planets)` (a string) and reads `planetsFromKey(key)`: an inline array prop would rebuild the WebGL context on every `VoyageRoot` render, and keying on the string keeps `exhaustive-deps` honest. `[]` is `""` and `["none"]` is `"none"`, so an empty list never collides with a one-planet list.
- **The only way to test a shader is to compile it in a browser — a 30-line harness is enough.** `esbuild --bundle` the real `Planet` + `EnergyOrb` into one IIFE, serve it with `python3 -m http.server`, call a `window.run(w, h, k)` through the Playwright MCP, read the console and a screenshot. It caught two composition faults no unit test could (a moon eclipsing the star; a ring touching its halo) and was cheap enough to run per tweak.
- **A planet lit from behind is mostly night.** The star sits behind and to the left of every planet, so the visible face is mostly the unlit side; a night floor (`PLANET_NIGHT_FLOOR`) keeps the noise readable and the storm band gets its own faint glow. The amber terminator is the one sanctioned amber outside the star.
- **A guard that does not widen the thing it guards.** The seed guard fails closed (`mongodb+srv`, trailing-dot hosts, mixed host lists, look-alike hostnames) but covers only the new, published placeholders: the existing seed wipes five collections without any guard and still does, now documented. An existing case is validated in `"update"` mode, which writes only the keys the literal lists: a field the literal omits is never rewritten, so a defaulted one an owner edited through `/admin` (`planetFeature`, `published`) keeps its value, where create mode would reset it to the default. (`diagram` has no spec default, so it is untouched in either mode — the placeholders simply omit it; a first draft of this plan claimed create mode would reset an uploaded diagram, and a mutation test showed it would not.) The branch that decides whether published placeholders reach a database lives in a tested function (`seedPlaceholdersIfAllowed`), not inline in the script, and the refusal is announced before the pre-existing wipe, not only after it — an operator who sees `exit=1` must not believe nothing was written.
- **`renderer.compile` walks hidden objects** (`scene.traverse`, not `traverseVisible`), so hidden planets and the hidden ring compile up front; it is synchronous on purpose and wrapped so a failure is a logged event, not a throw out of an effect.
- **The plan was applied mechanically before execution.** A small applier script parsed every `Create` / `replace … with` block and every `Run:` command, applied them in order to a pristine worktree and checked the stated test counts; the resulting tree equalled the one the plan was written from. Cheap, and it removes a whole class of "anchor not found" surprises during execution.
- **A 3D fade-in that waits for scroll is a half-built arrival frame.** The panels were 0/1 triggers from slice 4 on, but the planets' fade-in was scrubbed over the first 0.04 of the chapter, so a Dock / rail / back-link arrival at `start + 0.001` showed a lit panel quoting a world that was not there (the planet was already in place and full size, 2 % opaque). The chapter-level fade-in is now a `dt`-eased follower toward a 0/1 target (≥ 95 % within 0.5 s, no overshoot on a huge `dt`, a NaN `dt` is no step); the per-planet cross-fade and the last planet's fade-out stay scrubbed because they are tied to camera position. Retuning `WORLDS_WINDOW[0]` would not have worked (it moves the pinned slot centres).
- **three reports a shader error through a hook, not an exception.** `renderer.compile()` does not throw on a GLSL compile or link error; `renderer.debug.onShaderError` (and `console.error`) is the only signal, so a try/catch alone logs almost nothing. `SceneRoot` sets the hook and logs a truncated info log through the allow-listed `scene.compile_failed` event (`shaderErrorMessage`, pure and tested).
- **A fixed phone box needs one flexible child, and it must not be the call to action.** The first phone layout made the link the last child of a `34vh` box with fixed-rem content, so any viewport under ~740 px cut it off. `.world-panel__cols { flex: 1 1 0; min-height: 0; overflow: hidden }` makes the excerpts give way instead (measured: link inside the box at 390×844, 390×740 and 375×667).
- **Extract an effect when its behaviour is the feature.** The hash arrival is a ten-line effect whose whole job is ordering (not before the tier, once, not again after a demotion, not under StrictMode's double run); inline in `VoyageRoot` it was untestable, as a hook it has a `renderHook` suite.
- **Keyboard focus outlives opacity.** A link that turns `tabindex -1` under an opacity-0 panel stays focused and Enter still follows it; `Worlds` blurs the focused link when its panel goes inactive. `Tab` from an Orbit panel skips Worlds until the scroll position is inside it (every Worlds link is `-1` outside its hold) — the same design as `Process`; reaching Worlds by keyboard needs the Dock or a scroll first. Recorded, not changed.
- **Worlds is designed and tested for up to 8 published case studies.** Clearance is verified to N = 8 and each case gets 0.69 / N of the chapter (≈ 86vh at N = 8, ≈ 35vh at N = 20); beyond that the slots get thin and nothing enforces a cap. README says so.
- Any finding from the browser review that the bullets above do not cover — if there are none, say so explicitly.

- [ ] **Step 4: Update `design.md`**

Add a "Worlds (chapter 05, slice 5)" subsection after the Orbit subsection and correct the stale table sentence:

In `design.md`, replace:
```
(`VOYAGE_SCROLL_VH = 1400`; Orbit is 300vh)
```
with:
```
(`VOYAGE_SCROLL_VH = 1625`; Orbit is 300vh, Worlds 450vh)
```

In `design.md`, replace:
```
## Routes
```
with:
```markdown
### Worlds (chapter 05, slice 5)

**Chapter table and the star clock.** Worlds is 450vh (`VOYAGE_SCROLL_VH = 1625`). `starScale` and `distanceAU` are keyed by `starClock(progress)`, which counts every chapter at its slice-4 length (Worlds as 225vh), so the star and the DIST readout are identical to slices 3–4 everywhere outside Worlds (pinned by golden values) and grow at half the old rate per vh inside it. Rail ticks, `PROGRAMMATIC_EPS` and the `+0.001` arrivals simply follow the new table.

**One clock.** `src/scene/chapters/worldsSchedule.ts` (pure) mirrors `orbitSchedule.ts` and is read by `Worlds`, `Planet` and `Starfield`: `WORLDS_WINDOW = [0.04, 0.73]` sized to the desktop pin's hold (450 − 100 = 350vh = cp 0 … 0.7778; the phone's 64vh pin holds to 0.858), `worldsPresence` (planets' fade-in, starfield pull), `worldsCursor(cp, n)` (dwells on whole case indices, travels over `CASE_TRAVEL` of a slot), `caseTarget(i, n, cp)` (the panels' 0/1 input) and `caseCentre(i, n)` (where a planet is placed).

**Data path.** `page.tsx` → `getVoyageContent().caseStudies` → `toWorldCase` (server) → `VoyageRoot` (`worlds`) → `<Worlds cases animated>` and `worlds.map(planetFeature)` → `SceneRoot.planets` → `new Planet(planetsFromKey(planetsKey(planets)))`. The client only ever receives the slim `WorldCase` (three `caseExcerpt` excerpts of ~160 characters in place of up to 18 000 characters of markdown). `PlanetFeature` lives in a pure `src/lib/planetFeature.ts` shared by server and scene.

**Panels.** One glass panel at a time (desktop: left, `--worlds-panel-w: min(40rem, 44vw)`, all panels in one grid cell; phone: a capped `min(34vh, 18rem)` box under the dock). `--solo` is a 0/1 target and a CSS transition is the cross-fade. Panels are `overflow: hidden` with line-clamped excerpts, so the link is each panel's only tab stop and follows the pin hold. Still tier: every case stacked and fully visible. Zero cases: the label and one quiet line.

**Planets.** `Planet` is one set piece owning N planets: a sphere with a 3D value-noise fBm surface shader (the nebula's constants and domain warp, object-space noise, per-planet seed), lit by the direction to the star with a dark night side and a narrow amber terminator band, plus a feature (`ring`, `moon`, `storm`, `none`). Placement is `planetPosition`: camera pose at the slot centre + camera basis × an NDC offset at `PLANET_DEPTH`, so each planet projects exactly onto its target while its case is read; positions are recomputed only on an aspect change. Opacity is `shown × planetFadeOut × planetWeight(cursor)`: `shown` is a `dt`-eased follower toward a 0/1 target (a Dock / rail / back-link arrival at `start + 0.001` shows the planet within 0.5 s — the same trigger-not-scrub rule as the panels), while the per-planet cross-fade and the last planet's fade-out (to 0.9, so a phone's longer pin still shows it) follow scroll.

**`/voyage#<chapter>`.** `chapterForHash` / `hashArrivalProgress` (pure) plus a one-shot effect in `VoyageRoot` jump to `chapter.start + 0.001` once the tier resolves, through `voyageStore.scrollTo(p, { immediate: true })`; this is what makes "Back to the voyage" on `/work/[slug]` land on Worlds.

**Seed.** `scripts/seed.ts` seeds three published `placeholder-*` case studies through `seedPlaceholderCases` (idempotent by slug), only when `canSeedPlaceholders(MONGODB_URI, argv)` (local host, or `--placeholders`).

## Routes
```

- [ ] **Step 5: Correct the stale pacing note**

In `docs/superpowers/specs/2026-09-14-consulting-content-model-design.md`, replace:
```
| Pacing (carried over) | `VOYAGE_SCROLL_VH = 1400` (was 1250, tuned 2026-09-14, commit ea5944e; Orbit grew 150 → 300vh in slice 4 — spans are now declared in vh in `flightPath.ts`). |
```
with:
```
| Pacing (carried over) | `VOYAGE_SCROLL_VH = 1625` (was 1250, tuned 2026-09-14, commit ea5944e; Orbit grew 150 → 300vh in slice 4 and Worlds 225 → 450vh in slice 5 — spans are declared in vh in `flightPath.ts`). |
```

- [ ] **Step 6: Update the README's seed paragraph**

`README.md` is where the software documentation lives, and its seed comment still says the seed makes "projects, skills, settings, 3 services and 4 process steps".

In `README.md`, replace:
```
# Seed: projects, skills, settings, 3 services and 4 process steps.
# Clears projects/skills/settings/services/process steps; case studies,
# testimonials and inquiries are never touched.
```
with:
```
# Seed: projects, skills, settings, 3 services, 4 process steps and 3 PUBLISHED
# placeholder case studies (ring / moon / storm planets, slugs `placeholder-*`).
# Clears projects/skills/settings/services/process steps (always unguarded);
# case studies, testimonials and inquiries are never wiped. The placeholders are
# only written to a local database (localhost / 127.0.0.1 / [::1]) or with
# `--placeholders`; against anything else the run logs a refusal to
# logs/seed.jsonl, skips them, and still seeds the rest but exits non-zero.
```

In `README.md`, replace:
```
Restart `npm run dev` after editing a Mongoose schema — the cached model is not recompiled by hot reload and new fields are silently dropped until a restart.
```
with:
```
Restart `npm run dev` after editing a Mongoose schema — the cached model is not recompiled by hot reload and new fields are silently dropped until a restart.

**Worlds (chapter 05).** One planet and one panel per *published* case study, in CMS order. Replace the three `placeholder-*` cases through `/admin` (a diagram uploaded there shows as a thumbnail on desktop). Worlds is designed and tested for up to **8 published case studies**; each gets 0.69 / N of the chapter's scroll, so beyond that the slots get thin and nothing enforces a cap. With none published the chapter shows its label and "Case studies are being written up."
```

- [ ] **Step 7: Check the slice against spec §8 and spec §3 row 05**

Confirm and record in `worklog.md`, for chapter 05 only:
| Criterion | How to confirm |
|---|---|
| Reachable and legible on desktop and mobile | Task 8 captures (three cases at both sizes, a 1024×768 case), no clipped copy (`scrollHeight === clientHeight` on every panel), `document.documentElement.scrollWidth === 390` at 390×844 |
| Exactly one WebGL context for the scene | `Planet` joined `SceneRoot`'s `pieces` array; `grep -rn "new THREE.WebGLRenderer" src` shows only `SceneRoot.tsx` for `/voyage` (plus the pre-existing `ThreeBackground`, `/` only); no `EffectComposer`, no `Line2` |
| ≥ 45 fps mid-tier phone / ≥ 55 fps desktop `high` | Baseline tier held through Launch (Task 8 Step 6) plus the in-chapter first-entry and steady-state readings; real-phone fps and Lighthouse are slice 8's |
| Zero console errors | Task 8 checklist item 11 |
| Reduced-motion path fully usable | `still` tier renders `StillSky`; `Worlds` sets `data-static`, drops the pin, stacks every case with its diagram and links inside the fixed 450vh section (Task 8 Step 5) |
| Spec §3 row 05 content | a world per case study with a feature (ring / moon / storm) distinguishing it (items 1–2), camera fly-by carrying each planet across the frame (items 3–4), each panel showing client · context, Problem / Architecture / Outcome excerpts, stack chips, a diagram thumbnail and a link to `/work/<slug>` (T6), the `/work` page reviewed at both sizes and its back link landing on Worlds (items 7–8) |
| Spec §5 `/work/[slug]` | reviewed with the placeholders; the back link fixed in this slice; no redesign |
Anything that fails goes into `### Next` as a named follow-up, not into a silent pass.

- [ ] **Step 8: Record the execution amendments in this plan**

Fill the (currently empty) "Execution amendments" section near the top of this file with one bullet per deviation the controller accepted during execution or Task 8 (retuned constants, any task that needed a fix pass, anything a reviewer changed, the suite counts after each task), in the format slice 4's plan used (`**Task N:** …`). If nothing deviated, write `None.` explicitly.

- [ ] **Step 9: Commit and push**

```bash
cd /Users/admin/Codes-2/portfolio
git add worklog.md insights.md design.md README.md docs/superpowers/specs/2026-09-14-consulting-content-model-design.md docs/superpowers/plans/2026-10-14-voyage-slice-5.md
git commit -m "$(cat <<'EOF'
docs(voyage): slice 5 worklog, insights and architecture notes

Worlds / chapter 05 and /work/[slug]: per-task record, browser-review verdicts and
retuned constants, the star clock and the shared worlds schedule, the planet set
piece, the /voyage#<chapter> arrival, and the spec section 8 check for chapter 05.
Corrects the stale 1400 pacing notes and the README seed paragraph (placeholders,
the guard, the 8-case design range).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push
```
Then ask the user before merging (slice 4 is also still unmerged by the user's choice; slice 5 branches from it).

---

## Self-review

**1. Spec coverage — `docs/superpowers/specs/2026-10-14-voyage-slice-5-worlds-design.md`.**

| Spec requirement | Where |
|---|---|
| §1 D1 seed 3 placeholders (one per feature) | Task 4 (`PLACEHOLDER_CASES`: ring / moon / storm, published, `placeholder-` slugs and titles) |
| §1 D2 Worlds 450vh, `VOYAGE_SCROLL_VH` 1625, other spans unchanged | Task 1 (`declares its spans` test pins every span) |
| §1 D3 auto-excerpt, server-side, ~160 chars, no schema change | Task 3 (`caseExcerpt`, `toWorldCase`, `page.tsx` maps on the server) |
| §1 D4 zero cases: label + one quiet line, no planets, section keeps 450vh | Task 6 (`Worlds` empty state, tested) and Task 5 (`Planet` builds nothing for `[]`) |
| §1 D5 hybrid placement | Task 5 (`planetPosition`, tested to 6 decimals through a real camera) |
| §1 D6 trigger, not scrub | Tasks 2 + 6 (`caseTarget` 0/1 → `--solo`, CSS transition, `voyageCss` pins) |
| §2 chapter table, exact boundaries | Task 1 (contiguity / `sectionHeightVh` tests already in the suite run on the new table) |
| §2 pin holds, `worldsSchedule` (holds derived, window inside the desktop hold, cursor, targets, presence) | Task 2 (window **`[0.04, 0.73]`** per A2, not the spec's ≈ 0.74 — the draft would not fit) |
| §2 map-phase risk: absolute-progress consumers | Task 1 (A1 star clock re-keys `starScale` / `distanceAU`; the rest accepted, listed in Decision 2) |
| §3 `Planet` set piece (one piece, N planets, `TierSettings.planetSegments`, shader with attribution, ring / moon / storm / none, placement, aspect recompute, fades — the chapter-level fade-in a `dt`-eased trigger per the controller's ruling B-I2 —, still builds nothing) | Task 5 |
| §3 `SceneRoot` receives planets, GL effect depends on them, `renderer.compile` | Task 7 (stable key per A7; sync compile per A12, with `renderer.debug.onShaderError` → `scene.compile_failed` through the tested `shaderErrorMessage`, and a try/catch around the call) |
| §3 starfield focus pull | Task 7 (`worldsSoften`, `chapterSoften`) |
| §3 bank 0 through Worlds | nothing to build: `bankForProgress` is already 0 outside Orbit (map §3); the existing "0 in every chapter but Orbit" test covers Worlds |
| §4 data path, slim `WorldCase`, leaf narrowing | Tasks 3 + 6 |
| §4 desktop panel (**`min(40rem, 44vw)`** per A3), content, link to `/work/[slug]`, accessibility (every panel in the tree, only the active link focusable, hold-aware), phone box (**A4**), still tier, zero cases | Task 6 |
| §5 placeholder seed, upsert by slug, guard (`localhost` / `127.0.0.1` / `[::1]` or `--placeholders`) | Task 4 (the decision is the tested `seedPlaceholdersIfAllowed`; Decision 11 records that the refusal covers the case studies, not the pre-existing wipe, and is announced before it) |
| §5 diagram thumbnail exercised by an `/admin` upload | Task 8 Prerequisites + `desktop-case1-diagram.png` |
| §5 `/work/[slug]` reviewed at desktop and mobile; back link must land on Worlds, fix in this slice if broken | Task 7 (hash arrival — it *was* broken — as the tested `useHashArrival` hook) + Task 8 items 7–8 |
| §6 error handling (no cases; unknown feature → none; missing diagram → no thumbnail; empty section → no column; seed refusal; WebGL loss → `still`) | Tasks 5, 6, 4; WebGL loss is the existing `onContextLost` path |
| §7 testing: unit (schedule sweeps, `caseExcerpt` edge cases, `Planet` placement / separation / clearance / motion / fades / features / aspect / lifecycle, table, tiers, seed guard), component (`Worlds`), CSS pins | Tasks 1–7 |
| §7 browser review (1440×900, 1024×768, 390×844, still; regression frames; frame timing; console; `/work/placeholder-*`; back link) | Task 8 |
| §8 process | the execution handoff below; Task 9 |
| §9 out of scope | not touched; listed under "Deferred / carried" |

**1b. Plan-review fixes.** Two independent plan reviews (`.superpowers/sdd/slice5-plan-review-A.md` and `-B.md`) were applied under the controller's rulings: the planets' fade-in as a `dt`-eased trigger, the star-gap sweep across whole slots, `onShaderError` logging, the attribution wording, the storm uniform branch, full dispose coverage, the planet-equals-panel invariant, the phone box that clips excerpts and never the link (re-verified live at 390×844, 390×740 and 375×667), the pinned CSS rules, focus blur, bounded stack chips, the `useHashArrival` hook, `seedPlaceholdersIfAllowed`, the pre-wipe refusal notice, the reworded update-mode rationale, the README seed paragraph, push after every task, model pinning, one-decimal HUD strings, and the extra T8 captures and measurements.

**2. Placeholder scan.** Every code step carries complete code: new files in full, every edit as an exact find-and-replace pair whose anchor is unique at the point the step runs (the blocks were generated from the diff of the verified tree, so they cannot drift from it). The plan was mechanically verified: a script applied every `Create` / `replace … with` block of Tasks 1–7 and the Task 9 documentation edits, in order, to a pristine copy of the `e102143` tree and ran every `Run:` command and commit block; the resulting tree equals the one the plan was written from, and the stated test counts, `tsc` and eslint results are the observed ones. The only values left to the controller's eyes are the ones no test can see — the shader's appearance on the real page, the planets' composition, the panel's real layout, the frame cost — and those are named, exported tunables with a stated owner (Task 8), not placeholders. Tasks 9's `worklog.md` / `insights.md` text depends on the review's outcome and is specified as a list of required findings to write up, as in slice 4.

**2b. Test counts.** RED counts observed: Task 1 `4 failed | 32 passed (36)`, Task 2 module-missing, Task 3 `15 failed | 17 passed (32)` then module-missing, Task 4 module-missing ×2, Task 5 `1 failed | 11 passed (12)` then module-missing, Task 6 module-missing then `13 failed | 9 passed (22)`, Task 7 `4 failed | 18 passed (22)`, then `2 failed | 34 passed (36)` plus a module-missing file, then module-missing ×2. New tests per task: T1 4, T2 24, T3 22 (15 + 2 + 5), T4 20 (6 + 14), T5 40, T6 33 (20 + 13), T7 26 (3 + 3 + 1 + 7 + 7 + 5) — **+169** in all (516 → 685), **+10 files** (41 → 51).

**3. Type consistency.** Names used identically across every task and Interfaces block: `VOYAGE_SCROLL_VH` (1625) · `starClock` · `starScale` · `distanceAU` · `WORLDS_HOLD_DESKTOP` / `WORLDS_HOLD_MOBILE` · `WORLDS_WINDOW` · `WORLDS_EDGE_FADE` · `WORLDS_PRESENCE_END` · `CASE_TRAVEL` · `worldsPresence` · `worldsCursor` · `caseTarget` · `caseCentre` · `caseExcerpt` · `EXCERPT_MAX` · `PlanetFeature` · `toPlanetFeature` · `WorldCase` · `toWorldCase` · `VoyageRoot`'s `worlds` prop · `canSeedPlaceholders` · `PLACEHOLDERS_FLAG` · `PLACEHOLDER_CASES` · `seedPlaceholderCases` · `seedPlaceholdersIfAllowed` · `PlaceholderSeedOutcome` · `CaseStore` · `TierSettings.planetSegments` · `Planet(features)` · `PlanetView` · `planetTarget` · `planetPosition` · `planetPresenceTarget` · `planetFadeOut` · `planetWeight` · `planetOpacity` · `PLANET_FADE_IN_RATE` · `planetsKey` / `planetsFromKey` · `PLANET_*` / `MOON_*` tunables · `Worlds({ cases, animated })` · DOM `#worlds`, `.worlds`, `.world-panel`, `--solo`, `data-solo-off`, `data-static`, `.worlds-empty` · CSS `--worlds-panel-w` · `WORLDS_SOFTEN_PEAK` · `worldsSoften` · `chapterSoften` · `scrollTo(p, { immediate })` · `chapterForHash` / `hashArrivalProgress` / `HASH_ARRIVAL_EPS` · `useHashArrival` · `shaderErrorMessage` / `SHADER_LOG_MAX` · `scene.compile_failed` · `SceneRoot.planets`.

## Execution handoff

Plan complete. Two execution options: **(1) Subagent-driven (recommended)** — a fresh subagent per task in the wave order above (**pin the model explicitly on every Agent dispatch**: `model: "sonnet"` for implementers and reviewers, `model: "haiku"` for test-only chores; never Fable), an independent Sonnet reviewer after each, Task 1 alone, Waves 1 and 2 in parallel worktrees merged one at a time with the suite green after each merge, Task 7 alone, the controller running Tasks 8 and 9 personally and looking at every screenshot; **(2) inline execution** with the executing-plans skill, batching Wave 1 and Wave 2.
