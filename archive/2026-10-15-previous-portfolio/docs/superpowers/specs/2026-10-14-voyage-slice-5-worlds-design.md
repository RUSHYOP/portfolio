# Voyage slice 5 — Worlds (chapter 05) + `/work/[slug]` — design

Date: 2026-10-14 · Branch: `feat/voyage-slice-5` (from `feat/voyage-slice-4`, which is complete but unmerged by user choice) · Parent spec: `2026-09-14-voyage-redesign-design.md` §3 row 05, §5, §6 step 5.

## 1. Decisions (user, 2026-10-14 brainstorm)

| # | Question | Decision |
|---|---|---|
| D1 | What Worlds is built and reviewed against | **Seed 3 placeholder case studies** (one per planet feature: ring, moon, storm). The user replaces them through `/admin`. |
| D2 | Chapter length | **Worlds 225 → 450vh**; `VOYAGE_SCROLL_VH` 1400 → 1625; every other chapter keeps its span. |
| D3 | The three short column texts on a panel | **Auto-excerpt**, no schema change: server-side, first paragraph of each markdown section as plain text, cut at a word boundary (~160 chars) with an ellipsis. Full text stays on `/work/[slug]`. |
| D4 | Zero published cases | **Label + one quiet line** ("Case studies are being written up."), no planets, section keeps its 450vh; the camera fly-by still plays. The spec §5 "hide the chapter and drop its waypoint" rule stays unimplemented (as for Services and Process). |
| D5 | Planet placement | **Hybrid (approach C):** each planet is placed in world space from the camera pose at the centre of its case slot plus a camera-space offset, so it sits at an exact, testable screen target while its panel is read, and real camera motion carries it in and out (left → right across the frame). |
| D6 | Panel behaviour | **Trigger, not scrub** (standing rule since slice 4): scroll picks a 0/1 target per panel; a CSS transition animates it. 3D (planets, starfield) may stay scroll-scrubbed. |

## 2. Geometry and schedule

- **Chapter table** (`flightPath.ts`): `worlds.spanVh` 225 → 450, `VOYAGE_SCROLL_VH` 1400 → 1625. Spans stay multiples of 12.5vh (1625 = 130 × 12.5), so the cumulative construction keeps every boundary bit-exact. All tests and captures name positions with `progressAt(id, t)`.
- **Pin holds.** Desktop pin 100vh → stationary for 350vh = chapterProgress 0 … 0.7778. Mobile pin 64vh → 386vh = cp 0 … 0.8578.
- **`src/scene/chapters/worldsSchedule.ts`** — pure (no React / three / DOM), the single clock for `Worlds`, `Planet` and the starfield pull, sized to the smaller (desktop) hold:
  - `WORLDS_HOLD_DESKTOP`, `WORLDS_HOLD_MOBILE` derived from the span and the pin heights (not typed).
  - `WORLDS_WINDOW ≈ [0.04, 0.74]` (exact values set in the plan, guarded by a test that the window plus its edge fade sits inside the desktop hold); N cases share it in equal slots (≈ 105vh per case at N = 3).
  - `worldsCursor(cp, n)` — continuous case index in `[0, n−1]`, dwelling on integers and travelling only across a short stretch centred on each slot boundary (same shape as `orbitCursor`).
  - `caseTarget(i, n, cp)` — 0/1: all dark at cp 0; case 0 lit from the chapter's first pixel (dock / rail arrivals land at `start + 0.001`); lit case = `Math.round(worldsCursor)`; the last case stays lit until the pin releases.
  - `worldsPresence(cp)` — 0 → 1 → 0 envelope for the planets' chapter-level fade and the starfield focus pull.
- **Map-phase risk to measure before the plan:** anything keyed to *absolute* progress shifts when the table grows — the star-scale curve, `distanceAU` / the DIST readout, rail tick positions, the dock compact threshold. Approach/Jump/Orbit could render a slightly different star size than their slice-3/4 baselines. The map quantifies every absolute-progress consumer and the plan decides, per consumer, whether to accept the shift or re-key it by chapter.

