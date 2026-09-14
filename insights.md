# Insights

Reviews, observations, and lessons — not task tracking (see `worklog.md`).

## 2026-09-14 — Pre-redesign review

- **Latent Framer Motion hazard:** any component that calls `useScroll({ target: ref })` and *then* conditionally returns `null` leaves the ref unhydrated and throws. Rule adopted: gate rendering *before* ref-dependent hooks (see `QuoteSection` → `QuoteSectionContent` split). Worth grepping for on every new scroll-linked component.
- **Seed data ≠ production data:** `data/settings.json` has no `quote1`/`quote2`, which is exactly what surfaced the bug above. Empty-state paths need to be designed, not assumed — the redesign spec makes "chapter hides when its data is empty" an explicit rule.
- **Theme-wipe:** clip-path `circle()` transitions read as ovals on 16:9+ viewports because the circle grows in CSS px against a non-square canvas. Removed rather than fixed — dark-only is coming anyway.
- **ThreeUI reality check:** its components each own a renderer and the npm package bundles Three 0.128 + 0.165 beside our 0.169. Great as *reference source* (MIT), poor as a stack of drop-ins. Hence approach C: port shaders into one scene, import React widgets only where they're isolated (dock).
- **Network:** outbound to Railway's Mongo proxy port is reset after the TCP handshake on this network while HTTPS works — treat production-DB access from this machine as unreliable; keep a local seed path healthy.

## 2026-09-14 — Voyage slices 1–2 review

- **Plan code is a starting point, not evidence.** Of 14 tasks, 9 needed a fix pass, and most Important findings were defects in the plan's own verbatim code (NaN passthrough in `clamp01`, `logClient` able to throw, client-overridable server `ts`, unseeded streaks, uncancelled RAF, missing Lenis mount seed, FPS-probe cascade, light-theme token leak, Space-skip scrolling the page). Independent review after every task earned its cost.
- **Camera framing needs geometry, not taste.** "Star low-right" turned into arithmetic: the launch look-offset had to be big enough to clear the H1 on desktop (~11° right) yet inside a portrait viewport's ~15° horizontal half-FOV. Every future set-piece placement should be checked at both aspect ratios before committing a constant.
- **Two growth curves compound.** Camera approach already magnifies the star ~6×; an intrinsic 0.25→6 `starScale` on top made it fill a third of the frame by 50%. Tuned to 2.4 and let The Pilot's glare deliver the "fills the frame" beat.
- **Dark-only is not a token problem alone.** Pinning CSS variables on `.voyage-root` fixed `var(--…)` reads but not `[data-theme="light"] .x` attribute rules — those needed a forced `data-theme="dark"` plus scoped shields. Removing the toggle in slice 8 makes the shields dead code; keep them until then.
- **three.js `Color.r/g/b` are linear-sRGB** (ColorManagement default since r152). Deriving canvas `rgba()` from them shifts amber to orange-red; bit-unpack the hex instead.
- **macOS case-insensitive FS bites late.** `Telemetry.tsx` beside `telemetry.ts` typechecked for five tasks and only failed when the component was first imported. Never pair a component and helper differing only by case.
- **Idle-park RAF loops carefully.** A literal "reschedule only while dirty" would have re-armed forever on reduced-motion devices because `reset()` sets `dirty` unguarded from `pointerleave`; the guard belongs in the single sink (`draw`), not in each setter.
- **Node tests can't see textures, sprites or DOM** — round point sprites, glow scale, dock spring, Ignition timing and the mobile sheet were all verified only in the browser. The screenshot baselines are the regression net for those.
