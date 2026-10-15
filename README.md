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
- Styles and responsive layouts: `src/app/globals.css`.
- Project records: the existing MongoDB CMS, falling back to the original ten records in `src/content/projects.json` if unavailable. `/admin` retains project editing and the inquiry inbox. The old CMS hero and navigation fields are preserved but the new landing-page composition is code-owned.
- Contact: existing `/api/inquiries` endpoint; MongoDB persistence and Resend notifications. If the existing database is unavailable, a validated inquiry is delivered through Resend directly and acknowledged only after the owner notification is accepted. Email-only inquiries are not stored in the CMS inbox. Existing production credentials are reused. Browser and unit tests mock submission and do not send email.
- All project links and the portrait come from the previous project. Featured website images are captures of the actual live projects, converted to WebP.
- Canonical site: https://rushy.dev. `/voyage` redirects to `/`. Existing `/work/[slug]` readers remain available and noindexed.

## Preserved previous project

`archive/2026-10-15-previous-portfolio/` contains the entire previous source, public assets, project data, scripts, design notes, screenshots and configuration. `manifest.sha256.json` verifies all 375 preserved original files. Nothing was discarded. The archive is excluded from builds, TypeScript, lint, tests and Vercel uploads; it remains in the repository.

## Deployment

The existing Vercel project is `portfolio`. Deploy with `npx vercel@latest --prod`. The project uses its existing production MongoDB and Resend environment variables. Never commit `.env.local` or hosting credentials.
