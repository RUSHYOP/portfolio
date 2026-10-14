# Design

Architecture and visual-design reference for the portfolio site. `README.md` covers setup; this file covers *how it's built and why it looks/feels the way it does*.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **MongoDB + Mongoose** — content store (projects, skills, settings, and the consulting collections: services, process steps, case studies, testimonials, inquiries) and media (GridFS)
- **Resend** — transactional mail for inquiry notifications (`src/lib/mail.ts`)
- **marked + sanitize-html** — server-side markdown rendering for case-study bodies
- **Framer Motion** — all UI motion/transitions
- **Three.js** — particle starfield background
- Custom **Web Audio API** engine — ambient bed + reactive SFX (no audio library)
- **jose** (JWT) — single-admin auth for the CMS
- Deployed on **Vercel** (`@vercel/analytics`, `@vercel/speed-insights`)

## Architecture

```
src/app/page.tsx (server)          — fetches projects/skills/settings via src/lib/data.ts, renders PageClient
src/app/projects/page.tsx (server) — standalone /projects listing with tag filters
src/app/admin/page.tsx (client)    — CMS: auth gate + 9-tab dashboard
src/app/work/[slug]/page.tsx       — ISR case-study reading page (published slugs only)
src/app/api/*                      — REST-ish route handlers (auth, projects, skills, settings, media, upload,
                                     services, process, case-studies, testimonials, inquiries)
src/lib/mongodb.ts                 — cached Mongoose connection (global cache survives HMR/serverless reuse)
src/lib/models.ts                  — Project / Skill / Settings schemas
src/lib/collections/*              — schema-driven CMS: one def per collection → model, API and admin UI
src/lib/markdown.ts                — marked + sanitize-html allow-list (case-study bodies)
src/lib/mail.ts, src/lib/rateLimit.ts — Resend inquiry mail; fixed-window per-IP-hash limiter
src/lib/auth.ts                    — JWT issue/verify, rate-limited login, timing-safe credential check
src/lib/gridfs.ts                  — media stored as MongoDB GridFS chunks, served via /api/media/[fileId]
```

The public site is server-rendered for data (SEO, fast first paint) and hands off to one big client component (`PageClient`) that owns intro sequencing, scroll/audio reactivity, and the Three.js background. The admin dashboard is a single client route with nine tabs (Content, Projects, Skills, Navigation, Media, Consulting, Case studies, Testimonials, Inbox — ⌘1–9) driven by the same collections the public site reads — there is no separate CMS backend.

**Schema-driven collections** (`src/lib/collections/*`): the consulting content model is declared once per collection as a `CollectionDef` (`specs/{services,processSteps,caseStudies,testimonials,inquiries}.ts`) — field types, labels, limits, `orderable` / `publishable` / `publicList`, searchable fields and the paths to revalidate. `defineCollection(def)` turns that def into a Mongoose model, a DTO mapper, CRUD + reorder and a `validate(body, mode)` function; `routeHandlers.ts` turns the same object into `GET/POST`, `GET/PUT/DELETE by id` and `POST /reorder`, so each API route file is two lines. The defs also live in a mongoose-free `defs.ts`, which the client imports: the generic admin `CollectionTab` renders a list, an editor, move-up/move-down reordering and a publish toggle for *any* def, with `FieldInput` supplying one widget per field type (`text`, `textarea`, `markdown`, `chips`, `image`, `toggle`, `select`, `slug`, `number`). One definition therefore drives the database, the API, the validation on both sides and the UI — adding a collection is a spec file plus three route stubs, and client and server can never validate differently.

Public reads go through the published-only branch (`col.list({ publishedOnly: true })`); the admin asks for the same routes with `?all=1`, which requires the JWT cookie and returns drafts and internal fields. Inquiries are write-only from the public side: `publicList: false` means every GET is authenticated, and the POST path applies a 4 KB body cap, a honeypot, shared validation, a salted-IP-hash rate limit (5/hour) and non-blocking Resend mail, in that order, so a mail outage never loses a stored inquiry.

**Auth**: single hardcoded admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars, not a Users collection). Login sets an httpOnly JWT cookie (`admin_token`, 8h expiry). Login attempts are rate-limited per IP (5 / 15 min) and credential comparison is timing-safe.

