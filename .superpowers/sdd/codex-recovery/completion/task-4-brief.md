## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

### Task 4: Render authored testimonials and a reversible Dark Passage

**Files:** Create `src/components/voyage/Belt.tsx`, `DarkPassage.tsx`, `usePassageAudio.ts`, `passageEnvelope.ts`, `passageEnvelope.test.ts`; modify `src/lib/audio/AudioEngine.ts`, `VoyageRoot.tsx`, `Starfield.ts`, `EnergyOrb.ts`, `voyage.css`.

**Interfaces:** `Belt({quotes:Item[],animated:boolean})`; `DarkPassage({line:string,animated:boolean})`; engine `setPassage(active:boolean):void`. Engine gain ownership is separate from velocity filter; unmount/tier changes restore passage gain and SFX gates.

- [ ] Add failing envelope test and implement after red:

```ts
// passageEnvelope.test.ts
import {expect,it} from "vitest";
import {passageDarkness} from "./passageEnvelope";
it("fades to black, holds, then releases",()=>{expect(passageDarkness(0)).toBe(0);expect(passageDarkness(.5)).toBe(1);expect(passageDarkness(1)).toBe(0);});
// passageEnvelope.ts
export function passageDarkness(p:number){return Math.max(0,Math.min(1,p/.2,(1-p)/.2));}
```

- [ ] Create Belt with pointer drag, slow ring-like drift only while active, explicit pause, and native keyboard-scrollable quotes:

```tsx
"use client";
import {useState} from "react";
import {motion} from "framer-motion";
import type {Item} from "@/lib/collections/defineCollection";
import {useVoyage} from "@/scene/scroll/useVoyage";
const text=(v:unknown)=>typeof v==="string"?v:"";
export default function Belt({quotes,animated}:{quotes:Item[];animated:boolean}){
 const voyage=useVoyage();const [paused,setPaused]=useState(false);
 if(!quotes.length)return null;
 const drift=animated&&!paused&&voyage.chapter.id==="belt";
 return <section id="belt" className="chapter belt" aria-labelledby="belt-title">
  <div className="voyage-static">
   <p className="chapter__label">06 / THE BELT</p><h2 id="belt-title">In their words</h2>
   {animated&&<button type="button" onClick={()=>setPaused(p=>!p)} aria-pressed={paused}>{paused?"Resume motion":"Pause motion"}</button>}
   <div className="belt__window" tabIndex={0} role="region" aria-label="Client testimonials" onFocusCapture={()=>setPaused(true)}>
    <motion.ul className={`belt__tiles${animated?"":" belt__tiles--still"}`} drag={animated?"x":false} dragConstraints={{left:-(Math.max(0,quotes.length-1))*300,right:0}} dragElastic={0}>
     {quotes.map((quote,index)=><li key={quote.id} className="glass belt__tile" style={drift?{animation:`beltDrift 14s ease-in-out ${-index*2}s infinite alternate`}:undefined}>
      <blockquote><p>{text(quote.quote)}</p><footer>{text(quote.name)}{quote.role&&<> · {text(quote.role)}</>}{quote.company&&<> · {text(quote.company)}</>}</footer></blockquote>
     </li>)}
    </motion.ul>
   </div>
  </div>
 </section>;
}
```

CSS stacks all tiles and disables transforms in still mode. Keep native horizontal overflow for keyboard and touch; pointer drag is enhancement, not sole access. Do not append legacy quote1/quote2 as endorsements; optional personal statements require explicit “Purav's notes” treatment and are omitted here.

- [ ] Create DarkPassage:

```tsx
"use client";
import {useVoyage} from "@/scene/scroll/useVoyage";
import {passageDarkness} from "./passageEnvelope";
export default function DarkPassage({line,animated}:{line:string;animated:boolean}){
 const s=useVoyage();const opacity=animated?(s.chapter.id==="passage"?passageDarkness(s.chapterProgress):0):1;
 return <section id="passage" className={`chapter passage ${animated?"passage--animated":""}`} style={animated?{height:"60vh"}:undefined}>
  <p style={{opacity}}>{line}</p>
 </section>;
}
```

Passage 60vh corrects old 37.5vh micro-beat; measured mapping preserves all downstream alignment. Still has normal intrinsic text and no black overlay/fade. Avoid an empty labelled landmark when manifesto is blank.

- [ ] Add AudioEngine fields/method, preserving existing gain values and lazy startup:

```ts
private passageActive=false;
private sfxDisabled=false;
setSfxDisabled(disabled:boolean){this.sfxDisabled=disabled;}
setPassage(active:boolean){
 this.passageActive=active;
 if(!this.ctx)return;
 const now=this.ctx.currentTime;
 this.ambientBus?.gain.setTargetAtTime(.6*(active?Math.pow(10,-18/20):1),now,.18);
 this.sfxBus?.gain.setTargetAtTime(active?0:1,now,.04);
}
```

After graph initialization sets both bus fields, call `this.setPassage(this.passageActive)`. Add `this.sfxDisabled || this.passageActive` to the guard of every SFX wrapper (`click`, `bell`, `whoosh`, `impact`, temporarily `keystroke`) so new sources cannot leak during Passage. In root effect call `engine.setSfxDisabled(!animated)` and cleanup restores false; no singleton SSR call. This also gates existing dock/CTA wrapper calls in still tier without changing every click handler. New method affects SFX only, not user's ambient opt-in.

Create `usePassageAudio.ts`:

```ts
"use client";
import {useEffect} from "react";
import type {AudioEngine} from "@/lib/audio/AudioEngine";
import {voyageStore} from "@/scene/scroll/voyageStore";
export function usePassageAudio(engine:AudioEngine,animated:boolean){
 useEffect(()=>{
  const apply=()=>engine.setPassage(animated&&voyageStore.getState().chapter.id==="passage");
  apply();const unsubscribe=voyageStore.subscribe(apply);
  return()=>{unsubscribe();engine.setPassage(false);};
 },[engine,animated]);
}
```

Call hook unconditionally in root with `tier!==null&&tier!=="still"`, before any early return. Passage subscribes even while muted so enabling sound within Passage starts with correct gain. Gate bell/Jump engines independently as above. Extend existing audio tests with fake AudioParams to assert target `.6*10**(-18/20)`, restore `.6`, sfx 0→1, and unmute during passage initialization; do not test using real speakers.

- [ ] Fade the entire scene to black during animated Passage using a DOM layer, avoiding independent set-piece fade holes:

```tsx
// New SceneBlackout.tsx, mounted once alongside scene in VoyageRoot.
"use client";
import {useVoyage} from "@/scene/scroll/useVoyage";
import {passageDarkness} from "./passageEnvelope";
export default function SceneBlackout({animated}:{animated:boolean}){
 const s=useVoyage();return <div aria-hidden="true" className="voyage-blackout" style={{opacity:animated&&s.chapter.id==="passage"?passageDarkness(s.chapterProgress):0}}/>;
}
```

Use the same envelope to hide grain's offset, not content. SceneBlackout sits above canvas but below all track/HUD content. Existing telemetry already knows `passage` and must still read SIGNAL LOST. Add CSS:

```css
.belt {min-height:160vh;}
.belt__window {overflow-x:auto;overflow-y:visible;padding:2rem 0;perspective:900px;}
.belt__tiles {display:flex;gap:1.5rem;list-style:none;padding:0;margin:0;touch-action:pan-y;}
.belt__tile {flex:0 0 min(78vw,350px);padding:2rem;}
.belt__tile blockquote {margin:0;line-height:1.7;}
.belt__tile footer {font-size:.8rem;color:#a3a3a3;margin-top:1rem;}
.belt__tiles--still {display:grid;transform:none!important;}
.belt__tiles--still .belt__tile {animation:none!important;}
@keyframes beltDrift {from{transform:translateY(-8px) rotateY(-5deg)}to{transform:translateY(8px) rotateY(5deg)}}
.passage {display:grid;place-items:center;padding:4rem 1.5rem;}
.passage p {font-size:clamp(2rem,4vw,3.5rem);line-height:1.2;max-width:24ch;text-align:center;}
.voyage-blackout {position:fixed;inset:0;z-index:0;background:#000;pointer-events:none;}
@media(prefers-reduced-motion:reduce){.belt{min-height:0}.belt__tiles{transform:none!important}.belt__tile{animation:none!important}}
```

Root render branches thread published `testimonials` and `settings.manifesto`. Add a gentle Belt-only camera roll immediately after the existing lookAt/Orbit-bank block: `if(voyage.chapter.id==="belt")camera.rotateZ(Math.sin(voyage.chapterProgress*Math.PI*2)*Math.PI/36);`. This resets from lookAt every frame, changes neither forward depth nor facing, and does not run in still tier. Subscribe/gain test, React still/empty quote tests, typecheck and touched lint pass; commit `feat: add authored Belt and reversible Dark Passage`.
