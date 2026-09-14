# Voyage Redesign — Design Spec

**Date:** 2026-09-14
**Scope:** Sub-project 1 of 4 — visual language + scroll voyage for the portfolio → portfolio + consulting redesign.
**Status:** Approved by user in brainstorming (2026-09-14). Ready for implementation planning.

## 1. Goal

Turn the current single-page portfolio into a **portfolio + consulting site** where prospective clients understand what Purav builds, see proof, and book a call — while retaining and deepening the space theme as a **single continuous scroll voyage** through one persistent 3D scene.

### Positioning (drives copy and IA)
AI-powered full-stack product development (primary) plus system architecture / design advisory. Lead with building; advisory is visibly present but secondary.

### Decisions locked in brainstorming
| Topic | Decision |
|---|---|
| Approach | **C — Hybrid.** One persistent vanilla Three.js scene with scroll-driven camera; ThreeUI (MIT) shader/particle sources *ported* as set pieces; ThreeUI React components used verbatim **only** for isolated widgets (dock nav, CTA). |
| Navigation | Drop the top bar. Floating glass capsule dock. |
| Scroll | Cinematic continuous voyage, Lenis-style smoothing. Chapters = sections. |
| Theme | Dark only. Remove light theme and toggle. |
| Accent | Near-monochrome base + **exactly one accent: warm amber (~`#f2b35c`)**, used only for the star and primary CTAs. |
| Audio | Keep ambient bed, subtle SFX, scroll-reactive filter, visualizer. **Remove TypewriterText and keystroke synth entirely.** |
| Conversion | Scheduler embed (primary) + short inquiry form. Provider selection deferred to sub-project 3 (must run marketplace skill first). |
| Proof | 2–3 case studies, testimonials. Existing 10 projects are placeholders the user will replace. |
| Inspiration | threeui.com — Meng To's MIT Community catalog (`github.com/MengTo/threeui`, npm `@designcodeio/threeui@1.2.0`). |

### Out of scope for this spec (separate sub-projects, in order)
2. Consulting content model + CMS: `Service`, `CaseStudy`, `Testimonial`, `Inquiry` schemas, API routes, admin tabs.
3. Contact pipeline: scheduler provider, inquiry storage, transactional email.
4. Removals wiring beyond what the voyage needs (final deletion of light-theme CSS vars, `engine.setTheme` pitch logic cleanup).

Until sub-project 2 lands, Services / Process / Case studies / Testimonials ship from a typed seed file `data/consulting.json` so the voyage can be built and reviewed immediately and swapped to Mongo later without touching the scene.

## 2. Visual language

