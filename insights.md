# Insights

Reviews, observations, and lessons — not task tracking (see `worklog.md`).

## 2026-09-14 — Pre-redesign review

- **Latent Framer Motion hazard:** any component that calls `useScroll({ target: ref })` and *then* conditionally returns `null` leaves the ref unhydrated and throws. Rule adopted: gate rendering *before* ref-dependent hooks (see `QuoteSection` → `QuoteSectionContent` split). Worth grepping for on every new scroll-linked component.
- **Seed data ≠ production data:** `data/settings.json` has no `quote1`/`quote2`, which is exactly what surfaced the bug above. Empty-state paths need to be designed, not assumed — the redesign spec makes "chapter hides when its data is empty" an explicit rule.
- **Theme-wipe:** clip-path `circle()` transitions read as ovals on 16:9+ viewports because the circle grows in CSS px against a non-square canvas. Removed rather than fixed — dark-only is coming anyway.
- **ThreeUI reality check:** its components each own a renderer and the npm package bundles Three 0.128 + 0.165 beside our 0.169. Great as *reference source* (MIT), poor as a stack of drop-ins. Hence approach C: port shaders into one scene, import React widgets only where they're isolated (dock).
- **Network:** outbound to Railway's Mongo proxy port is reset after the TCP handshake on this network while HTTPS works — treat production-DB access from this machine as unreliable; keep a local seed path healthy.