**Media pipeline**: uploads go through `/api/upload` → validated by type-specific size/dimension limits (`profile`, `project_icon`, `skill_icon`, `audio`) → stored in GridFS → referenced as `/api/media/{fileId}`. (`scripts/migrate-media.ts` was a one-time migration off static `public/` files; `@vercel/blob` is a leftover dependency, not the active storage path.)

## Visual design system

Design tokens live in `src/app/globals.css` as CSS custom properties, swapped via `[data-theme="dark"|"light"]` on `<html>` (see `ThemeToggle.tsx`, persisted to `localStorage`).

| Token | Dark (default) | Light |
|---|---|---|
| `--primary` / `--bg` | `#000000` | `#f5f5f5` |
| `--secondary` / `--bg-secondary` | `#0a0a0a` | `#ffffff` |
| `--tertiary` | `#1a1a1a` | `#e8e8e8` |
| `--white` / `--text` | `#ffffff` | `#111111` |
| `--gray-mid` / `--text-muted` | `#a3a3a3` | `#555555` |
| `--border` | `#222222` | `#d4d4d4` |
| `--glow` | `rgba(255,255,255,.1)` | `rgba(0,0,0,.06)` |

Palette is deliberately near-monochrome (black/white + grays) — no brand color accent. "Noir" aesthetic reinforced by the cinematic overlays below.

**Typography**:
- Body/display: **Styrene A** (self-hosted `.otf`, preloaded in `layout.tsx`, weights 100–900) falling back to **Space Grotesk** (`next/font/google`)
- Mono/label accents (loading text, tags, timestamps): **JetBrains Mono**

**Layout**: single-column scrolling page, sections registered by `id` for anchor-nav scrolling (`#about`, `#projects`, `#contact`). Breakpoint at `768px` collapses all grids (about, contact, projects, skills, footer) to one column and hides the desktop nav menu.

**`/work/[slug]`** (`src/app/work/work.css`) shares `/voyage`'s world rather than the noir home page's: dark only, one amber accent (`--amber: #f2b35c`), JetBrains Mono telemetry labels for the eyebrow/metrics/stack, and a centred 72rem reading column where the typography carries the page because there is no 3D scene. Its colours are pinned locally instead of read from the globals.css tokens — the same guard `voyage.css` uses — plus `[data-theme="light"] body:has(.work)` shields for grain and vignette, so a carried-over light theme can't wash the page out. Page background is painted on `body:has(.work)` so the narrow column leaves no seam.

**Admin panel** gets its own CSS section (`Admin Panel`, `src/app/globals.css:1269`) — a flat, utilitarian dashboard style, deliberately *not* sharing the cinematic treatment (see Overlays below).

## Motion & interaction design

- **Cinematic intro** (`motion/CinematicIntro.tsx`) gates the page on first load; `PageClient` stages in the navbar and Three.js background only after intro completes (100ms / 250ms staggered).
- **Global overlays** (`motion/GlobalOverlays.tsx`) — `Vignette`, `FilmGrain`, `ScrollProgress`, `CustomCursor` — mount on every public route but explicitly **not** under `/admin` ("admin routes get a clean utilitarian surface").
- **Scroll-linked parallax**: `QuoteSection` uses `useScroll({ target: ref })` to drive opposite-direction `y`/`x` parallax on the opening/closing quote marks. *Gotcha*: the component only calls this hook path when it actually renders a quote — an internal `QuoteSectionContent` split ensures the ref-holding `<div>` is never absent while the hook targets it (fixed 2026-09-14; previously threw `useScroll` "target ref not hydrated" whenever a quote setting was empty).
- **Theme toggle**: instant swap, no transition wipe (a circular clip-path "wipe" animation was removed 2026-09-14 for looking distractingly oval on wide viewports).
- **Admin tab transitions**: `AnimatePresence mode="wait"` cross-fade + 6px vertical slide between tabs; active-tab underline uses a shared `layoutId` for a sliding-indicator effect; unsaved-changes per tab get a pulsing dot, and switching away from a dirty tab prompts a `window.confirm`.
- Reduced-motion is respected (`@media (prefers-reduced-motion)` section in globals.css; `html { scroll-behavior: smooth }` is itself gated on `no-preference`).

