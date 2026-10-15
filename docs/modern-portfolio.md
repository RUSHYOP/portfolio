# Modern portfolio — October 15, 2026

User direction: a new modern portfolio using web design, CSS and motion; dark graphite selected. Preserve all previous project sources in a folder. Ship the result.

Design: graphite canvas, warm white display typography, orange detail, asymmetric hero, large real project screenshots, typographic research feature, compact project index, capabilities, portrait and contact. No 3D, audio, scroll hijacking, fabricated metrics, or invented client claims. Existing portrait, projects, links, CMS and Resend inquiry service remain useful source material.

Implementation checklist
- [x] Archive current source/assets/docs/configuration with a SHA-256 manifest. Exclude archive from build/deploy without deleting it.
- [x] New responsive layout, navigation, project presentation, biography, metadata and favicon; server content visible without JavaScript.
- [x] Progressive CSS/IntersectionObserver reveals, keyboard focus, reduced-motion handling, accessible contact form with pending/error/success states using existing inquiry endpoint.
- [x] Preserve CMS/API in active application; project reads fall back to original checked-in records when DB unavailable. Archive original frontend and all 3D/audio sources.
- [x] Typecheck, lint, existing backend tests, production build, desktop/mobile browser review, keyboard/zoom/reduced-motion and contact mocks; verify archive hashes.
- [ ] Commit, deploy to linked Vercel production project as authorized by “ship it”, and verify public response.

Files: src/app/page.tsx and globals.css define composition; src/components/SiteHeader.tsx, Motion.tsx and ContactForm.tsx own isolated interactions; src/lib/portfolio.ts reads real records; src/app/projects/page.tsx lists all projects. Existing backend/CMS remains under src/app/api, src/app/admin and src/lib. All original files are preserved under archive/2026-10-15-previous-portfolio.

Verification: 297 tests in 28 files; typecheck passed; production build passed on Next 16.4.1. Browser checks at 320/390/768/1024/1440 have zero horizontal overflow. Reduced motion, no-JavaScript content, 200% CSS zoom, skip link and mocked contact success verified. No page errors or canvas elements. All 375 archive checksums match. Runtime dependency audit: zero vulnerabilities; five development-only findings remain in the upstream ESLint glob/braces dependency chain, with no compatible patched release offered by npm audit.
