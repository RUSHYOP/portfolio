# Restrained cinematic correction — implementation report

Date: 2026-09-30. Author: Codex. Base: `96dff18`. Status: implementation and automated checks complete; production browser/reviewer gate pending controller. This report does **not** close visual acceptance or authorize chapter expansion by itself.

## Changes

- Replaced rotated glass cards, mobile solo replacement and count-dependent timing with intrinsic editorial Services for every tier. Desktop index/title and detail columns collapse into authored single-column mobile flow. Each promise, outcomes list and engagement appears once. N=0 temporarily preserves its empty default interval; N=1/6/10 uses real content height without fixed reservations, horizontal strips or nested readers.
- Pulled measured physical/canonical geometry forward. Local bridge-owned segments map both directions; native and Lenis use the same conversions. ResizeObserver tracks section/content/font reflow and window resize. The root has no fixed minimum travel; Surface retains its single final viewport tail. Store/camera/rail public APIs and forward camera curve remain intact.
- Server-rendered foreground now contains the actual hero, actions and service records before tier selection. Launch has no hidden initial motion. Ignition mounts only after tier resolution and renders only when enabled, preventing no-JS or still overlays from obscuring content.
- Reduced Launch type scale and measure, protected ordinary hyphenated words while permitting emergency text-zoom wrapping, exposed the mobile “Discuss a project” inquiry action, removed dock magnification and theme/telemetry clutter, and retained labelled audio plus sheet focus restoration. Added cyclic Tab/Shift-Tab handling so the mobile dialog does not leak keyboard focus. CTA arrow spacing accounts for MagneticButton's wrapper.
- Omitted decorative Topology from the single scene registry on both desktop and mobile. The primitive remains dormant code with its lifecycle tests; no graph represents client evidence. Lowered star/streak density and brightness, added deterministic streak length/brightness variation and additive endpoint fading, and enabled antialiasing within existing DPR caps.
- Jump streaks and amber flare now follow velocity and settle exponentially using delta time. Native stale velocity resets after idle. Store suppression includes the programmatic arrival event; Lenis bridge suppression continues until its completion callback, with timeout protection, so canonical epsilon cannot flash acceleration during the remaining physical tail. Audio/FOV share suppressed velocity.
- Orb core and halo are bounded in projected viewport terms, with Launch framing clear of the copy. Static fallback replaces hard amber SVG discs with a contained radial glow and dim stars. Jump no longer obscures navigation with letterbox bars; its existing hold gates premature placeholder labels.
- Updated `design.md`, `worklog.md` and `insights.md`: the visual gate is explicitly reopened, and previous 64vh/150vh/card-strip/arbitrary-N claims are historical and superseded. Future Slice 4 must integrate the measured natural layout rather than replace it.

No dependencies, CMS records, fake case evidence, schedulers or email sends were introduced. Existing inquiry integration remains for later Landing work.

## Verification

- Red phase recorded: geometry tests failed for the absent module; N=1/6/10 Services tests failed on the old `150vh` height.
- Focused geometry/store/camera/component/frame run: **79 passed**. Geometry exercises monotone mappings and inverse round trips with variable Approach/Orbit heights, exact boundaries, +.001 navigation, restored scroll, and the Surface tail once.
- Added bridge integration: native and mocked Lenis navigation after measured reflow, arrival suppression, native idle settling, cleanup, and physical Lenis tail suppression. Latest focused bridge/orb/SSR run: **14 passed**.
- SSR regression renders the real root without a detected tier: one hero, one service heading, actual copy/actions, no booting blank, no Ignition overlay and no phantom root/Approach reservation.
- Full suite: **39 files / 391 tests passed**, before adding the final Lenis-tail and modal-keyboard regressions. That regression subsequently passed in the 14-test focused run; a subsequent modal-keyboard regression also passed (**1/1**). Current suite contains **393 tests in 40 files**.
- `npm run typecheck`: passed after behavioral changes.
- Touched-file ESLint: passed. `git diff --check`: passed after final whitespace cleanup.
- Production build: passed, including 25 generated pages. Existing `baseline-browser-mapping` stale-data warnings remain; no dependency update was introduced for this visual correction.
- Global `npm run lint`: **16 findings, 10 errors / 6 warnings**, all outside changed app files. Existing findings cover admin/project UI, ThemeToggle, ThreeBackground, TypewriterText, older motion overlays, auth and mongodb. This is not a clean global lint baseline.

## Browser collaboration and evidence

The controller owns browser automation and captures under `screenshots/voyage/design-correction/`; this implementation agent did not compete for the browser. I personally inspected draft Launch, desktop Services and paused mobile Jump images. The editorial hierarchy materially improves authored reading order, and the paused Jump image has no static spokes or clipped white glare. Drafts precede some final polish and are not production acceptance evidence.

Controller feedback drove additional fixes: CTA arrow crowding, protected-token/nav overflow at 320px with 200% text, a no-JS Ignition occlusion invisible to a DOM-only visibility test, static hard-disc fallback, and fixed atmosphere/audio bounds after mobile layout-viewport expansion. Fixed surfaces now follow CSS `100vw` rather than retaining an expanded inset-based viewport. Final production screenshots and metrics are the controller's gate.

Controller preliminary checks reported all ten temporarily cloned long service rows visible without internal clipping and exact Approach-bottom/Jump-top adjacency. Temporary browser fixtures did not alter CMS data. These checks do not substitute for the requested final N=6/10, resized/font-reflow and 200% production matrix.

## Outstanding gate / limits

Pending controller record: matched production desktop/mobile Launch and first/middle/last Services; Jump entry/mid/exit plus slow/fast/pause recording; fresh 320px/200% overflow recheck; N=6/10 long-copy browser matrix; keyboard/menu/contact navigation; reduced motion, WebGL unavailable/context loss; one live WebGL context; measured +.001 navigation after resize; true document scroll-limit endpoint; CLS < .05 and actual hardware FPS. Antialiasing and reduced primitive counts have been implemented but hardware performance is not inferred from unit tests. Independent reviewer approval remains required before Orbit implementation.

Later chapters remain placeholders by design in this bounded correction, including Landing; the visible inquiry navigation currently travels to that canonical section. No real inquiry was sent. The existing jump hook's edge/whoosh contract remains; bars are deliberately omitted during Jump. N=0 omission and broader chapter hydration behavior remain later integration work.
