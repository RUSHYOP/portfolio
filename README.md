# Portfolio Website

Personal portfolio website showcasing my work as a Backend Developer.

## About

This is my portfolio website built with Next.js and React. It features an interactive space-themed design with Three.js animations and includes sections for about me, projects, and contact information.

## Features

- Interactive 3D background with Three.js
- Responsive design
- Project showcase
- Schema-driven consulting CMS at `/admin` (services, process, case studies, testimonials, inbox)
- Contact/inquiry form delivered over Resend
- Background ambient audio

## Tech Stack

- Next.js
- React
- TypeScript
- Three.js
- MongoDB + Mongoose
- Resend

## Consulting CMS

The consulting side of the site is schema-driven: one definition per collection in `src/lib/collections/specs/*` generates the Mongoose model, the API routes and the admin UI (see `design.md` for the architecture).

**Collections**

| Collection | API | Public? | Notes |
|---|---|---|---|
| Services | `/api/services` | Yes (all) | Ordered; shown on `/voyage` |
| Process steps | `/api/process` | Yes (all) | Ordered |
| Case studies | `/api/case-studies` | Published only | Backs `/work/[slug]`; unique slug |
| Testimonials | `/api/testimonials` | Published only | Ordered |
| Inquiries | `/api/inquiries` | POST only | Contact-form submissions; reads are admin-only |

Each collection route also exposes `/[id]` (GET/PUT/DELETE) and `/reorder`. Public GETs return published items only; the admin reads the same routes with `?all=1` plus the auth cookie to see drafts and internal fields.

**Admin tabs** (`/admin`, ⌘1–9): Content, Projects, Skills, Navigation, Media, Consulting, Case studies, Testimonials, Inbox.

**Environment variables** (set in `.env.local` locally and in the Vercel project for production — never commit values):

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongo connection string |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `JWT_SECRET` | Single-admin CMS auth |
| `RESEND_API_KEY` | Resend API key for inquiry mail |
| `RESEND_FROM` | Verified from-address for both inquiry emails |
| `INQUIRY_NOTIFY_TO` | Where the owner notification is sent |
| `INQUIRY_IP_SALT` | Salt for the hashed submitter IP used by the rate limiter |

Without `RESEND_API_KEY` the inquiry POST still stores the submission — mail is non-blocking by design.

**Local development**

```bash
# Local MongoDB (mongo:7 — mongo:latest/8.x fails on some kernels, SERVER-121912)
docker run -d --name portfolio-mongo-local -p 27018:27017 mongo:7

# Seed: projects, skills, settings, 3 services and 4 process steps.
# Clears projects/skills/settings/services/process steps; case studies,
# testimonials and inquiries are never touched.
MONGODB_URI="mongodb://localhost:27018/portfolio" npm run seed

npm run dev        # http://localhost:3000
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

Restart `npm run dev` after editing a Mongoose schema — the cached model is not recompiled by hot reload and new fields are silently dropped until a restart.

## Contact

**Purav S**  
Email: puravshrinavalan@gmail.com  
Location: Bangalore, India

## Links

- [GitHub](https://github.com/RUSHYOP)
- [LinkedIn](https://linkedin.com/in/purav-s)
- [X](https://x.com/rushyyyyyyyyyyy)
- [Instagram](https://instagram.com/_rushyyy)

## License

© 2025 Purav S. All rights reserved.
