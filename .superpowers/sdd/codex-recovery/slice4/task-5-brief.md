## Authoritative visual amendment — 2026-09-30

The user rejected the earlier visual result. Follow `.superpowers/sdd/codex-recovery/design-correction-brief.md` and its accepted restrained cinematic correction. An editorial foreground and meaningful real CMS content dominate. Do not default to equal glass cards; rings, planets and graphs are secondary sparse scene cues, with no invented project relationships. Decorative sample CSS, glass/blur prescriptions and old pinned-reader styling below are subordinate to the corrected tokens and composition. Visual review may simplify or decrease decoration. Keep pinned interaction only where a chapter needs it and all content remains accessible; Services uses intrinsic natural flow on every tier, authored order, no arc/150vh/card-strip treatment. Do not restore overlapping animated mobile service cards. Functional camera, data, navigation and accessibility contracts remain mandatory.

## Task 5: Browser gate, regression checks, and evidence

**Files:** `worklog.md`, `insights.md`, `screenshots/voyage/slice-4/*`; only fix implementation files if review demonstrates a defect.

**Interfaces:** Existing dev server `/voyage`; browser automation and screenshot tools available to executing session; existing quality JSON logs.

- [ ] Verify actual `/voyage` response HTML contains the current CMS headline, service/process body text and exactly one of each chapter ID. Open with JavaScript disabled and confirm that text is visible/readable; no blank root and no hidden hero. Record buffered CLS during normal hydration at both target viewports and require <0.05. Then run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Record exact results, including any pre-existing failures separately. Do not invent FPS or claim a WebGL review from a still fallback screenshot.
- [ ] Start or reuse `npm run dev`. Read the browser automation tool documentation before driving it. Open `/voyage`; confirm actual process CMS data. At 1440×900 and 390×844 capture Orbit entry, each of the four held steps (or every returned step if count differs), Orbit exit, Approach, Jump, and Worlds entry. For each held step i use the measured Orbit element:

```js
const section = document.getElementById("orbit");
const top = section.getBoundingClientRect().top + window.scrollY;
const target = top + (i + 0.5) * window.innerHeight;
window.scrollTo({ top: target, behavior: "instant" });
```

Wait for the actual `window.scrollY` to settle within 2px of target before capturing. Do not assume old raw p=.27 reaches the middle of Orbit. Store screenshot names `desktop-orbit-step-01.png`, `mobile-orbit-step-01.png`, matching entry/exit and regression names under `screenshots/voyage/slice-4/`. Check ring front position and panel title match in each capture. Check 30° bank during first-viewport entry, smooth ring rotation between steps, bright white nodes, no amber ring, and no overlap with dock/controls.
- [ ] Click Process in dock and Orbit rail tick, then Work/Worlds and Landing. Preserve their existing `chapter.start + .001` targets. Verify actual scrollY is within 2px of the measured `toScroll(chapter.start + .001, segments)` target, separately verify that offset lies inside the named chapter and its rail label is active; repeat after a viewport resize and after opening/closing the inline Read all steps disclosure. Verify no Jump SFX on programmatic passage. Confirm raw native forward scroll retains Slice 3 Jump behavior. Confirm browser restoration into Orbit seeds correct step without a scroll event.
- [ ] Test maximum legal copy (600-character what, 400-character deliverable, 40-character duration) using temporary local test fixtures, reverted before commit. At 390×844 and 200% zoom: reader keyboard focus reachable, all words readable by scrolling, no horizontal overflow, disclosure toggle focus visible and all steps accessible, no keyboard trap. Verify stable reader DOM/focus with scrollTop reset when step index changes. Scroll past Orbit with disclosure closed and open; hidden region is inert and never consumes keyboard focus. Tab from the toggle through the visible region to the next page control; Shift+Tab returns. In the all-steps region press End and verify the final step is readable within the viewport bound. Retune CSS only with evidence.
- [ ] Emulate reduced motion and reload: confirm no voyage canvas, no Orbit sticky container, all N steps readable in order, no scroll-driven fades or transforms, and later chapter navigation remains aligned despite intrinsic Orbit height. Disable WebGL and reload for the same checks. Test zero, one, four and five process records with local fixtures and restore real data. Zero is the explicit empty-section deviation, not a broken render.
- [ ] At **both 900px and 844px viewport heights**, test local N=0 and N=1 fixtures in still mode and N=4 animated. Run this browser assertion using the live DOM (not a mocked scrollHeight):

