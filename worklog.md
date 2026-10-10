# Worklog

## 2026-09-14

- Linked repo to Vercel project `portfolio`; pulled production env into `.env.local`.
- Attempted to clone Railway MongoDB locally — connection stalls/resets on the Railway proxy port from this network (TCP connects, no MongoDB wire-protocol response). Parked; running against a local `mongo:latest` Docker container on port 27018 seeded from `data/*.json` instead.
- Fixed `QuoteSection` crash when a quote is empty (`useScroll` targeting an unmounted ref) by gating render before the hooks.
- Removed the circular theme-wipe transition (looked oval on wide viewports) and its dead CSS.
- Captured baseline screenshots of all 8 screens into `screenshots/`.
- Wrote `design.md` (architecture + visual system reference).
- Brainstormed the portfolio → portfolio + consulting redesign; decisions and chapter script in `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`.

### Slices 1–2 built (branch `feat/voyage`, subagent-driven, Opus implementers + reviewers)
- 14 plan tasks executed with a fresh implementer and an independent reviewer per task; every Important finding fixed and re-reviewed before moving on.
- Foundation: `flightPath` (11-waypoint camera path, never-reverse invariant, chapter-aligned parameterisation), `voyageStore` + `useVoyage`, quality tiers with a once-per-load FPS probe, structured client logs → `/api/logs` → `logs/client.jsonl`.
- Scene: `SceneRoot` (single WebGL context), seeded `Starfield` (round sprites), seeded `WarpStreaks`, `EnergyOrb` star (FBM + fresnel + glow, world-space glow floor), `StillSky` fallback, Lenis bridge with native fallback and mount seed.
- DOM: `Telemetry`, `Letterbox`, `FlightRail`, `Dock` (ported ThreeUI proximity spring, MIT; idle-parking loop; dialog sheet with focus management), `CallToAction`, `Ignition`, `Launch`, `VoyageRoot`, `/voyage` route (noindex), `voyage.css`.
- Settings gained `heroHeadline` / `heroSubheadline` (data-driven hero copy; admin inputs are sub-project 2).
- Browser review at 1440×900 (tier `high`, probe ~121 fps) and 390×844 (tier `mid`): tuned star framing/scale/tone, fixed light-theme leaks (token pin + forced `data-theme="dark"` + attribute-rule shields), removed the legacy scroll hairline on `/voyage`, fixed the mobile hint/audio-pill collision, balanced the H1.
- Repo hygiene surfaced along the way: pre-existing `data.ts` type error fixed; `next lint` (removed in Next 16) replaced with a flat ESLint config; `Telemetry.tsx`/`telemetry.ts` case collision renamed.

### Slices 1–2 merged
- Whole-branch review clean → merged `feat/voyage` into `master` (b1f2606), production build verified, pushed. Pacing tightened to `VOYAGE_SCROLL_VH = 1250` (ea5944e) at the user's request.

