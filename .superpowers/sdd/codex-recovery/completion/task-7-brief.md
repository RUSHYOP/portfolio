## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

### Task 7: Truthful Pilot arrival, horizon and relaunch

**Files:** Create `src/components/voyage/Pilot.tsx`, `Surface.tsx`, `arrival.ts`, `arrival.test.ts`, `src/scene/chapters/Horizon.ts`; modify root/scene/orb/CSS.

**Interfaces:** `Pilot({settings:Settings,skills:Skill[],animated:boolean})`; `Surface({sections:FooterSection[],chapters:readonly Chapter[],onRelaunch:()=>void})`; root `relaunchEpoch:number` prop read by scene without recreating GL. `pilotGlare(local)` peaks early, `pilotReveal(local)` reveals real portrait/bio as glare dims.

- [ ] Write pure envelope tests then implement:

```ts
// arrival.test.ts
import {expect,it} from "vitest";
import {pilotGlare,pilotReveal} from "./arrival";
it("resolves portrait after the glare",()=>{expect(pilotGlare(.15)).toBe(1);expect(pilotGlare(.5)).toBe(0);expect(pilotReveal(.15)).toBe(0);expect(pilotReveal(.5)).toBe(1);});
// arrival.ts
export const pilotGlare=(p:number)=>Math.max(0,Math.min(1,p/.15,(.45-p)/.3));
export const pilotReveal=(p:number)=>Math.max(0,Math.min(1,(p-.2)/.3));
```

- [ ] Add Pilot:

```tsx
"use client";
import Image from "next/image";
import type {Settings,Skill} from "@/lib/data";
import {useVoyage} from "@/scene/scroll/useVoyage";
import {pilotReveal} from "./arrival";
export default function Pilot({settings,skills,animated}:{settings:Settings;skills:Skill[];animated:boolean}){
 const s=useVoyage();const reveal=animated?(s.chapter.id==="pilot"?pilotReveal(s.chapterProgress):s.progress<.74?0:1):1;
 return <section id="pilot" className="chapter pilot" aria-labelledby="pilot-title" style={animated?{minHeight:"200vh"}:undefined}>
  <div className={animated?"chapter__pin pilot__pin":"voyage-static"}>
   <div className="pilot__grid" style={{opacity:reveal}}>
    {settings.profileImage&&<div className="pilot__portrait"><Image src={settings.profileImage} alt="Purav S" fill sizes="(max-width:767px) 240px, 400px" unoptimized/></div>}
    <div><p className="chapter__label">09 / THE PILOT</p><h2 id="pilot-title">{settings.aboutHeading||"Purav S"}</h2>
     {settings.aboutText.split(/\n+/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
     {settings.contactLocation&&<p className="chapter__label">{settings.contactLocation}</p>}
     {!!skills.length&&<ul className="voyage-chips" aria-label="Technical experience">{skills.map(skill=><li key={skill.id}>{skill.name}</li>)}</ul>}
    </div>
   </div>
  </div>
 </section>;
}
```

Do not silently truncate biography to exactly three paragraphs; retain all authored text and use natural layout on small/short screens. Keep rich formatting only through the existing safe `renderFormatted` helper if the stored bio depends on it. Add real soft bell on forward organic crossing of `pilot` local `.5`, using the existing programmatic flag and muted/still guards. Root subscription code:

```ts
useEffect(()=>{
 let previous=voyageStore.getState();
 return voyageStore.subscribe(next=>{
  const threshold=.74+(.84-.74)*.5;
  if(animated&&!state.muted&&!previous.programmatic&&!next.programmatic&&previous.progress<threshold&&next.progress>=threshold)engine.bell({volume:.07});
  previous=next;
 });
},[animated,state.muted,engine]);
```

Preserve actual bell option shape from `synths.ts`; volume is the existing optional numeric control. For skipped prior chapters threshold stays canonical and valid. `distanceAU` remains zero from Pilot start as already specified.

- [ ] In EnergyOrb's update compute `const arrival = ctx.voyage.chapter.id==="pilot"?pilotGlare(ctx.voyage.chapterProgress):0;` and include it in the existing `Math.max(this.glare, jumpGlare, arrival)` effective glare for both sphere uniform and glow sizing. Do not overwrite external setGlare or Jump controls. This is an original additive glow enhancement, no compositor.

- [ ] Add Horizon:

