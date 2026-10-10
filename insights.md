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

## 2026-09-15 — Consulting CMS (sub-project 2) review

- **One spec, four collections.** `defineCollection(def)` generates the Mongoose schema, the DTO mapper, CRUD + reorder, the validator and — via the mongoose-free `defs.ts` — the admin UI. Four collections that would each have needed a model, a route trio and a bespoke tab came to ~2k lines of would-be duplication avoided; the payoff is that client and server validate through *the same* function, so they cannot drift.
- **Markdown is sanitised server-side only.** `src/lib/markdown.ts` (marked + a sanitize-html allow-list) runs in the `/work/[slug]` server component; no raw case-study body ever reaches the client. Hrefs survive only if they match `^(https?:|mailto:)` — `allowedSchemes` alone lets relative and anchor links through — so case-study links must be absolute.
- **Resend `batch.send` is all-or-nothing.** A single rejected recipient fails the whole batch: an invalid auto-reply address silently killed the owner notification too. Send the owner notification and the auto-reply as separate calls, or accept that a bad inquirer address costs you the lead.
- **Resend rejects `example.com` recipients** outright, so smoke tests need a real inbox (or the honeypot path, which stores nothing and sends nothing).
- **Resend's dashboard is not a content store.** The API-keys CSV export only holds a key *preview*, and the `Templates` / `Broadcasts` APIs come back empty for this account — email bodies live in code (`src/lib/mail.ts`) as plain text, versioned with everything else.
- **`appendLog` no-ops on Vercel.** The serverless filesystem is read-only, so anything written to `logs/` exists in local dev only. Production observability needs a console mirror (structured JSON to stdout) — file logs are a dev convenience, not the architecture.
- **`mongoose.models.X || model()` never recompiles under Next HMR.** A long-running dev server holds the *first* compiled schema; new fields are silently dropped on write with no error anywhere. Restart `next dev` after every schema edit — and suspect this first when a field "saves" but never comes back.
- **DevTools MCP `resize_page` clamps around ~500px**, so it cannot reproduce a 390px phone. True mobile screenshots need Playwright with a real device viewport; three mobile-only bugs (tab strip not scrolling the active tab into view, row actions clipping past the card, upload row overflow) were only visible there.
- **Published-only is a data-layer property, not a page one.** The public list handler, `getVoyageContent()` and `/work/[slug]` each filter independently; the check that actually proves it is flipping `published` on a real document and watching the list drop to 0 *and* the page 404 — a passing curl against published content proves nothing.
