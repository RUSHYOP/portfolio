# Consulting Content Model + CMS + Inquiries — Design Spec

**Date:** 2026-09-14
**Scope:** Sub-project 2 of the voyage redesign (see `2026-09-14-voyage-redesign-design.md`). Provides the content the voyage chapters 02–10 read, the admin tabs to edit it, and the inquiry pipeline (storage, public endpoint, minimal Resend email, admin Inbox).
**Status:** Approved in brainstorming (2026-09-14). Ready for implementation planning.

## 1. Goal

Make Services, Process steps, Case studies, Testimonials and Inquiries first-class, admin-editable data so slices 3–7 of the voyage build against real content instead of a seed file — without duplicating the hand-rolled model/route/tab pattern four more times.

### Decisions locked in brainstorming
| Topic | Decision |
|---|---|
| Architecture | **B — schema-driven collection layer.** One `defineCollection()` factory generates model, DTO mapper, validator and route handlers from a field spec; one generic `CollectionTab` renders admin CRUD from the same spec. Existing Projects/Skills/Settings untouched. |
| Case-study authoring | **Markdown textareas** for problem / architecture / outcome; structured fields for everything else. Rendered to sanitised HTML on `/work/[slug]`. |
| Services & Process | **Editable, reorderable lists of any count** (the voyage lays out whatever exists). |
| Publishing | `published` flag on **Case studies and Testimonials** only; public reads return published items; chapters hide when zero published. |
| Inquiries | **Store + public rate-limited `POST /api/inquiries` + admin Inbox** with status workflow. |
| Email | **Resend**, user's own API key (already set locally and in Vercel production as `RESEND_API_KEY`). Two minimal plain-text emails; no HTML templates, no react-email. Sending domain `communications.rushy.dev` (DKIM/SPF verified; inbound MX not needed). |
| Pacing (carried over) | `VOYAGE_SCROLL_VH = 1250` (tuned 2026-09-14, commit ea5944e). |

### Out of scope
Scheduler embed (sub-project 3 chooses the provider via the marketplace skill), migrating Projects/Skills onto the factory, HTML email templates, inbound email, admin roles.

## 2. Content model

All Mongoose models live in `src/lib/models.ts`; DTOs and reads in `src/lib/data.ts`, following the existing `projectId`-style external id (`svc_…`, `step_…`, `case_…`, `tst_…`, `inq_…` via `crypto.randomUUID()`).

| Collection (Mongo name) | Fields | Notes |
|---|---|---|
| **Service** (`services`) | `title` text ≤120 req · `promise` text ≤200 req · `outcomes` chips 1–4 × ≤80 · `engagement` text ≤120 · `order` number | Approach Vector panels |
| **ProcessStep** (`processsteps`) | `title` text ≤60 req · `what` textarea ≤600 req · `deliverable` textarea ≤400 · `duration` text ≤40 · `order` | Orbit ring nodes |
| **CaseStudy** (`casestudies`) | `slug` slug ≤80 req unique · `title` text ≤120 req · `client` text ≤80 · `context` text ≤200 · `problem` / `architecture` / `outcome` markdown ≤6000 each · `stack` chips ≤12 × ≤40 · `metrics` chips ≤6 × ≤60 · `diagram` image · `planetFeature` select `none\|ring\|moon\|storm` · `published` toggle (default false) · `order` | Worlds + `/work/[slug]` |
| **Testimonial** (`testimonials`) | `quote` textarea ≤400 req · `name` text ≤80 req · `role` text ≤80 · `company` text ≤80 · `published` toggle (default false) · `order` | The Belt |
| **Inquiry** (`inquiries`) | `name` text ≤120 req · `email` text ≤200 req (email format) · `building` textarea ≤2000 req · `budget` select `lt5k\|5to15k\|15to40k\|40kplus\|undecided` req · `timeline` select `asap\|1to3m\|3mplus\|exploring` req · `status` select `new\|replied\|archived` (default `new`) · `ipHash` text · `notifyFailed` toggle (default false) · `createdAt` | Landing form → Inbox. Not orderable. |
| **Settings** (extend) | `manifesto` text ≤200 (default: *"Most software fails at the seams. I design the seams."*) | Dark Passage line; Content tab gains inputs for `heroHeadline`, `heroSubheadline`, `manifesto` |

