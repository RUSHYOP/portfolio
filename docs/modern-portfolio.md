# Modern portfolio — October 15, 2026

User direction: a new modern portfolio using web design, CSS and motion; dark graphite selected. Preserve all previous project sources in a folder. Ship the result.

Design: graphite canvas, warm white display typography, orange detail, asymmetric hero, large real project screenshots, typographic research feature, compact project index, capabilities, portrait and contact. No 3D, audio, scroll hijacking, fabricated metrics, or invented client claims. Existing portrait, projects, links, CMS and Resend inquiry service remain useful source material.

Implementation checklist
- [x] Archive current source/assets/docs/configuration with a SHA-256 manifest. Exclude archive from build/deploy without deleting it.
- [x] New responsive layout, navigation, project presentation, biography, metadata and favicon; server content visible without JavaScript.
- [x] Progressive CSS/IntersectionObserver reveals, keyboard focus, reduced-motion handling, accessible contact form with pending/error/success states using existing inquiry endpoint.
- [x] Preserve CMS/API in active application; project reads fall back to original checked-in records when DB unavailable. Archive original frontend and all 3D/audio sources.
- [x] Typecheck, lint, existing backend tests, production build, desktop/mobile browser review, keyboard/zoom/reduced-motion and contact mocks; verify archive hashes.
- [x] Commit, deploy to linked Vercel production project as authorized by “ship it”, and verify public response.

Files: src/app/page.tsx and globals.css define composition; src/components/SiteHeader.tsx, Motion.tsx and ContactForm.tsx own isolated interactions; src/lib/portfolio.ts reads real records; src/app/projects/page.tsx lists all projects. Existing backend/CMS remains under src/app/api, src/app/admin and src/lib. All original files are preserved under archive/2026-10-15-previous-portfolio.

Verification: 297 tests in 28 files; typecheck passed; production build passed on Next 16.4.1. Browser checks at 320/390/768/1024/1440 have zero horizontal overflow. Reduced motion, no-JavaScript content, 200% CSS zoom, skip link and mocked contact success verified. No page errors or canvas elements. All 375 archive checksums match. Runtime dependency audit: zero vulnerabilities; five development-only findings remain in the upstream ESLint glob/braces dependency chain, with no compatible patched release offered by npm audit.

Production: https://rushy.dev. First deployment READY (49-second Vercel build); public homepage 200, correct canonical, no browser page errors, zero mobile overflow. Post-deploy route review caught an unanchored logs exclusion that also excluded the client logging API. The deployment ignore entries are now root-anchored. Contact form uses POST even without hydration, preventing native fallback submission from putting message contents in a URL.

Post-deployment external-service check: existing production MongoDB returns connection resets; CMS reads remain unavailable. The new site remains usable using its preserved project records. Added tested Resend fallback for database outages, with 503 if both storage and owner mail fail. Read-only Resend inspection confirmed sending enabled, DKIM and SPF verified; its unrelated receiving MX is failed. No test email sent. This does not claim the old database has been repaired.

## Project stories — October 15 update

Requested changes: remove Network Scanner Pro and HarvestLink from the public portfolio; remove ProcSAGE’s code link; add GharPay as collaborative work; give all projects blog-style detail pages.

Implemented nine `/projects/[slug]` articles, internal links from the homepage and index, per-article metadata, a contents navigation, project resources, next-project navigation, and sitemap entries. Public curation applies to both CMS and fallback data, so old records cannot reintroduce the removed projects or code link. The original data and archive remain preserved.

GharPay copy was checked against the public https://gharpay.co/ website and the sibling `Residence OS` source: README, package.json, db/index.ts, server/rbac/authorize.ts, server/apt-admin/statement-amounts.ts, payment-review.ts, and month-close.ts. Credit is collaborative; no individual feature ownership, usage figures, or business outcomes are invented. Only a public marketing screenshot is included, never authenticated records or private source. Other articles expand the existing project descriptions without invented performance results.

Verification: 302 tests in 28 files; lint, typecheck, and production build passed. Browser review of homepage, index, GharPay and ProcSAGE at 320/390/768/1440 px found no overflow, removed links, or browser errors; GharPay also fits at 200% CSS zoom. Screenshots are in `screenshots/project-stories/`.

Production-build checks: all nine article routes return 200 with unique canonicals and one h1; unknown slugs return 404; sitemap contains all nine stories. GharPay's table of contents navigates correctly and all four sections remain readable without JavaScript. All 375 archived originals still match their SHA-256 manifest.

## Digital Garden addition

Added Digital Garden to the homepage, curated project index, and `/projects/digital-garden` article. Its overview covers the public library, Obsidian-compatible note rendering, linked reading paths, private Markdown imports, PDF exports, and the content/account architecture. Evidence: live public homepage plus `obsidian-vault-website` README, frontend/internal API package manifests, current landing route, catalogue reader, content storage, private-vault graph and storage, PDF job orchestration, webhook route, incremental sync script, and subscriber-platform documentation. No authenticated notes, credentials, or private source are published.

Generalized the feature styles and image captions to support both GharPay and Digital Garden. The sitemap automatically includes the tenth article. Preserved the requested `Purav S - Portfolio` page title. Targeted content tests (5), lint, production build, and browser checks of home/index/article at 320/390/768/1440 passed with no overflow or page errors. The local dev server remains on port 3005.

## Subtle advisory positioning

Capabilities now invite shaping ideas and reviewing technical approaches; the CTA reads “Let’s work it through.” Contact copy welcomes technical decisions and a fresh perspective, and the message field asks “What’s on your mind?” This expresses availability for advisory conversations alongside delivery through the existing inquiry flow. Contact form tests (2), lint, production build, and mobile contact rendering passed; no emails were sent during verification.

## Ramco work profile and live tenure

Added `/projects/ramco-work-profile` as the lead work-section feature and first entry in the work index, with article metadata and automatic sitemap inclusion. It covers the internship-to-full-time progression and broad AI engineering, developer tooling, product interface, and team enablement work. It includes no proprietary project names, customer details, private documents, or internal performance figures.

User confirmed the start date as 2 February 2026, including the internship. The reusable live counter refreshes every minute and when a tab becomes visible. It uses Asia/Kolkata calendar dates, displays completed months in the first year, then decimal years rounded to one decimal (14 months → 1.2 years). The server timestamp provides a matching hydration snapshot; the browser catches up to the current time.

Verification: 14 targeted content/date/component tests pass, including the anniversary boundary at midnight in India, year formatting, a running clock crossing the anniversary, and timer cleanup. Lint and production build pass. Home and profile article fit 320/390/768/1440 px and 200% zoom with no browser page errors.
