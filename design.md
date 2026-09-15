# Design

Architecture and visual-design reference for the portfolio site. `README.md` covers setup; this file covers *how it's built and why it looks/feels the way it does*.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **MongoDB + Mongoose** — content store (projects, skills, settings, and the consulting collections: services, process steps, case studies, testimonials, inquiries) and media (GridFS)
- **Resend** — transactional mail for inquiry notifications (`src/lib/mail.ts`)
- **marked + sanitize-html** — server-side markdown rendering for case-study bodies
- **Framer Motion** — all UI motion/transitions
- **Three.js** — particle starfield background
- Custom **Web Audio API** engine — ambient bed + reactive SFX (no audio library)
- **jose** (JWT) — single-admin auth for the CMS
- Deployed on **Vercel** (`@vercel/analytics`, `@vercel/speed-insights`)

## Architecture

```
src/app/page.tsx (server)          — fetches projects/skills/settings via src/lib/data.ts, renders PageClient
src/app/projects/page.tsx (server) — standalone /projects listing with tag filters
src/app/admin/page.tsx (client)    — CMS: auth gate + 9-tab dashboard
src/app/work/[slug]/page.tsx       — ISR case-study reading page (published slugs only)
src/app/api/*                      — REST-ish route handlers (auth, projects, skills, settings, media, upload,
                                     services, process, case-studies, testimonials, inquiries)
src/lib/mongodb.ts                 — cached Mongoose connection (global cache survives HMR/serverless reuse)
src/lib/models.ts                  — Project / Skill / Settings schemas
src/lib/collections/*              — schema-driven CMS: one def per collection → model, API and admin UI
src/lib/markdown.ts                — marked + sanitize-html allow-list (case-study bodies)
src/lib/mail.ts, src/lib/rateLimit.ts — Resend inquiry mail; fixed-window per-IP-hash limiter
src/lib/auth.ts                    — JWT issue/verify, rate-limited login, timing-safe credential check
src/lib/gridfs.ts                  — media stored as MongoDB GridFS chunks, served via /api/media/[fileId]
```

The public site is server-rendered for data (SEO, fast first paint) and hands off to one big client component (`PageClient`) that owns intro sequencing, scroll/audio reactivity, and the Three.js background. The admin dashboard is a single client route with nine tabs (Content, Projects, Skills, Navigation, Media, Consulting, Case studies, Testimonials, Inbox — ⌘1–9) driven by the same collections the public site reads — there is no separate CMS backend.

**Schema-driven collections** (`src/lib/collections/*`): the consulting content model is declared once per collection as a `CollectionDef` (`specs/{services,processSteps,caseStudies,testimonials,inquiries}.ts`) — field types, labels, limits, `orderable` / `publishable` / `publicList`, searchable fields and the paths to revalidate. `defineCollection(def)` turns that def into a Mongoose model, a DTO mapper, CRUD + reorder and a `validate(body, mode)` function; `routeHandlers.ts` turns the same object into `GET/POST`, `GET/PUT/DELETE by id` and `POST /reorder`, so each API route file is two lines. The defs also live in a mongoose-free `defs.ts`, which the client imports: the generic admin `CollectionTab` renders a list, an editor, move-up/move-down reordering and a publish toggle for *any* def, with `FieldInput` supplying one widget per field type (`text`, `textarea`, `markdown`, `chips`, `image`, `toggle`, `select`, `slug`, `number`). One definition therefore drives the database, the API, the validation on both sides and the UI — adding a collection is a spec file plus three route stubs, and client and server can never validate differently.

Public reads go through the published-only branch (`col.list({ publishedOnly: true })`); the admin asks for the same routes with `?all=1`, which requires the JWT cookie and returns drafts and internal fields. Inquiries are write-only from the public side: `publicList: false` means every GET is authenticated, and the POST path applies a 4 KB body cap, a honeypot, shared validation, a salted-IP-hash rate limit (5/hour) and non-blocking Resend mail, in that order, so a mail outage never loses a stored inquiry.

