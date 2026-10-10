# Project recovery — 2026-09-30

Recovered from the project Claude transcript, 112 project session-summary records (filtered by milestone), project memory, Git history, approved specs, task ledger and review reports. Code and fresh checks take precedence over historical completion claims.

## Completed before recovery

- Voyage slices 1–2: single Three.js scene, camera path, quality tiers, scroll store, Launch, Ignition, rail, dock, audio integration and static fallback.
- Consulting CMS: service/process/case-study/testimonial collections, admin forms, inquiry persistence/email, case-study reading pages, seed and twelve review fixes. Merged at `063e2d5`.
- Slice 3 design and implementation plan: all 24 plan-review fixes were applied before the last session stopped. Independently verified on recovery.

## Execution checklist

- [x] Recover decisions, outstanding work and original visual-review requirement.
- [x] Verify baseline: 313 tests passing; TypeScript clean. Existing lint backlog: 10 errors and 6 warnings.
- [x] Restore local runtime and inspect Launch on desktop/mobile. Desktop Launch probe: 121 FPS, high tier.
- [x] Slice 3: Approach panels/topology and Jump visuals/audio; task tests, independent reviews, desktop/mobile/still browser checks. Launch-window FPS probes held high/mid tiers; chapter 02/03 performance and Playwright integration remain Slice 8 follow-ups. See the Slice 3 worklog and local Task 10/11 reports.
- [ ] Slice 4: Orbit process ring and step panels.
- [ ] Slice 5: Worlds with authored case studies and distinguishing planet features.
- [ ] Slice 6: Belt, Dark Passage and interactive project Constellation; skip empty proof chapters with consistent camera/scroll geometry.
- [ ] Slice 7: Pilot, Landing inquiry form/scheduler and Surface relaunch.
- [ ] Slice 8: remove legacy navigation/theme/typewriter paths, finish route wiring, integration/accessibility/performance checks.
- [ ] Resolve applicable deferred CMS review findings and repository lint backlog.
- [ ] Final whole-change review, fixes, production build and delivery.

## Decisions retained

Dark only; warm amber accent; one WebGL scene; high/mid/still tiers; reduced-motion content remains fully usable; camera never reverses. Preserve existing tuned star framing. Content comes from the CMS. Service count is unrestricted, visually tuned for three. Jump fires on every forward organic crossing, including skipped-band scroll events; suppress backward/programmatic passes. Use additive sprites and the existing synthesized whoosh, without a bloom pipeline. Screenshot and inspect desktop/mobile after each meaningful visual increment. Integration tests were deliberately deferred to Slice 8.

The approved design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the corrected Slice 3 plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. Detailed recovery/task evidence is local in `.superpowers/sdd/codex-recovery/`.

## External and content dependencies

MongoDB and Resend are established choices. The original local Mongo container was absent; a new loopback-only `mongo:7` container was created at port 27018 and seeded, without changing production data. The current seed contains no case studies or testimonials; never invent client endorsements. The user selected Resend when asked about contact: use the existing inquiry backend as the primary contact flow, with no scheduler integration or empty booking column.

Resend key rotation was offered previously, not completed or newly authorized. Existing remote branches were intentionally retained. Historical Claude-specific model and authorship instructions describe the prior session, not authorship of new Codex work.

## Latest user steering

The user explicitly confirmed the full remaining redesign and selected Resend for the inquiry service. Continue the real Resend-backed contact flow; no booking provider or public scheduler URL has been supplied.

The user rejected the current visual quality as fake, childish and unpolished. Functional Slice 3 verification remains valid, but visual acceptance is reopened. Correct the composition and rendering quality before extending the same treatment to later chapters. Audit and refine the current work; do not treat fidelity to the recovered plan or passing tests as proof of design quality. An optional direction question is pending (refined cinematic or minimal editorial); preserve the existing cinematic direction unless the user steers otherwise.