Rules:
- Every limit above lives in the field spec and nowhere else; the validator and the admin input `maxLength` are both generated from it.
- `slug` matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`, is unique (Mongo unique index), auto-derived from `title` in the admin until the user edits it, and immutable via the public reading route (changing it 404s old links — the admin warns on edit).
- Markdown → HTML happens **server-side only** in `src/lib/markdown.ts` using `marked` with raw HTML disabled plus `sanitize-html` (allow-list: headings, p, ul/ol/li, strong/em, code/pre, a with `rel="noopener"` and `https?:` only, blockquote). Nothing else renders markdown.
- Public reads (`publishedOnly: true`) sort by `order` and never return `ipHash`, `notifyFailed`, or unpublished items.

## 3. Server: the collection factory

```
src/lib/collections/
  fieldSpec.ts        FieldType union, FieldSpec, CollectionDef types; limits helpers
  defineCollection.ts defineCollection(def) → { model, toDto, validate, list, getById, getBySlug?, create, update, remove, reorder }
  routeHandlers.ts    listAndCreate(col), byId(col), reorder(col) → Next route handler objects
  specs/
    services.ts  processSteps.ts  caseStudies.ts  testimonials.ts  inquiries.ts   (one FieldSpec each, ~40 lines)
src/app/api/
  services/route.ts, services/[id]/route.ts, services/reorder/route.ts        (two-liners)
  process/…  case-studies/…  testimonials/…
  inquiries/route.ts (custom POST, factory GET), inquiries/[id]/route.ts (factory PUT/DELETE)
```

- **Field types:** `text | textarea | markdown | chips | image | toggle | select | slug | number`. Each: `{ type, label, required?, max?, min?, options?, default?, help? }`. `chips` has `maxItems` and per-item `max`.
- **`validate(body, mode)`** returns `{ ok: true, value } | { ok: false, error: string }`; `mode: "create"` enforces `required`, `mode: "update"` validates only present keys and forbids `id`/`order`/`createdAt` changes through PUT.
- **Routes:** public `GET` list (cached like `/api/projects`: `s-maxage=3600, stale-while-revalidate=86400`; `?all=1` with admin auth returns unpublished too), admin `POST`, admin `GET/PUT/DELETE /[id]`, admin `PUT /reorder` with `{ ids: string[] }` (validates the set equals the collection's ids, writes `order` in one `bulkWrite`). Auth via existing `verifyRequest`. Errors mirror the existing routes' shape `{ error }` with 400/401/404/500.
- **`getVoyageContent()`** in `data.ts`: `{ services, process, caseStudies, testimonials, settings }` — one call for `/voyage/page.tsx`; `getCaseStudyBySlug(slug)` returns `null` for missing or unpublished (→ `notFound()`).
- **Inquiries `POST`** (public, `src/app/api/inquiries/route.ts`), in order: body ≤ 4 KB → honeypot field `website` must be empty (return `201 { ok: true }` silently when tripped, do not store) → `validate("create")` → rate limit **5 per hour per IP** (SHA-256 of `x-forwarded-for` first hop + a server salt from `INQUIRY_IP_SALT`; in-memory `Map` like `auth.ts`'s login limiter; `429` with `Retry-After`) → `create` with `status: "new"`, `ipHash` → `sendInquiryEmails(inquiry)` (never throws; on failure set `notifyFailed: true` and `appendLog("inquiries", { event: "notify.failed", id })`) → `201 { ok: true }`. No PII in logs beyond the id.
- **Seed:** `scripts/seed.ts` upserts 3 services and 4 process steps (copy from the voyage spec §3), sets `manifesto` default; case studies and testimonials are not seeded.

## 4. Email: `src/lib/mail.ts`

Dependency: `resend` (official SDK). Env (all four documented in `.env.example`; `RESEND_API_KEY` already set locally and in Vercel production, the other three are added in the same task): `RESEND_API_KEY`, `RESEND_FROM` (`Purav S <hello@communications.rushy.dev>`), `INQUIRY_NOTIFY_TO` (owner's address), `INQUIRY_IP_SALT` (random 32-byte hex for the rate-limit IP hash). Missing Resend env → `sendInquiryEmails` logs `notify.skipped` and returns `{ sent: false }` (dev without keys still works); missing salt → rate limiter still works with an empty salt (hashes are then unsalted; a startup warning is logged once).

`sendInquiryEmails(inquiry): Promise<{ sent: boolean }>` sends two plain-text emails via `resend.batch.send`:

1. **Owner notification** — to `INQUIRY_NOTIFY_TO`, `reply_to` = inquirer's email. Subject `New inquiry — {name} ({budget label}, {timeline label})`. Body:
   ```
   {name} <{email}>
   Budget: {budget label} · Timeline: {timeline label}

   {building}

   Reply directly to this email, or open /admin → Inbox.
   ```
2. **Auto-reply** — to the inquirer, `reply_to` = `INQUIRY_NOTIFY_TO`. Subject `Got it — I'll reply within 24 hours`. Body:
   ```
   Hi {first name},

   Thanks for reaching out about what you're building. I read every inquiry personally and reply within 24 hours.

   — Purav
   ```