### Palette
Existing near-monochrome base retained: `#000000` void → `#0a0a0a` panels → `#1a1a1a` edges; white / `#a3a3a3` / `#6b6b6b` text. All 3D elements (starfield, warp streaks, nebula haze, topology lines, planets) render **monochrome white-on-black**. One accent, amber `#f2b35c`, appears only as: (a) the energy-orb "star" and its glow, (b) primary CTA fill, (c) the flight-rail progress dot, (d) the amber terminator line on case-study planets, (e) the cursor ring over CTAs. Ice-blue (ThreeUI's warp default) is explicitly rejected so CTAs never blend into the sky.

### Typography
- Display: **Styrene A** (existing self-hosted). Hero: `clamp(3.5rem, 8vw, 8rem)`, weight 500, letter-spacing −0.02em, line-height 0.95. Section headings: `clamp(2rem, 4vw, 3.5rem)`, weight 500.
- Instrument text: **JetBrains Mono** for chapter labels (`01 / LAUNCH`), telemetry, stack chips, form labels, footer build line. Uppercase, letter-spacing 0.12–0.2em, 0.7–0.8rem.
- Body: Styrene 300–400, 1.05rem, line-height 1.7, max-width 62ch.

### Surfaces
Content sits on **glass panels**, never flat cards: 1px border `rgba(255,255,255,.08)`, `backdrop-filter: blur(18px)`, background `rgba(10,10,10,.55)`, a 1px inner top highlight `rgba(255,255,255,.06)`, radius 20px. Grain and vignette overlays (existing `FilmGrain`, `Vignette`) stay. Custom cursor stays and gains an amber ring when hovering a CTA.

### Motion rules
- The camera does the big moves; DOM does small ones: fade-up 12px, 0.5s, ease `[0.2, 0.7, 0.2, 1]`. Nothing bounces.
- Scroll velocity drives three things simultaneously: warp streak length, the audio low-pass cutoff (existing `setScrollEnergy` path), and a subtle chromatic offset on the grain overlay.
- `prefers-reduced-motion`: camera path collapses to static per-chapter crossfades, particles freeze, SFX off, DOM reveals become opacity-only.

## 3. The voyage — chapter script

Persistent across all chapters: one depth-sorted starfield (evolved from the existing particle field, thinned), a thin **flight-path rail** on the right edge (replaces the top scroll-progress bar), grain, vignette, custom cursor, the dock.

| # | Chapter | Scene / camera | Content | ThreeUI reference (ported) | Data source |
|---|---|---|---|---|---|
| 00 | **Ignition** | Black → mono title resolves (blur→sharp, no typewriter) → hairline telemetry fills → void ignites (existing ignite fade) → dock descends. ≤1.2s, skippable, first visit per session only. | `PURAV S` / `SYSTEMS · AI · PRODUCT` | `uplink-loader` (tick/telemetry motif) | static |
| 01 | **Launch** (Hero) | Camera parked in deep field. Amber energy orb low-right. Warp streaks drift imperceptibly. | H1 "I build AI-powered products, end to end." Sub: "Full-stack builds and system architecture for founders and teams who want it shipped, not just scoped." CTAs: **[Book a call]** amber · [See the work] ghost. Mono hint `SCROLL TO DEPART ↓` at 0.4 opacity. | `energy-orb`, `warp-field` | `settings` |
| 02 | **Approach Vector** (Services) | Scroll pulls camera toward the star; streak length ∝ velocity. Three glass panels dock in a shallow arc, staggered. Topology graph assembles node-by-node behind the middle panel. | Panels: AI-powered product builds · System architecture & design · Advisory / fractional engineering. Each: mono label, one-line promise, 3 outcome bullets, "typical engagement" line. | `nexus-topology`, `warp-field` | `services[]` |
| 03 | **Orbit** (Process) | Camera banks ~30° into orbit. One large orbital ring with 4 luminous nodes; scroll rotates the ring so each node arrives front-center and its panel pins ~1 viewport. | Discover → Architect → Build → Ship & operate. Each: what happens, what you get, how long. | `orbital-sphere` (rings only) | `process[]` |
| 04 | **Worlds** (Case studies) | Star recedes. Camera flies past one planet per ~1.5 viewports. Planet = shader sphere, nebula-noise monochrome surface, amber terminator. | Panel per case: mono `CASE 01`, context, **Problem → Architecture → Outcome** in three columns, stack chips, architecture-diagram thumbnail, [Read the case study →] → `/work/[slug]`. | nebula noise (from `julian-vance-nebula` source) | `caseStudies[]` |
| 05 | **The Belt** (Testimonials) | Camera threads an asteroid belt: glass tiles on a slow ring, draggable, auto-drifting. **If 0 testimonials, chapter is skipped and the camera path shortens.** | Quote, name, role, company. Optional "own words" tiles from legacy `quote1`/`quote2`. | `character-wave` motion | `testimonials[]` |
| 06 | **Constellation** (Projects) | Each project is a star; lines connect projects sharing a technology. Hover → neighbours light + mini card; click → detail panel. | Title, description, links. [All projects →] keeps `/projects`. | `constellation-field` | `projects[]` |
| 07 | **Looking Back** (About) | Camera turns 180°; the star is small and distant. | Photo in a **porthole** (circular mask, hairline ring). Bio (3 short paragraphs). Mono credentials strip: IEEE ESCI 2025 · B.E. CSE · years shipping · stack breadth · Bangalore, India. | — | `settings` |
| 08 | **Landing** (Contact) | Camera descends; a faint horizon line with amber glow rises from the bottom. | Left panel: scheduler embed, headline "Let's talk about what you're building." Right panel: inquiry form — name, email, what you're building, budget range (select), timeline (select). Success: `SIGNAL RECEIVED · I reply within 24h` + soft bell SFX. **Scheduler failing to load promotes the form to primary.** | `emerald-horizon` (monochrome) | form UI only here; pipeline is sub-project 3 |
| 09 | **Surface** (Footer) | Touchdown. | Dock links, socials, mono build line `NEXT.JS · THREE.JS · MONGODB`, **[Relaunch ↑]** → scroll to top with whoosh + re-fire ignite fade. | `newsletter-footer` (structure) | `settings.footerSections` |

Standalone `QuoteSection` is retired with the typewriter; quotes may live on as Belt tiles.

## 4. Dock, CTAs, rail

**Dock.** Centered glass capsule, `top: 20px`, ~640px wide desktop: amber monogram `P` · Services · Process · Work · About · **[Book a call]**. Wraps ThreeUI's `AnimatedTopDock` React component used verbatim (the one intentional second Three copy in approach C), **lazy-loaded after ignition** so it never affects first paint. Past the hero: shrinks ~15%, blur strengthens, active chapter link glows. Mobile (<768px): monogram · **Book a call** · `≡` opening a full-screen glass sheet with links and the rail.

**CTA.** One component `<CallToAction>` used in Launch, every case panel, Landing. Amber fill, black text, 999px radius, mono label, arrow slides on hover, magnetic pull via existing `MagneticButton`. Anywhere except Landing, click smooth-scrolls to Landing (whoosh SFX) — the camera descent *is* the transition.

**Flight-path rail.** Right edge, 1px, chapter ticks with mono labels on hover, amber progress dot. Click a tick → jump to chapter. Hidden below 1024px.

**Removed:** top `Navbar`, `ThemeToggle` (theme part; floating audio controls remain), light theme, `TypewriterText`, standalone `QuoteSection`, the projects 3D carousel, `playKeystroke` synth.

## 5. Technical architecture

```
src/scene/                          one persistent WebGL context
  SceneRoot.tsx                     mounts canvas, owns renderer/loop (evolved from ThreeBackground.tsx)
  camera/flightPath.ts              CatmullRomCurve3 through 9 chapter waypoints + per-chapter lookAt targets
  chapters/                         one set piece per file: export { build(scene, tier), update(t, voyage) , dispose() }
    Starfield.ts WarpStreaks.ts EnergyOrb.ts Topology.ts OrbitRing.ts Planet.ts Belt.ts Constellation.ts Horizon.ts
  scroll/useVoyage.ts               Lenis → normalized store { progress 0..1, velocity, chapter, chapterProgress }
  quality.ts                        tier selection (high | mid | still) + 1s FPS probe demotion
src/components/voyage/              DOM chapter content (glass panels); reads useVoyage for reveals
  Ignition.tsx Launch.tsx Services.tsx Process.tsx Worlds.tsx Belt.tsx Constellation.tsx About.tsx Landing.tsx Surface.tsx
src/components/dock/                Dock.tsx (AnimatedTopDock wrapper), FlightRail.tsx, CallToAction.tsx
src/app/work/[slug]/page.tsx        case-study reading page, server-rendered, no scene
data/consulting.json                typed seed: services, process, caseStudies, testimonials (until sub-project 2)
```

- **One store, two consumers.** `useVoyage` publishes progress/velocity/chapter. The Three render loop reads it imperatively (no per-frame React renders). Framer Motion reads it for DOM reveals. The audio engine subscribes for the scroll filter (replaces the current `requestAnimationFrame` loop in `PageClient`).
- **Set pieces are ports, not imports.** Every ThreeUI reference is re-implemented in `src/scene/chapters/` against the project's `three@0.169`, with an MIT attribution header naming the source component. `@designcodeio/threeui` is imported only in `src/components/dock/Dock.tsx`.
- **Quality tiers.** `high`: desktop, DPR 1.5, full particle counts, bloom. `mid`: mobile, DPR 1, half counts, no bloom. `still`: reduced-motion or WebGL unavailable/lost — static gradient + baked starfield image, chapter crossfades. Tier picked once at mount from device signals, then a 1s FPS probe demotes one tier if <45fps. Tier and probe result are logged (structured JSON) to `logs/`.
- **Server/client split unchanged.** `src/app/page.tsx` fetches content server-side and renders one client root. `/work/[slug]` is server-rendered and mounts no scene.
- **Overlays.** `GlobalOverlays` continues to exclude `/admin`; the scene likewise never mounts under `/admin` or `/work/*`.

### Error handling
- WebGL unavailable / context lost → `still` tier; never a blank screen.
- Scheduler embed blocked or fails to load within 4s → inquiry form becomes the primary panel.
- Fonts already `font-display: optional`; ignition waits on nothing.
- Missing/empty data arrays → chapter hides and the flight path drops its waypoint (Belt explicitly; same rule for Worlds).

## 6. Build order and review loop

Vertical slices; **each ends with a browser review before the next begins** (chrome-devtools: 1440×900 and 390×844, ≥5 scroll positions, FPS probe value logged). Review asks: does it match the chapter script? where is it weaker than intended? what emerged that's better than the script?

1. Scene skeleton: `SceneRoot`, `useVoyage` + Lenis, `flightPath`, `FlightRail`, `quality` (stars only).
2. Ignition + Launch: orb, streaks, hero copy, dock, CTA.
3. Approach Vector: services panels + topology.
4. Orbit: process ring.
5. Worlds: planets + `/work/[slug]`.
6. Belt + Constellation.
7. Looking Back + Landing (form UI, no pipeline) + Surface.
8. Removals (nav, theme toggle, typewriter, quote section, carousel) + perf pass vs. pre-redesign baseline.

Findings → `insights.md`; progress → `worklog.md`; tier/FPS logs → `logs/`. Every slice's screenshot set is committed under `screenshots/voyage/` as the visual regression baseline.

## 7. Testing

- **Unit:** `flightPath` interpolation at chapter boundaries; `quality` tier selection matrix (device × reduced-motion × probe result); `useVoyage` progress/chapter math incl. skipped chapters.
- **Integration (Playwright):** scroll to each chapter → its panel is visible and the rail tick is active; reduced-motion run → camera position unchanged across scroll; WebGL-disabled run → `still` tier renders content; scheduler-blocked run → form is primary.
- **Visual:** committed screenshot baselines per slice.
- **Perf:** Lighthouse + performance trace at slice 8 against the current site.

## 8. Success criteria

- All 9 chapters reachable and legible on desktop and mobile.
- Exactly one WebGL context for the scene (dock's own context is the only exception).
- ≥45 fps on a mid-tier phone, ≥55 fps on desktop at tier `high`.
- LCP ≤ 2.5s, CLS < 0.05, Lighthouse accessibility ≥ 95, zero console errors.
- Reduced-motion path fully usable end to end.
- No light-theme, typewriter, or top-navbar code paths remain after slice 8.
