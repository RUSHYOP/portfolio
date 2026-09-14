# Worklog

## 2026-09-14

- Linked repo to Vercel project `portfolio`; pulled production env into `.env.local`.
- Attempted to clone Railway MongoDB locally — connection stalls/resets on the Railway proxy port from this network (TCP connects, no MongoDB wire-protocol response). Parked; running against a local `mongo:latest` Docker container on port 27018 seeded from `data/*.json` instead.
- Fixed `QuoteSection` crash when a quote is empty (`useScroll` targeting an unmounted ref) by gating render before the hooks.
- Removed the circular theme-wipe transition (looked oval on wide viewports) and its dead CSS.
- Captured baseline screenshots of all 8 screens into `screenshots/`.
- Wrote `design.md` (architecture + visual system reference).
- Brainstormed the portfolio → portfolio + consulting redesign; decisions and chapter script in `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`.

### Next
- Implementation plan for spec sub-project 1 (voyage), then build in 8 vertical slices with a browser review after each.