## Audio design

Singleton Web Audio graph (`src/lib/audio/AudioEngine.ts`), lazily started on first user gesture:

```
ambientBus (space.mp3 + noise pad + drone) ──┐
                                              ├─► duckLowpass ──► masterGain ──► destination
sfxBus (clicks, whooshes, impacts, keystrokes)┘
```

- `masterGain` ramps smoothly on mute/unmute (click-free).
- `duckLowpass` briefly drops its cutoff on "impact" events for a sidechain-style ducking feel.
- A second filter (`scrollFilter`) is driven continuously by scroll velocity — `PageClient` computes px/ms energy on every animation frame and feeds it to the engine, so faster scrolling audibly darkens the ambient bed.
- An `AnalyserNode` taps `masterGain` for the navbar's `AudioVisualizer`.
- Theme changes (`engine.setTheme`) re-pitch UI click sounds (dark → lower pitch, light → higher).

## 3D background

`ThreeBackground.tsx` — a mouse-reactive particle starfield (`THREE.Points`), rendered on a dedicated canvas behind all content. Performance-conscious by construction: capped device-pixel-ratio (1.5 desktop / 1 mobile), `antialias: false`, no stencil/depth buffers, and it fades in (`igniteRef`) only after the intro completes rather than rendering immediately.

## Voyage architecture (`/voyage`)

The cinematic consulting page (noindex until launch) is one scroll-driven camera flight, built in slices per `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`. The pieces that every chapter builds on:

- **Scroll → state.** `VoyageScroll` (Lenis, with a native fallback) writes normalised progress into `voyageStore` (`src/scene/scroll/voyageStore.ts`), which derives `chapter` / `chapterProgress` from `CHAPTERS` in `flightPath.ts`. DOM reads it via `useVoyage()`; the scene reads it once per frame as `ctx.voyage`. Each chapter is a `<section>` whose height comes from `sectionHeightVh(chapter)`, so the scroll track and the flight path share one parameterisation.
- **One WebGL context.** `SceneRoot` owns the only renderer and a flat `pieces` array of `SetPiece`s (`build(scene, tier)` / `update(ctx)` / `dispose()`): `Starfield`, `WarpStreaks`, `Topology`, `OrbitRing`, `EnergyOrb`. There is no post-processing composer.
- **Tiers.** `quality.ts` picks `high` / `mid` / `still` from the environment (mobile → `mid`; reduced motion or no WebGL → `still`), and a once-per-load FPS probe can demote one tier. Per-tier counts live in `TierSettings`. `still` renders `StillSky` instead of `SceneRoot`; `Services` and `Process` receive `animated = false` and `Ignition` is disabled, while `Launch` predates the prop and has no reduced-motion guard yet (GAP-3 follow-up).

### Approach Vector and Jump (chapters 02–03, slice 3)

**Data path.** `src/app/voyage/page.tsx` (server, ISR 5m) calls `getVoyageContent()` once and passes only `services` (plus `settings`) to `VoyageRoot`, and from there to `<Services services animated>`. `Item` is untyped past its base fields, so the narrowing happens at the leaf: `Services.tsx`'s `readService()` turns each field into a string or a string array (`typeof x === "string" ? x : ""`, `Array.isArray(...)`). The client imports `Item` type-only, so no Mongoose code reaches the bundle. Later slices thread their own prop instead of carrying unused ones.

**Pose as CSS custom properties.** `servicesLayout.ts`'s pure `panelPose(index, count, chapterProgress)` returns five numbers, all of them unit-tested: `dock`, `arc`, `tilt` (the desktop arc), `solo` (mobile one-at-a-time replacement over `[0.04, 0.56]` inside a 64vh pin) and `delay`. The desktop `dock` is a 0/1 trigger (1 from chapterProgress > 0), not a scrub: `voyage.css` animates it with a transition on `.service-panel` staggered by `--dock-delay` (0 / 120 / 240 ms for three panels, 240 ms in total whatever N is), so no scroll position can rest on a half-built arc (see Orbit, below). `Services` writes `--dock` / `--arc` / `--tilt` / `--solo` / `--dock-delay` onto each panel, and `voyage.css` decides which ones are used: the desktop rules translate and rotate from `--dock` / `--arc` / `--tilt`, and the `@media (max-width: 767px)` block uses only `--solo`, which stays scroll-scrubbed (`transition: none`). Because the media query makes the choice, there is no `matchMedia` listener in JS, no resize state, and no hydration mismatch between the server and client render. Inactive mobile panels get `data-solo-off`, which drops their backdrop blur and their pointer events. `still` / reduced motion uses `STATIC_POSE` and `data-static`: no pin, and every panel flows inside the same fixed 150vh.

