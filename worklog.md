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

### Sub-project 2 complete — pending whole-branch review
- All 14 tasks done on `feat/consulting-cms`; whole-branch review + merge to `master` is the next gate (deferred minors in `.superpowers/sdd/progress.md`).

### Next
- Whole-branch review of `feat/consulting-cms`, then merge to `master`.
- Plan slice 3 (Approach Vector + Jump) carrying forward the tuned constants (`STAR_SCALE_MAX = 2.4`, `LAUNCH_LOOK_OFFSET = (-28, 18, 0)`, `GLOW_MIN = 3.5`); slice 3 wires `getVoyageContent()` into `VoyageRoot`.