```ts
import * as THREE from "three";
import type {Tier} from "@/scene/quality";
import type {SetPiece,FrameContext} from "./types";
export class Horizon implements SetPiece{
 private mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>|null=null;
 private offset=new THREE.Vector3();
 build(scene:THREE.Scene,tier:Tier){this.dispose();if(tier==="still")return;
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uOpacity:{value:0}},
   vertexShader:`varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`varying vec2 uv0;uniform float uOpacity;void main(){float line=exp(-abs(uv0.y-.5)*180.);float glow=exp(-abs(uv0.y-.5)*16.)*.16;float edge=pow(sin(uv0.x*3.14159265),.7);vec3 color=mix(vec3(.65),vec3(.949,.702,.361),.7);gl_FragColor=vec4(color,(line+glow)*edge*uOpacity);}`});
  this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(40,8),material);this.mesh.visible=false;scene.add(this.mesh);
 }
 update({voyage,camera}:FrameContext){if(!this.mesh)return;const visible=voyage.chapter.id==="landing"||voyage.chapter.id==="surface";this.mesh.visible=visible;if(!visible)return;
  const p=voyage.chapter.id==="surface"?1:voyage.chapterProgress;this.mesh.material.uniforms.uOpacity.value=Math.min(1,p*4);
  this.offset.set(0,-7+2*Math.min(1,p*2),-18).applyQuaternion(camera.quaternion);this.mesh.position.copy(camera.position).add(this.offset);this.mesh.quaternion.copy(camera.quaternion);
 }
 dispose(){if(!this.mesh)return;this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh=null;}
}
```

Register Horizon in existing scene list; still gets a CSS static gradient behind Landing, no scene.

- [ ] Add `Surface.test.tsx` link-policy cases alongside the component:

```ts
import {expect,it} from "vitest";
import {footerHref} from "./Surface";
const retained=new Set(["pilot","landing","surface","constellation"]);
it("rejects control/backslash and protocol-relative footer paths",()=>{
 for(const input of [String.raw`/\evil.example/path`,"//evil.example", "\u0000/ok", "javascript:alert(1)"])expect(footerHref(input,retained)).toBe("");
 expect(footerHref("/projects",retained)).toBe("/projects");expect(footerHref("#contact",retained)).toBe("#landing");expect(footerHref("https://example.com/work",retained)).toBe("https://example.com/work");
});
it("reroutes empty portfolio aliases to the existing projects route and omits other absent chapters",()=>{
 const emptyPortfolio=new Set(["launch","pilot","landing","surface"]);
 expect(footerHref("#projects",emptyPortfolio)).toBe("/projects");
 expect(footerHref("/#constellation",emptyPortfolio)).toBe("/projects");
 expect(footerHref("/voyage#worlds",emptyPortfolio)).toBe("/projects");
 expect(footerHref("#approach",emptyPortfolio)).toBe("");
 expect(footerHref("/#orbit",emptyPortfolio)).toBe("");
 expect(footerHref("#arbitrary-missing-fragment",emptyPortfolio)).toBe("");
 expect(footerHref("#projects",retained)).toBe("#constellation");
});
```

- [ ] Add Surface with safe authored footer links and relaunch:

```tsx
"use client";
import type {FooterSection} from "@/lib/data";
import type {Chapter} from "@/scene/camera/flightPath";
export function footerHref(value:string,retained:ReadonlySet<string>):string{
 if(/[\u0000-\u001f\u007f\\]/.test(value))return "";
 const aliases:Record<string,string>={about:"pilot",contact:"landing",projects:"constellation"};
 const fragment=(hash:string,prefix="")=>{
  let source:string;try{source=decodeURIComponent(hash.slice(1));}catch{return "";}
  const id=aliases[source]??source;
  if(retained.has(id))return `${prefix}#${id}`;
  return id==="constellation"||id==="worlds"?"/projects":"";
 };
 if(value.startsWith("#"))return fragment(value);
 if(value.startsWith("/")&&!value.startsWith("//")){
  const url=new URL(value,"https://voyage.invalid");
  if((url.pathname==="/"||url.pathname==="/voyage")&&url.hash)return fragment(url.hash,url.pathname+url.search);
  return value;
 }
 try{const url=new URL(value);return ["https:","http:","mailto:"].includes(url.protocol)?value:"";}catch{return "";}
}
export default function Surface({sections,chapters,onRelaunch}:{sections:FooterSection[];chapters:readonly Chapter[];onRelaunch:()=>void}){
 const retained=new Set(chapters.map(chapter=>chapter.id));
 const groups=sections.map(section=>({...section,links:section.links.flatMap(link=>{const href=footerHref(link.url,retained);return href?[{...link,url:href}]:[];})})).filter(section=>section.links.length>0);
 return <section id="surface" className="chapter surface" style={{minHeight:"162.5vh"}}>
  <footer className="voyage-static"><p className="chapter__label">11 / SURFACE</p>
   <div className="surface__links">{groups.map((section,i)=><nav key={i} aria-label={section.title}><h2>{section.title}</h2><ul>{section.links.map((link,j)=><li key={j}><a href={link.url}>{link.label}</a></li>)}</ul></nav>)}</div>
   <p className="chapter__label">NEXT.JS · THREE.JS · MONGODB</p><button type="button" onClick={onRelaunch}>Relaunch ↑</button>
  </footer>
 </section>;
}
```

Pass the same retained `chapters` array used by dock/rail from VoyageRoot into Surface. Missing ordinary chapter fragments are omitted; missing Worlds/Constellation aliases truthfully lead to the existing `/projects` page, even if that page currently has no records. Drop a footer group if filtering leaves no links. Replace literal 162.5 with `sectionHeightVh(CHAPTERS.find(c=>c.id==="surface")!)` in component code using existing imports; the extra tail must remain exactly one viewport beyond surface allocation. Root owns callback:

```ts
const [relaunchEpoch,setRelaunchEpoch]=useState(0);
const relaunch=useCallback(()=>{
 if(tier!=="still")engine.whoosh({volume:.08});
 setRelaunchEpoch(value=>value+1);
 voyageStore.scrollTo(0);
},[engine,tier]);
```

SceneRoot adds a layout-synced epoch ref (same pattern as igniteRef). Frame holds `let lastRelaunch=relaunchEpochRef.current; let pendingRelaunch=false;`. Insert:

```ts
if(lastRelaunch!==relaunchEpochRef.current){lastRelaunch=relaunchEpochRef.current;pendingRelaunch=true;}
if(pendingRelaunch&&voyage.chapter.id==="launch"){igniteT=0;pendingRelaunch=false;}
```

Place before updating `ctx.ignite`. Do not include epoch in scene effect dependencies; relaunch must not recreate WebGL or replay first-visit Ignition session logic.

- [ ] Fetch `getSkills` alongside server content/projects, thread data; add Pilot/Surface branches. CSS:

```css
.pilot__pin {padding-top:100px;padding-bottom:70px;}
.pilot__grid {display:grid;grid-template-columns:minmax(180px,380px) minmax(0,1fr);gap:clamp(2rem,5vw,5rem);align-items:center;max-width:1200px;}
.pilot__portrait {position:relative;width:100%;aspect-ratio:1;border-radius:50%;overflow:hidden;border:1px solid #f2b35c;box-shadow:0 0 45px rgba(242,179,92,.09);}
.pilot__portrait img {object-fit:cover;}
.pilot h2 {font-size:clamp(2rem,4vw,3.5rem);font-weight:500;}
.pilot p {line-height:1.7;max-width:62ch;}
.surface__links {display:flex;flex-wrap:wrap;gap:3rem;margin:3rem 0;}
.surface__links h2 {font-size:1rem;}
.surface__links ul {list-style:none;padding:0;line-height:2;}
@media(max-width:767px),(max-height:650px){.pilot__pin{position:relative;height:auto;padding:100px 1.25rem}.pilot__grid{grid-template-columns:1fr}.pilot__portrait{width:240px;max-width:100%;margin:auto}}
```

For short/mobile screens, disable scroll-hidden Pilot opacity to keep full natural bio readable (`animated` layout treatment derives desktop matchMedia, or CSS force `.pilot__grid {opacity:1!important}` in the same media rule). This is an explicit readability fallback, not a claim of cinematic portrait timing on a page taller than viewport.

- [ ] Run arrival tests, add Pilot still test verifying exact supplied paragraphs/location and no synthetic IEEE/degree string, add Surface alias safety test, scene lifecycle tests, typecheck and touched lint. Commit `feat: add truthful Pilot arrival and Surface relaunch`.
