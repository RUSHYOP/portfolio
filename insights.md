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

## 2026-09-18 — Slice 3 planning (Approach Vector + Jump)
- **Compute the sticky hold before defining scroll windows.** A `position: sticky; height: 100vh` pin inside a 150vh chapter is stationary for only `150 − 100 = 50vh` — chapterProgress 0→⅓, not the whole chapter. The controller's "dock over the first ~50%" and mobile thirds were wrong on paper; the plan-writer caught it by doing the arithmetic. Rule: hold = section − pin, then place every window inside it (desktop dock by 0.28; mobile needs a shorter 64vh pin to hold to 0.57).
- **Map first, then plan, then adversarially review the plan — each caught things the previous step could not.** The six-reader map found three implemented-but-uncalled hooks (`setSoften`, `setGlare`, the streak curves) that made slice 3 smaller; the critic corrected four map claims; the five-lens plan review found a plan test that could never go green (`arc` for a lone panel) and nine wrong test counts that would have read as clobbered tests to a fresh implementer. None of these needed code to be written first.
- **Non-discriminating tests are the plan's silent failure mode.** "Combines by max" tests probed points where `max`, `+` and a clamped sum all return the same value; every Jump test ran at velocity 0 where `max(a, b) === b`. Before writing an assertion, pick inputs where the correct and the plausible-wrong implementation differ, and compute the expected literal (`chapterAt(0.205).chapterProgress ≈ 0.25`, `jumpGlare ≈ 0.7071`).
- **Big fan-out workflows will hit the Opus session limit mid-run.** A 52-agent plan review (~4M subagent tokens) stopped at 33/52; `Workflow({ resumeFromRunId })` replayed the finished agents from cache and ran only the 19 failures. Design the scoring so a failed verifier counts as "not refuted" (conservative), and keep the script byte-identical on resume so the cache hits.
- **A single native-scroll emit can skip a 25vh chapter entirely.** Lenis's lerp or a fast flick can carry progress from `approach` straight to `orbit`; an edge detector keyed on `chapter.id === "jump"` never fires. Detect crossings by index (`prev < jumpIndex && next >= jumpIndex`), and drive continuous beats off `chapterProgress`, never off the sign-less `velocity` (a slow deliberate scroll must still burst).

## 2026-09-18 — Voyage slice 3 (Approach Vector + Jump)

- A 100vh sticky pin inside a 150vh section stays stationary for only 50vh. The usable chapter-progress window comes from `sectionHeight − pinHeight`; mobile uses a 64vh pin to give its three replacement panels 86vh of hold.
- `max()` lets two drivers share one visual control without overwriting each other: `setGlare` and Jump glare, `setSoften` and Approach soften, and velocity and hyperspace streak curves. The existing control tests stay valid while each beat enters and exits continuously.
- Velocity is instantaneous and sign-less, so a slow intentional pass can show no Jump burst. `chapterProgress` provides the monotonic 0→1 clock within the 25vh band.
- The whoosh is a one-shot 0.4s wall-clock sound on the crossing edge. Letterbox has a 900ms wall-clock floor and stays down for the remainder of the band: the 250ms idle tick renews its deadline while chapter `jump` is reported. Without renewal, an arrow-key pass lifts the bars while the tunnel grows.
- Crossing detection reads chapter indices. A native-scroll emit can jump from Approach to Orbit and never report Jump as the current chapter.
- Programmatic `scrollTo` needs epsilon and timeout clearing because a Lenis lerp tail can stall, and a no-op guard because scrolling to the current position emits nothing. Without those exits, later organic Jump beats can stay suppressed.
- Browser review exposed a compiled CSS ordering problem: writing the prefixed `backdrop-filter` last left Chrome without the standard declaration and therefore without glass blur. The restored blur changed graph visibility, prompting its offset retune. The same review found static mobile cards clipping their copy under flex shrink and inner overflow; intrinsic height fixed that. No additional browser finding remains unrecorded here or in the Task 10 report.


## 2026-09-30 — Correction after visual rejection (Codex)

- The earlier 64vh/150vh timing and arbitrary-N arc guidance is superseded. Intrinsic service rows make reading height a consequence of actual CMS content; measured physical-to-canonical mapping keeps navigation and the camera aligned without a global document-height denominator.
- A passing pose test cannot establish composition. Tests that insisted on a full burst at zero velocity codified the rejected behavior; frame invariants now check settling and bounds, with rendered screenshots as a separate review gate.
- Native scroll emits no guaranteed zero-velocity event. Clear stale movement on the existing clock, and suppress both in-flight and arrival velocity for programmatic travel; otherwise the last frame can flash or drive audio.
- SSR text in the DOM is insufficient when a client-only dismissal overlay covers it. Gate Ignition on resolved tier and enabled motion, and inspect actual no-JS screenshots as well as server markup.
- Protected hyphenated headline tokens still need emergency wrapping at narrow widths and enlarged text. Mobile navigation needs a minmax(0,1fr) content column so a visible inquiry action can wrap without widening the page.

- User instruction “follow the claudes plan” supersedes the editorial art-direction detour. Preserve the original chapter motifs and tune only observed rendering/readability defects. Retaining original typography requires an intrinsic Launch container at large text sizes; a centered fixed-height pin placed the H1 above the document at200% and was corrected without changing the type scale.
