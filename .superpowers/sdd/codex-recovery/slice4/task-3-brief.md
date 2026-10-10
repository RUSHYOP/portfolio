## Authoritative visual amendment — 2026-09-30

The user rejected the earlier visual result. Follow `.superpowers/sdd/codex-recovery/design-correction-brief.md` and its accepted restrained cinematic correction. An editorial foreground and meaningful real CMS content dominate. Do not default to equal glass cards; rings, planets and graphs are secondary sparse scene cues, with no invented project relationships. Decorative sample CSS, glass/blur prescriptions and old pinned-reader styling below are subordinate to the corrected tokens and composition. Visual review may simplify or decrease decoration. Keep pinned interaction only where a chapter needs it and all content remains accessible; Services uses intrinsic natural flow on every tier, authored order, no arc/150vh/card-strip treatment. Do not restore overlapping animated mobile service cards. Functional camera, data, navigation and accessibility contracts remain mandatory.

## Task 3: Integrate Process with the corrected content-first server root

**Correction dependency:** The visual correction already removes the tier-null empty root and hidden Launch. Verify and extend that implementation for Process; do not replace it or clamp intrinsic Services.

**Files:** Modify `src/components/voyage/VoyageRoot.tsx`, `Launch.tsx`, `Process.tsx`, and `src/app/voyage/voyage.css`; create `src/components/voyage/serverContent.test.tsx`.

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

- [ ] Add reservation CSS. It applies only before tier resolution; the actual enhanced section heights remain component-owned. Surface retains its final tail. Process gets a keyboard-focusable bounded reader when needed (`tabIndex={0}` on `.process__static`); intrinsic Services remains normal page flow with no reservation or clamp; all actual text is rendered, with no duplicated sections or headings:

```css
.voyage-root[data-tier="pending"] #launch { height:var(--reserve-launch)!important; }
.voyage-root[data-tier="pending"] #jump { height:var(--reserve-jump)!important; }
.voyage-root[data-tier="pending"] #orbit { height:var(--reserve-orbit)!important; }
.voyage-root[data-tier="pending"] #worlds { height:var(--reserve-worlds)!important; }
.voyage-root[data-tier="pending"] #belt { height:var(--reserve-belt)!important; }
.voyage-root[data-tier="pending"] #passage { height:var(--reserve-passage)!important; }
.voyage-root[data-tier="pending"] #constellation { height:var(--reserve-constellation)!important; }
.voyage-root[data-tier="pending"] #pilot { height:var(--reserve-pilot)!important; }
.voyage-root[data-tier="pending"] #landing { height:var(--reserve-landing)!important; }
.voyage-root[data-tier="pending"] #surface { height:var(--reserve-surface)!important; }
.voyage-root[data-tier="pending"] .process__static { max-height:100vh; overflow:auto; }
@media (prefers-reduced-motion:reduce) {
  .voyage-root[data-tier="pending"] .chapter:not(#surface) { height:auto!important; min-height:0!important; }
  .voyage-root[data-tier="pending"] #jump { display:none; }
  .voyage-root[data-tier="pending"] .process__static { max-height:none; overflow:visible; }
  .voyage-root[data-tier="pending"] .chapter:not(#approach) .chapter__pin { position:relative; height:auto; min-height:100vh; }
}
```

Services retains the corrected intrinsic structure unchanged; do not introduce a duplicate tree or pending reservation. Future Slice 5–7 tasks must extend the reservation values to their real variable heights and render each newly added chapter/form in this same server tree.

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