**Auth**: single hardcoded admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars, not a Users collection). Login sets an httpOnly JWT cookie (`admin_token`, 8h expiry). Login attempts are rate-limited per IP (5 / 15 min) and credential comparison is timing-safe.

**Media pipeline**: uploads go through `/api/upload` → validated by type-specific size/dimension limits (`profile`, `project_icon`, `skill_icon`, `audio`) → stored in GridFS → referenced as `/api/media/{fileId}`. (`scripts/migrate-media.ts` was a one-time migration off static `public/` files; `@vercel/blob` is a leftover dependency, not the active storage path.)

## Visual design system

Design tokens live in `src/app/globals.css` as CSS custom properties, swapped via `[data-theme="dark"|"light"]` on `<html>` (see `ThemeToggle.tsx`, persisted to `localStorage`).

| Token | Dark (default) | Light |
|---|---|---|
| `--primary` / `--bg` | `#000000` | `#f5f5f5` |
| `--secondary` / `--bg-secondary` | `#0a0a0a` | `#ffffff` |
| `--tertiary` | `#1a1a1a` | `#e8e8e8` |
| `--white` / `--text` | `#ffffff` | `#111111` |
| `--gray-mid` / `--text-muted` | `#a3a3a3` | `#555555` |
| `--border` | `#222222` | `#d4d4d4` |
| `--glow` | `rgba(255,255,255,.1)` | `rgba(0,0,0,.06)` |

Palette is deliberately near-monochrome (black/white + grays) — no brand color accent. "Noir" aesthetic reinforced by the cinematic overlays below.

**Typography**:
- Body/display: **Styrene A** (self-hosted `.otf`, preloaded in `layout.tsx`, weights 100–900) falling back to **Space Grotesk** (`next/font/google`)
- Mono/label accents (loading text, tags, timestamps): **JetBrains Mono**

**Layout**: single-column scrolling page, sections registered by `id` for anchor-nav scrolling (`#about`, `#projects`, `#contact`). Breakpoint at `768px` collapses all grids (about, contact, projects, skills, footer) to one column and hides the desktop nav menu.

**`/work/[slug]`** (`src/app/work/work.css`) shares `/voyage`'s world rather than the noir home page's: dark only, one amber accent (`--amber: #f2b35c`), JetBrains Mono telemetry labels for the eyebrow/metrics/stack, and a centred 72rem reading column where the typography carries the page because there is no 3D scene. Its colours are pinned locally instead of read from the globals.css tokens — the same guard `voyage.css` uses — plus `[data-theme="light"] body:has(.work)` shields for grain and vignette, so a carried-over light theme can't wash the page out. Page background is painted on `body:has(.work)` so the narrow column leaves no seam.

**Admin panel** gets its own CSS section (`Admin Panel`, `src/app/globals.css:1269`) — a flat, utilitarian dashboard style, deliberately *not* sharing the cinematic treatment (see Overlays below).

## Motion & interaction design

- **Cinematic intro** (`motion/CinematicIntro.tsx`) gates the page on first load; `PageClient` stages in the navbar and Three.js background only after intro completes (100ms / 250ms staggered).
- **Global overlays** (`motion/GlobalOverlays.tsx`) — `Vignette`, `FilmGrain`, `ScrollProgress`, `CustomCursor` — mount on every public route but explicitly **not** under `/admin` ("admin routes get a clean utilitarian surface").
- **Scroll-linked parallax**: `QuoteSection` uses `useScroll({ target: ref })` to drive opposite-direction `y`/`x` parallax on the opening/closing quote marks. *Gotcha*: the component only calls this hook path when it actually renders a quote — an internal `QuoteSectionContent` split ensures the ref-holding `<div>` is never absent while the hook targets it (fixed 2026-09-14; previously threw `useScroll` "target ref not hydrated" whenever a quote setting was empty).
- **Theme toggle**: instant swap, no transition wipe (a circular clip-path "wipe" animation was removed 2026-09-14 for looking distractingly oval on wide viewports).
- **Admin tab transitions**: `AnimatePresence mode="wait"` cross-fade + 6px vertical slide between tabs; active-tab underline uses a shared `layoutId` for a sliding-indicator effect; unsaved-changes per tab get a pulsing dot, and switching away from a dirty tab prompts a `window.confirm`.
- Reduced-motion is respected (`@media (prefers-reduced-motion)` section in globals.css; `html { scroll-behavior: smooth }` is itself gated on `no-preference`).