## 3. The `Planet` set piece (`src/scene/chapters/Planet.ts`)

- Joins `SceneRoot`'s `pieces`. `SceneRoot` receives `planets: PlanetFeature[]` (one per published case, in CMS order) in place of a bare count; the GL rebuild effect depends on it. `still` builds nothing.
- **Surface:** `SphereGeometry` (segments from `TierSettings`, e.g. high 64 / mid 32 / still 0) with a `ShaderMaterial`: monochrome fBm nebula noise ported from the `julian-vance-nebula` source (MIT attribution header, re-implemented against three@0.169), a per-planet seed so no two surfaces match; lit by the direction to `STAR_POSITION` — dark night side and a narrow **amber terminator** band (amber stays the star's colour everywhere else).
- **Distinguishing feature** (`planetFeature`): `ring` — thin tilted additive grey ring; `moon` — small sphere on a slow orbit around its planet; `storm` — brighter, more turbulent latitude band in the surface shader; `none` — plain.
- **Placement (D5):** for planet *k*, `pose = getCameraPose(progressAt("worlds", slotCentre_k))`; position = `pose.position` + the camera basis at that pose × a camera-space offset derived from an NDC screen target and a depth. Desktop target: centre-right, clear of the left panel, in front of the star; portrait target: centred below the panel. Positions are recomputed when the camera's aspect changes (N vector ops, no rebuild). Exported tunables: `PLANET_RADIUS`, `PLANET_DEPTH`, `PLANET_TARGET_LANDSCAPE`, `PLANET_TARGET_PORTRAIT`, feature parameters.
- **Visibility:** per-planet fade around its own slot (scroll-scrubbed) × `worldsPresence`, so a distant next world does not clutter the frame. Starfield focus pull during the window, dispatched beside `approachSoften` / `orbitSoften`.
- **Shader precompile:** after the pieces are built, `SceneRoot` calls `renderer.compile(scene, camera)` so every program compiles up front — removes the slice-4 first-entry hitch in Orbit (23.7 ms median / p95 40 ms at 4× throttle) and prevents a new one in Worlds.
- Bank is 0 throughout Worlds (Orbit's bank has returned to level by Worlds' start).

## 4. The Worlds panels (`src/components/voyage/Worlds.tsx`)

- **Data path:** `page.tsx` → `getVoyageContent().caseStudies` → mapped server-side to a slim `WorldCase` `{ id, slug, title, client, context, stack, diagram, planetFeature, excerpts: { problem, architecture, outcome } }` → `VoyageRoot` → `<Worlds cases animated>` and `SceneRoot.planets`. `caseExcerpt(markdown, 160)` lives server-side (beside `renderMarkdown`); the client never receives the full markdown (≤ 3 × 6000 chars per case), which also shrinks the `/voyage` payload. Every field is narrowed at the leaf, as in `Services` / `Process`.
- **Desktop:** one glass panel at a time on the left (`--worlds-panel-w ≈ min(46rem, 52vw)`), planets centre-right. Content: mono `CASE 01`, title (`<h2>`, omitted when empty), client · context line, three columns — Problem / Architecture / Outcome — with mono labels over the excerpts, stack chips, a small diagram thumbnail when present, and **Read the case study →** (`next/link` to `/work/[slug]`). Panels overlap in one box; `caseTarget` → `--solo`; the CSS transition is the cross-fade; hidden panels drop their blur and pointer events (`data-solo-off`).
- **Accessibility:** every panel stays in the accessibility tree; only the active panel's link is keyboard-focusable (inactive links `tabIndex −1`); visible focus ring. Worlds panels are **not** scroll containers (`overflow: hidden`; the excerpts are bounded by D3's cut and a CSS line clamp), so unlike `Process` they need no panel tab stop — the link is the only one, and its focusability follows the same hold rule (`useMediaQuery` picks the desktop or phone hold) so no off-screen link pulls the page back.
- **Mobile (≤ 767px):** 64vh pin, panel top-anchored full-width below the dock pill; `CASE 01`, title, context, the three excerpts stacked (each clamped to ~3 lines), one row of stack chips, the link; diagram hidden; the planet sits below the panel.
- **Still tier / reduced motion:** every case stacked and fully visible (diagram shown, links focusable) inside the fixed 450vh section; `transition: none`.
- **Zero cases (D4):** the `05 / WORLDS` label and "Case studies are being written up."; no planets.

