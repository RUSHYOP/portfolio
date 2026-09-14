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
- Deferred minors live in `.superpowers/sdd/progress.md` for the whole-branch review.

### Next
- Sub-project 2 Tasks 4–14 (specs → routes → markdown → mail → inquiries → admin tabs → `/work/[slug]` → seed/docs), then whole-branch review and merge.
- Plan slice 3 (Approach Vector + Jump) carrying forward the tuned constants (`STAR_SCALE_MAX = 2.4`, `LAUNCH_LOOK_OFFSET = (-28, 18, 0)`, `GLOW_MIN = 3.5`); slice 3 wires `getVoyageContent()` into `VoyageRoot`.