Both bodies are template strings in `mail.ts`; swapping to Resend dashboard templates later is a one-place change (`template_id`). Budget/timeline labels come from the same `options` table the field spec uses.

## 5. Admin

- **Tabs:** existing five + **Consulting** (Services list above Process list, each a `CollectionTab`), **Case studies**, **Testimonials**, **Inbox**. `Tab` union extends to nine; keyboard shortcuts ⌘1–9.
- **`CollectionTab<T>`** (`src/app/admin/components/CollectionTab.tsx`) props: `spec`, `apiBase`, `items`, `toast`, `loadData`, `uploadFile`, `onDirtyChange`. Renders: search (over all text fields), sorted list with `↑ ↓ EDIT DELETE` and a Draft/Live badge when `publishable`, add form, inline edit form, 5-second delete confirm (existing pattern), reorder via `PUT /reorder`. Field widgets by type: `text`/`number` input, `textarea`, `markdown` (textarea + live preview rendered client-side with the same `marked` options, HTML-escaped — the server render is authoritative), `chips` (existing technologies-style input), `image` (existing `uploadFile` with new upload type `diagram`: ≤1 MB, ≤1600×1200, jpg/png/webp/svg), `toggle`, `select`, `slug` (auto-fill from `title` until touched; pattern-validated).
- **InboxTab** (bespoke): newest-first, each row shows name, email (copy button), budget/timeline labels, excerpt, `notifyFailed` flag, status chips New → Replied → Archived (one-click `PUT /api/inquiries/[id] { status }`), delete with confirm. No create form.
- **ContentTab** gains `heroHeadline`, `heroSubheadline`, `manifesto` inputs (text, with the spec's limits).
- Dirty tracking, toasts, and `beforeunload` guard reuse the existing `admin/page.tsx` mechanics unchanged.

## 6. Public consumption (contract for slices 3–7)

- `/voyage/page.tsx` calls `getVoyageContent()` and passes `services`, `process`, `caseStudies`, `testimonials`, `settings.manifesto` into `VoyageRoot`; chapter components receive arrays and **hide when empty** (Worlds, Belt) per the voyage spec.
- `/work/[slug]/page.tsx` (server, `revalidate = 300`, `generateStaticParams` over published slugs, `notFound()` otherwise): title, client/context, stack chips, metrics, diagram (`/api/media/{id}`), three rendered markdown sections. No scene mounted. Lighter reading surface per the voyage spec.
- Everything is `revalidate = 300` like today's pages; admin writes call `revalidatePath("/voyage")` and `revalidatePath("/work/[slug]", "page")` so edits appear without waiting.

## 7. Error handling

- Validation errors: `400 { error }` with the field name and limit in the message (generated from the spec).
- Duplicate slug: `409 { error: "slug already exists" }`.
- Reorder with a wrong id set: `400`.
- Inquiry: honeypot → silent `201`; rate limit → `429` + `Retry-After`; email failure → stored, flagged, logged, still `201`; missing Resend env → skipped, logged, `201`.
- Markdown render never throws: sanitiser failure falls back to escaped plain text.
- `/work/[slug]` for unpublished or unknown → 404.

## 8. Testing

- **Unit (vitest, node):** `validate` for every field type and mode (required, max, chips count/length, select options, slug pattern, toggle coercion); `toDto` strips internal fields; `reorder` rejects wrong id sets; each spec's limits asserted from the spec object; `markdown.ts` strips `<script>`, `javascript:` links, and raw HTML; `mail.ts` with the Resend client mocked (both emails, labels, `reply_to`, skip-when-env-missing, never-throws); inquiry route: honeypot, oversize body, invalid enum, rate limit at the 6th call, email-failure-still-201.
- **Integration (route handlers with `NextRequest`, mocked data layer):** list/create/update/delete/reorder for one collection through the factory.
- **Browser (controller):** admin — create a service, a process step, a draft case study with a diagram, publish it, reorder; Inbox — submit the Landing form once the slice-7 UI exists (until then, `curl`), see the row, flip status. `/work/[slug]` renders the markdown sections.

## 9. Success criteria

- Four collections + Settings extension editable end-to-end from `/admin`; identical validation client and server, generated from one spec.
- `POST /api/inquiries` stores, rate-limits, ignores honeypot hits, and sends both emails through Resend from `communications.rushy.dev`; a Resend outage never loses an inquiry.
- `getVoyageContent()` and `/work/[slug]` return published content only; unpublished is invisible publicly.
- No new `#f2b35c`/theme code touched; existing routes' behaviour unchanged; all tests green; lint clean in new files.
