# Restrained cinematic correction implementation brief

> Use the existing sequential implementation/review workflow. User rejection of the current visuals supersedes the original decorative arc, card and hyperspace prescriptions. Read `design-correction-audit.md` first. No new dependencies or invented CMS content.

**Goal:** Make Launch → Approach → Jump feel composed, legible and professional before extending the journey.

**Architecture:** Keep one vanilla Three scene, canonical chapter ranges and the existing store/navigation APIs. Pull physical/canonical measurement forward from Slice 4 Task 1 so Services can follow real content height. Use an editorial DOM foreground and a subdued scene. Default direction is restrained cinematic; do not wait for an optional style response.

## 1. Measured geometry and intrinsic editorial Services

**Files:** `src/scene/scroll/scrollGeometry.ts` and tests, `VoyageScroll.tsx`, `flightPath.ts` comments, `voyageStore.ts` comments, `VoyageRoot.tsx`, `Services.tsx`, `servicesLayout.ts` and tests, `voyage.css`.

- [ ] Implement the physical/canonical bridge and DOM-boundary tests preserved in `design-correction-geometry-reference.md` now. Reuse its reference implementation after checking current source. Geometry is local to one bridge effect, measured on resize/content change, never stored in server-global state. Native and Lenis branches use the same conversions. Remove the obsolete fixed track minHeight.
- [ ] Replace rotated equal panels and absolute mobile solo panels with an unrotated editorial sequence in authored CMS order. Desktop: readable title/index and detail columns with quiet separators and comfortable measures; mobile: intrinsic single-column page flow. Render each promise, outcome and engagement once. No horizontal card strip, mandatory 150vh allocation, 64vh card, or nested reader for ordinary Services copy. All N records stay present, including N=1/6/10; N=0 retains the temporary empty interval until shared omission work, unless that support already exists.
- [ ] Let Approach height follow content in animated and still tiers. Do not artificially reserve fixed cinematic height for this now-identical natural layout. Keep optional reveal movement small and nonessential. Remove the current tier-null empty-root return and initial Launch opacity zero now: server HTML must render actual hero/body/Services once, visible before tier or ignition. SceneRoot mounts only after high/mid resolution; Ignition may overlay after hydration, never gate server content. Any pending-tier reservation elsewhere must not clamp these intrinsic Services or create hydration shifts.
- [ ] Write/adjust meaningful tests before implementation: monotone mapping and round trips across variable Approach/Orbit heights; exact chapter boundaries; +.001 navigation mapped to pixels; true Surface scroll-limit→1 with its intentional tail exactly once; N=1 still content without phantom root blank; DOM authored order and all text once for long N=6/10. Verify no overlapping later sections after viewport resize and font/content reflow. Preserve both native/Lenis programmatic velocity/audio suppression throughout navigation.
- [ ] Remove tests whose sole contract is the rejected rotation/card-strip/solo presentation. Retain mathematical and access invariants. Run geometry/store/camera/component tests and typecheck. Slice 4 Task 1 becomes verify/integrate only, not a second rewrite.

## 2. Launch, navigation and reading hierarchy

**Files:** `Launch.tsx`, `Dock.tsx` and relevant tests, `voyage.css`; shared control styling only where necessary.

- [ ] Retain actual CMS copy and Styrene. Reduce headline scale and tune measure/line-height to avoid the isolated `AI-` line in the current title, without hardcoding seed-specific breaks. Use the audit's dimensions as starting points, not required decorative constants. Place the orb clear of copy/actions.
- [ ] Maintain a consistent text edge and safe clearance below the dock. Make the contact action visible on mobile without opening its sheet; use “Discuss a project” or equally truthful inquiry language. Preserve keyboard operation, sheet focus restoration and narrow-screen/zoom wrapping.
- [ ] Quiet competing monogram/telemetry/rail/audio presentation. Remove obsolete theme affordance if still rendered, preserving functioning audio controls and labels. No new dashboard decorations. Services metadata is ordinary readable content, not tiny dim telemetry.
- [ ] Confirm current server text and DOM order remain visible before scene readiness and in no-JS/still/WebGL-fallback cases. Do not duplicate hero/body across tiers. Later Slice 4 SSR work must integrate this structure, not replace it with fixed service reservations.

## 3. Subdue and refine existing scene primitives

**Files:** `Topology.ts`, `WarpStreaks.ts`, `EnergyOrb.ts`, `quality.ts`, `SceneRoot.tsx`, relevant frame/math/disposal tests.

- [ ] Omit decorative topology on mobile; on desktop either omit it or use small round softened points and sparse dim edges within clear background space. No square bare-point sprites or graph crossing service text. Preserve one scene and truthful distinction between decoration and real case evidence.
- [ ] Replace full-white constant-opacity spokes with sparse, varied, tapered streaks. Jump intensity should be velocity-led and decay to a quiet rest state even if progress stops at the midpoint. Use delta-time-aware settling; programmatic navigation cannot trigger acceleration/audio. Keep forward-only camera motion and reduced-motion freeze. Do not retain old max(progressIntensity, velocityIntensity) simply to pass obsolete appearance tests.
- [ ] Contain amber orb glare by projected viewport size, particularly mobile; remove the giant white-hot clipped mass. Tune existing primitives/shaders, not extra effects. Evaluate renderer antialiasing together with fewer softer lines on actual hardware. Keep existing tier budgets; no new compositor, canvas context, dependency or bloom stack.
- [ ] Adjust unit tests around observable frame invariants: finite state, stable still mode, decay after stopped velocity, bounded projected flare at mobile/desktop aspect ratios, suppression during programmatic travel, disposal. Avoid asserting arbitrary aesthetic constant values. Check chrome/chapter visibility so Orbit labels do not leak into a held Jump and letterbox does not leave an accidental isolated rail.

## 4. Review gate before adding chapters

- [ ] Run focused tests, typecheck and touched-file lint; report the current global baseline accurately. Verify camera never reverses during forward scrolling and stays aligned with the visible measured chapter. Verify navigation +.001 target after resize and both scrolling branches.
- [ ] In production mode capture Launch, first/middle/last Services, transition entry/mid/exit at 1440×900 and 390×844; inspect 320px, 200% zoom and N=6/10 long content. No dock collision, clipped copy, hidden record, massive blank interval, tiny engagement copy, graph scaffolding or hard full-screen spokes.
- [ ] Record slow/fast scroll and pause at Jump midpoint: it settles quietly rather than freezing a burst. Inspect images personally and iterate composition within this scope. Exact particle count/type size is discretionary; readability and visual restraint are mandatory.
- [ ] Check keyboard navigation, no-JS/server text, reduced motion, WebGL unavailable/context loss, menu and contact. Measure real CLS (<.05 target) and FPS using the existing browser workflow; preserve no duplicate canvas/context and existing performance gates. Do not send a real inquiry during visual testing.
- [ ] Save evidence under `screenshots/voyage/design-correction/`, record factual changes/tests/limitations, and obtain the existing reviewer gate before Orbit implementation. This is a bounded correction, not permission to invent proof or redesign admin/other routes.

**Contact settlement for later Landing:** Existing Resend-backed `/api/inquiries` is primary. No public booking URL exists; do not add scheduler configuration, an iframe/provider, or an empty scheduler column. Preserve truthful stored-success/error behavior and human honeypot handling. Optional existing verified booking links may remain secondary if actually present; do not create one.