## Audio design

Singleton Web Audio graph (`src/lib/audio/AudioEngine.ts`), lazily started on first user gesture:

```
ambientBus (space.mp3 + noise pad + drone) ──┐
                                              ├─► duckLowpass ──► masterGain ──► destination
sfxBus (clicks, whooshes, impacts, keystrokes)┘
```

- `masterGain` ramps smoothly on mute/unmute (click-free).
- `duckLowpass` briefly drops its cutoff on "impact" events for a sidechain-style ducking feel.
- A second filter (`scrollFilter`) is driven continuously by scroll velocity — `PageClient` computes px/ms energy on every animation frame and feeds it to the engine, so faster scrolling audibly darkens the ambient bed.
- An `AnalyserNode` taps `masterGain` for the navbar's `AudioVisualizer`.
- Theme changes (`engine.setTheme`) re-pitch UI click sounds (dark → lower pitch, light → higher).

## 3D background

`ThreeBackground.tsx` — a mouse-reactive particle starfield (`THREE.Points`), rendered on a dedicated canvas behind all content. Performance-conscious by construction: capped device-pixel-ratio (1.5 desktop / 1 mobile), `antialias: false`, no stencil/depth buffers, and it fades in (`igniteRef`) only after the intro completes rather than rendering immediately.

## Routes

| Route | Rendering | Purpose |
|---|---|---|
| `/` | Server + client hydration | Hero → Quote → About → Quote → Projects (carousel) → Contact → Footer |
| `/projects` | Server | Full project list with technology-tag filtering |
| `/admin` | Client-only | CMS login gate → Content / Projects / Skills / Navigation / Media / Consulting / Case studies / Testimonials / Inbox tabs |
| `/voyage` | Server (ISR, 5m) | Cinematic consulting page (noindex until launch) |
| `/work/[slug]` | Server (ISR, 5m + `generateStaticParams`) | Case-study reading page; unknown or unpublished slug → 404 |
| `/api/auth/{login,logout,verify}` | Route handler | JWT cookie session |
| `/api/{projects,skills,settings}[/:id]` | Route handler | CRUD backing the CMS + public data fetch |
| `/api/{services,process,case-studies,testimonials}[/:id]`, `…/reorder` | Route handler | Generic collection CRUD + reordering; GET is published-only unless `?all=1` + auth |
| `/api/inquiries[/:id]` | Route handler | Public POST (honeypot + rate limit + Resend mail); all reads/writes otherwise admin-only |
| `/api/upload`, `/api/media/[fileId]` | Route handler | GridFS upload / stream-back |

## Notes for future changes

- Content (hero copy, quotes, project/skill lists, nav & footer links) is **fully data-driven** from MongoDB — don't hardcode copy changes in components; edit via `/admin` or the `Settings`/`Project`/`Skill` models.
- Any new scroll- or ref-dependent Framer Motion hook should follow the `QuoteSectionContent` pattern: gate rendering *before* the hook call, never after, so the target ref is guaranteed mounted for the hook's whole lifetime.
- Keep `/admin` free of the cinematic overlays (`GlobalOverlays` already excludes it by pathname) — it's intentionally a plain, fast, utilitarian surface for content editing, contrasted against the public site's noir treatment.
