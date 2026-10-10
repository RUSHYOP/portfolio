## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

## Task 3: Extend the existing content-first server root for Process

**Already implemented:** Visible server hero/body, tier-gated ignition/SceneRoot and one DOM tree are retained from the engineering correction. Integrate Process and restored Services into that root; do not reintroduce a tier-null early return, duplicate text or initial opacity zero. Below are reservation/integration contracts, not permission to overwrite newer root logic. Still/no-WebGL Services must remain fully readable, and pending reservations must match the restored enhanced layout rather than the superseded editorial flow. Preserve the current text-zoom/static overflow fix; verify both pending and resolved tiers with long content.

**Files:** Modify `src/components/voyage/VoyageRoot.tsx`, `Launch.tsx`, `Process.tsx`, the completed Services static wrapper, and `src/app/voyage/voyage.css`; create `src/components/voyage/serverContent.test.tsx`.

**Interfaces:** `data-tier="pending"` describes server/hydration markup. `animated` is false until a high/mid tier is resolved. Server emits the actual hero, services and all process text in one section tree. The pending CSS reserves the same physical chapter dimensions that enhancement will use; reduced-motion CSS renders intrinsic content from the first paint. SceneRoot only mounts for high/mid.

- [ ] Remove the `if (tier === null) return <div className="voyage-root voyage-root--booting" />;` branch. Move `const animated = tier !== null && tier !== "still";` before the existing hook consumers that need it, preserving unconditional hook order. Retain the mount environment detection; it changes the data-tier attribute after hydration. Add `type CSSProperties` to the React import and `orbitHeightVh` import. Compute these plain render values:

```ts
const reservations = Object.fromEntries(CHAPTERS.map(c => [`--reserve-${c.id}`, `${sectionHeightVh(c)}vh`])) as CSSProperties;
const trackStyle = { ...reservations, "--reserve-orbit": `${orbitHeightVh(process.length)}vh` } as CSSProperties;
```

Use these opening/scene elements and keep the existing children/order:

```tsx
<div className="voyage-root" data-tier={tier ?? "pending"}>
  <VoyageScroll smooth={animated} />
  {tier === "high" || tier === "mid" ? <SceneRoot tier={tier} ignite={ignited} onContextLost={onContextLost} /> : <StillSky />}
  {/* Existing HUD, dock, Ignition and ordered sections remain here. */}
  <main className="voyage-track" style={trackStyle}>
```

The excerpt is an insertion contract, not replacement of the full root: preserve Slice 3/4's actual SceneRoot props when editing the scene element. Track style contains reservation custom properties only, **no minHeight**. Do not mount Ignition while tier is null: wrap its existing element in `tier !== null && ...`, so the disabled-state completion effect cannot prematurely finish session ignition. Once tier resolves it may overlay content; it must never hide server text. In Launch invocation pass `ready={true}`. In `Launch.tsx` change the motion wrapper `initial` to `false` and keep `animate={{opacity:1,y:0}}`; remove the no-longer-used readiness prop if desired by updating its one caller in the same edit. Hint opacity still derives from chapter progress. No inline server opacity:0 or transform may hide the H1/body/CTAs.

- [ ] Add reservation CSS. It applies only before tier resolution; the actual enhanced section heights remain component-owned. Surface retains its final tail. Each pending static content wrapper gets a keyboard-focusable bounded reader (`tabIndex={0}` on Services' static wrapper and Process `.process__static`); all actual text is rendered, with no duplicated sections or headings:

```css
.voyage-root[data-tier="pending"] #launch { height:var(--reserve-launch)!important; }
.voyage-root[data-tier="pending"] #approach { height:var(--reserve-approach)!important; }
.voyage-root[data-tier="pending"] #jump { height:var(--reserve-jump)!important; }
.voyage-root[data-tier="pending"] #orbit { height:var(--reserve-orbit)!important; }
.voyage-root[data-tier="pending"] #worlds { height:var(--reserve-worlds)!important; }
.voyage-root[data-tier="pending"] #belt { height:var(--reserve-belt)!important; }
.voyage-root[data-tier="pending"] #passage { height:var(--reserve-passage)!important; }
.voyage-root[data-tier="pending"] #constellation { height:var(--reserve-constellation)!important; }
.voyage-root[data-tier="pending"] #pilot { height:var(--reserve-pilot)!important; }
.voyage-root[data-tier="pending"] #landing { height:var(--reserve-landing)!important; }
.voyage-root[data-tier="pending"] #surface { height:var(--reserve-surface)!important; }
.voyage-root[data-tier="pending"] .process__static,
.voyage-root[data-tier="pending"] .chapter--approach[data-static="true"] > .chapter__pin { max-height:100vh; overflow:auto; }
@media (prefers-reduced-motion:reduce) {
  .voyage-root[data-tier="pending"] .chapter:not(#surface) { height:auto!important; min-height:0!important; }
  .voyage-root[data-tier="pending"] #jump { display:none; }
  .voyage-root[data-tier="pending"] .process__static,
  .voyage-root[data-tier="pending"] .chapter--approach[data-static="true"] > .chapter__pin { max-height:none; overflow:visible; }
  .voyage-root[data-tier="pending"] .chapter__pin { position:relative; height:auto; min-height:100vh; }
}
```

The Services selectors match Slice 3’s `chapter--approach` / `data-static="true"` contract; do not introduce a duplicate Services tree. Pending Approach must reserve the restored animated height (150vh default), with all authored Services readable through its keyboard-accessible static reader; there is no editorial intrinsic-height exemption while tier is pending. Reduced-motion/no-WebGL resolved still uses intrinsic section height. Explicitly test no-JS pending N=1/3/6/10 and longest legal copy: every service can be reached without clipping, while pending→animated boundaries remain stable. Preserve the restored mobile static-card overflow fix inside this reader rather than blindly adding a competing inner clamp. Future Slice 5–7 tasks must extend the reservation values to their real variable heights and render each newly added chapter/form in this same server tree.

- [ ] Add server rendering test using `react-dom/server` against Launch and Process (no browser/WebGL required):

```tsx
import {renderToString} from "react-dom/server";
import {expect,it} from "vitest";
import Launch from "./Launch";
import Process from "./Process";
it("includes visible real hero and every process step in server HTML",()=>{
 const hero=renderToString(<Launch headline="Actual CMS headline" subheadline="Actual CMS promise" ready />);
 expect(hero).toContain("Actual CMS headline");expect(hero).toContain("Actual CMS promise");
 expect(hero).not.toContain("opacity:0");
 const process=renderToString(<Process animated={false} steps={[
  {id:"a",order:0,createdAt:"",title:"Discover",what:"Understand constraints"},
  {id:"b",order:1,createdAt:"",title:"Ship",what:"Operate reliably"},
 ]}/>);
 expect(process).toContain("Understand constraints");expect(process).toContain("Operate reliably");
 expect(process.match(/id="orbit"/g)).toHaveLength(1);
 expect(process).not.toContain("chapter__pin");
});
```

Retain `ready` in Launch for this test/interface unless the deliberate same-task cleanup updates both. Run this test, all touched component tests, typecheck and touched lint. Browser gate must separately inspect actual `/voyage` response and a JavaScript-disabled browser: component render tests alone cannot prove the root is server-rendering content. Capture CLS from navigation through tier resolution at 1440×900 and 390×844 using buffered LayoutShift entries; require <0.05 before accepting the slice. If a reservation mismatch shifts downstream sections, fix the relevant reservation/body overflow rather than restoring the blank server root.

- [ ] Commit `feat: server-render voyage content before scene enhancement`.