## 5. Data, `/work/[slug]`

- **Placeholder seed (`scripts/seed.ts`):** three case studies, slugs prefixed `placeholder-`, titles marked as placeholders, `planetFeature` ring / moon / storm, 2–4 realistic paragraphs per markdown section, stack and metrics chips, published. Upserted by slug (re-runnable). **Guard:** the seed refuses to write published placeholders unless `MONGODB_URI` targets `localhost` / `127.0.0.1` or `--placeholders` is passed. The diagram thumbnail is exercised by uploading one diagram through `/admin` in the browser review.
- **`/work/[slug]`** (built in sub-project 2): reviewed in the browser at desktop and mobile with the placeholders. Its "← Back to the voyage" link (`/voyage#worlds`) must land on Worlds; if Lenis or the client-only mount breaks the hash jump, fix it in this slice. No redesign of the page.

## 6. Error handling

- No published cases → D4 empty state; `SceneRoot.planets` is `[]` and `Planet` builds nothing.
- Unknown `planetFeature` value → treated as `none`. Missing diagram → no thumbnail. Empty markdown section → that column shows nothing (label omitted with it).
- Seed against a non-local database without the flag → exits non-zero with a structured log line, writes nothing.
- WebGL loss mid-chapter → existing `still` fallback.

## 7. Testing (written first)

- **Unit (node):** `worldsSchedule` exhaustive sweeps (binary targets, exactly one lit past cp 0, monotone, last case holds through the mobile release, n = 0/1/2/NaN, window inside the desktop hold); `caseExcerpt` (headings, lists, code, links, emphasis, raw HTML stripped; word-boundary cut with ellipsis; empty, whitespace, short input; no mid-word cut); `Planet` (projection target at each slot centre for both aspects, star-disc separation at each slot centre, camera clearance along the whole path, left → right screen motion through each slot, per-slot fades, each feature builds its parts, unknown feature → none, aspect recompute, idempotent dispose, still/zero builds nothing); chapter table at 1625 (contiguity, bit-exact boundaries, `sectionHeightVh`); quality tier settings; seed guard.
- **Component (jsdom + RTL):** `Worlds` — one panel lit per capture point, trigger behaviour at slot boundaries, nav arrival lit, link tab stops, still tier, empty state, CMS narrowing, `/work/<slug>` hrefs.
- **CSS pins:** `voyageCss.test.ts` for the Worlds transition, `data-solo-off` blur gate (prefixed first), mobile pin, still tier.
- **Browser review (controller):** 1440×900, 1024×768, 390×844, still tier; slice-3/4 regression frames re-captured at the new table; first-entry and steady-state frame timing; console clean; `/work/placeholder-*` at desktop and mobile; back-link lands on Worlds.

## 8. Process

Map (absolute-progress consumers, camera path through Worlds, star position per slot, payload size) → plan → two plan reviewers → subagent-driven execution in parallel worktrees (Sonnet implementers, Haiku for test-only chores, independent reviewer per task) → controller browser review → whole-branch review → fix wave → docs (worklog, insights, design) → ask before merging.

## 9. Out of scope

Belt, Dark Passage, Constellation (slice 6); making the chapter table data-dependent (spec §5 hide-and-drop rule); a redesign of `/work/[slug]`; real case-study copy (the user's).
