## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

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
