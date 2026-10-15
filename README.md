# Purav — editorial portfolio

A dark graphite portfolio built with Next.js, local Styrene typography, CSS transitions, and progressive scroll reveals. No 3D renderer, audio or scroll interception.

## Run

```sh
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Content and services

- Homepage composition and copy: `src/app/page.tsx`.
- Styles and responsive layouts: `src/app/globals.css`; editorial motion and visual refinements: `src/app/refinements.css`. Shared public-page motion lives in `src/components/Motion.tsx` and respects reduced motion.
- Phone layouts use a compact header, 44px navigation targets, single-column inquiry fields and article contents, and anchor offsets below the sticky header. Touch previews avoid hover zoom; short landscape viewports keep the header in document flow. Responsive checks cover 320–430px phones, landscape, 200% zoom, and desktop.
- Project records: the existing MongoDB CMS, falling back to `src/content/projects.json` if unavailable. Public curation in `src/lib/portfolio.ts` excludes Network Scanner Pro and HarvestLink, hides ProcSAGE’s code link, and adds GharPay as collaborative work and Digital Garden as a knowledge platform. `/admin` retains project editing and the inquiry inbox. The old CMS hero and navigation fields are preserved but the new landing-page composition is code-owned.
- Contact: existing `/api/inquiries` endpoint; MongoDB persistence and Resend notifications. If the existing database is unavailable, a validated inquiry is delivered through Resend directly and acknowledged only after the owner notification is accepted. Email-only inquiries are not stored in the CMS inbox. Existing production credentials are reused. Browser and unit tests mock submission and do not send email.
- Article content: `src/content/project-stories.ts`; all eleven work entries have `/projects/[slug]` pages, canonical metadata, article navigation, and sitemap entries. GharPay’s description is based on the Residence OS source and its public website; its screenshot is a public homepage capture, converted to WebP. No private project source or resident data is published. The portrait and other project records come from the previous portfolio.
- Ramco profile: `/projects/ramco-work-profile`, featured on the homepage. `src/components/RamcoTenure.tsx` updates the tenure from 2 February 2026 using India calendar dates; it shows completed months, then decimal years.
- Canonical site: https://rushy.dev. `/voyage` redirects to `/`. Existing `/work/[slug]` readers remain available and noindexed.

## Preserved previous project

`archive/2026-10-15-previous-portfolio/` contains the entire previous source, public assets, project data, scripts, design notes, screenshots and configuration. `manifest.sha256.json` verifies all 375 preserved original files. Nothing was discarded. The archive is excluded from builds, TypeScript, lint, tests and Vercel uploads; it remains in the repository.

## Deployment

The existing Vercel project is `portfolio`. Deploy with `npx vercel@latest --prod`. The project uses its existing production MongoDB and Resend environment variables. Never commit `.env.local` or hosting credentials.
