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

- Plan fixes applied (24 items, +270 lines) and verified by a second Opus agent that replayed four tasks' RED phases empirically — eight quoted vitest error strings were wrong and were replaced with the measured ones. Plan committed; execution starts at Task 1.

### 2026-09-30 — reverted Codex attempt (recorded 2026-10-09)
- Forty commits implemented slice 3 and part of Orbit outside this workflow, then `revert: undo Codex Voyage changes` restored the tree to 063e2d5 (diff empty). Decision 2026-10-09: ignore it and execute the reviewed plan from scratch; the reverted commits remain in history as reference only.
- Environment had lapsed after three weeks: `node_modules` gone, the Mongo container gone, dev server down. Restored with `npm ci`, a fresh `mongo:7` on 27018 + `npm run seed`, `npm run dev`; baseline re-established at 313/313, typecheck 0.

### 2026-10-10 — slice 3 wave 1 (parallel)
- User directive: parallelize the remaining work before a weekly usage reset. Tasks 2–8 were implemented concurrently by seven Opus agents in isolated git worktrees (`.worktrees/task-N`, branches `slice3/task-N` from be538a0, `node_modules` symlinked), each reviewed independently by a fresh Opus agent; Task 1 reviewed alongside. All eight reviews approved; one fix pass (Task 3: the brief's `converge` was a per-frame local and snapped from ~0.55 to 0 on the first frame after Jump while streaks were still ~60 units long — now an eased field with a same-instance exit test). Task 4's implementer caught a contradiction inside the brief (burst opacity gated by ignite in the design note, not in the snippet) and followed the note; the reviewer upheld it.
- Merged in order 2, 5, 6, 7, 4, 3 with the suite green after each (371 tests / 33 files, typecheck 0). Git identity switched to RUSHYOP (the machine had been left on a different account; 43 local commits re-authored) and the branch pushed.
- Cross-task catches recorded for Task 9/10: native `scrollTo` animates (not instant) because `globals.css` sets `html { scroll-behavior: smooth }`; the letterbox hold only renews while live, so a ≥900 ms emit gap while parked in the band lifts the bars.

## Slice 3 — Approach Vector + Jump (feat/voyage-slice-3)

Executed 2026-10-10 from the reviewed plan `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. Tasks 2–8 ran in parallel Opus worktrees per user directive (weekly quota reset), each independently reviewed; Task 1 was reviewed alongside them; Task 9 ran sequentially; Task 10 was the controller's browser pass. Shas below are the ones on this branch (the 43 pre-push commits were re-authored to RUSHYOP, so worktree reports quote older shas for Task 1).

### Per task
- **Task 1 — `voyageStore` programmatic flag** (`be538a0`). `VoyageState.programmatic`, `PROGRAMMATIC_EPS = 0.002`, `PROGRAMMATIC_TIMEOUT_MS = 2000`; three exits (within ε, past the `Date.now()` deadline, replaced by a later `scrollTo`); `scrollTo` is a no-op without a scroller and does not arm when already within ε. 8 new tests.
- **Task 2 — `decideJumpBeat`** (`c724603`). Pure decision function in `src/components/voyage/jumpBeat.ts`: forward crossing by chapter *index* (`prev < JUMP_INDEX && next >= JUMP_INDEX`), never backward, suppressed when either emit is programmatic, `JUMP_HOLD_MS = 900` minimum hold renewed while the store still reports `jump`. 14 new tests.
- **Task 3 — WarpStreaks hyperspace** (`d621644`, fix `3813b73`). `hyperLength` / `hyperOpacity` / `hyperConverge` over the Jump's chapterProgress, combined with the velocity curves by `Math.max`. One fix pass: `converge` was a per-frame local and snapped ~0.55 → 0 on the first Orbit frame while streaks were still ~60 units long; it is now an eased field with a same-instance exit test. 8 + 1 new tests.
- **Task 4 — EnergyOrb Jump flare** (`2dfdc63`). `jumpGlare(t) = sin(π·t)` combined with `setGlare` by `max`; additive burst sprite (`BURST_WORLD = 26`). Implementer followed the brief's design note (`opacity = jump × ignite`) over its snippet; reviewer upheld. 6 new tests.
- **Task 5 — Starfield focus pull** (`40c3c40`). `approachSoften` (rise 0.02→0.22, hold to 0.45, fall to 0.65) eased into a second `chapterSoften` field, combined with `setSoften` by `max`. 6 new tests.
- **Task 6 — Topology set piece** (`264bfaf`). `src/scene/chapters/Topology.ts`, own `mulberry32` seed, `TierSettings.topologyNodes` 42 / 22 / 0, node-by-node assembly via `setDrawRange` with nearest-previous-neighbour edges, camera-relative placement, joined `SceneRoot`'s `pieces` array. 13 new tests + 2 `quality.test.ts` assertions.
- **Task 7 — data wiring** (`8a4360b`). `/voyage` reads `getVoyageContent()` and threads `services` to `VoyageRoot`; thin `data.voyage.test.ts` (characterisation test, green on first run; the real red was `tsc`). 2 new tests.
- **Task 8 — service panels** (`9bfba92`, fix `08599eb`). `servicesLayout.ts` (`panelPose`, `STATIC_POSE`), `Services.tsx`, Approach CSS (desktop arc docked by chapterProgress 0.28; mobile 64vh pin with one-panel replacement over `[0.04, 0.56]`). One fix pass: the crossfade width is now `min(SOLO_CROSSFADE × slot, SOLO_START)` (`SOLO_CROSSFADE = 0.18`; the cap only bites for N < 3), so a lone panel is dark before the chapter, and `data-solo-off` panels get `pointer-events: none`. 12 + 3 layout tests, 9 component tests.
- **Task 9 — VoyageRoot wiring** (`f90dbd8`). `<Services>` + a bare 25vh `<section id="jump">` (no pin, no label, no `aria-label`), `useJumpBeat(animated)` OR'd into `<Letterbox>`, whoosh + `voyage.jump` log on fire, `voyage.jump` added to `LOG_EVENTS`. Hook uses `performance.now()` (controller instruction) and clears the letterbox on cleanup. 1 new test.
- **Task 10 — browser review** (controller; baselines `1fec812` + recapture `a2c6b1c`). Desktop 1440×900 at p08 / p10 / p12 / p16 / p195 / p21 / p23; mobile 390×844 (true device emulation via DevTools `emulate`, tier `mid`) at p08 / p10 / p12 / p14 / p16 / p195 / p21 / p23; `mobile-still.png` (reduced motion → tier `still`, stacked panels). All in `screenshots/voyage/slice-3/`.
- **Task 11 — docs + closing verification** (this section, `insights.md`, `design.md`).

### Browser review verdicts
- **FPS probe** (Launch-window sample only — it cannot see chapter 02/03 frame cost): desktop 120–121 fps, `high → high`; mobile emulation 121 fps, `mid → mid`. Baseline tier held through Launch on both.
- **lookAt swing** p21 → p23: reads as a **cut** behind the bars, not a smear. No one-frame pose copy / lerp override needed.
- Checklist: panels legible at both sizes, no horizontal overflow (`scrollWidth` 390); the arc reads (middle lifted 26 px, outer tilted); the topology reads behind the middle panel after the retune; starfield soften visible at p12; Jump = letterbox → tunnel → flare verified at p21 on both tiers, flare absent at p23; console: zero app errors/warnings (only Next's dev `<link rel=preload>` warning).
- Smoke cases: A backward orbit → jump never fires; B "Book a call" CTA sweep 0 → 0.841 never drops the bars; C reload at Landing and the `/voyage#orbit` deep-link never fire; D a 40 px arrow-style pass drops the bars after the crossing and holds ≥ 0.9 s past the band. `voyage.jump` log lines: 4, all genuine forward organic crossings.
- Not verified: the audio whoosh by ear (headless, the engine starts muted) — the fire path is proven by the log line. p23 captures landed after the hold had lifted (MCP round-trip ≈ 1.4 s) — accepted; the bars-down state is p21. First load renders the Space Grotesk fallback (Styrene A is `font-display: optional`); baselines are in the cached-font state.

### Retuned in the browser review (each its own commit)
| Commit | Constant / rule | Old | New | Why |
|---|---|---|---|---|
| `c979e44` | `backdrop-filter` declaration order, `voyage.css` (4 sites) | `backdrop-filter` then `-webkit-backdrop-filter` | `-webkit-backdrop-filter` then `backdrop-filter` | lightningcss drops the standard property when the prefixed one follows, and Chrome ignores the prefixed alias — **no `.glass` panel or the dock had ever blurred since slice 1** |
| `49f0eba` | `Topology.OFFSET_Z` | −34 | −24 | with the glass now blurring, the graph vanished behind the middle panel |
| `49f0eba` | `Topology.OFFSET_X` | −2.6 | −0.9 | at −24 the graph projected left of the middle panel |
| `80d31d4` | mobile Approach pin `padding-top` | none | 4.5rem | the dock pill overlapped the panel header; inner padding keeps the sticky hold (a `top` offset would shorten it) |
| `8e79bef` | still-tier mobile `.service-panel` | inherited `flex: 1 1 0; overflow-y: auto` | `flex: 0 0 auto; height: auto; overflow: visible` (+ `.services` `flex: 0 0 auto`) | three 355 px panels were split to 235 px each and clipped mid-sentence |

### Plan amendments made during execution
- Task 3: Jump-exit convergence is eased (`private converge`), not a per-frame local.
- Task 4: burst `opacity = jump × ignite` (design note over snippet).
- Task 8: crossfade capped at `SOLO_START`; controller accepted the mobile fade-out ending at chapterProgress 0.60 — 0.027 past the 64vh pin's release at 0.573, while the block is already moving.
- Task 9: `performance.now()` instead of `Date.now()` for the hold clock; cleanup resets the letterbox.
- `.superpowers/sdd/slice3-decisions.md` (gitignored, amended on disk only): line 18 now records the **64vh** Approach pin (86vh of hold → chapterProgress [0, 0.573], no change to `sectionHeightVh` / offset identity / `VOYAGE_SCROLL_VH`); line 31 now records the `[0.04, 0.56]` replacement window with an 18%-of-slot crossfade and the mobile p10 / p12 / p14 captures (p18 would photograph an empty pin). No new binding decision was added for these constants.

### Closing verification (2026-10-10, HEAD `a2c6b1c`)
- `npm run typecheck` — 0 errors.
- `npm test` — **396 passed / 35 files** (baseline 313 / 30 at `063e2d5`: +83 tests, +5 files).
- `npm run lint` — 16 problems (10 errors, 6 warnings), the pre-existing repo baseline in files this branch never touched (errors: `TypewriterText` ×4, `ThemeToggle`, `ThreeBackground`, `CustomCursor`, `CinematicIntro`, `FilmGrain`, `admin/page.tsx:357`; warnings: `ProjectsTab.tsx` ×3, `ProjectsClient`, `src/lib/auth.ts:71`, `src/lib/mongodb.ts:9`).
- `npx eslint src/scene src/components/voyage src/lib src/app/voyage` — 0 errors, 2 warnings, both in pre-existing untouched files (`auth.ts:71`, `mongodb.ts:9`). `npx eslint` over exactly the 26 `src` files this slice changed — **0 errors, 0 warnings** (its one output line is the 'file ignored' notice for `voyage.css`, which ESLint does not lint).
- `npm run build` — succeeds (`.env.local` supplied `MONGODB_URI`); `/voyage` listed as static, revalidate 5m.

### Spec §8 check — chapters 02 and 03 only
| Criterion | Verdict | Evidence |
|---|---|---|
| Reachable and legible on desktop and mobile | PASS | 7 desktop + 8 mobile captures in `screenshots/voyage/slice-3/`; no clipped copy, `scrollWidth` 390 at 390×844 |
| Exactly one WebGL context for the scene | PASS | `SceneRoot.tsx:46` is the only renderer on `/voyage`; `Topology` joined `pieces` (`SceneRoot.tsx:65`); no `EffectComposer` anywhere in `src`. (`ThreeBackground` is `/` only; `quality.ts` `hasWebGL()` releases its probe context immediately.) |
| ≥ 55 fps desktop at `high` / ≥ 45 fps mid-tier phone | PASS (scoped) | Baseline tier held through Launch: desktop 120–121 fps `high → high`, mobile *emulation on a desktop GPU* 121 fps `mid → mid`. Chapter 02/03 frame cost and real-phone fps are measured at slice 8 (spec §7). |
| Zero console errors | PASS | Zero app errors/warnings; only Next's dev `<link rel=preload>` warning (framework, dev-only). |
| Reduced-motion path usable end to end | PASS | `quality.ts:26` → `still`; `VoyageRoot` renders `StillSky` instead of `SceneRoot`; `Services` sets `data-static` and drops the pin, every panel flows (`mobile-still.png`, after `8e79bef`); `useJumpBeat` returns early and `<Letterbox>` is gated on `animated`; the Jump section keeps its 25vh (`sectionHeightVh(jumpChapter)` is unconditional). |
| LCP / CLS / Lighthouse a11y | Not in scope | Slice 8 (spec §7 perf pass). |

No criterion failed.

### Deferred / follow-ups
- `globals.css:2443-2444` has the same `backdrop-filter` declaration-order bug (outside this slice).
- `favicon.ico` 404 — no favicon in the repo.
- At 390 portrait the star sits just off the right edge at p195 — lookAt framing for slice 4.
- `jumpBeat.ts` doc comments still say "wall-clock" though the hook uses `performance.now()`.
- Task 10 item 9 (judder) was judged only on scripted passes.
- Reviewer minors collected for the whole-branch review in `.superpowers/sdd/slice3-final-deferrals.md`.

### Slice 3 merged (2026-10-10)
- Whole-branch review (Opus, 72-commit range, net 47 files / +5083) → "ready to merge after fix wave": one Important — the scroll store's idle `tick()` never resolved an expired `programmatic` deadline, so a stale `prev=true` could suppress a genuine Jump crossing after an interrupted CTA scroll — plus hook coverage, discriminating tests, a11y attributes and comment fixes. One fixer closed all 10 items (5 commits; new `useJumpBeat` hook test with a case that fails on the old store); re-review "Ready to merge". Merged into `master` (fast-forward to cce842b), 413 tests + typecheck + production build verified on the merged result, pushed.

## 2026-10-13 / 14

### Slice 4 — Orbit (branch `feat/voyage-slice-4`, planning)
- Environment had lapsed again (Docker Desktop stopped, dev server down, `gh` flipped back to another account): restarted Docker (Mongo data intact — 3 services, 4 process steps; the case study is gone since the 10-09 container recreate, needed only in slice 5), restarted `npm run dev`, switched `gh` back to RUSHYOP.
- Found a pacing conflict before planning: Orbit was 150vh (only 50vh of sticky hold) while the spec wants each of 4 process nodes pinned ~1 viewport, and no later chapter has slack inside 1250vh. User decision: **Orbit 150 → 300vh, `VOYAGE_SCROLL_VH` 1250 → 1400**, every other chapter keeps its length (~½ viewport per step).
- Map (Sonnet): the chapter table moves to vh spans with derived fractions — each `end` must use the same cumulative expression as the next `start` (the naive form leaves 1-ulp gaps where `chapterAt` falls through to `surface`); 11 tests break and 7 more silently retarget (the Jump band moves from under their literals) → all converted to `progressAt(id, t)`. The camera barely moves in Orbit (z −70 → −100), so the bank (`rotateZ` after `lookAt`), ring rotation and star growth carry the chapter; the star is only 13–56 px across, hence a limb-darkening ramp.
- Plan (Sonnet, 10 tasks; every block applied to a clean tree → 496 tests green) → two parallel Sonnet reviews: one Critical (the mobile last step did not dwell — 38vh of empty pin), the ring's "occlusion" cue never engages at any usable tilt, the mobile panel covered the star, a backwards `LIMB_POWER` comment, three tests that could not catch a wrong implementation (incl. a tautological "byte-identical" proof and zero CSS coverage). All fixed in the plan before execution.

### Next
- Whole-branch review of `feat/voyage-slice-3` → fix wave → merge to `master`.
- **Slice 4 — Orbit (process ring).** Carry forward the tuned constants: `Topology.OFFSET_Z = −24`, `OFFSET_X = −0.9`; mobile Approach pin `64vh` + `padding-top: 4.5rem`; `DOCK_END = 0.28`; `SOLO_START = 0.04`, `SOLO_END = 0.56`, `SOLO_CROSSFADE = 0.18` (capped at `SOLO_START`); `JUMP_HOLD_MS = 900`; `HYPER_LENGTH_MAX = 60`, `HYPER_OPACITY_PEAK = 0.9`, `HYPER_CONVERGE_MAX = 0.55`; `BURST_WORLD = 26`; `topologyNodes` 42 / 22 / 0; and the prefixed-first `backdrop-filter` order for any new glass.
- Open follow-up: `Launch.tsx` has no `useReducedMotion()` guard (GAP-3, deliberately not retrofitted in slice 3).
- Open follow-up: Playwright integration tests are deferred to slice 8 (spec §7 deviation, user decision Q4).
- Still offered: Resend key rotation.

## Slice 4 — Orbit / the process ring (feat/voyage-slice-4)

Executed 2026-10-13 / 14 from the reviewed plan `docs/superpowers/plans/2026-10-13-voyage-slice-4.md` (base `fc91f88`, 10 tasks). Task 1 ran alone; Tasks 2 ∥ 3 ∥ 5 and 4 ∥ 6 ∥ 7 ran in parallel git worktrees (`s4/task-N`), merged one at a time with the suite green after each; Task 8 alone; Task 9 was the controller's browser review. Sonnet implementers and reviewers; every task review approved on the first pass (no fix pass). Shas are the task commits on this branch.

### Per task
- **Task 1 — vh chapter table + `progressAt`** (`dc84fe4`, 421 tests). `CHAPTERS` is declared as `spanVh` spans; every `start`/`end` derives from one cumulative array (`end_i` and `start_{i+1}` are the same expression, last `end` forced to 1), so all 11 boundaries are bit-exact and `chapterAt` never falls through to `surface`. Orbit 150 → 300vh, `VOYAGE_SCROLL_VH` 1250 → 1400, track 1500vh with the `scrollHeight − innerHeight === VOYAGE_SCROLL_VH` identity intact. `progressAt(id, t)` exported; every absolute progress literal in the slice 1–3 tests converted under the old table first (pure refactor), then the geometry swapped. `Dock` compaction point is now `DOCK_COMPACT_PROGRESS = progressAt("launch", 0.625)`.
- **Task 2 — the bank** (`ccf2bae`, 429). Pure `bankForProgress` (0 outside Orbit, eases to `BANK_MAX` = 30° over orbit cp [0, 0.18], holds, eases back over [0.82, 1]); `SceneRoot` applies `camera.rotateZ(smoothBank)` after `lookAt`, `smoothBank` lerped at `POSE_LERP`. Kept out of `getCameraPose`, so the never-reverse test is untouched.
- **Task 3 — `orbitSchedule.ts`** (`8164413`, 23 schedule tests). The one clock for the panels, the ring and the starfield: `ORBIT_WINDOW = [0.04, 0.62]`, `orbitPresence`, `orbitCursor`, `ORBIT_HOLD_DESKTOP` (2/3) / `ORBIT_HOLD_MOBILE` (0.787). Its panel half (`stepSolo` / `panelPresence`) was replaced in Task 9 — see below.
- **Task 4 — star limb + focus pull** (`f42b8d3`, 464). `orbitLimb` + the `uLimb` uniform in `EnergyOrb` (`LIMB_POWER` 0.6, `LIMB_RIM` 0.3); `Starfield` gains `orbitSoften` (`ORBIT_SOFTEN_PEAK` 0.75) and `chapterSoften(chapterId, cp)`, with `approachSoften` unchanged.
- **Task 5 — data wiring** (`75dc916`). `page.tsx` passes `process`; `VoyageRootProps.process`, destructured as `steps` so it never shadows Node's `process`.
- **Task 6 — `OrbitRing`** (`481d15e`, 473). Thin 6-radial-segment torus (`TierSettings.ringSegments` 128 / 64 / 0) plus sphere nodes sharing one geometry and one material; world space around `STAR_POSITION`; `OrbitRing(stepCount)` joined `SceneRoot`'s `pieces`. The reviewer projected the geometry through the real camera path: the front node is the nearest ring point, below the star at every chapterProgress, ≥ 24.8 units from the camera.
- **Task 7 — `Process.tsx` + Orbit CSS** (`44b83a3`, 470; 15 `Process` + 3 `voyageCss` tests). One glass step panel at a time, three mono-labelled fields, desktop panel in the left ~38% via `--orbit-panel-w` / `--orbit-panel-h`, mobile 64vh pin with a top-anchored `min(34vh, 18rem)` box, still tier stacks every step inside the fixed 300vh. Controller's tab-stop gate: the active panel is a tab stop only while `chapterProgress < ORBIT_HOLD_MOBILE`.
- **Task 8 — `VoyageRoot` wiring** (`b184b94`, 503 / 40 files, build OK). Mounts `<Process steps animated>`, `SceneRoot.stepCount` made required, `orbit` dropped from the placeholder filter. The controller checked all 14 Task 9 capture points against the plan to 6 dp.
- **Task 9 — browser review** (controller; two fix commits `b4fec31`, `5c462b2`, tuning `b591511`, `b86844f`, baselines `dc821d8`).
- **Task 10 — docs + closing verification** (this section, `insights.md`, `design.md`, the content-model spec's pacing note).

### Browser review: the trigger fixes (plan superseded)
- **Approach dock** (`b4fec31`). The user flagged a half-built Approach frame (panel 1 up, panel 2 ghosted, panel 3 missing). Root cause was slice-3 behaviour, not a slice-4 regression: `servicesLayout` scrubbed the desktop dock over chapterProgress 0.02 … 0.28, so every rest point inside it was half-built (reproduced at cp 0.12). The same review found the arrivals from Dock / FlightRail / the Launch CTA land at `approach.start + 0.001` (cp ≈ 0.009), before the scrub window, so a SERVICES click landed on an empty chapter. The dock is now a 0/1 trigger (`dock` is `1` from cp > 0); a CSS transition on `.service-panel` (opacity 0.7 s, transform 0.9 s) staggered by `--dock-delay` (0 / 120 / 240 ms, fixed 240 ms in total whatever N is) is the animation. Mobile Approach `--solo` stays scrubbed (`transition: none`). Tests added or rewritten in `servicesLayout`, `Services` and `voyageCss` (suite 503 → 506).
- **Orbit panels** (`5c462b2`, user: "Proceed" on the recommendation to apply the same). `stepSolo` and `panelPresence` no longer exist. `orbitSchedule.stepTarget(i, n, cp)` gives each panel a 0/1 target: the lit step is `Math.round(orbitCursor)`, all dark at cp 0, the first step from the chapter's first pixel, the last step held through the mobile pin release. The `.process-panel` transition (opacity 0.45 s, transform 0.6 s) is the cross-fade; still tier `transition: none`. The ring's cursor is still scroll-scrubbed. Topology's node assembly was deliberately left scrubbed. Suite 506 → 507 (the two trigger commits added 4 in all).
- Earlier "drift" in the captures (scrollY overshooting 1974 → 2503) was a stale Lenis tween fighting the harness's native `scrollTo`, not a page bug; captures now poll `scrollY` until it is stable.

### Browser review verdicts
- **FPS probe** (Launch window): 112–121 fps, no demotion — baseline tier held through Launch (chapter 04 frame cost on a real phone is measured at slice 8, spec §7). In chapter: desktop 1440 `high` tier 120 fps median (p95 10.1 ms) through steps 1 → 4; mobile 390×844 with 4× CPU throttle, `mid` tier, steady-state Orbit 10.1 ms vs Approach 9.4 ms median. The FIRST entry into Orbit after a reload measured **23.7 ms median / p95 40 ms** — shader warm-up (ring + `EnergyOrb` programs compile on first use); follow-up below.
- Checklist: **1** bank reads as an ellipse roll and is level at worlds-entry ✓ · **2** limb darkening visible at step 4 and pin-release, reads as a dot at step 1 (accepted) ✓ · **3** the ring reads as an orbit, monochrome nodes ✓ · **4** the active node sits at the front of the near arc, larger than the rest, clear of the panel and the star, does not out-shine the star ✓ · **5** panel legible, node and star clear at 1440 and 1024 ✓ · **6** one panel at a time — now a trigger; `desktop-crossfade-1-2.png` shows one panel with the ring mid-travel ✓ · **7** slice-3 money frames unchanged (approach-docked, prejump, jump-mid match slice-3 p12 / p195 / p21 on both sizes; only the DIST readout, rail ticks and the real `04 / ORBIT` label differ) ✓ · **8** rail Orbit 19.6% / Worlds 41.1%, DIST 7.0 AU at Orbit start, the Process dock link lands with step 1 lit ✓ · **9** no judder (numbers above); off panels drop their backdrop blur ✓ · **10** console clean — 0 errors / warnings over a full scroll ✓ · **11** optional edge data (0 / 1 / 2 steps) skipped in the browser, covered by unit tests.
- Whether the browser review re-measured the plan-time finding that depth occlusion never engages is not recorded; `RING_TILT` stayed 72° and no ring constant was changed.
- The **still tier** was captured too: `StillSky`, steps stacked, nothing clipped, no horizontal overflow, `#worlds` lands at top 0 after the smooth native scroll.
- 26 baselines in `screenshots/voyage/slice-4/` (25 in the brief + `desktop-approach-nav-arrival.png`); no x-overflow at 390. The desktop step / crossfade / pin-release retakes were shot on a long-lived tab, so their HUD clock reads `T+ 59:59` (the clock's cap) — cosmetic.

### Retuned in the browser review
| Commit | Constant / rule | Old | New | Why |
|---|---|---|---|---|
| `b4fec31` | desktop Approach dock | scrubbed over cp 0.02 … 0.28 | 0/1 trigger at cp > 0, `--dock-delay` stagger (0 / 120 / 240 ms) | half-built rest frames; nav arrivals landed on an empty chapter |
| `5c462b2` | Orbit panel visibility | `stepSolo` / `panelPresence`, scrubbed | `stepTarget`, 0/1 + CSS transition (opacity 0.45 s / transform 0.6 s) | same cause: a scrubbed fade can be caught at rest mid-way |
| `b591511` | `--orbit-panel-h` | `clamp(20rem, 48vh, 27rem)` | `clamp(20rem, 48vh, 23rem)` | seed steps need ≤ 357 px; 27rem left ~70 px of dead glass at 1440×900 |
| `b591511` | `.process-panel__field:last-child` `margin-bottom` | 1.1rem | 0 | the trailing margin alone pushed step 1 into a 5 px internal scroll at 1024×768 |
| `b86844f` | mobile Orbit type scale (new, `max-width: 767px`) | inherited desktop scale | index `margin-bottom` 0.5rem; title 1.15rem / `margin-bottom` 0.6rem; field 0.85rem, `line-height` 1.45, `margin-bottom` 0.65rem; field label span `margin-bottom` 0.15rem | seed steps overflowed the `min(34vh, 18rem)` box by up to 67 px at 390×844 and hid "How long"; the cap stays because it keeps the star clear |

No `BANK_MAX`, ring, limb or schedule constant was changed.

### Plan amendments made during execution
- Recorded in the plan's "Execution amendments" section: the two trigger fixes (the plan's `stepSolo` / `panelPresence` text and decisions 5 and 7 are historical), the three retunes, the controller's tab-stop gate, 26 baselines, and the 503 → 507 test count.

### Closing verification (2026-10-14, HEAD `dc821d8`)
- `npx tsc --noEmit` — 0 errors.
- `npx vitest run` — **507 passed / 40 files** (baseline 413 / 36 at `fc91f88`: +94 tests, +4 files; the plan expected 503 — the extra 4 are the two trigger commits' tests).
- `npx eslint .` — 16 problems (10 errors, 6 warnings), the pre-existing repo baseline in files this branch never touched.
- `npx eslint src/scene src/components/voyage src/components/dock src/lib src/app/voyage` — 0 errors; only the 2 pre-existing warnings in `src/lib/auth.ts` and `src/lib/mongodb.ts`.
- `npm run build` — succeeds, `/voyage` in the route table.

### Spec §8 check — chapter 04 only
| Criterion | Verdict | Evidence |
|---|---|---|
| Reachable and legible on desktop and mobile | PASS | steps 1–4 at 1440×900 and 390×844, plus a 1024×768 step, in `screenshots/voyage/slice-4/`; no clipped copy after the mobile type scale; no x-overflow at 390 |
| Exactly one WebGL context for the scene | PASS | `grep -rn "new THREE.WebGLRenderer" src` → `SceneRoot.tsx:51` and `ThreeBackground.tsx:46` (mounted only by `PageClient`, the `/` route); `grep -rn "EffectComposer\|Line2" src` → no matches. `OrbitRing` is in `SceneRoot`'s `pieces` array (`SceneRoot.tsx:73`) |
| ≥ 55 fps desktop `high` / ≥ 45 fps mid-tier phone | PASS for steady state; one named follow-up | Launch probe 112–121 fps, no demotion; desktop `high` 120 fps median through steps 1 → 4; mobile emulation (4× throttle, desktop GPU) steady-state Orbit 10.1 ms median. The first entry into Orbit after a reload cost 23.7 ms median (≈ 42 fps) / p95 40 ms — shader warm-up, **not a silent pass**: see Next. Real-phone fps is slice 8's |
| Zero console errors | PASS | 0 errors / warnings over a full scroll |
| Reduced-motion path fully usable | PASS | `still` tier renders `StillSky`; `Process` sets `data-static`, drops the pin and stacks every step inside the fixed 300vh section; `desktop-still.png` / `mobile-still.png`, nothing clipped |
| Spec §3 row 04 content | PASS | banked camera (item 1), star visibly a sphere (item 2, a dot at step 1 — accepted), one ring with N luminous nodes (item 3), each node front-centre as its panel takes over (items 4, 6), each panel shows what happens / what you get / how long |
| LCP / CLS / Lighthouse a11y | Not in scope | slice 8 |

### Final review and fix wave

- Whole-branch review (Sonnet, `.superpowers/sdd/slice4-final-review.md`): **Ready to merge after fix wave** — 0 Critical, 2 Important, 10 Minor.
- Fix wave `833f63a` (+ `style` comment wrap): (1) Lenis `allowNestedScroll: true` — a long CMS step panel can now take the desktop wheel (verified live: wheel over an overflowing panel leaves the page still; at the panel's end the page scrolls on; elsewhere the page scrolls); (2) the Process tab stop follows the layout — `useMediaQuery("(max-width: 767px)")` picks `ORBIT_HOLD_MOBILE` on a phone, `ORBIT_HOLD_DESKTOP` on desktop, so no off-screen tab stop pulls the page back; (7, review Minor 1) inactive animated panels are `tabIndex -1` so a hidden overflowing scroll container is never an implicit tab stop; stale comments; intent pins for `DOCK_COMPACT_PROGRESS`, Services "stays docked after Approach", still-tier `--dock-delay`, and the CSS retunes.
- Review Minor 2 (outgoing panel's blur popping off) dropped after a browser check: the step panels share one box and the incoming panel keeps its blur, so nothing pops (checked at 0.14 / 0.86 with transitions slowed 8×).
- Final verification: `tsc` 0; **516 passed / 41 files**; targeted eslint 0 errors (the 2 pre-existing warnings); `npm run build` green with `/voyage`.

### Next
- **Slice 5 — Worlds + `/work/[slug]`.** Carry forward the tuned constants: `BANK_MAX` 30°, `RING_RADIUS` 20, `RING_TILT` 72°, `RING_TUBE` 0.1, `NODE_RADIUS` 0.55, `NODE_ACTIVE_BOOST` 0.9, `LIMB_POWER` 0.6, `LIMB_RIM` 0.3, `ORBIT_SOFTEN_PEAK` 0.75, `ORBIT_WINDOW` [0.04, 0.62], `--orbit-panel-w` `min(30rem, 32vw)`, `--orbit-panel-h` `clamp(20rem, 48vh, 23rem)`; plus the prefixed-first `backdrop-filter` order for any new glass.
- **Shader precompile (slice 8).** The first entry into Orbit costs 23.7 ms median / p95 40 ms: precompile the ring and `EnergyOrb` programs at scene init (`renderer.compile`).
- HUD clock caps at `T+ 59:59` on long-lived tabs (seen in some baselines) — cosmetic.
- Approach mobile `--solo` and Topology's node assembly remain scroll-scrubbed (deliberate); revisit only if a half-built rest frame is reported there.
- Desktop keeps a stale off-screen tab stop on the last Orbit panel for cp 0.667 – 0.787 (the tab-stop gate is device-agnostic); `Process.tsx` comments it.
- Open from the plan: `Launch.tsx` has no `useReducedMotion()` guard; Playwright integration tests deferred to slice 8; `Services` and `Process` re-render on every store emit (add a selector); `getVoyageContent` fetches case studies and testimonials that slice 5 / 6 will finally use; the scroll-region `tabIndex` is fixed for `Process` only, not `Services`; spec §5:129 (empty data hides the chapter and drops its waypoint) is still not implemented; still-tier `Process` overflows the fixed 300vh section once copy averages ≳ 330 chars per step on a phone.
- Open post-merge follow-ups from `.superpowers/sdd/slice3-final-review.md` that this slice did not touch: `globals.css:2443-2444` has `backdrop-filter` before `-webkit-backdrop-filter` (verified still true); `favicon.ico` 404 (no favicon in `public/` or `src/app`); burst flare fade-out and Topology parallax; blur cost on `mid` at ≥ 768 px coarse pointer; Safari / Firefox late scroll restoration may fire a spurious Jump beat; background-tab interval throttling lifting the letterbox; `WarpStreaks` convergence toward world (0, 0) rather than the camera's x/y; still-tier Approach overflow with 4 services; `getVoyageContent` projection. Not independently re-verified in this pass except where marked.
- Still offered: Resend key rotation.

## Slice 5 — Worlds / chapter 05 + /work/[slug] (feat/voyage-slice-5)

Executed 2026-10-14 from the plan `docs/superpowers/plans/2026-10-14-voyage-slice-5.md` (base `e102143`, 9 tasks). Task 1 ran alone, Tasks 2–4 and 5–6 in parallel waves, Task 7 alone; Task 8 was the controller's browser review and fix wave, Task 9 is this record. The task reports record every brief applied without a deviation (T1–T7); per-task reviewer verdicts are not preserved in the repo, so none are claimed here. Shas are the commits on this branch; test counts are the full-suite totals measured at each commit on the merged branch.

### Per task
- **T1 — chapter table + star clock** (`adfc4d8`, 520 / 41 files). `worlds.spanVh` 225 → 450, `VOYAGE_SCROLL_VH` 1400 → 1625. `starScale` / `distanceAU` are re-keyed by `starClock(progress)`, which counts every chapter at its slice-4 length, so the star and DIST are unchanged outside Worlds (golden values captured from the old tree at 17 digits, keyed by `(chapter, chapterProgress)`).
- **T2 — `worldsSchedule.ts`** (`8af8d1e`, 544 / 42; +24 tests). The one clock for panels, planets and the starfield: `WORLDS_WINDOW` [0.04, 0.73], `WORLDS_EDGE_FADE` 0.04, `CASE_TRAVEL` 0.3, `worldsPresence`, `worldsCursor`, `caseTarget`, `caseCentre`, `WORLDS_HOLD_DESKTOP` / `WORLDS_HOLD_MOBILE`.
- **T3 — excerpts + DTO** (`a37348c`, 566 / 44; +22). `caseExcerpt` (first paragraph of each markdown section, plain text, cut at a word boundary at `EXCERPT_MAX` 160), `PlanetFeature` in a pure `src/lib/planetFeature.ts`, the slim `WorldCase` / `toWorldCase` (JSON capped at 2000 characters by a test); `page.tsx` maps on the server.
- **T4 — placeholders + seed guard** (`782c728`, 586 / 46; +20). `canSeedPlaceholders` (fails closed), three published `placeholder-*` case studies (ring / moon / storm), `seedPlaceholdersIfAllowed`, `scripts/seed.ts` wiring; the refusal is logged before the pre-existing wipe, writes no case studies and exits non-zero, and does not widen the wipe.
- **T5 — `Planet`** (`21deefb`, 626 / 47; +40). One set piece owning N planets: object-space value-noise fBm surface shader, ring / moon / storm / none, `planetPosition` (camera pose at the slot centre + camera basis × NDC offset at `PLANET_DEPTH`), `TierSettings.planetSegments`, `planetsKey` / `planetsFromKey`.
- **T6 — `Worlds` + CSS** (`a9396b7`, 659 / 48; +33). One glass panel at a time (`--solo` 0/1 target, CSS transition), shared grid cell on desktop, capped box on a phone, still tier stacked, zero-case state, blur of a focused link whose panel goes inactive.
- **T7 — wiring + hash arrival** (`0a96f0b`, 685 / 51; +26). `SceneRoot` takes `planets` (GL effect keyed on the string `planetsKey`) and runs `renderer.compile` with `renderer.debug.onShaderError` feeding the allow-listed `scene.compile_failed` event (`shaderErrorMessage`); `Starfield` focus pull (`WORLDS_SOFTEN_PEAK` 0.6); `chapterHash` + `useHashArrival` + `voyageStore.scrollTo(p, { immediate })`; `VoyageRoot` mounts `<Worlds>`.
- **T8 — browser review and fix wave** (controller; `319ab0a`, `b21e3a8`, `adbe339`, `7a6ca3b`, `da5aee9`, `b4333b8`, baselines `810639f`, final 704 / 51). See below.
- **T9 — docs + closing verification** (this section, `insights.md`, `design.md`, README seed paragraph, the content-model spec's pacing note, the plan's execution amendments).

### Browser review verdicts
- Seeded for the review: only the three placeholders, through `seedPlaceholdersIfAllowed` from a scratch script with no wipe of the other local collections (the plan's `npm run seed` would also have reset projects, skills, settings, services and steps).
- **Checklist (14 items), all pass after the fix wave:** **1** section order correct, `#worlds` exactly once, inside `<Worlds>` ✓ · **2** regression frames: DIST 8.1 / 7.3 / 7.1 / 7.0 / 5.6 AU at approach-docked / prejump / jump-mid / orbit-entry / orbit-step4; star size equals the slice-4 baselines (prejump 6.5 px vs 6.5 px; orbit-entry 8 vs 9 px, surface-animation noise; a wrong star clock would have given about −17 %); step 4 identical to slice 4; only the rail ticks moved (accepted) ✓ · **3** Dock "Work" arrival lands at 0.35484 with panel 1 lit and the planet eased in, a complete frame, DIST 4.4 AU ✓ · **4** desktop 1440×900 cases 1–3: one panel each, link tab stop only on the lit panel, ring / moon / storm all read, star clear after the retune, Belt entry clean, case 3 still lit at pin release ✓ · **5** 1024×768 case 2: panel 94 → 717 px, link inside, nothing clipped, star and planet clear of the panel's right edge (512 px) ✓ · **6** phones: 390×844 box 287 px (link bottom 388 vs box bottom 401, 2-line titles, no x-overflow); 390×740 box 252 (excerpts clipped by 23 px, link inside); 375×667 box 227 (clipped by 48 px, the Outcome column drops whole, link inside) ✓ · **7** still tier at 390 and 1440: no WebGL canvas (the only canvas is the existing 2D audio visualizer), cases stacked, chips shown, clamps lifted, transition 0 s, links in natural tab order, stack ~1,512 / 1,607 px inside the 450vh section, `#belt` at the viewport top when scrolled to Belt's start ✓ · **8** `/work/placeholder-ledger` at desktop and mobile: `noindex`, two back links to `/voyage#worlds`, no x-overflow, the diagram renders 16:9 ✓ · **9** the back link: client click at 1440 and 390 lands at 0.35484 (0.35483 at 390, pixel rounding) with panel 1 lit and no letterbox; hard load and reload pass; the cold hard load passes after `b4333b8` ✓ · **10** keyboard walk at 390: Tab reaches case 1's link (accessible name, 2 px solid focus ring); PageDown into case 2 moves focus from the hidden link to the body; the next Tab reaches case 2's link ✓ · **11** console: 0 errors over a full scroll, 0 `scene.compile_failed`; 1 warning, the pre-existing Next "`scroll-behavior: smooth` on `<html>`" warning on client route change (from `668dac3` / `8675fa4`; a follow-up) ✓ · **12** FPS (below) ✓ · **13** zero-case data: all three unpublished by a direct DB toggle (a dev restart was needed because `/voyage` is ISR with `revalidate` 300; restored afterwards): label plus "Case studies are being written up.", 0 panels, section still 450vh; 1 or 2 cases were not run live, unit tests cover them ✓ · **14** diagram: uploaded through `/api/upload` (type `diagram`) and attached with `PUT /api/case-studies/<itemId>` (items are keyed by `itemId`, not `_id`); the thumbnail is 120×75 with `object-fit: contain`; the shared grid cell grows from 507 to 556 px because the box is the tallest panel (the plan said "unchanged"; harmless) ✓.
- **The planet / panel / arrival items in particular** (planet read and features = 4, composition = 4–5, one panel at a time = 4, nav arrival = 3, back link = 9 in the numbering above): all pass, and they pass *after* the fixes in the table below, which the review itself prompted (ring and halo crowding, superimposed panel text, ghosting planets, the 768 px portrait planet, the cold-load fragment scroll).
- **FPS** (this machine, Apple GPU; mobile figures are 4× CPU throttle emulation; real-phone fps and Lighthouse are slice 8's):
  - **Probe: 121 fps, `high` tier, no demotion — baseline tier held through Launch.**
  - **Desktop:** first entry (prejump → Orbit → Worlds) median 8.3 ms, p95 9.1, max 9.4; steady state case 1 → 3 the same. No first-entry hitch.
  - **Mobile emulation, 4× CPU:** first entry median 8.3, p95 9.4, max 41.9; steady state the same (max 41.7).
  - **Against slice 4** (23.7 ms median / p95 40 ms first entry into Orbit, 10.1 ms steady): that hitch did **not reproduce** in this review, with or without `renderer.compile`. The A/B at 4× (the call temporarily commented out, restored, never committed) gave load long tasks of 105 / 256 / 79 ms with it and 102 / 258 / 56 without, and an identical first entry. So on this machine the precompile is free at mount but buys nothing visible; it is kept as cheap insurance for a real phone GPU, which slice 8 measures.

### Retuned in the browser review
| Commit | Constant / rule | Old | New | Why |
|---|---|---|---|---|
| `319ab0a` | `PLANET_RADIUS` | 2.5 | 2.2 | at 1440×900 case 1's ring ran into the star's halo and the planet (~110 px radius) outweighed the star; by case 3 the growing halo lapped the planet's limb |
| `319ab0a` | `PLANET_TARGET_LANDSCAPE.x` | 0.40 | 0.50 | same cause: more room to the right of the star |
| `b21e3a8` | `.world-panel` opacity transition | one simultaneous 0.45 s cross-fade | staged: incoming 0.32 s after a 0.16 s delay, `[data-solo-off]` outgoing 0.16 s with no delay (pinned in `voyageCss`) | the simultaneous fade superimposed two three-column panels' text at about 50 % each (unreadable, frozen mid-transition under the Web Animations API) |
| `adbe339` (F3) | `useHashArrival` | left `#worlds` in the URL | clears the fragment after the jump with `history.replaceState(history.state, "", path + search)` | a late native fragment scroll could override the arrival (a cold dev load landed on 0.35385) |
| `7a6ca3b` (F2) | planet target for portrait ≥ 768 px | the phone target (portrait aspect) | new `PLANET_TARGET_PORTRAIT_WIDE` (0.5, −0.55), chosen by `FrameContext.viewportWidth` > `PHONE_MAX_WIDTH` (767) | at 768×1024 the planet sat half behind the desktop panel; the plan's fallback (the landscape target) would have put it over the star |
| `da5aee9` (F1) | planet swap | scroll-scrubbed per-planet cross-fade (`planetWeight`) | each planet eases toward its panel's 0/1 `caseTarget` with `dt`, staged so the outgoing one clears below `PLANET_SWAP_CLEAR` 0.02 before the incoming one rises; `PLANET_SWAP_OUT_RATE` 20, `PLANET_SWAP_IN_RATE` 8; `planetWeight` deleted | at rest just past a slot boundary two half-transparent planets overlapped (see-through ghosting) |
| `b4333b8` | `.chapter--worlds` | no `scroll-margin-top` | `scroll-margin-top: -1.625vh` (`HASH_ARRIVAL_EPS` × `VOYAGE_SCROLL_VH`); `worldsSchedule` header comment corrected | even after F3 one cold dev load kept the hash and landed on the section top (0.35385, every panel dark); a native fragment scroll now lands on `start + 0.001` with case 1 lit (verified with `scrollIntoView` and a cold hard load: 0.35484, hash cleared) |

User decisions during the review: "swap on a timer" (F1; extends the no-partial-rest-frames rule: anything that dissolves one subject into another is a trigger plus a timed fade, while camera motion and placement may still follow scroll) and "third planet target" (F2). Unchanged: `WORLDS_WINDOW`, `WORLDS_EDGE_FADE`, `CASE_TRAVEL`, `WORLDS_SOFTEN_PEAK`, `PLANET_DEPTH`, `PLANET_TARGET_PORTRAIT`, `PLANET_FADE_OUT_END`, `PLANET_FADE_IN_RATE`, `--worlds-panel-w`.

### Plan amendments made during execution
- Recorded in the plan's "Execution amendments" section: the six post-T7 commits, which supersede A6's `planetWeight`, Decision 15's accepted portrait tablet and A9's single-layer hash arrival; the retuned values and the new tunables; 685 → 704 tests; and the placeholder seeding done through a scratch script.

### Closing verification (2026-10-14, HEAD `810639f`)
- `npx tsc --noEmit` — 0 errors.
- `npx vitest run` — **704 passed / 51 files** (baseline 516 / 41 at `e102143`: +188 tests, +10 files; the plan expected 685 — the extra 19 are the browser-review fix wave's tests: `b21e3a8` +1, `adbe339` +2, `7a6ca3b` +5, `da5aee9` +10, `b4333b8` +1).
- `npx eslint .` — 16 problems (10 errors, 6 warnings), the pre-existing repo baseline, all in files this branch never touched (`src/app/admin/components/ProjectsTab.tsx`, `src/app/admin/page.tsx`, `src/app/projects/ProjectsClient.tsx`, `ThemeToggle`, `ThreeBackground`, `TypewriterText`, `CinematicIntro`, `CustomCursor`, `FilmGrain`, `src/lib/auth.ts`, `src/lib/mongodb.ts`).
- `npx eslint src/scene src/components/voyage src/components/dock src/lib src/app/voyage scripts` — 0 errors; only the 2 pre-existing warnings in `src/lib/auth.ts` and `src/lib/mongodb.ts`.
- `npm run build` — succeeds (Next 16.0.7, Turbopack) with `/voyage` (revalidate 5m) and `/work/[slug]` (SSG: `placeholder-ledger`, `placeholder-routing`, `placeholder-telemetry`, 5m) in the route table. Run in a throwaway worktree (see `insights.md`), never in this checkout.

### Final-review fix wave (I1, M1, M2, M3, M7, M8)
- **I1 (`291ea32`, with M8):** the desktop Worlds box is bounded, `max-height: calc(100vh - 2 * 4.5rem - 2.652rem)`. Arithmetic: the pin is 100vh and centres the label and the box, so they must fit between two margins of 4.5rem (the dock clearance; dock bottom = 20 + 36 + 11.2 + 2 = 69.2 px); the label block is 0.72rem × 1.6 + 1.5rem = 2.652rem (42.4 px); total 100vh − 186.4 px (713 px at 900, 414 at 600, 354 at 540, 244 at 430, 204 at 390). The excerpt block is the one shrinking child. Because the non-excerpt content is about 300 px, which exceeds the 244 and 204 px bounds, a compact tier at `@media (min-width: 768px) and (max-height: 560px)` mirrors the phone box (foot hidden, title 2 lines, meta 1 line, excerpts 2 lines, phone padding and type); the link then fits down to a viewport about 320 px tall. The phone and still tiers reset the bound. Pins in `voyageCss.test.ts`; the vacuous link pin was dropped and the phone-box test title fixed.
- **M1 (`fb22052`):** the hash arrival is verified on the next frame and after 300 ms and re-asserted at most twice; cancelled on unmount.
- **M2 (`cf07937`):** the last planet leaves on a `dt` follower once cp passes `PLANET_LEAVE_AT` 0.80 (`PLANET_LEAVE_RATE` 12), with the positional cut at 0.90 kept; on phones the planet is gone by the 0.858 pin release (user decision).
- **M3 + M7 (the docs commit):** whitespace-only `Worlds` text is treated as missing; the `useHashArrival`-before-`useJumpBeat` order is commented at the call site; plan Decision 9 and A11 corrected.
- Suite: 704 → 727 passed / 51 files; `tsc` clean; `eslint src/scene src/components/voyage src/app/voyage` 0 errors, 0 warnings.
- Not measured by the fix author (no browser work): the I1 bound at 1024×600, 960×540, 932×430, 844×390, 1440×900 (expected 556 px, unclipped) and 1024×768; M1 and M2 live.

### Spec §8 check — chapter 05 only
| Criterion | Verdict | Evidence |
|---|---|---|
| Reachable and legible on desktop and mobile | PASS, with one by-design limit (the final review's I1 on short windows is fixed: see "Final-review fix wave" below) | three cases at 1440×900 and 390×844, a 1024×768 case and a 768×1024 case in `screenshots/voyage/slice-5/` (29 baselines); nothing clipped at 1440, 1024 or 390×844; no x-overflow at 390; on 390×740 and 375×667 the excerpts are clipped by 23 / 48 px **by design** (the box keeps the link whole), so "no clipped copy" does not hold on those two shorter phones. **Short windows at ≥ 768 px (final review I1):** before the fix the case link fell off-screen at 1024×600 (link bottom 620 > 600), 960×540 (610 > 540), 932×430 (555 > 430) and 844×390 (535 > 390); 1440×900, 1366×768, 1280×600 and 1024×768 were fine. The desktop box is now bounded to `100vh − 2 × 4.5rem − 2.652rem` and a compact tier applies at `max-height: 560px`; re-measured by the controller, not by the fix author |
| Exactly one WebGL context for the scene | PASS | `grep -rn "new THREE.WebGLRenderer" src` → `SceneRoot.tsx:62` and `ThreeBackground.tsx:46` (`/` only); `Planet` is in `SceneRoot`'s `pieces` array (`SceneRoot.tsx:86`); `grep -rn "EffectComposer\|Line2" src` → no code matches |
| ≥ 45 fps mid-tier phone / ≥ 55 fps desktop `high` | PASS in emulation | probe 121 fps, no demotion; first entry and steady state median 8.3 ms on desktop and under 4× CPU throttle (max 41.9 / 41.7 ms single frames). Real-phone fps and Lighthouse are slice 8's |
| Zero console errors | PASS | 0 errors and 0 `scene.compile_failed` over a full scroll; 1 pre-existing Next `scroll-behavior: smooth` warning on client route change (follow-up) |
| Reduced-motion path fully usable | PASS | `still` tier renders `StillSky` (no WebGL canvas); `Worlds` sets `data-static`, drops the pin, stacks every case with chips and links inside the fixed 450vh section at 390 and 1440 (~1,512 / 1,607 px) |
| Spec §3 row 05 content | PASS | a world per case study with a ring / moon / storm distinguishing it, a camera fly-by carrying each planet across the frame, each panel with client · context, Problem / Architecture / Outcome excerpts, stack chips, a diagram thumbnail (verified by an upload through the admin API path) and a link to `/work/<slug>`; `/work/placeholder-ledger` reviewed at both sizes, its back link lands on Worlds (checklist 8–9) |
| Spec §5 `/work/[slug]` | PASS | reviewed with the placeholders; the back link was broken and is fixed in this slice (three layers, see `design.md`); no redesign |
Nothing failed outright; the by-design phone clip and the items under Next are named, not silently passed.

### Next
- **Slice 6 — Belt, Dark Passage, Constellation.** Carry forward the tuned constants: `WORLDS_WINDOW` [0.04, 0.73], `WORLDS_EDGE_FADE` 0.04, `CASE_TRAVEL` 0.3, `WORLDS_SOFTEN_PEAK` 0.6, `PLANET_RADIUS` 2.2, `PLANET_DEPTH` 18, `PLANET_TARGET_LANDSCAPE` (0.50, −0.05), `PLANET_TARGET_PORTRAIT` (0, −0.45), `PLANET_TARGET_PORTRAIT_WIDE` (0.5, −0.55), `PHONE_MAX_WIDTH` 767, `PLANET_FADE_OUT_END` 0.9 (now the positional safety cut), `PLANET_LEAVE_AT` 0.8, `PLANET_LEAVE_RATE` 12, `PLANET_FADE_IN_RATE` 8, `PLANET_SWAP_OUT_RATE` 20, `PLANET_SWAP_IN_RATE` 8, `PLANET_SWAP_CLEAR` 0.02, `PLANET_RING_*`, `MOON_*`, `PLANET_NIGHT_FLOOR` 0.12, `EXCERPT_MAX` 160, `--worlds-panel-w` `min(40rem, 44vw)`, the staged `.world-panel` swap (0.16 s out, 0.32 s in after 0.16 s), `.chapter--worlds { scroll-margin-top: -1.625vh }`; plus the prefixed-first `backdrop-filter` order for any new glass.
- **The placeholder case studies are in the local database only.** The owner replaces them through `/admin`. Flip `/voyage` and `/work` to indexable together at launch.
- **Open follow-ups from the review (none fixed in slice 5):**
  - Off-axis perspective stretches the sphere horizontally by about 10 % at its slot centre and about 15 % at pin release, at landscape NDC x 0.5 (FOV is fixed at 60–70°).
  - The ring edges alias on the mid tier (DPR 1) on phones.
  - At 375×667 the phone panel covers the top of the star.
  - At 768 px wide the HUD and the dock pill overlap (pre-existing).
  - When one case has a diagram, the other cases' panels show dead space at the bottom (shared grid cell).
  - An outgoing planet between 0.001 and 0.02 opacity is still drawn for 1–2 frames.
  - The star-gap test covers only the settled lit range.
  - F3: a reload or a copied URL after arriving no longer deep-links to `#worlds` (the hash is gone); the scroll-margin keeps a real fragment scroll correct.
  - The Next "`scroll-behavior: smooth` on `<html>`" warning on client route change (pre-existing).
- **Carried from the plan's "Deferred / carried":** `Launch.tsx` has no `useReducedMotion()` guard; Playwright integration tests are deferred to slice 8; `Services`, `Process` and `Worlds` re-render on every store emit (add a selector when slice 8 measures it); the scroll-region `tabIndex` fix is for `Process` only; spec §5:129 (empty data hides the chapter and drops its waypoint) is not implemented anywhere; `getVoyageContent` still fetches `testimonials`, which slice 6 will finally use; mid-tier blur cost at ≥ 768 px coarse pointer; the Safari / Firefox late-scroll-restoration spurious beat; browser **Back** restoring a scroll position into `/voyage` shares the hash-arrival root cause and is not fixed; the existing seed wipes five collections without a guard (pre-existing, documented, not widened); still-tier `Worlds` overflows the fixed 450vh section once five or more long cases stack on a phone. (The plan's "portrait tablet gets the portrait planet target with the desktop panel" item is **resolved** by F2 and dropped.)
- **Stress test:** 1 or 2 cases were not run live (unit tests cover them), and 3 is the most the browser review saw; clearance is unit-verified to N = 8 and the design range is 8. Nothing in the review tested more than 3 cases live.
- Still offered: Resend key rotation.