### Sub-project 2 — consulting content model + CMS (branch `feat/consulting-cms`, in progress)
- Spec `docs/superpowers/specs/2026-09-14-consulting-content-model-design.md`; plan `docs/superpowers/plans/2026-09-14-consulting-content-model.md` (14 tasks). Approach B: schema-driven `defineCollection` factory + one generic admin `CollectionTab`. Resend for inquiry mail (key in `.env.local` + Vercel prod only; no dashboard templates exist, so plain-text bodies live in code).
- Task 1 `fieldSpec.ts` — pure validator. Review fix: own-property lookup (prototype-chain keys were silently accepted), exhaustive `never` switch.
- Task 2 `defineCollection.ts` — Mongoose model/DTO/CRUD/reorder. Review fixes: `published` became a real injected toggle field (`effectiveFields`), `order = max+1` with stable sort (was `countDocuments`, which collided after deletes), `DuplicateSlugError` on E11000.
- Task 3 `routeHandlers.ts` — `listAndCreate` / `byId` / `reorderRoute` / `revalidateAll`. Review fixes: `console.error` → structured `appendLog("api", …)`, one logged error boundary per handler (incl. `byId.GET`), discriminating auth-before-body tests (failed auth + malformed body → 401), real 401 cases for every guarded handler. Suite 145/145.
- Task 4 `specs/*` — five collection defs + `ALL_DEFS`, plus an invariant sweep (defaults match types, no reserved keys, unique prefixes/collections, searchable names real fields).
- Task 5 — thin route files for services/process/case-studies/testimonials, `Settings.manifesto`, `getVoyageContent` / `getCaseStudyBySlug` / `getPublishedCaseStudySlugs`. An Opus session limit interrupted the first attempt; Tasks 5+ ran on Sonnet implementers/reviewers (same review loop) until the limit reset.
- Task 6 `markdown.ts` — marked + sanitize-html allow-list. Review fix: hrefs are kept only when they match `^(https?:|mailto:)` (relative/anchor links were slipping past `allowedSchemes`), render errors logged via `appendLog`. Authoring constraint: case-study links must be absolute.
- Task 7 `rateLimit.ts` + `mail.ts` — fixed-window limiter; Resend batch send (owner notification with `replyTo` inquirer, plain-text auto-reply), never throws, env read inside the function. `RESEND_FROM` / `INQUIRY_NOTIFY_TO` / `INQUIRY_IP_SALT` added to `.env.local` and Vercel production.
- Local Mongo: Docker Desktop restarted on a kernel `mongo:latest` (8.x) refuses (SERVER-121912); `portfolio-mongo-local` recreated on `mongo:7` at 27018 and re-seeded.
- Task 8 — public inquiry POST (byte-measured 4 KB guard → JSON → honeypot → validate → email → salted IP hash + 5/hour limit → create → non-blocking mail) plus admin GET/PUT-status/DELETE. Review fixes: `clientIp()` with the Vercel-edge trust boundary documented, once-per-process structured salt warning, post-create tail isolated so a stored inquiry never returns 500. Live smoke: unauth GET 401, honeypot 201 with nothing stored.
- Task 9 `FieldInput` — one widget per field type (chips, slug live-filter, switch toggle, image upload via the existing `/api/upload`). Review fixes: focus ring restored on select/number, hyphen collapse, chip dedupe; RTL + user-event + jsdom added as devDeps with a per-file `@vitest-environment jsdom` pragma (global env stays node).
- Task 10 `CollectionTab` — generic list/editor/reorder/publish for any def; mongoose-free `collections/defs.ts` so client code never pulls the DB; `admin.upload_failed` / `admin.save_failed` client log events; auto-slug from title until edited. Review clean. Suite 265/265.
- Task 11 — Consulting / Case studies / Testimonials / Inbox tabs wired into the admin with ⌘1–9 and an unsaved-changes confirm; first browser render of the CMS UI (14 screenshots in `screenshots/admin/sub-project-2/`, 1440×900 + 390×844). Three mobile bugs found and fixed by looking: tab strip didn't scroll the active tab into view, row actions clipped past the card, image-upload row overflowed. The first implementer stalled at browser login; the browser pass was re-run as its own agent. Resend verified end-to-end with a real inquiry (owner notification + auto-reply delivered).
- Task 12 — hero headline / subheadline / manifesto inputs on the Content tab; `loadData` now `Promise.allSettled` so one failed fetch can't pin the admin on "Loading…"; `CollectionTab` `singular` prop ("New service", "Case study created"). Found by the browser pass: the long-running dev server held a stale compiled Mongoose model (`mongoose.models.X ||` never recompiles under HMR), so new schema fields were silently dropped until restart. Review clean. Suite 286/286.
- Task 13 — `/work/[slug]` case-study reading page: ISR (`revalidate = 300`) + `generateStaticParams` over published slugs, `notFound()` on an unknown or unpublished slug, server-sanitised markdown body, metrics/stack/diagram blocks, `work.css` pinning its own dark palette (one amber accent) so a light-theme toggle can't bleed in. `metadata.ts` builds the per-case-study `title` + `description`.
- Task 14 — `scripts/seed.ts` seeds 3 services + 4 process steps and the `manifesto` setting; docs refreshed (`worklog.md`, `insights.md`, `design.md`, `README.md`); closing verification run.
- Whole-branch review (Opus, 35 commits) → "ready to merge after fix wave": 1 Critical (a failed `/api/settings` load left the Content tab on defaults, and Save All would have overwritten every live setting), 8 Important. One fix subagent closed F1–F12 in 11 commits: `appendLog` mirrors to stdout on a read-only FS (production logs now reach Vercel); owner notification sent independently of the auto-reply; admin load failures toast + Save guarded + 401 → login; markdown `h1` demoted to `h2`; `/work/[slug]` noindex + openGraph; dead `Cache-Control` constants removed (next.config's `/api/*` rule wins on the wire); `PUT /api/settings` whitelisted + revalidates `/` and `/voyage`; seed routed through the validator; `logApiError` shared; empty-update 400; `React.cache` on the case-study read. Suite 313/313, build green.
- Deferred minors and post-merge follow-ups live in `.superpowers/sdd/progress.md` and `.superpowers/sdd/final-review.md`.

### Sub-project 2 deliverables (14 tasks)
- `src/lib/collections/*` — `fieldSpec` validator, `defineCollection` factory, `routeHandlers`, five collection specs (`services`, `processSteps`, `caseStudies`, `testimonials`, `inquiries`) + mongoose-free `defs.ts`.
- API — `/api/{services,process,case-studies,testimonials}` (+ `/[id]`, `/reorder`) and `/api/inquiries` (+ `/[id]`); public GETs are published-only, admin GETs use `?all=1`.
- Mail/abuse — `src/lib/mail.ts` (Resend batch: owner notification + inquirer auto-reply), `src/lib/rateLimit.ts` (5/hour per salted IP hash), 4 KB body cap, honeypot.
- Admin — generic `CollectionTab` + `FieldInput`, `ConsultingTab`, `InboxTab`, Content-tab hero/manifesto inputs, nine tabs with ⌘1–9 and an unsaved-changes confirm.
- Public — `getVoyageContent()` / `getCaseStudyBySlug()` / `getPublishedCaseStudySlugs()` in `data.ts`, `/work/[slug]`, `src/lib/markdown.ts` (marked + sanitize-html allow-list).
- Env vars added (`.env.local` + Vercel production, values never committed): `RESEND_API_KEY`, `RESEND_FROM`, `INQUIRY_NOTIFY_TO`, `INQUIRY_IP_SALT`.
- Seed decision: `scripts/seed.ts` clears and re-inserts `services` / `processsteps` (defaults, like projects/skills/settings) but never touches `casestudies`, `testimonials` or `inquiries` — those are author/visitor data.

### Task 14 closing verification (2026-09-15)
- `npm run typecheck` 0 errors · `npm test` 291/291 in 28 files · `npm run build` succeeds (`/work/[slug]` listed as SSG + 5m revalidate, `/work/pricing-engine` prerendered).
- `npm run lint` — 16 problems (10 errors, 6 warnings), **all pre-existing** in files this branch never touched (`TypewriterText`, `ThemeToggle`, `ThreeBackground`, `CustomCursor`, `CinematicIntro`, `FilmGrain`, `ProjectsClient`, plus `admin/page.tsx:337` which dates to 668dac3). Linting sub-project 2's files alone: 0 problems.
- Live checks against the dev server: `/api/services` 3, `/api/process` 4, `/api/case-studies` 1 (published only), `/api/testimonials` 0 public / 1 with `?all=1` authenticated; `/api/inquiries` 401 unauthenticated, 2 items authenticated; `/work/pricing-engine` 200, `/work/nope` 404; honeypot POST 201 with the inquiry count unchanged; a 5 KB body 413. Unpublishing `pricing-engine` dropped the public list to 0 and `/work/pricing-engine` to 404; restored afterwards.

### Sub-project 2 merged (2026-09-15)
- Whole-branch review → 12-item fix wave → re-review "Ready to merge" → merged into `master` (fast-forward to 063e2d5), 313 tests + typecheck + production build verified on the merged result, pushed. Post-merge follow-ups recorded in `.superpowers/sdd/final-review.md`.

## 2026-09-18

### Slice 3 — Approach Vector + Jump (branch `feat/voyage-slice-3`, planning)
- Understand phase as a workflow: six parallel subsystem readers (scene core, set pieces, camera/scroll, DOM, audio, data/tests) → synthesized map `.superpowers/sdd/slice3-map.md` (497 lines) → completeness critic (verified ~60 claims against source; 4 corrections; verdict sufficient). Key facts: waypoints/geometry for chapters 02/03 already exist (approach 0.08–0.20 = 150vh, jump 0.20–0.22 = 25vh); `Starfield.setSoften`, `EnergyOrb.setGlare`, `WarpStreaks` velocity curves exist but are uncalled; no whoosh asset (the synth `playWhoosh` already sweeps upward); `getVoyageContent()` has zero callers.
- User decisions: services panels data-driven N tuned for 3, CMS rendered as-is; Jump beat fires on forward organic crossings every time, never backward, suppressed during programmatic `scrollTo`; polish = additive sprites + existing whoosh (no bloom pipeline, no ambient sweep); Playwright integration tests deferred to slice 8 (spec §7 deviation).
- Plan written by an Opus agent from the map + decisions (`docs/superpowers/plans/2026-09-18-voyage-slice-3.md`, 11 tasks). It caught an arithmetic error in the controller's docking windows — a 100vh sticky pin inside a 150vh section holds for only 50vh (chapterProgress 0→⅓) — and re-derived the dock timing (desktop by 0.28; mobile 64vh pin with one-panel-at-a-time replacement over [0.04, 0.56]).
- Plan review as a workflow: five lenses (signature fidelity, test breakage, decision compliance, format rigour, cinematic/perf/a11y) → two adversarial skeptics per Important → synthesis. Result: 1 Critical (a plan test asserting `arc: 0` for a lone panel while the code returned 1), 8 Important (incl. a `void services;` bridge conditioned on a fact no subagent holds; letterbox lifting mid-burst on slow scroll; inactive mobile glass panels still paying an 18px backdrop blur; nine wrong test counts), 15 Minor; 2 refuted; 7 deferred to execution review. Hit the Opus session limit mid-run; resumed from cache after the reset.

### Next
- Apply the 24 plan fixes → verify → commit the plan → execute Tasks 1–11 sequentially (one Opus implementer at a time, independent review after each; controller runs the browser review at 1440×900 and 390×844 with screenshots to `screenshots/voyage/slice-3/`).
- Then: whole-branch review → merge; slice 4 (Orbit) plan; Resend key rotation still offered.

## Slice 3 — Approach Vector + Jump (feat/voyage-slice-3)

Completed 2026-09-30. Task evidence and independent reviews are in `.superpowers/sdd/codex-recovery/`; all 16 desktop/mobile/still captures are committed under `screenshots/voyage/slice-3/`.

- Task 1: Added a programmatic-scroll flag to `voyageStore`, with epsilon, timeout and no-op exits.
- Task 2: Added the pure `decideJumpBeat` chapter-index crossing detector and hold decision.
- Task 3: Added chapter-progress hyperspace curves to `WarpStreaks`, combined with existing velocity curves.
- Task 4: Added Jump glare and an additive star flare to `EnergyOrb`; combined glare channels with `max`.
- Task 5: Added the Approach focus pull in `Starfield`, preserving its existing soften control with `max`.
- Task 6: Added seeded, per-tier `Topology` to the existing `SceneRoot` pieces array.
- Task 7: Wired published services from `page.tsx` through `getVoyageContent()` to `VoyageRoot` and tested the data read.
- Task 8: Added data-driven service panels, staggered desktop docking and mobile single-panel replacement. The mobile Approach pin is 64vh so its stationary window lasts 86vh of the 150vh section.
- Task 9: Added the bare 25vh Jump section and `useJumpBeat`, with a one-shot synthesized whoosh and letterbox held through the band.
- Task 10: Captured and inspected all 16 required views; verified organic skipped-band/reverse/keyboard crossings, the programmatic CTA, reduced motion and audio scheduling. Fixed compiled glass blur declaration order, mobile still-card clipping and graph placement; independent reviews approved each fix. Camera transition reads as a quick cut-like recenter, without smear; no lookAt snap was needed.
- Task 11: Closed the documentation and verification gate. Amended the local ignored `slice3-decisions.md` at its two superseded pin/capture lines: 64vh Approach pin and the `[0.04, 0.56]` mobile solo window, with p10/p12/p14 captures.

Launch-only one-second probes were 121 FPS high→high on desktop and 121 FPS mid→mid on mobile. The mobile-emulated native-scroll smoke pass measured 240 frames, median 8.3ms, p95 9.9ms, max 10.3ms; it does not certify target-phone or chapter 02/03 performance. Browser review retuned `Topology.OFFSET_X` −2.6→0 and `OFFSET_Y` 1.4→−9; `OFFSET_Z` stayed −34. The glass declarations were reordered to retain both prefix and standard blur, and static mobile cards now flow without clipping.

Closing checks: `npx tsc --noEmit` 0 errors; `npx vitest run` 398 tests in 35 files passed; `npm run build` succeeded with `/voyage` in the route table. `npx eslint .` reports the existing 16 problems (10 errors, 6 warnings) outside Slice 3. The prescribed scoped command `npx eslint src/scene src/components/voyage src/lib src/app/voyage` exits 0 with 2 pre-existing `src/lib` warnings (`auth.ts`, `mongodb.ts`), and no errors; it is not globally clean.

Spec §8, chapters 02/03: desktop and mobile panels/Jump were reachable and legible in the captures; `Topology` joins the single existing WebGL scene, without a composer; the Launch-window probe retained high/mid tiers; browser review found zero JavaScript/app console errors. In `still`, `StillSky` replaces the scene, Services drops its pin and shows all panels, and the inert Jump keeps its 25vh span. Browser asset/preload warnings remain for Slice 8. Audio verification confirms whoosh scheduling and mute gating, not subjective sound quality.

### Next

Slice 4: Orbit / process ring. Carry forward the tuned Topology offsets (X 0, Y −9, Z −34) and the 64vh Approach pin/mobile solo window. `Launch.tsx` still lacks a `useReducedMotion()` guard (GAP-3), and Playwright integration tests remain deferred to Slice 8 (spec §7). Slice 8 also owns measured chapter 02/03 frame cost, final device performance, root asset/preload cleanup and the brief still-Ignition exit fade. Whole-change review and remote delivery follow the remaining slices; this branch has not been pushed yet.


## 2026-09-30 — Visual gate reopened: restrained cinematic correction (Codex)

The user's visual rejection superseded the Slice 3 arc, mobile replacement, decorative graph and progress-held white burst. Earlier acceptance and “carry forward 64vh” notes above are historical, not current approval. The correction introduces intrinsic editorial Services in every tier, a measured physical/canonical scroll bridge, readable SSR foreground, smaller Launch hierarchy, mobile inquiry action, quieter navigation and one subdued scene. No CMS records or dependencies were added.

Focused tests were first made red for the missing geometry module and fixed-height N=1/6/10 Services; those now pass. New bridge integration tests cover native/Lenis navigation after reflow, exact arrival suppression and native idle settling. Frame tests cover delta-time-independent decay, programmatic suppression and projected orb bounds. Production screenshots, full verification and remaining gate status are recorded in `.superpowers/sdd/codex-recovery/design-correction-report.md`. The visual gate remains reopened until controller browser and independent reviewer approval; later chapters must integrate the measured layout rather than restore fixed reservations.

## 2026-09-30 — Restore Claude design authority

Latest instruction: follow Claude’s plan. Restored the approved service arc, topology, progress-driven hyperspace Jump and letterbox, fixed-world star, telemetry, amber rail marker, capsule dock and original hero typography in `7dc05ee`; retained measured geometry, visible server content, keyboard focus handling and text-zoom fixes. The September30 follow-on plans now explicitly implement the original Claude spec; their editorial override is superseded. Resend inquiry choice remains binding.

Production build passed. Controller inspected 11 desktop/mobile/fallback captures in `screenshots/voyage/claude-restoration/`: measured positions exact, no horizontal overflow or app page errors, one animated scene canvas, all static content readable. Local Launch probe120fps at desktop high/mobile mid; no physical-phone claim. Forward Jump letterbox/beat verified, backward/programmatic suppression retained. Full implementation test run414 passed, focused final changes passed. Orbit and the remaining roadmap still pending.