**Set-piece additions.** `Topology` (`src/scene/chapters/Topology.ts`) is a new `SetPiece` in the existing `pieces` array. It has its own `mulberry32` seed and a `topologyNodes` count per tier (42 / 22 / 0), assembles node by node via `setDrawRange`, and is placed camera-relative behind the middle panel. Chapter 02/03 behaviour was added to the existing pieces as chapter-gated branches:
- `Starfield`: `approachSoften` during Approach, combined with `setSoften` by `max`.
- `WarpStreaks`: hyperspace length, opacity and convergence during Jump, combined with the velocity curves by `max`. Convergence eases back out on exit.
- `EnergyOrb`: `jumpGlare` plus an additive burst sprite during Jump, combined with `setGlare` by `max`.

The rule is that **a piece reads `ctx.voyage.chapter.id` / `chapterProgress` inside its own `update()`**. `SceneRoot` does not drive them per chapter, and there is no DOM → GL channel, so a chapter's visual logic lives with the object it changes and stays unit-testable in node.

**The two-clock Jump beat.** Chapter 03 is a bare 25vh `<section id="jump">`: no pin, no label, no `aria-label`. The beat runs on two clocks:
- *Scroll clock* (continuous): the set pieces' hyperspace and flare curves read `chapterProgress`, so the tunnel tracks the reader's scroll at any speed.
- *Event clock* (discrete):
  - `useJumpBeat(animated)` subscribes to `voyageStore` and hands every emit to the pure `decideJumpBeat()` (`jumpBeat.ts`). It fires on a forward crossing by chapter index (`prev < JUMP_INDEX && next >= JUMP_INDEX`, so an approach → orbit jump in one emit still counts), never backward, and never while the store's `programmatic` flag is set.
  - When it fires, the hook plays the upward whoosh once and logs `voyage.jump`. It also returns a letterbox flag that `VoyageRoot` ORs with Ignition's. The bars are held for `max(JUMP_HOLD_MS = 900, the rest of the band)`, because the 250 ms idle tick renews the deadline while the store still reports `jump`. The hold uses `performance.now()`.
  - `voyageStore.scrollTo()` sets `programmatic` until the scroll lands within `PROGRAMMATIC_EPS`, or `PROGRAMMATIC_TIMEOUT_MS` passes, or a later `scrollTo` replaces it. It does not arm at all when the target is the current position. This is how dock and CTA navigation pass through the band without the beat.
  - In `still` the hook returns early and the letterbox is gated on `animated`. The section keeps its 25vh, so the scroll identity is the same on every tier.

### Orbit (chapter 04, slice 4)