```js
const table = [
  ["launch",0,.08],["approach",.08,.20],["jump",.20,.22],["orbit",.22,.34],
  ["worlds",.34,.52],["belt",.52,.60],["passage",.60,.63],["constellation",.63,.74],
  ["pilot",.74,.84],["landing",.84,.95],["surface",.95,1],
];
const track = document.querySelector(".voyage-track");
if (getComputedStyle(track).minHeight !== "0px" && getComputedStyle(track).minHeight !== "auto") throw new Error("Unexpected fixed track minimum");
const segments = table.map(([id,start,end]) => {
  const rect = document.getElementById(id).getBoundingClientRect();
  const top = rect.top + window.scrollY;
  return { id, start, end, top, bottom: top + rect.height - (id === "surface" ? innerHeight : 0) };
});
const scrollLimit = document.documentElement.scrollHeight - innerHeight;
if (Math.abs(segments.at(-1).bottom - scrollLimit) > 2) throw new Error("Surface does not end at true document scroll limit");
for (const s of segments) {
  const navTarget = s.top + .001 / (s.end - s.start) * (s.bottom - s.top);
  if (!(navTarget > s.top && navTarget < s.bottom)) throw new Error(`Navigation outside ${s.id}`);
}
window.scrollTo({ top: scrollLimit, behavior: "instant" });
```

After settling, verify actual scrollY equals the reported scrollLimit within 2px, Surface is the active rail chapter, and `surface` canonical progress is 1 (the pure measured-boundary test proves the mapping; inspect the store using the running app's dev debugger if needed). Scroll back to every measured section top and confirm its active chapter at the exact boundary; then click its actual dock/rail control and compare to the **+.001 mapped target**, not top. Repeat after resize without reload. There must be no extra trailing blank caused by the removed 1350vh minimum; Surface's intentional one-viewport tail is already accounted for and is not an extra chapter interval. Restore real data after fixtures.

- [ ] Inspect console errors and GPU context count; at most one live voyage canvas. Record actual quality tier and logged 1s FPS probe for both desktop and mobile. If software rendering forces still or demotion, record that limitation and obtain a real animated review before marking cinematic acceptance complete. Inspect ring disappearance on either side of Orbit and context-loss fallback. Review every screenshot visually, not just file existence.
- [ ] Append factual outcomes and deviations to `worklog.md` and `insights.md`, including actual step counts, mapping change, sampled FPS, desktop/mobile review findings, and any remaining controller decision. Commit screenshots and notes with `docs: record Orbit browser acceptance`. Only proceed to Slice 5 after this gate passes.

## Self-review of this plan

- Orbit step geometry, CMS fields, ring rotation, monochrome material, viewport dwell, static accessible content, camera bank, single scene, disposal, and browser gate each have an implementation task.
- The physical/canonical mapping has round-trip and boundary tests; existing camera forward/distance tests remain authoritative. Geometry is never persisted in server-global state.
- The general empty-chapter removal and reduced-motion micro-beat deletion are settled temporary/shared-scope deferrals to Slice 6, not silently claimed as complete.
- Actual Slice 3 file edits may land after this plan; all shared integration steps are surgical additions, not full-file replacements. Only this plan document was written during planning.

**Visual regression gate:** Compare with the accepted correction, not the rejected Slice 3 cards. Services remains natural page flow for all N and tiers. Orbit remains subordinate to readable process content; simplify ring brightness, glass and pin styling where needed.
