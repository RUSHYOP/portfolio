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

### Next
- Whole-branch review of `feat/voyage-slice-3` → fix wave → merge to `master`.
- **Slice 4 — Orbit (process ring).** Carry forward the tuned constants: `Topology.OFFSET_Z = −24`, `OFFSET_X = −0.9`; mobile Approach pin `64vh` + `padding-top: 4.5rem`; `DOCK_END = 0.28`; `SOLO_START = 0.04`, `SOLO_END = 0.56`, `SOLO_CROSSFADE = 0.18` (capped at `SOLO_START`); `JUMP_HOLD_MS = 900`; `HYPER_LENGTH_MAX = 60`, `HYPER_OPACITY_PEAK = 0.9`, `HYPER_CONVERGE_MAX = 0.55`; `BURST_WORLD = 26`; `topologyNodes` 42 / 22 / 0; and the prefixed-first `backdrop-filter` order for any new glass.
- Open follow-up: `Launch.tsx` has no `useReducedMotion()` guard (GAP-3, deliberately not retrofitted in slice 3).
- Open follow-up: Playwright integration tests are deferred to slice 8 (spec §7 deviation, user decision Q4).
- Still offered: Resend key rotation.