**Chapter table in vh.** `flightPath.ts` declares `CHAPTERS` as `spanVh` spans (`VOYAGE_SCROLL_VH = 1625`; Orbit is 300vh, Worlds 450vh) and derives every `start` / `end` from one cumulative array: `end_i` and `start_{i+1}` are the same expression and the last `end` is exactly 1, so the table has no 1-ulp gaps and `sectionHeightVh` returns the span exactly. The spans are the source of truth; fractions are derived. `progressAt(id, t)` names a position by chapter-relative progress (`t <= 0` / `t >= 1` return the chapter's own `start` / `end` bit-for-bit), and tests, captures and constants such as `DOCK_COMPACT_PROGRESS` use it instead of absolute literals, so moving the table cannot silently retarget them.

**One clock.** `src/scene/chapters/orbitSchedule.ts` is pure (no React, three or DOM) and is read by `Process`, `OrbitRing` and `Starfield`, so a panel and its node change together:
- `ORBIT_WINDOW = [0.04, 0.62]` is the stretch of chapterProgress the steps share in equal slots. It is sized to the *desktop* pin's hold (300vh section − 100vh pin = 200vh = cp 0 … 2/3); the mobile pin is 64vh and holds to 0.787. One window serves every device because the ring is a single WebGL instance and cannot be media-query-aware.
- `orbitPresence(cp)` (0 at cp 0, 1 across the window, 0 again by `ORBIT_PRESENCE_END` = 0.66) is used only by the ring (`ringFade`) and the starfield focus pull (`orbitSoften` = `ORBIT_SOFTEN_PEAK` × presence, dispatched by `chapterSoften(chapterId, cp)` beside the unchanged `approachSoften`). The ring then finishes its own fade by cp 0.9, because the camera flies through the star region in later chapters.
- `orbitCursor(cp, n)` is the continuous step index in `[0, n-1]`: it sits on an integer while a step dwells and moves between two integers only across a `STEP_CROSSFADE` stretch (0.3 of a slot) centred on each slot boundary. N = 0 / 1 give 0.
- `stepTarget(i, n, cp)` is the panels' input: a 0/1 target, never in between. The lit step is `Math.round(orbitCursor)`, so a panel changes exactly half-way through the ring's travel; everything is dark at cp 0, the first step is lit from the chapter's first pixel (nav arrivals land at `start + 0.001`), and the last step stays lit through the mobile pin release. The panels have no fade-out: the pin's release is their exit, and `Process` shows nothing outside Orbit (`chapter.id === "orbit"`).

**Scroll picks a target, time animates.** `Process` writes each panel's `stepTarget` as `--solo`; `.process-panel` animates opacity (0.45 s) and transform (0.6 s) with a CSS transition, and the still tier sets `transition: none`. A scrubbed fade can always be caught at rest half-way, so any state a reader can stop on has to be a complete frame. The ring's cursor, Topology's node assembly and Approach's mobile `--solo` stay scroll-scrubbed.

**Data path.** `page.tsx` → `getVoyageContent().process` → `VoyageRoot` (prop `process`, destructured as `steps` so it never shadows Node's global) → `<Process steps animated>`, and `process.length` → `SceneRoot.stepCount` → `new OrbitRing(stepCount)` (effect deps `[tier, onContextLost, stepCount]`). `Process` mirrors `Services`: `"use client"`, `Item` type-only, narrowed at the leaf, `<h2>` only for a non-empty title, a decorative `aria-hidden` ordinal, three mono-labelled fields (What happens / What you get / How long) omitted with their label when empty, and `data-solo-off` gating backdrop blur and pointer events (`-webkit-backdrop-filter` first). Only the active animated panel is a tab stop, and only while `chapterProgress < ORBIT_HOLD_MOBILE`. Still tier: `data-static`, no pin, every step stacked inside the fixed 300vh. Layout is CSS custom properties: `--orbit-panel-w: min(30rem, 32vw)` (the left ~38% with the pin's gutter) and `--orbit-panel-h: clamp(20rem, 48vh, 23rem)`; on mobile a top-anchored `min(34vh, 18rem)` box under a 64vh pin with `padding-top: 4.5rem`, with its own type scale.

**Bank and limb.** `bankForProgress(progress)` (pure, in `flightPath.ts`) is 0 outside Orbit and eases to `BANK_MAX` (30°) over orbit cp [0, 0.18] and back over [0.82, 1]; `SceneRoot` applies it as `camera.rotateZ(smoothBank)` straight after `lookAt`, which rebuilds the quaternion every frame, so the roll never accumulates. It is kept out of `getCameraPose`, so the never-reverse invariant and every waypoint test are unaffected. `orbitLimb(progress)` (in `EnergyOrb.ts`, ramps over cp [0, 0.2] and [0.8, 1]) drives the `uLimb` uniform: `body *= mix(1, pow(ndotv, LIMB_POWER), uLimb)` and the fresnel rim is cut to `LIMB_RIM`, so the star reads as a lit sphere; at `uLimb = 0` both factors are exactly 1 and every other chapter, including the Jump flare and Pilot glare, renders as before.

**The ring.** `OrbitRing` builds in world space around `STAR_POSITION`: a thin `TorusGeometry` (6 radial segments, tubular = `TierSettings.ringSegments`, 128 / 64 / 0) with an additive `MeshBasicMaterial` — a torus, because WebGL lines are 1 px — and N low-poly sphere nodes sharing one geometry and one material, the active node swelling by scale. `RING_TILT` (72°, the angle between the ring plane's normal and the view axis) makes a shallow ellipse whose near arc passes below the star; "front-centre" is its lowest point, where `ringSpin(cursor, n)` puts node `round(cursor)`. Depth testing stays on as a guard, but at any tilt that keeps the front node clear of the star the back arc never reaches the disc, so the 3D read comes from the ellipse, the nodes' perspective size and the limb darkening. N = 0 or the `still` tier builds an empty hidden group; N = 1 is a static node. The exported tunables are `BANK_MAX`, `RING_RADIUS` (20), `RING_TILT`, `RING_TUBE` (0.1), `NODE_RADIUS` (0.55), `NODE_ACTIVE_BOOST` (0.9), `RING_OPACITY`, `NODE_OPACITY`, `RING_FADE_OUT_END`, `LIMB_POWER` (0.6), `LIMB_RIM` (0.3), `ORBIT_SOFTEN_PEAK` (0.75), `ORBIT_WINDOW` and `STEP_CROSSFADE`, plus the two `--orbit-panel-*` properties.

### Worlds (chapter 05, slice 5)

**Chapter table and the star clock.** Worlds is 450vh (`VOYAGE_SCROLL_VH = 1625`). `starScale` and `distanceAU` are keyed by `starClock(progress)`, which counts every chapter at its slice-4 length (Worlds as 225vh), so the star and the DIST readout are identical to slices 3–4 everywhere outside Worlds (pinned by golden values) and grow at half the old rate per vh inside it. Rail ticks, `PROGRAMMATIC_EPS` and the `+0.001` arrivals simply follow the new table.

**One clock.** `src/scene/chapters/worldsSchedule.ts` (pure) mirrors `orbitSchedule.ts` and is read by `Worlds`, `Planet` and `Starfield`: `WORLDS_WINDOW = [0.04, 0.73]` sized to the desktop pin's hold (450 − 100 = 350vh = cp 0 … 0.7778; the phone's 64vh pin holds to 0.858), `worldsPresence` (the starfield pull), `worldsCursor(cp, n)` (dwells on whole case indices, travels over `CASE_TRAVEL` of a slot), `caseTarget(i, n, cp)` (the 0/1 input shared by the panels and the planets) and `caseCentre(i, n)` (where a planet is placed).

**Data path.** `page.tsx` → `getVoyageContent().caseStudies` → `toWorldCase` (server) → `VoyageRoot` (`worlds`) → `<Worlds cases animated>` and `worlds.map(planetFeature)` → `SceneRoot.planets` → `new Planet(planetsFromKey(planetsKey(planets)))`. The client only ever receives the slim `WorldCase` (three `caseExcerpt` excerpts of ~160 characters in place of up to 18 000 characters of markdown). `PlanetFeature` lives in a pure `src/lib/planetFeature.ts` shared by server and scene.

**Panels.** One glass panel at a time (desktop: left, `--worlds-panel-w: min(40rem, 44vw)`, all panels in one grid cell; phone: a capped `min(34vh, 18rem)` box under the dock). `--solo` is a 0/1 target and a CSS transition is the cross-fade, **staged**: the outgoing panel (`[data-solo-off]`) fades out in 0.16 s with no delay and the incoming one fades in over 0.32 s after a 0.16 s delay, so two panels' text never superimposes. Panels are `overflow: hidden` with line-clamped excerpts, so the link is each panel's only tab stop and follows the pin hold. Still tier: every case stacked and fully visible, `transition: none`. Zero cases: the label and one quiet line.

**Planets.** `Planet` is one set piece owning N planets: a sphere (`PLANET_RADIUS` 2.2) with a 3D value-noise fBm surface shader (the nebula's constants and domain warp, object-space noise, per-planet seed), lit by the direction to the star with a dark night side and a narrow amber terminator band, plus a feature (`ring`, `moon`, `storm`, `none`). Placement is `planetPosition`: camera pose at the slot centre + camera basis × an NDC offset at `PLANET_DEPTH` (18), so each planet projects exactly onto its target while its case is read. There are three targets: landscape (0.50, −0.05), portrait phone (0, −0.45), and a wide portrait (0.5, −0.55) for a portrait window wider than `PHONE_MAX_WIDTH` (767 px, `FrameContext.viewportWidth`), which still gets the desktop panel. Positions are recomputed only when the aspect or that wide-portrait flag changes. Opacity is `shown × planetFadeOut × swap[k] × ignite`, and **every factor but the last planet's tail is a trigger, not a scrub**: `shown` is a `dt`-eased follower toward a 0/1 target (a Dock / rail / back-link arrival at `start + 0.001` shows the planet within 0.5 s), and `swap[k]` is a per-planet follower toward the panel's own `caseTarget`, out at `PLANET_SWAP_OUT_RATE` 20 and in at `PLANET_SWAP_IN_RATE` 8, with the incoming planet held until every other planet is below `PLANET_SWAP_CLEAR` 0.02, so no frame shows two planets (a whole swap ≈ 0.5 s at 60 fps; while the group is still hidden the swaps snap to their targets, so an arrival lands on the lit planet). Only `planetFadeOut`, the last planet's tail to 0.9 (so a phone's longer pin still shows it), follows scroll.

**`/voyage#<chapter>`.** `chapterForHash` / `hashArrivalProgress` (pure) plus a one-shot effect (`useHashArrival`) jump to `chapter.start + 0.001` once the tier resolves, through `voyageStore.scrollTo(p, { immediate: true })`; this is what makes "Back to the voyage" on `/work/[slug]` land on Worlds. It has three layers: (1) the hook's jump; (2) after the jump the hook clears the fragment with `history.replaceState(history.state, "", path + search)`, so a late native fragment scroll cannot re-apply it (the cost: a reload or copied URL after arriving no longer carries `#worlds`); (3) `.chapter--worlds { scroll-margin-top: -1.625vh }` (`HASH_ARRIVAL_EPS` × `VOYAGE_SCROLL_VH`), so any native fragment scroll that still happens lands on `start + 0.001` rather than on the section top where every panel is dark.

**Seed.** `scripts/seed.ts` seeds three published `placeholder-*` case studies through `seedPlaceholderCases` (idempotent by slug), only when `canSeedPlaceholders(MONGODB_URI, argv)` (local host, or `--placeholders`).

## Routes

| Route | Rendering | Purpose |
|---|---|---|
| `/` | Server + client hydration | Hero → Quote → About → Quote → Projects (carousel) → Contact → Footer |
| `/projects` | Server | Full project list with technology-tag filtering |
| `/admin` | Client-only | CMS login gate → Content / Projects / Skills / Navigation / Media / Consulting / Case studies / Testimonials / Inbox tabs |
| `/voyage` | Server (ISR, 5m) | Cinematic consulting page (noindex until launch) |
| `/work/[slug]` | Server (ISR, 5m + `generateStaticParams`) | Case-study reading page; unknown or unpublished slug → 404 |
| `/api/auth/{login,logout,verify}` | Route handler | JWT cookie session |
| `/api/{projects,skills,settings}[/:id]` | Route handler | CRUD backing the CMS + public data fetch |
| `/api/{services,process,case-studies,testimonials}[/:id]`, `…/reorder` | Route handler | Generic collection CRUD + reordering; GET is published-only unless `?all=1` + auth |
| `/api/inquiries[/:id]` | Route handler | Public POST (honeypot + rate limit + Resend mail); all reads/writes otherwise admin-only |
| `/api/upload`, `/api/media/[fileId]` | Route handler | GridFS upload / stream-back |

## Notes for future changes

- Content (hero copy, quotes, project/skill lists, nav & footer links) is **fully data-driven** from MongoDB — don't hardcode copy changes in components; edit via `/admin` or the `Settings`/`Project`/`Skill` models.
- Any new scroll- or ref-dependent Framer Motion hook should follow the `QuoteSectionContent` pattern: gate rendering *before* the hook call, never after, so the target ref is guaranteed mounted for the hook's whole lifetime.
- Keep `/admin` free of the cinematic overlays (`GlobalOverlays` already excludes it by pathname) — it's intentionally a plain, fast, utilitarian surface for content editing, contrasted against the public site's noir treatment.
