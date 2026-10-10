# Voyage Redesign — Slices 5–8 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute sequentially; finish each slice's browser gate before starting the next. Current Codex attribution applies. No historical Claude model/trailer rules apply.

**Goal:** Complete the approved proof-to-arrival voyage, connect its existing CMS and inquiry backend, launch it at `/`, and remove the replaced experience without fabricating proof or configuration.

**Architecture:** Build on completed Slices 3/4 and the root-local measured scroll geometry. Preserve canonical chapter ranges, but omit empty sections and filter camera waypoints and navigation together; physical mapping skips the resulting canonical gaps. Keep one scene, CMS-derived DOM, accessible static counterparts, and small pure helpers shared between DOM and set pieces.

**Tech Stack:** Existing Next.js 16, React 19, Three.js 0.169, Framer Motion 12, Lenis 1.3, Vitest 5, Mongo/Mongoose, and Resend. Add Playwright and axe test tooling only in the final verification task if absent.

## Global Constraints

- “The camera never reverses direction”; Constellation uses a wider composition and scale reveal, never a backward dolly.
- “One persistent vanilla Three.js scene with scroll-driven camera.” No React Three Fiber, extra canvas, or second renderer.
- All new geometry is monochrome, except the approved case-planet amber terminator, star, Pilot portrait rim and Landing horizon glow. CTA amber is `#f2b35c`.
- “DOM does small ones: fade-up 12px, 0.5s, ease [0.2, 0.7, 0.2, 1]. Nothing bounces.” Existing `.glass`, Styrene A and JetBrains Mono remain the visual vocabulary.
- “Missing/empty data arrays → chapter hides and the flight path drops its waypoint (Belt explicitly; same rule for Worlds).” Slice 6 also closes Slice 4's temporary empty-Orbit exception.
- “prefers-reduced-motion”: no camera/particle motion, no SFX, opacity-only reveals, fixed FOV; Jump removed, manifesto remains ordinary static content.
- “Each ends with a browser review before the next begins”: 1440×900 and 390×844, ≥5 positions, actual tier/FPS, screenshots under `screenshots/voyage/`.
- Preserve user-authored content only. Do not add metrics, clients, testimonials, credentials, publication claims, years of experience, or placeholder endorsements. Empty proof stays empty.
- Use `getVoyageContent`, `getProjects`, current `/work/[slug]`, and current `/api/inquiries`; these exist. No replacement backend or parallel content schema.
- Client imports of server collection code are type-only. Shared collection spec constants are safe because their imports are type-only; do not import collection singletons into clients.
- Baseline lint: **10 errors, 6 warnings**. Until Slice 8, touched-file lint must introduce no new problems; report whole-repo baseline honestly. Slice 8 must resolve remaining findings and reach clean lint.
- No production inquiry submission or email for verification. Intercept browser POSTs and use existing mocked API tests; live delivery requires explicit authorization and deployment configuration.

## Settled decisions and external dependencies

1. Slice 4's measured mapping, N process records, and original geometric implementation are approved. Empty Orbit is temporary until Task 3 here.
2. **Scheduler public URL is not present in the inspected Settings model.** Add one validated blank-by-default CMS field. Render the real inquiry form as primary until the user supplies an actual public booking/embed URL. Never invent a provider/account or claim scheduling works without a verified URL. A generic iframe `load` event cannot prove a cross-origin scheduler is usable; keep a permanent direct booking link and a visible form, with a 4s slow/error promotion.
3. `POST /api/inquiries` already validates, rate-limits, stores, and sends best-effort Resend notifications. Deployment needs working MongoDB, `INQUIRY_IP_SALT`, and the environment values read by `src/lib/mail.ts`. Storage success is a real success even when notification fails; existing backend records notification failure for admin follow-up.
4. Current Settings can truthfully supply portrait, heading, biography, location, manifesto and footer links. It has **no verified credential strip model**. Show location and CMS skills only. Do not hardcode IEEE/degree/years merely because the visual spec lists them. Verified extra credentials remain content-dependent.
5. `/work/[slug]` already sanitizes markdown, handles unknown/unpublished slugs as 404, and renders no scene. Enhance navigation/metadata at launch; do not rebuild it.
6. Current consulted snapshot is before all Slice 3/4 edits. Shared-file instructions are additive surgical edits. Never overwrite a teammate's completed Jump, Topology, programmatic suppression, Orbit, or quality work.

## File structure and execution order

| Slice/task | Main files | Responsibility |
|---|---|---|
| 5 / 1 | `proof.ts`, `Worlds.tsx`, `Planet.ts` and tests | Real CMS case sequence + distinguishing planets |
| 5 / 2 | screenshots, worklog, insights | Worlds browser gate |
| 6 / 3 | `activeChapters.ts`, `activeFlightPath.ts`, bridge, rail, dock | Omitted chapters, shortened continuous camera path |
| 6 / 4 | `Belt.tsx`, `DarkPassage.tsx`, `usePassageAudio.ts`, AudioEngine | Quotes, black passage, reversible ambient duck |
| 6 / 5 | `projectGraph.ts`, `Constellation.tsx`, scene Constellation | Shared-tech graph + keyboard-equivalent project detail |
| 6 / 6 | screenshots, notes | Journey/browser gate |
| 7 / 7 | `Pilot.tsx`, `Horizon.ts`, `Surface.tsx`, scene/root | Truthful arrival, horizon, relaunch |
| 7 / 8 | `schedulerUrl.ts`, settings layers, `Landing.tsx` and tests | Configurable booking + real inquiry form |
| 7 / 9 | screenshots, notes | Arrival/browser gate |
| 8 / 10 | `/page.tsx`, collection specs, legacy components/audio/theme | Home launch, invalidation, removals |
| 8 / 11 | integration tests, perf/accessibility evidence | Final release gate |

Use the exact file paths given within each task. All new DOM modules live under `src/components/voyage`; set pieces under `src/scene/chapters`.

## Slice 5 — Worlds

### Task 1: Read actual proof, show its narrative, and fly past one planet per case

**Files:** Create `src/components/voyage/proof.ts`, `proof.test.ts`, `Worlds.tsx`, `Worlds.test.tsx`, `src/scene/chapters/Planet.ts`; modify `src/app/voyage/page.tsx`, `VoyageRoot.tsx`, `SceneRoot.tsx`, `src/app/voyage/voyage.css`.

**Interfaces:** `readProof(Item): Proof`; `casePhase(local,count): {index,t}`. `Worlds({cases:Item[],animated:boolean})`; `new Planet(features: Feature[])` implements `SetPiece`. `Feature = "none"|"ring"|"moon"|"storm"`. Height is `(1.5*N+1)*100vh`: N 1.5-viewport holds and one exit viewport. Original long-form Markdown remains on the existing reading page; chapter preview is a bounded plain-text excerpt, never unsanitized HTML.

- [ ] Add the pure module test first:

```ts
import { expect, it } from "vitest";
import { readProof, casePhase } from "./proof";
it("preserves authored proof without inventing optional fields", () => {
  expect(readProof({id:"c",order:0,createdAt:"",title:"A",slug:"a"})).toMatchObject({title:"A",slug:"a",metrics:[],feature:"none",problem:""});
});
it("keeps each case for 1.5 viewports and holds the last through exit", () => {
  expect(casePhase(.75/4,2).index).toBe(0);
  expect(casePhase(2.25/4,2).index).toBe(1);
  expect(casePhase(1,2).index).toBe(1);
  expect(casePhase(0,0).index).toBe(-1);
});
```

- [ ] Run `npx vitest run src/components/voyage/proof.test.ts`; expect missing-module failure. Create `proof.ts`:

```ts
import type { Item } from "@/lib/collections/defineCollection";
export type Feature="none"|"ring"|"moon"|"storm";
const text=(v:unknown)=>typeof v==="string"?v:"";
const list=(v:unknown)=>Array.isArray(v)?v.filter((s):s is string=>typeof s==="string"):[];
export function readProof(item:Item) {
  const feature:Feature=item.planetFeature==="ring"||item.planetFeature==="moon"||item.planetFeature==="storm"?item.planetFeature:"none";
  return {id:item.id,title:text(item.title),slug:text(item.slug),context:text(item.context),
    problem:text(item.problem),architecture:text(item.architecture),outcome:text(item.outcome),
    diagram:text(item.diagram),stack:list(item.stack),metrics:list(item.metrics),feature};
}
export function excerpt(markdown:string) {
  const plain=markdown.replace(/!\[[^\]]*\]\([^)]*\)/g,"").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/<[^>]*>/g,"").replace(/[#*_`>]/g,"").replace(/\s+/g," ").trim();
  return plain.length>220?`${plain.slice(0,217).trimEnd()}…`:plain;
}
export function casePhase(local:number,count:number) {
  if(!count)return {index:-1,t:0};
  const units=Math.max(0,Math.min(1,Number.isFinite(local)?local:0))*(1.5*count+1);
  const index=Math.min(count-1,Math.floor(units/1.5));
  return {index,t:Math.min(1,(units-index*1.5)/1.5)};
}
```

- [ ] Add `Worlds.tsx`:

```tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import type { Item } from "@/lib/collections/defineCollection";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { CHAPTERS } from "@/scene/camera/flightPath";
import { readProof,excerpt,casePhase } from "./proof";
function Case({item,index}:{item:Item;index:number}) {
  const c=readProof(item);
  return <article className="glass worlds__case">
    <p className="chapter__label">CASE {String(index+1).padStart(2,"0")}</p>
    <h3>{c.title}</h3>{c.context&&<p>{c.context}</p>}
    <dl className="worlds__narrative">{([['Problem',c.problem],['Architecture',c.architecture],['Outcome',c.outcome]] as const).map(([label,value])=>value&&<div key={label}><dt>{label}</dt><dd>{excerpt(value)}</dd></div>)}</dl>
    {!!c.stack.length&&<ul className="voyage-chips" aria-label="Stack">{c.stack.map((s,i)=><li key={`${i}-${s}`}>{s}</li>)}</ul>}
    {!!c.metrics.length&&<ul aria-label="Results">{c.metrics.map((s,i)=><li key={`${i}-${s}`}>{s}</li>)}</ul>}
    {c.diagram&&<Image src={c.diagram} width={480} height={240} loading="lazy" alt={`${c.title} architecture diagram`} unoptimized />}
    <Link href={`/work/${encodeURIComponent(c.slug)}`}>Read the case study →</Link>
  </article>;
}
export default function Worlds({cases,animated}:{cases:Item[];animated:boolean}) {
  const voyage=useVoyage();
  const before=CHAPTERS.findIndex(c=>c.id===voyage.chapter.id)<CHAPTERS.findIndex(c=>c.id==="worlds");
  const phase=casePhase(voyage.chapter.id==="worlds"?voyage.chapterProgress:before?0:1,cases.length);
  if(!cases.length)return null;
  return <section id="worlds" aria-labelledby="worlds-title" className="chapter worlds" style={animated?{height:`${(1.5*cases.length+1)*100}vh`}:undefined}>
    <div className={animated?"chapter__pin worlds__pin":"voyage-static"}>
      <p className="chapter__label">05 / WORLDS</p><h2 id="worlds-title">Selected work</h2>
      {animated?<div key={phase.index} className="worlds__reader" role="region" aria-label="Case study preview" tabIndex={0}><Case item={cases[phase.index]} index={phase.index}/></div>:cases.map((item,index)=><Case key={item.id} item={item} index={index}/>)}
    </div>
  </section>;
}
```

The Image matches the existing uploaded-media case page. Add the shared Book a call CTA after the case reading link; keep the reading link as a real link:

```tsx
// Imports in Worlds.tsx:
import CallToAction from "@/components/dock/CallToAction";
import {voyageStore} from "@/scene/scroll/voyageStore";
import {getAudioEngine} from "@/lib/audio/AudioEngine";
const book=()=>{getAudioEngine().whoosh({volume:.08});voyageStore.scrollTo(CHAPTERS.find(c=>c.id==="landing")!.start);};
// Immediately after the reading Link:
<CallToAction label="Book a call" onClick={book}/>
```

- [ ] Add Planet implementation:

```ts
import * as THREE from "three";
import type { Tier } from "@/scene/quality";
import type { SetPiece,FrameContext } from "./types";
import { casePhase,type Feature } from "@/components/voyage/proof";
export class Planet implements SetPiece {
  private root:THREE.Group|null=null;
  private planets:THREE.Group[]=[];
  private geometries:THREE.BufferGeometry[]=[];
  private materials:THREE.Material[]=[];
  private offset=new THREE.Vector3();
  constructor(private features:Feature[]){}
  build(scene:THREE.Scene,tier:Tier){
    this.dispose(); if(tier==="still"||!this.features.length)return;
    const root=new THREE.Group(); root.visible=false;
    const sphere=new THREE.SphereGeometry(1,tier==="high"?48:24,tier==="high"?32:16);
    const ring=new THREE.TorusGeometry(1.45,.025,6,80);
    const band=new THREE.TorusGeometry(1.005,.018,6,80);
    this.geometries=[sphere,ring,band];
    const white=new THREE.MeshBasicMaterial({color:0x9a9a9a,transparent:true,opacity:.6,depthWrite:false});
    const amber=new THREE.MeshBasicMaterial({color:0xf2b35c,transparent:true,opacity:.65,depthWrite:false});
    const shader=new THREE.ShaderMaterial({
      vertexShader:`varying vec3 p; varying vec3 n; void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 p; varying vec3 n;
      float hash(vec3 x){return fract(sin(dot(x,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){float f=noise(p*3.)*.6+noise(p*9.)*.3+noise(p*21.)*.1;float light=max(.08,dot(normalize(n),normalize(vec3(-.6,.3,1.))));gl_FragColor=vec4(vec3((.09+.55*f)*light),1.);}`
    });
    this.materials=[white,amber,shader];
    this.planets=this.features.map((feature,index)=>{
      const group=new THREE.Group();group.name=`case-planet-${index}`;
      group.add(new THREE.Mesh(sphere,shader));
      const terminator=new THREE.Mesh(band,amber);terminator.rotation.y=.9;group.add(terminator);
      if(feature==="ring"){const mesh=new THREE.Mesh(ring,white);mesh.rotation.x=1.05;group.add(mesh);}
      if(feature==="moon"){const mesh=new THREE.Mesh(sphere,white);mesh.scale.setScalar(.18);mesh.position.set(1.4,.6,.2);group.add(mesh);}
      if(feature==="storm"){const mesh=new THREE.Mesh(band,white);mesh.rotation.x=Math.PI/2;mesh.position.y=.25;mesh.scale.setScalar(.97);group.add(mesh);}
      group.visible=false;root.add(group);return group;
    });scene.add(root);this.root=root;
  }
  update({voyage,camera}:FrameContext){
    if(!this.root)return;this.root.visible=voyage.chapter.id==="worlds";if(!this.root.visible)return;
    const {index,t}=casePhase(voyage.chapterProgress,this.planets.length);
    this.planets.forEach((planet,i)=>{planet.visible=i===index;});
    const mobile=camera.aspect<1;
    this.offset.set((t-.5)*(mobile?3:7)+(mobile?0:3),mobile?4:0,-16).applyQuaternion(camera.quaternion);
    this.root.position.copy(camera.position).add(this.offset);this.root.quaternion.copy(camera.quaternion);
    this.root.scale.setScalar(mobile?1.1:2.4);
    this.planets[index].rotation.y=t*.3;
  }
  dispose(){this.root?.removeFromParent();this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.root=null;this.planets=[];this.geometries=[];this.materials=[];}
}
```

- [ ] Wire server `caseStudies` into VoyageRoot's `cases: Item[]` prop; derive `features = useMemo(()=>cases.map(c=>readProof(c).feature),[cases])` and pass to SceneRoot. Add a `features: Feature[]` scene prop/effect dependency, preserve existing registry, insert `new Planet(features)`. Replace Worlds placeholder with `<Worlds cases={cases} animated={animated}/>` in ordered map. Add styles:

```css
.voyage-static {padding:100px clamp(1.5rem,6vw,6rem);max-width:1100px;margin:auto;}
.voyage-static > article + article {margin-top:2rem;}
.worlds h2,.voyage-static h2 {font-size:clamp(2rem,4vw,3.5rem);font-weight:500;}
.worlds__pin {padding-top:90px;padding-bottom:60px;}
.worlds__reader {max-height:64vh;overflow:auto;width:min(64%,850px);border-radius:20px;overscroll-behavior:contain;}
.worlds__reader:focus-visible {outline:2px solid white;outline-offset:3px;}
.worlds__case {padding:clamp(1.25rem,3vw,2.5rem);}
.worlds__case h3 {font-size:clamp(1.5rem,3vw,2.5rem);font-weight:500;}
.worlds__case img {width:100%;height:auto;max-height:180px;object-fit:contain;margin:1rem 0;}
.worlds__narrative {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;}
.worlds__narrative dt {font-family:var(--font-jetbrains-mono);font-size:.75rem;text-transform:uppercase;}
.worlds__narrative dd {margin:.5rem 0;line-height:1.7;color:#a3a3a3;overflow-wrap:anywhere;}
.voyage-chips {display:flex;flex-wrap:wrap;gap:.5rem;list-style:none;padding:0;font-family:var(--font-jetbrains-mono);font-size:.7rem;}
.voyage-chips li {border:1px solid #333;border-radius:99px;padding:.4rem .6rem;}
@media(max-width:767px){.worlds__pin{justify-content:flex-end;padding:0 1.25rem 88px}.worlds__reader{width:100%;max-height:48vh}.worlds__narrative{grid-template-columns:1fr}}
```

- [ ] Add a DOM test with two real-shaped Item fixtures verifying both case titles in still mode, one current preview in animated mode, empty returns no Worlds section, safe text display of `<script>`, optional missing diagram/metrics absent, and `/work/<slug>` link. Full test core:

```tsx
// @vitest-environment jsdom
import { render,screen,cleanup } from "@testing-library/react";
import { afterEach,expect,it } from "vitest";
import Worlds from "./Worlds";
const item={id:"c",order:0,createdAt:"",title:"Authored case",slug:"authored",problem:"<script>alert(1)</script>Plain"};
afterEach(cleanup);
it("links actual proof without inventing results",()=>{render(<Worlds cases={[item]} animated={false}/>);expect(screen.getByRole("link",{name:/Read the case/}).getAttribute("href")).toBe("/work/authored");expect(screen.queryByRole("img")).toBeNull();expect(document.querySelector("script")).toBeNull();});
it("omits empty proof",()=>{render(<Worlds cases={[]} animated={false}/>);expect(document.getElementById("worlds")).toBeNull();});
```

Run new tests, `npm run typecheck`, touched-file lint, existing work metadata/API tests. Commit `feat: add CMS Worlds fly-by and proof panels`.

### Task 2: Worlds browser gate

- [ ] Run the common slice gate at the end of this document, using Worlds entry, case 1 midpoint, case 2 midpoint when present, final case/exit, and the next chapter. Check actual authored diagrams, all three narrative columns desktop / stacked mobile, feature ring/moon/storm distinctions with temporary local fixtures, screen-reader links, and long previews' scrollability.
- [ ] Verify `/work/[slug]` existing published pages have no canvas, sanitized prose, and functioning return navigation. For empty case content, Task 3 must close the temporary missing-section/camera mismatch before the next slice gate; never fabricate two case studies for screenshots. Record a local fixture explicitly if needed to verify geometry.
- [ ] Save `screenshots/voyage/slice-5/*`, append worklog/insights, commit `docs: record Worlds review`.

## Slice 6 — skipped chapters, Belt, Dark Passage, Constellation

### Task 3: Remove empty chapter sections, navigation ticks and camera waypoints together

**Files:** Create `src/scene/camera/activeChapters.ts`, `activeFlightPath.ts`, `activeFlightPath.test.ts`; modify `flightPath.ts`, `scrollGeometry.test.ts`, `VoyageScroll.tsx`, `VoyageRoot.tsx`, `SceneRoot.tsx`, `FlightRail.tsx`, `src/components/dock/Dock.tsx`.

**Interfaces:** `activeChapters({process,cases,testimonials,still}): readonly Chapter[]`; `createActiveFlightPath(chapters): (progress:number,out?:CameraPose)=>CameraPose`. Preserve canonical ranges/indices. Store `chapterAt` is unchanged because the bridge never emits a removed span. `toScroll` in Slice 4 already clamps a gap target to the next retained section start. No global mutable configuration; pass active chapter array as root props and capture in bridge/scene effects.

- [ ] Add pure `activeChapters.ts`:

```ts
import { CHAPTERS } from "./flightPath";
export function activeChapters({process,cases,testimonials,still}:{process:number;cases:number;testimonials:number;still:boolean}) {
  return CHAPTERS.filter(c=>!(c.id==="orbit"&&!process)&&!(c.id==="worlds"&&!cases)&&!(c.id==="belt"&&!testimonials)&&!(c.id==="jump"&&still));
}
```

Add to `flightPath.ts` one read-only clone export, analogous to CAMERA_WAYPOINTS:

```ts
export const CAMERA_LOOK_TARGETS: readonly THREE.Vector3[] = LOOKAT_POINTS.map(v=>v.clone());
```

- [ ] Add failing tests then run them before adding `activeFlightPath.ts`:

```ts
import {expect,it} from "vitest";
import {activeChapters} from "./activeChapters";
import {createActiveFlightPath} from "./activeFlightPath";
it("drops optional waypoints, retains forward motion, and joins canonical gaps continuously",()=>{
  const chapters=activeChapters({process:0,cases:0,testimonials:0,still:false});
  expect(chapters.some(c=>["orbit","worlds","belt"].includes(c.id))).toBe(false);
  const pose=createActiveFlightPath(chapters);
  let z=Infinity;
  for(const c of chapters){for(let i=0;i<=100;i++){const p=pose(c.start+(c.end-c.start)*i/100);expect(p.position.z).toBeLessThanOrEqual(z+1e-6);expect(p.lookAt.z).toBeLessThan(p.position.z);z=p.position.z;}}
  const jump=chapters.find(c=>c.id==="jump")!,passage=chapters.find(c=>c.id==="passage")!;
  expect(pose(jump.end).position.distanceTo(pose(passage.start).position)).toBeLessThan(1e-6);
});
it("removes Jump in still but retains the static manifesto",()=>{
 const ids=activeChapters({process:4,cases:2,testimonials:0,still:true}).map(c=>c.id);
 expect(ids).not.toContain("jump");expect(ids).toContain("passage");
});
```

- [ ] Implement `activeFlightPath.ts`:

```ts
import * as THREE from "three";
import {CHAPTERS,CAMERA_WAYPOINTS,CAMERA_LOOK_TARGETS,type Chapter,type CameraPose} from "./flightPath";
export function createActiveFlightPath(chapters:readonly Chapter[]) {
  const indices=chapters.map(c=>CHAPTERS.findIndex(original=>original.id===c.id));
  const positions=[...indices.map(i=>CAMERA_WAYPOINTS[i].clone()),CAMERA_WAYPOINTS.at(-1)!.clone()];
  const targets=[...indices.map(i=>CAMERA_LOOK_TARGETS[i].clone()),CAMERA_LOOK_TARGETS.at(-1)!.clone()];
  const positionCurve=new THREE.CatmullRomCurve3(positions,false,"centripetal");
  const targetCurve=new THREE.CatmullRomCurve3(targets,false,"centripetal");
  return (progress:number,out?:CameraPose)=>{
    const p=Number.isNaN(progress)?0:Math.max(0,Math.min(1,progress));
    let index=chapters.findIndex(c=>p<c.end);if(index<0)index=chapters.length-1;
    const chapter=chapters[index];
    const local=Math.max(0,Math.min(1,(p-chapter.start)/(chapter.end-chapter.start)));
    const t=(index+local)/chapters.length;
    const pose=out??{position:new THREE.Vector3(),lookAt:new THREE.Vector3()};
    positionCurve.getPoint(t,pose.position);targetCurve.getPoint(t,pose.lookAt);
    // Monotone smoothstep depth avoids spline overshoot after arbitrary omissions.
    const eased=local*local*(3-2*local);
    pose.position.z=THREE.MathUtils.lerp(positions[index].z,positions[index+1].z,eased);
    pose.lookAt.z=Math.min(pose.lookAt.z,pose.position.z-1);
    return pose;
  };
}
```

Apply this filtered factory **only when chapters are omitted**; retain existing tuned `getCameraPose` when all eleven exist. In SceneRoot effect create `const samplePose = chapters.length===CHAPTERS.length ? getCameraPose : createActiveFlightPath(chapters)` and replace its two pose calls with `samplePose`. Array prop comes from root useMemo, so effects do not rebuild on scroll.

- [ ] In root derive active array using counts and `tier === "still"`. Render its ordered entries instead of CHAPTERS, pass `chapters` into VoyageScroll, SceneRoot, FlightRail and Dock. Remove track's fixed `minHeight` (it would reintroduce blank space after omissions); natural section heights + surface tail now set scroll limit. Process zero already filtered. In bridge measurement map the provided chapters only; remove zero-height rects (`if(rect.height<=0)return []`) defensively. Do not mutate voyageStore or server module constants. Tail stays surface's `100vh`.

For FlightRail add prop `{chapters:readonly Chapter[]}`; derive content chapters locally; filter out micro-beats. For Dock add same prop; replace `startOf` global with a function closed over these props. Filter Process if absent; change Work destination to Constellation if Worlds absent. Concrete resolution:

```ts
const links=DOCK_LINKS.flatMap(link=>{
  const chapter=link.chapter==="worlds"&&!chapters.some(c=>c.id==="worlds")?"constellation":link.chapter;
  return chapters.some(c=>c.id===chapter)?[{...link,chapter}]:[];
});
const startOf=(id:ChapterId)=>chapters.find(c=>c.id===id)?.start??0;
```

Use `links` in both desktop/mobile maps. Keep `go()` programmatic suppression, sound gate and focus-return behavior. Rail can retain canonical vertical tick placement with gaps; no ghost ticks may remain. All chapter targets including CTA remain canonical and inverse bridge handles them.

- [ ] Extend scrollGeometry test with missing contiguous chapters and exact shared physical boundaries:

```ts
it("maps removed spans to the next retained chapter without blank travel",()=>{
 const segments=[{startPx:0,endPx:100,start:0,end:.22},{startPx:100,endPx:200,start:.60,end:.63},{startPx:200,endPx:300,start:.63,end:1}];
 expect(toVoyage(100,segments)).toBe(.60);
 expect(toScroll(.34,segments)).toBe(100);
 expect(toScroll(.60,segments)).toBe(100);
 expect(toVoyage(300,segments)).toBe(1);
});
```

Run all camera/store/scroll tests; expand active camera test over all eight combinations of empty Orbit/Worlds/Belt and both tiers, preserving same assertions. Confirm full-content camera tests still sample original tuned path. Commit `feat: skip empty voyage chapters and their camera waypoints`.

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

### Task 5: Constellation with shared-tech neighbors and keyboard-equivalent details

**Files:** Create `src/components/voyage/projectGraph.ts`, `projectGraph.test.ts`, `Constellation.tsx`, `src/scene/chapters/Constellation.ts`; modify server page/root/scene/CSS.

**Interfaces:** `buildProjectGraph(projects:Project[]) => {nodes:{id,x,y}[],edges:[number,number][]}`. DOM owns hover/focus/selected state; a React context is unnecessary. Pass an imperative interaction ref from root to scene set piece, `{current:{activeId:string|null}}`; update on DOM interactions, never per-frame React. Still uses the same semantic buttons/details in a normal list.

- [ ] Add pure test, run red, then implement:

```ts
// projectGraph.test.ts
import {expect,it} from "vitest";
import {buildProjectGraph} from "./projectGraph";
const p=(id:string,technologies:string[])=>({id,technologies,title:id,description:"",icon:"",liveLink:"",liveLinkLabel:"",codeLink:"",showLiveLink:false,showCodeLink:false,order:0});
it("connects actual shared technologies once, case-insensitively",()=>{expect(buildProjectGraph([p("a",["React"]),p("b",[" react "]),p("c",["Go"])]).edges).toEqual([[0,1]]);});
it("handles empty graph",()=>{expect(buildProjectGraph([])).toEqual({nodes:[],edges:[]});});
// projectGraph.ts
import type {Project} from "@/lib/data";
export function buildProjectGraph(projects:Project[]){
 const n=projects.length;
 const nodes=projects.map((p,i)=>({id:p.id,x:.5+.38*Math.cos(i*Math.PI*2/Math.max(1,n)-Math.PI/2),y:.5+.36*Math.sin(i*Math.PI*2/Math.max(1,n)-Math.PI/2)}));
 const tags=projects.map(p=>new Set(p.technologies.map(t=>t.trim().toLowerCase()).filter(Boolean)));
 const edges:[number,number][]=[];
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if([...tags[i]].some(t=>tags[j].has(t)))edges.push([i,j]);
 return {nodes,edges};
}
export function safeProjectHref(value:string){try{const u=new URL(value);return u.protocol==="https:"||u.protocol==="http:"?u.href:"";}catch{return "";}}
```

- [ ] Create DOM chapter:

```tsx
"use client";
import {useMemo,useState,type RefObject} from "react";
import Link from "next/link";
import type {Project} from "@/lib/data";
import {buildProjectGraph,safeProjectHref} from "./projectGraph";
export default function Constellation({projects,animated,interaction}:{projects:Project[];animated:boolean;interaction:RefObject<{activeId:string|null}>}){
 const graph=useMemo(()=>buildProjectGraph(projects),[projects]);
 const [selected,setSelected]=useState<string|null>(null);
 const [hovered,setHovered]=useState<string|null>(null);
 const active=hovered??selected;
 const current=projects.find(p=>p.id===selected);
 const preview=projects.find(p=>p.id===hovered);
 const mark=(id:string|null)=>{setHovered(id);interaction.current.activeId=id??selected;};
 const choose=(id:string)=>{setSelected(id);interaction.current.activeId=id;};
 return <section id="constellation" className="chapter constellation" aria-labelledby="constellation-title">
  <div className="voyage-static">
   <p className="chapter__label">08 / CONSTELLATION</p><h2 id="constellation-title">A wider view</h2>
   <div className={animated?"constellation__map":"constellation__list"}>
    {animated&&<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">{graph.edges.map(([a,b])=><line key={`${a}-${b}`} x1={graph.nodes[a].x*100} y1={graph.nodes[a].y*100} x2={graph.nodes[b].x*100} y2={graph.nodes[b].y*100} stroke="white" strokeWidth=".15" opacity={active===projects[a].id||active===projects[b].id?1:.2}/>)}</svg>}
    {projects.map((p,i)=><button key={p.id} type="button" style={animated?{left:`${graph.nodes[i].x*100}%`,top:`${graph.nodes[i].y*100}%`}:undefined}
     aria-pressed={selected===p.id} aria-controls="project-detail" onPointerEnter={()=>mark(p.id)} onPointerLeave={()=>mark(null)} onFocus={()=>mark(p.id)} onBlur={()=>mark(null)} onClick={()=>choose(p.id)}>{p.title}</button>)}
   </div>
   {preview&&preview.id!==selected&&<p className="glass constellation__preview">{preview.title} — {preview.description}</p>}
   <div id="project-detail" className="glass constellation__detail" aria-live="polite">
    {current?<><h3>{current.title}</h3><p>{current.description}</p><ul className="voyage-chips">{current.technologies.map((t,i)=><li key={`${i}-${t}`}>{t}</li>)}</ul>
     {current.showLiveLink&&safeProjectHref(current.liveLink)&&<a href={safeProjectHref(current.liveLink)} target="_blank" rel="noopener noreferrer">{current.liveLinkLabel||"View project"} ↗</a>}
     {current.showCodeLink&&safeProjectHref(current.codeLink)&&<a href={safeProjectHref(current.codeLink)} target="_blank" rel="noopener noreferrer">View code ↗</a>}
     <button type="button" onClick={()=>{setSelected(null);interaction.current.activeId=null;}}>Close details</button></>:<p>{projects.length?"Select a project to explore it.":"Project details are being prepared."}</p>}
   </div><Link href="/projects">All projects →</Link>
  </div>
 </section>;
}
```

On mobile, use the semantic list rather than overlapping small labels (CSS below). Do not apply `aria-hidden` to the actual controls. Neighbor lighting must also highlight neighbor buttons: compute neighbor IDs from graph edges for active index and add `data-neighbor={neighbors.has(p.id)}`; plain code:

```ts
const activeIndex=projects.findIndex(p=>p.id===active);
const neighbors=new Set(graph.edges.flatMap(([a,b])=>a===activeIndex?[projects[b].id]:b===activeIndex?[projects[a].id]:[]));
```

- [ ] Build a matching monochrome set piece with no new scene or event raycaster:

```ts
import * as THREE from "three";
import type {Tier} from "@/scene/quality";
import type {SetPiece,FrameContext} from "./types";
import type {Project} from "@/lib/data";
import {buildProjectGraph} from "@/components/voyage/projectGraph";
export class Constellation implements SetPiece {
 private root:THREE.Group|null=null;private geometries:THREE.BufferGeometry[]=[];private material:THREE.PointsMaterial|null=null;private lineMaterial:THREE.LineBasicMaterial|null=null;private offset=new THREE.Vector3();
 constructor(private projects:Project[],private interaction:{current:{activeId:string|null}}){}
 build(scene:THREE.Scene,tier:Tier){
  this.dispose();if(tier==="still"||!this.projects.length)return;
  const graph=buildProjectGraph(this.projects);const positions=graph.nodes.flatMap(n=>[(n.x-.5)*18,(.5-n.y)*12,0]);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute("color",new THREE.Float32BufferAttribute(graph.nodes.flatMap(()=>[.5,.5,.5]),3));
  this.material=new THREE.PointsMaterial({color:0xffffff,size:.16,vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const edges=new THREE.BufferGeometry();edges.setAttribute("position",new THREE.Float32BufferAttribute(graph.edges.flatMap(([a,b])=>[...positions.slice(a*3,a*3+3),...positions.slice(b*3,b*3+3)]),3));
  this.lineMaterial=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false});
  this.geometries=[geometry,edges];const root=new THREE.Group();root.add(new THREE.Points(geometry,this.material),new THREE.LineSegments(edges,this.lineMaterial));root.visible=false;scene.add(root);this.root=root;
 }
 update({voyage,camera}:FrameContext){
  if(!this.root)return;this.root.visible=voyage.chapter.id==="constellation";if(!this.root.visible)return;
  const reveal=Math.min(1,voyage.chapterProgress/.2);this.material!.opacity=reveal*.65;this.lineMaterial!.opacity=reveal*.16;
  this.root.scale.setScalar(.5+.5*reveal);this.offset.set(0,0,-22).applyQuaternion(camera.quaternion);this.root.position.copy(camera.position).add(this.offset);this.root.quaternion.copy(camera.quaternion);
  const graph=buildProjectGraph(this.projects);const index=this.projects.findIndex(p=>p.id===this.interaction.current.activeId);
  const neighbors=new Set(graph.edges.flatMap(([a,b])=>a===index?[b]:b===index?[a]:[]));
  const colors=this.geometries[0].getAttribute("color") as THREE.BufferAttribute;
  this.projects.forEach((_,i)=>{const brightness=i===index||neighbors.has(i)?1:.4;colors.setXYZ(i,brightness,brightness,brightness);});colors.needsUpdate=true;
 }
 dispose(){this.root?.removeFromParent();this.geometries.forEach(g=>g.dispose());this.material?.dispose();this.lineMaterial?.dispose();this.root=null;this.geometries=[];this.material=null;this.lineMaterial=null;}
}
```

Before commit optimize the included update code to satisfy zero-per-frame allocation: cache `graph` as a constructor field, cache last active ID, update colors only when active ID changes, and use `graph.edges.some(([a,b])=>(a===index&&b===i)||(b===index&&a===i))` instead of allocating Sets. Exact field and replacement:

```ts
private graph:ReturnType<typeof buildProjectGraph>;
private lastActive:string|null|undefined=undefined;
// Constructor body: this.graph=buildProjectGraph(projects);
// Replace build's local graph with const graph=this.graph;
// Replace update's graph/neighbor/color block:
if(this.lastActive!==this.interaction.current.activeId){
 this.lastActive=this.interaction.current.activeId;
 const index=this.projects.findIndex(p=>p.id===this.lastActive);
 const colors=this.geometries[0].getAttribute("color") as THREE.BufferAttribute;
 this.projects.forEach((_,i)=>{
  const neighbor=this.graph.edges.some(([a,b])=>(a===index&&b===i)||(b===index&&a===i));
  const brightness=i===index||neighbor?1:.4;colors.setXYZ(i,brightness,brightness,brightness);
 });colors.needsUpdate=true;
}
```

Reset `lastActive=undefined` on build/dispose. This scene composition expands the project system across the frame; the camera continues forward and never reverses. It represents the same portfolio system as the Worlds passage, without inventing case/project associations.

- [ ] Fetch `getProjects()` alongside `getVoyageContent()` on the server; thread `projects: Project[]` through root/SceneRoot. Root creates `const projectInteraction=useRef({activeId:null as string|null})`; pass same ref to DOM and set piece. Register new scene piece and branch. Add CSS:

```css
.constellation {min-height:180vh;}
.constellation__map {height:58vh;position:relative;margin:2rem 0;}
.constellation__map svg {position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
.constellation__map button {position:absolute;transform:translate(-50%,-50%);max-width:180px;padding:.75rem;border:1px solid #444;border-radius:99px;background:rgba(0,0,0,.8);color:white;}
.constellation button:focus-visible {outline:2px solid white;outline-offset:3px;}
.constellation button[data-neighbor="true"],.constellation button[aria-pressed="true"] {border-color:white;background:#222;}
.constellation__list {display:grid;gap:1rem;margin:2rem 0;}
.constellation__detail,.constellation__preview {padding:1.5rem;line-height:1.7;margin:1rem 0;}
.constellation__detail a,.constellation__detail button {display:inline-block;margin:1rem 1rem 0 0;}
@media(max-width:767px){.constellation__map{height:auto;display:grid;gap:1rem}.constellation__map svg{display:none}.constellation__map button{position:static;transform:none;max-width:none}.constellation{min-height:0}}
```

- [ ] Add DOM test exercising keyboard focus→preview and Enter→details with a two-project fixture and interaction ref, then verify neighbor marker and only safe real links appear; no mouse-only path. Run graph tests, component tests, typecheck/touched lint and scene lifecycle checks (build twice/dispose twice removes all children). Commit `feat: add accessible shared-technology constellation`.

### Task 6: Journey browser gate

- [ ] Execute common gate: empty and populated Worlds/Belt/Orbit combinations, all chapter jumps after omission, and still native scrolling with Jump removed. Exact boundary must report next visible chapter, never a removed label. Confirm camera position continuity at each cut and forward depth throughout. Resize at an omitted gap and restore a bookmark.
- [ ] Inspect Belt native keyboard scroll, drag, pause and no fake endorsements; Passage readable hold at 60vh, black scene, SIGNAL LOST, actual muted/opt-in behavior, -18dB gain and restoration on forward/backward exit, unmount and still demotion. Verify Constellation focus highlights same neighbors as hover and detail links remain operable at 390px/200% zoom.
- [ ] Save `screenshots/voyage/slice-6/*`, logs, notes; commit `docs: record journey chapter review`.

## Slice 7 — Pilot, Landing, Surface

### Task 7: Truthful Pilot arrival, horizon and relaunch

**Files:** Create `src/components/voyage/Pilot.tsx`, `Surface.tsx`, `arrival.ts`, `arrival.test.ts`, `src/scene/chapters/Horizon.ts`; modify root/scene/orb/CSS.

**Interfaces:** `Pilot({settings:Settings,skills:Skill[],animated:boolean})`; `Surface({sections:FooterSection[],onRelaunch:()=>void})`; root `relaunchEpoch:number` prop read by scene without recreating GL. `pilotGlare(local)` peaks early, `pilotReveal(local)` reveals real portrait/bio as glare dims.

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

- [ ] Add Surface with safe authored footer links and relaunch:

```tsx
"use client";
import type {FooterSection} from "@/lib/data";
function footerHref(value:string){
 const aliases:Record<string,string>={"#about":"#pilot","#contact":"#landing","#projects":"#constellation"};
 const href=aliases[value]??value;
 if(href.startsWith("/")&&!href.startsWith("//")||href.startsWith("#"))return href;
 try{const url=new URL(href);return ["https:","http:","mailto:"].includes(url.protocol)?href:"";}catch{return "";}
}
export default function Surface({sections,onRelaunch}:{sections:FooterSection[];onRelaunch:()=>void}){
 return <section id="surface" className="chapter surface" style={{minHeight:"162.5vh"}}>
  <footer className="voyage-static"><p className="chapter__label">11 / SURFACE</p>
   <div className="surface__links">{sections.map((section,i)=><nav key={i} aria-label={section.title}><h2>{section.title}</h2><ul>{section.links.map((link,j)=>footerHref(link.url)&&<li key={j}><a href={footerHref(link.url)}>{link.label}</a></li>)}</ul></nav>)}</div>
   <p className="chapter__label">NEXT.JS · THREE.JS · MONGODB</p><button type="button" onClick={onRelaunch}>Relaunch ↑</button>
  </footer>
 </section>;
}
```

Replace literal 162.5 with `sectionHeightVh(CHAPTERS.find(c=>c.id==="surface")!)` in component code using existing imports; the extra tail must remain exactly one viewport beyond surface allocation. Root owns callback:

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

### Task 8: Booking configuration and real inquiry submission

**Files:** Create `src/lib/schedulerUrl.ts`, `.test.ts`, `src/components/voyage/Landing.tsx`, `Landing.test.tsx`; modify `src/lib/models.ts`, `src/lib/data.ts`, admin `types.ts`, `ContentTab.tsx`, settings API/test, root/CSS.

**Interfaces:** Settings `schedulerUrl:string` defaults `""`; `schedulerUrl(value:unknown):string|null` returns valid public HTTPS URL or null (blank is valid absence `""`). `Landing({schedulerUrl:string,animated:boolean})`. Existing endpoint exact payload: `{name,email,building,budget,timeline,website}`. No internal fields sent.

- [ ] Write validator test, run red, then implement:

```ts
// schedulerUrl.test.ts
import {expect,it} from "vitest";
import {schedulerUrl} from "./schedulerUrl";
it("accepts blank and public https URLs only",()=>{expect(schedulerUrl("")).toBe("");expect(schedulerUrl("https://booking.example.com/purav")).toBe("https://booking.example.com/purav");for(const value of ["javascript:alert(1)","http://example.com","https://user:pass@example.com","https://localhost/","https://127.0.0.1/",4])expect(schedulerUrl(value)).toBeNull();});
// schedulerUrl.ts
export function schedulerUrl(value:unknown):string|null {
 if(typeof value!=="string")return null;const trimmed=value.trim();if(!trimmed)return "";if(trimmed.length>2048)return null;
 try{const url=new URL(trimmed);const host=url.hostname.toLowerCase();
  if(url.protocol!=="https:"||url.username||url.password||!host.includes(".")||host.endsWith(".local")||host.endsWith(".localhost")||host==="localhost"||/^[\d.]+$/.test(host)||host.includes(":"))return null;
  return url.href;
 }catch{return null;}
}
```

This URL is rendered only in the browser; no server fetch, no SSRF proxy. Domain checks are usability restrictions for a public booking address, not a claim to resolve DNS or identify a provider.

- [ ] Thread one field through the existing settings layers, with exact additions:

```ts
// ISettings in src/lib/models.ts; Settings in data.ts; admin Settings type:
schedulerUrl: string;
// SettingsSchema:
schedulerUrl: { type:String, default:"", trim:true, maxlength:2048 },
// docToSettings:
schedulerUrl: typeof doc.schedulerUrl === "string" ? doc.schedulerUrl : "",
// admin EMPTY_SETTINGS and ContentTab form initializer:
schedulerUrl: "", // EMPTY_SETTINGS
schedulerUrl: s.schedulerUrl || "", // ContentTab initializer
```

Add schedulerUrl to settings editable whitelist. Before updateSettings in PUT:

```ts
if(Object.prototype.hasOwnProperty.call(updates,"schedulerUrl")){
 const url=schedulerUrl(updates.schedulerUrl);
 if(url===null)return NextResponse.json({error:"Scheduler URL must be a public HTTPS URL"},{status:400});
 updates.schedulerUrl=url;
}
```

Import validator as `schedulerUrl` (the property name does not shadow this function). Add text input to ContentTab near contact settings:

```tsx
<label htmlFor="schedulerUrl">Public booking URL</label>
<input id="schedulerUrl" type="url" value={contentForm.schedulerUrl} onChange={e=>updateForm({schedulerUrl:e.target.value})} placeholder="https://" />
<p>Leave blank to make the inquiry form primary. Use your actual public booking or embed URL.</p>
```

Add schedulerUrl to ContentForm type and every settings test fixture TypeScript requires. Settings route test mocks verify invalid scheme returns 400 and no update, blank clears, valid string persists and revalidates both routes. Do not populate database with an invented URL.

- [ ] Add full Landing form implementation:

```tsx
"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {BUDGET_OPTIONS,TIMELINE_OPTIONS} from "@/lib/collections/specs/inquiries";
import {schedulerUrl as normalizeUrl} from "@/lib/schedulerUrl";
import {getAudioEngine} from "@/lib/audio/AudioEngine";
export default function Landing({schedulerUrl,animated}:{schedulerUrl:string;animated:boolean}){
 const url=normalizeUrl(schedulerUrl)||"";
 const [embedState,setEmbedState]=useState<"loading"|"loaded"|"failed">("loading");
 const [state,setState]=useState<"idle"|"sending"|"success"|"error">("idle");
 const [error,setError]=useState("");const busy=useRef(false);const request=useRef<AbortController|null>(null);
 const status=useRef<HTMLParagraphElement>(null);const mounted=useRef(true);
 useEffect(()=>{if(!url)return;const timer=window.setTimeout(()=>setEmbedState(current=>current==="loaded"?current:"failed"),4000);return()=>window.clearTimeout(timer);},[url]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
 useEffect(()=>{if(state==="success"||state==="error")status.current?.focus();},[state]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current)return;busy.current=true;setState("sending");setError("");
  const form=event.currentTarget;const data=new FormData(form);
  const payload=Object.fromEntries(["name","email","building","budget","timeline","website"].map(key=>[key,String(data.get(key)??"")]));
  const body=JSON.stringify(payload);
  if(new TextEncoder().encode(body).length>4096){setError("Please shorten your message before sending.");setState("error");busy.current=false;return;}
  const controller=new AbortController();request.current=controller;
  const timeout=window.setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body,signal:controller.signal});
   if(!response.ok){
    const retry=response.headers.get("Retry-After");
    throw new Error(response.status===429?`Too many attempts. Please try again${retry?` in ${retry} seconds`:" later"}.`:response.status===400?"Please check the form fields and try again.":"Your inquiry could not be sent. Please try again.");
   }
   if(!mounted.current)return;setState("success");form.reset();if(animated)getAudioEngine().bell({volume:.07});
  }catch(reason){
   if(!mounted.current)return;setError(reason instanceof Error&&reason.name!=="AbortError"?reason.message:"We could not confirm delivery. Please check your connection before trying again.");setState("error");
  }finally{window.clearTimeout(timeout);busy.current=false;request.current=null;}
 }
 const primary=!url||embedState==="failed";
 return <section id="landing" className="chapter landing" aria-labelledby="landing-title">
  <div className="voyage-static"><p className="chapter__label">10 / LANDING</p><h2 id="landing-title">You’ve arrived. Let’s talk about what you’re building.</h2>
   <div className={`landing__grid ${primary?"landing__grid--form-primary":""}`}>
    {url&&<div className="glass landing__scheduler"><h3>Book a call</h3><a href={url} target="_blank" rel="noopener noreferrer">Open booking page ↗</a>
     {embedState!=="failed"?<iframe key={url} title="Book a call" src={url} onLoad={()=>setEmbedState("loaded")} onError={()=>setEmbedState("failed")} referrerPolicy="strict-origin-when-cross-origin"/>:<p>The booking view is unavailable. Open the booking page or send an inquiry below.</p>}
     <button type="button" onClick={()=>setEmbedState("failed")}>Use the inquiry form</button>
    </div>}
    <form className="glass landing__form" onSubmit={submit} aria-busy={state==="sending"}>
     <h3>{primary?"Tell me what you’re building":"Send an inquiry"}</h3>
     <label htmlFor="inquiry-name">Name</label><input id="inquiry-name" name="name" autoComplete="name" required maxLength={120}/>
     <label htmlFor="inquiry-email">Email</label><input id="inquiry-email" name="email" type="email" autoComplete="email" required maxLength={200}/>
     <label htmlFor="inquiry-building">What are you building?</label><textarea id="inquiry-building" name="building" required maxLength={2000} rows={6}/>
     <label htmlFor="inquiry-budget">Budget range</label><select id="inquiry-budget" name="budget" required defaultValue=""><option value="" disabled>Select a range</option>{BUDGET_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
     <label htmlFor="inquiry-timeline">Timeline</label><select id="inquiry-timeline" name="timeline" required defaultValue=""><option value="" disabled>Select a timeline</option>{TIMELINE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
     <div className="landing__honeypot" aria-hidden="true"><label htmlFor="inquiry-website">Website</label><input id="inquiry-website" name="website" tabIndex={-1} autoComplete="off"/></div>
     <button className="landing__submit" type="submit" disabled={state==="sending"}>{state==="sending"?"Sending…":"Send inquiry →"}</button>
     <p ref={status} tabIndex={-1} role={state==="error"?"alert":"status"}>{state==="success"?"SIGNAL RECEIVED · I reply within 24h":error}</p>
    </form>
   </div>
  </div>
 </section>;
}
```

Key `<Landing key={settings.schedulerUrl} ...>` at root to reset embed state when configuration changes. The iframe eagerly loads so its timeout measures an attempted load, rather than an offscreen lazy frame that never started; do not claim the timeout identifies the reason for failure. Better provider-specific deferred loading is not required without a real URL. Keep a direct booking link for CSP/X-Frame-Options cases; onLoad alone does not prove success.

The mounted ref prevents post-unmount state updates. An abort does not mean the server failed to store, so retain the cautious timeout message and never retry automatically. Use native constraint validation for required/email fields; retain input values on failure. Success only after HTTP 2xx, never on click. There is no scheduler-success bell until a real provider contract exists.

- [ ] Add failing/passing form tests using jsdom and mocked fetch. Required core:

```tsx
// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import Landing from "./Landing";
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();});
function fill(){fireEvent.change(screen.getByLabelText("Name"),{target:{value:"Test"}});fireEvent.change(screen.getByLabelText("Email"),{target:{value:"test@example.com"}});fireEvent.change(screen.getByLabelText("What are you building?"),{target:{value:"A project"}});fireEvent.change(screen.getByLabelText("Budget range"),{target:{value:"undecided"}});fireEvent.change(screen.getByLabelText("Timeline"),{target:{value:"exploring"}});}
it("posts exact public fields and reports stored success",async()=>{const fetch=vi.fn().mockResolvedValue(new Response('{"ok":true}',{status:201}));vi.stubGlobal("fetch",fetch);render(<Landing schedulerUrl="" animated={false}/>);fill();fireEvent.submit(screen.getByRole("button",{name:/Send inquiry/}).closest("form")!);await waitFor(()=>expect(screen.getByRole("status").textContent).toContain("SIGNAL RECEIVED"));const payload=JSON.parse(fetch.mock.calls[0][1].body);expect(Object.keys(payload).sort()).toEqual(["budget","building","email","name","timeline","website"]);expect(fetch.mock.calls[0][0]).toBe("/api/inquiries");});
it("retains input after a server failure",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response('{}',{status:500})));render(<Landing schedulerUrl="" animated={false}/>);fill();fireEvent.submit(screen.getByRole("button",{name:/Send inquiry/}).closest("form")!);await screen.findByRole("alert");expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Test");});
```

Add fake-timer case for iframe stall→4000ms→primary form, invalid URL has no iframe, repeated submits while pending only call fetch once, and 429 produces useful retry copy. Reuse existing API POST tests for validation/storage/email failures; browser tests intercept POST and do not deliver mail.

- [ ] Add CSS and branch:

```css
.landing {min-height:150vh;background:radial-gradient(ellipse at 50% 100%,rgba(242,179,92,.06),transparent 55%);}
.landing__grid {display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:3rem;}
.landing__grid--form-primary {grid-template-columns:minmax(0,760px);justify-content:center;}
.landing__grid--form-primary .landing__scheduler {order:2;}
.landing__form,.landing__scheduler {padding:clamp(1.25rem,3vw,2.5rem);}
.landing__form {display:grid;gap:.75rem;}
.landing__form label {font-family:var(--font-jetbrains-mono);text-transform:uppercase;letter-spacing:.12em;font-size:.7rem;margin-top:.6rem;}
.landing__form input,.landing__form textarea,.landing__form select {width:100%;border:1px solid #444;background:#0a0a0a;color:white;border-radius:10px;padding:.8rem;font:inherit;}
.landing__form :focus-visible {outline:2px solid #f2b35c;outline-offset:3px;}
.landing__submit {background:#f2b35c;color:#000;border:0;border-radius:99px;padding:1rem;margin-top:1rem;font-family:var(--font-jetbrains-mono);}
.landing__submit:disabled {opacity:.6;}
.landing__scheduler iframe {display:block;border:0;width:100%;height:650px;margin-top:1.5rem;background:white;border-radius:12px;}
.landing__honeypot {position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;}
@media(max-width:767px){.landing__grid{grid-template-columns:1fr}.landing__scheduler iframe{height:600px}.landing{min-height:0}}
```

Run new form/settings tests and existing inquiry API/mail tests, typecheck and touched lint. Commit `feat: connect Landing inquiries and configurable booking`.

### Task 9: Arrival browser gate

- [ ] Execute common gate with Pilot entry/glare/resolve, Landing form, Surface and Relaunch, both dimensions. Confirm actual biography/portrait content; omit unsupported credentials. Verify no context rebuild on relaunch, first-visit session state remains intact, star re-ignites only at Launch, and no backward camera motion except deliberately scrolling back through the journey.
- [ ] Test missing scheduler config as form-primary. With a temporary local fixture URL and intercepted frame, verify blocked/error/slow frame promotes form after four seconds and direct booking link remains. Do not mistake mocked availability for verified real provider integration. Intercept inquiry POST for 201/400/429/500/network timeout; no external message is sent.
- [ ] Verify still, WebGL loss, 200% zoom, mobile keyboard open, complete long biography/form, focus and status announcement. Save `screenshots/voyage/slice-7/*`, notes/logs; explicitly record missing real booking URL/configuration. Commit `docs: record arrival and inquiry review`.

## Slice 8 — launch, removals, integration and performance

### Task 10: Launch at `/`, invalidate public content, and delete replaced code paths

**Files:** Modify `src/app/page.tsx`, `src/app/voyage/page.tsx`, `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/work/metadata.ts`, case reading page, collection specs, `src/components/motion/GlobalOverlays.tsx`, `src/hooks/useAudio.ts`, AudioEngine/synths, global/voyage CSS; create `src/components/FloatingAudioControls.tsx`; delete only the legacy component files whose inbound references are removed.

**Interfaces:** `/` is canonical voyage; `/voyage` stays a noindex preview alias with canonical `/`; `/work/[slug]` becomes indexable for published cases. `/projects`, `/admin`, APIs and media routes keep functioning. Settings edit already invalidates both roots; consulting collection edits must now invalidate `/` too.

- [ ] Replace `src/app/page.tsx` with the same server content composition as the completed preview route, preserving established prop names:

```tsx
import type {Metadata} from "next";
import {getVoyageContent,getProjects,getSkills} from "@/lib/data";
import VoyageRoot from "@/components/voyage/VoyageRoot";
import "./voyage/voyage.css";
export const revalidate=300;
export const metadata:Metadata={title:"Purav S — AI-powered products, end to end",description:"Full-stack product builds and system architecture for founders and teams.",alternates:{canonical:"/"}};
export default async function Home(){
 const [content,projects,skills]=await Promise.all([getVoyageContent(),getProjects(),getSkills()]);
 return <VoyageRoot settings={content.settings} services={content.services} process={content.process} cases={content.caseStudies} testimonials={content.testimonials} projects={projects} skills={skills}/>;
}
```

Update `/voyage` metadata to `robots:{index:false,follow:false},alternates:{canonical:"/"}`. Keep its data composition consistent; extract shared server loader only if it avoids actual duplicate transformation, not a gratuitous wrapper. Existing `/work` return links become `/#worlds`, falling back `/#constellation` only when no published cases (a valid current study means Worlds exists). Remove its `noindex` metadata flag for published studies only; existing notFound pages remain 404. Add published slugs to sitemap using `getPublishedCaseStudySlugs` with its existing build DB-fallback policy.

- [ ] Update all four collection specs (`services.ts`, `processSteps.ts`, `caseStudies.ts`, `testimonials.ts`) to include `"/"` in `revalidate`, preserving `/voyage` and case page invalidation. Add table-driven collection test:

```ts
import {expect,it} from "vitest";
import {servicesDef} from "./services";
import {processStepsDef} from "./processSteps";
import {caseStudiesDef} from "./caseStudies";
import {testimonialsDef} from "./testimonials";
it.each([servicesDef,processStepsDef,caseStudiesDef,testimonialsDef])("invalidates the launched home for $name",definition=>{expect(definition.revalidate).toContain("/");expect(definition.revalidate).toContain("/voyage");});
```

Audit `src/app/api/projects` and `src/app/api/skills` mutation routes: each public mutation must invalidate `/` and `/voyage`, preserving `/projects` invalidation. Settings already handles `/`; keep its tests. Preserve case publish/unpublish invalidation and slug handling.

- [ ] Create the audio-only controls and replace root import:

```tsx
"use client";
import AudioVisualizer from "./AudioVisualizer";
export default function FloatingAudioControls({muted,onToggleMute}:{muted:boolean;onToggleMute:()=>void}){
 return <div className="floating-controls"><button type="button" className="fc-btn" onClick={onToggleMute} aria-label={muted?"Enable ambient audio":"Mute ambient audio"} aria-pressed={!muted}>{muted?"◌":"♫"}</button><AudioVisualizer active={!muted}/></div>;
}
```

No auto-start: retain useAudio mute/gesture startup path. Set `<html lang="en" data-theme="dark">` in layout. Remove VoyageRoot's temporary theme-pinning effect and `engine.setTheme` call after removing the theme API. Remove EngineState.theme, class `setTheme`, the useAudio setTheme callback/return value, and light/dark pitch/filter branches; keep dark base `6000` in `setScrollEnergy`. Update initial EngineState snapshots/tests to `{muted:true,ready:false}`. Remove `playKeystroke` import, engine wrapper, synth function/export and corresponding tests only once callers are removed. Preserve all unrelated click/bell/ambient/visualizer code.

- [ ] Find inbound references before deletion:

```bash
rg -n 'PageClient|Navbar|ThemeToggle|TypewriterText|QuoteSection|ThreeBackground|CinematicIntro|playKeystroke|keystroke\(' src
rg -n 'from .*Projects|from .*Hero|from .*About|from .*Contact|from .*Footer' src
rg -n 'light|theme-preference|setTheme|prefers-color-scheme' src
```

Delete legacy `PageClient.tsx`, `Navbar.tsx`, `ThemeToggle.tsx`, `TypewriterText.tsx`, `QuoteSection.tsx`, `ThreeBackground.tsx`, and legacy Hero/About/Contact/Footer/Projects carousel components **after all inbound references are resolved**. Do not delete `src/app/projects/ProjectsClient.tsx` or CMS project/admin components sharing similar names. Remove obsolete CSS sections for these components, light-theme overrides, old scroll-progress bar on voyage routes, and typewriter animations. Any legacy component still used on another public route must be migrated to plain semantic content before deletion, not stranded as a broken import.

GlobalOverlays changes `isVoyage` to `pathname === "/" || pathname?.startsWith("/voyage")`; still exclude `/admin`, and keep scene absent on `/work/*`. No top progress strip on `/`. Existing standalone `/projects` can keep its ordinary progress indicator unless the user wants all public progress removed; this is distinct from the deleted top navigation.

- [ ] Fix global reduced-motion and initial rendering completely. Root's current `tier===null` early return is a blank server placeholder. Replace it with content-first SSR: define `animated=tier!==null&&tier!=="still"`; render the DOM with still layout until client tier is resolved; mount SceneRoot only when `tier` is high/mid. Keep Ignition's session behavior client-only. To avoid massive CLS from switching a natural-height still layout to cinematic sections, server render the same section-height reservations for default desktop **via CSS**, with static content visible and no motion, then progressively enhance after layout. Alternatively resolve tier from reduced-motion via `useSyncExternalStore` with stable server snapshot and use CSS media queries for intrinsic still layouts. Required CSS:

```css
@media(prefers-reduced-motion:reduce){
 .voyage-root .chapter__pin{position:relative;height:auto;min-height:0;}
 .voyage-root .launch__hint{animation:none;}
 .voyage-root .process,.voyage-root .worlds,.voyage-root .pilot{height:auto!important;min-height:0!important;}
 .voyage-root *, .voyage-root *::before, .voyage-root *::after {scroll-behavior:auto!important;}
}
```

**Execution decision is evidence-driven:** measure CLS before/after, use one content-first branch with no duplicate IDs and no hidden duplicate forms. If reserving default heights conflicts with all-step still accessibility, use the still content as the SSR baseline and defer cinematic enhancement until before first paint in a layout effect, measuring actual CLS; never mark the LCP/CLS criterion satisfied merely because the blank placeholder disappeared. This hydration/layout work is a bounded implementation review within Task 10, and may require its own follow-up task if the measured browser behavior demands a different architecture.

- [ ] Verify exact route/type/lint tests and production build. Run final `rg` searches; no live typewriter/keystroke/light-theme/top-Navbar/carousel code path may remain. Historical docs and screenshots may still contain those words; do not rewrite history. Fix the pre-existing 10 lint errors/6 warnings in their owning modules with narrowly scoped changes, not global disables. Commit `feat: launch voyage home and remove legacy experience`.

### Task 11: Integration, accessibility, performance and final release evidence

**Files:** Add `playwright.config.ts`, `tests/voyage.spec.ts` and package scripts/devDependencies if missing; optional `@axe-core/playwright` tooling; modify only confirmed defects; save `screenshots/voyage/slice-8/*`, `logs/`, `worklog.md`, `insights.md`.

**Interfaces:** Production server `http://127.0.0.1:3000`; use existing content read-only. Browser request interception prevents real inquiry delivery. Real WebGL/FPS review is separate from headless fallback assertions.

- [ ] Install only test tooling if absent: `npm install --save-dev @playwright/test @axe-core/playwright`; use installed version declarations and lockfile. Inspect the available browser binary; install Chromium with `npx playwright install chromium` if needed. Add scripts `test:e2e: "playwright test"`. Minimal configuration:

```ts
import {defineConfig,devices} from "@playwright/test";
export default defineConfig({testDir:"./tests",fullyParallel:false,use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure"},projects:[{name:"desktop",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:900}}},{name:"mobile",use:{...devices["iPhone 13"],defaultBrowserType:"chromium",viewport:{width:390,height:844}}}],webServer:{command:"npm run start -- --hostname 127.0.0.1",url:"http://127.0.0.1:3000",reuseExistingServer:!process.env.CI}});
```

Build before running. Do not test development FPS and report it as production performance.

- [ ] Add integration test core:

```ts
import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem("voyage-ignition-played","1"));});
test("each rendered chapter is reachable and no removed rail target remains",async({page})=>{
 await page.goto("/");await expect(page.locator(".voyage-root")).toBeVisible();
 const ids=await page.locator(".voyage-track > section[id]").evaluateAll(nodes=>nodes.map(node=>node.id));
 for(const id of ids){await page.locator(`#${id}`).evaluate(node=>node.scrollIntoView({block:"start",behavior:"instant"}));await expect(page.locator(`#${id}`)).toBeInViewport();}
 const targets=await page.locator(".rail__tick").count();expect(targets).toBe(ids.filter(id=>!["jump","passage"].includes(id)).length);
 expect(await page.locator("#voyage-canvas").count()).toBeLessThanOrEqual(1);
});
test("reduced motion exposes every process step and removes Jump",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
 await expect(page.locator("#voyage-canvas")).toHaveCount(0);await expect(page.locator("#jump")).toHaveCount(0);
 await expect(page.locator(".process__reader")).toHaveCount(0);
 const process=page.locator("#orbit");if(await process.count()){await process.scrollIntoViewIfNeeded();expect(await process.locator("li article").count()).toBeGreaterThan(0);}
 await page.locator("#landing").scrollIntoViewIfNeeded();await expect(page.getByLabel("Email",{exact:true})).toBeVisible();
});
test("blocked WebGL preserves content",async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args:Parameters<typeof original>){if(String(args[0]).includes("webgl"))return null;return original.apply(this,args); } as typeof original;});
 await page.goto("/");await expect(page.locator(".voyage-root")).toHaveAttribute("data-tier","still");await page.locator("#landing").scrollIntoViewIfNeeded();await expect(page.getByLabel("Name",{exact:true})).toBeVisible();
});
test("inquiry success is tied to a successful intercepted response",async({page})=>{
 let requests=0;await page.route("**/api/inquiries",async route=>{requests++;await route.fulfill({status:201,contentType:"application/json",body:'{"ok":true}'});});
 await page.goto("/");await page.getByLabel("Name",{exact:true}).fill("Browser test");await page.getByLabel("Email",{exact:true}).fill("test@example.com");await page.getByLabel("What are you building?").fill("Test only; request intercepted.");await page.getByLabel("Budget range").selectOption("undecided");await page.getByLabel("Timeline",{exact:true}).selectOption("exploring");await page.getByRole("button",{name:"Send inquiry →"}).click();await expect(page.getByRole("status")).toContainText("SIGNAL RECEIVED");expect(requests).toBe(1);
});
test("keyboard and contrast audit has no serious/critical violations",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");const report=await new AxeBuilder({page}).analyze();expect(report.violations.filter(v=>v.impact==="serious"||v.impact==="critical")).toEqual([]);
});
```

Resolve typing differences against installed Playwright APIs; no `any` suppressions. Add actual integration cases for context loss (`WEBGL_lose_context` when available), dock target→active rail, scheduler blocked/4s form-primary using a test settings fixture isolated from production DB, unknown/unpublished case 404, no canvas on `/work/*` and `/admin`, Relaunch and keyboard project details. A missing scheduler URL is verified as missing config, not bypassed to claim blocked-provider integration coverage.

- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`. Every unexpected failure must be fixed or explicitly block completion. Test logs must identify actual counts, not guessed counts. Check imports do not drag server/Mongoose code into client chunks. Verify no new console errors/hydration warnings in both routes.
- [ ] Capture production Lighthouse and performance traces at 1440×900 and a realistic mobile profile. Compare to recorded pre-redesign baseline if it exists; if no usable baseline exists, state comparison unavailable and record absolute results. Target LCP ≤2.5s, CLS <0.05, accessibility ≥95, high-tier desktop ≥55fps and mid-tier phone ≥45fps. Record hardware/browser, tier, DPR, throttling, measured frame counts and probe result. Browser emulation is not evidence of real mid-tier phone GPU performance. Missing hardware validation remains a named limitation, not a fabricated pass.
- [ ] Use Chrome performance/memory tools to profile all set pieces; fix only observed hot paths. No allocations in per-frame graph construction, no orphan event listeners or geometry after navigation, one context maximum. Confirm context-loss demotion cannot leave pins hiding content. Confirm focus pull applies to readability-critical panels without softening still mode; reuse Starfield's non-destructive max-combined control rather than clobbering external settings. Bloom remains absent unless real visual/perf evidence justifies the new compositor scope.
- [ ] Capture final screenshot sets at all content chapter entries, at least five intermediate positions, every case/process step, mobile menu, still, WebGL fallback, form error/success and actual booking if configured. Personally inspect images, not just file paths. Update final worklog with completed scopes, test evidence, metrics, outstanding scheduler URL/mail/hardware/content dependencies. Commit `test: verify voyage launch accessibility and performance`.

## Common slice browser gate (Tasks 2, 6, 9; repeat after relevant fixes)

1. Run exact slice unit tests, typecheck and touched-file lint. Repository lint may retain the recorded baseline until Task 10. Start/reuse the documented local server.
2. Read automation tool documentation, open actual page, record tier and FPS probe. Capture 1440×900 and 390×844, ≥5 meaningful positions. Derive targets from actual section bounding rects/viewport holds, not raw old normalized percentages. Confirm scrollY has settled within 2px before captures.
3. Inspect screenshots for content/ring/planet alignment, crop, glass readability, no unintended amber, dock/controls overlap, heading/body typography, focus visibility and horizontal overflow. Retune numbers only from observed defects; rerun affected checks after edits.
4. Test keyboard/touch, 200% zoom, longest legal CMS text, empty optional data, reduced motion, WebGL disabled/lost and resizing midway. Do not overwrite real CMS data to create screenshots; temporary fixtures must be local, isolated, and removed before commit.
5. Confirm server routes, CMS edits and no unintended audio/messages. Save actual screenshots, logged tier/probe, console findings and deviations in worklog/insights. Finish the gate before progressing to next slice.

## Coverage and honest completion boundaries

- Implemented by plan: data-driven proof/process/quotes/projects; readable static alternatives; skip semantics across physical layout/camera/navigation; no reverse camera; bookable URL configuration; real inquiry API integration; truthful Pilot; Surface relaunch; home launch; CMS invalidation; legacy removal; automated/browser/perf gates.
- External inputs still required for full product acceptance: actual public scheduler URL and provider embedding permission; verified published case studies/testimonials/credential copy; deployed DB/email settings; target-device performance evidence when unavailable locally.
- Provider-specific scheduler completion callbacks and appointment-success sound are not implemented without an actual provider contract. Inquiry success sound is implemented on actual stored-success response.
- Content-first SSR/hydration and CLS require measured implementation review in Task 10; this plan explicitly refuses to call a blank server placeholder or unmeasured cinematic hydration a performance pass.
- Original geometry is approved. No code is represented as a ThreeUI source port unless its source is actually read and attribution retained.
