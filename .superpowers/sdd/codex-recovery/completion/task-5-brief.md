## Authoritative visual amendment — 2026-09-30

The user rejected the earlier visual result. Follow `.superpowers/sdd/codex-recovery/design-correction-brief.md` and its accepted restrained cinematic correction. An editorial foreground and meaningful real CMS content dominate. Do not default to equal glass cards; rings, planets and graphs are secondary sparse scene cues, with no invented project relationships. Decorative sample CSS, glass/blur prescriptions and old pinned-reader styling below are subordinate to the corrected tokens and composition. Visual review may simplify or decrease decoration. Keep pinned interaction only where a chapter needs it and all content remains accessible; Services uses intrinsic natural flow on every tier, authored order, no arc/150vh/card-strip treatment. Do not restore overlapping animated mobile service cards. Functional camera, data, navigation and accessibility contracts remain mandatory.

### Task 5: Constellation with shared-tech neighbors and keyboard-equivalent details

**Files:** Create `src/components/voyage/projectGraph.ts`, `projectGraph.test.ts`, `Constellation.tsx`, `src/scene/chapters/Constellation.ts`; modify server page/root/scene/CSS.

**Interfaces:** `portfolioNodes(projects:Project[],cases:Item[]):PortfolioNode[]`; `buildProjectGraph(projects:Project[]) => {nodes:{id,x,y}[],edges:[number,number][]}`. DOM owns hover/focus/selected state; a React context is unnecessary. Pass an imperative interaction ref from root to scene set piece, `{current:{activeId:string|null}}`; update on DOM interactions, never per-frame React. Still uses the same semantic buttons/details in a normal list.

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
import type {Item} from "@/lib/collections/defineCollection";
import {readProof} from "./proof";
export type PortfolioNode=Project & {kind:"case"|"project"};
export function portfolioNodes(projects:Project[],cases:Item[]):PortfolioNode[]{
 const worlds=cases.map((item,index)=>{const c=readProof(item);return {id:`case:${c.id}`,kind:"case" as const,title:c.title,description:c.context,icon:"",technologies:c.stack,liveLink:`/work/${encodeURIComponent(c.slug)}`,liveLinkLabel:"Read the case study",showLiveLink:true,codeLink:"",showCodeLink:false,order:index};});
 return [...worlds,...projects.map(p=>({...p,id:`project:${p.id}`,kind:"project" as const}))];
}
export function buildProjectGraph(projects:Project[]){
 const n=projects.length;
 const nodes=projects.map((p,i)=>({id:p.id,x:.5+.38*Math.cos(i*Math.PI*2/Math.max(1,n)-Math.PI/2),y:.5+.36*Math.sin(i*Math.PI*2/Math.max(1,n)-Math.PI/2)}));
 const tags=projects.map(p=>new Set(p.technologies.map(t=>t.trim().toLowerCase()).filter(Boolean)));
 const edges:[number,number][]=[];
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if([...tags[i]].some(t=>tags[j].has(t)))edges.push([i,j]);
 return {nodes,edges};
}
export function safeProjectHref(value:string){if(/^\/work\/[A-Za-z0-9%_-]+$/.test(value))return value;try{const u=new URL(value);return u.protocol==="https:"||u.protocol==="http:"?u.href:"";}catch{return "";}}
```

- [ ] Add combined-graph identity tests to `projectGraph.test.ts` (import `portfolioNodes`):

```ts
it("retains each authored case as its own node alongside projects",()=>{
 const cases=[{id:"same",order:0,createdAt:"",title:"Actual case",slug:"actual",context:"Actual context",stack:["React"]}];
 const nodes=portfolioNodes([p("same",["React"])],cases);
 expect(nodes.map(n=>n.id)).toEqual(["case:same","project:same"]);
 expect(nodes[0]).toMatchObject({kind:"case",title:"Actual case",liveLink:"/work/actual",technologies:["React"]});
 expect(buildProjectGraph(nodes).edges).toEqual([[0,1]]);
 expect(portfolioNodes([],[])).toEqual([]);
});
```

This link is an actual case reading URL; the edge says only “shared React,” not that the project and case are the same engagement.

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
 if(!projects.length)return null;
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
     <button type="button" onClick={()=>{setSelected(null);interaction.current.activeId=null;}}>Close details</button></>:<p>Select a case or project to explore it.</p>}
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

Reset `lastActive=undefined` on build/dispose. The scene uses the **same authored cases as individually labelled case nodes**, alongside separate project nodes. Prefix IDs by kind; never collapse a case into a project or invent a case→project relation. Edges only indicate actual shared case.stack/project.technologies tags. At Constellation entry scale the case nodes from planet-like points to their final small star size as the wider graph reveals. The camera continues forward; the just-passed case worlds remain identifiable by their exact titles and /work links. Use case nodes first in graph ordering so Worlds order is preserved.

- [ ] Reuse `getProjects()`/root props already threaded by Task 3; keep raw `projects: Project[]` at root for authored data, derive `const graphItems=useMemo(()=>portfolioNodes(projects,cases),[projects,cases])`, and pass `graphItems` to the DOM Constellation and scene constructor using their existing `projects` parameter. PortfolioNode structurally extends Project, so both consumers keep their exact typed interfaces. Include graphItems in scene dependencies. Root creates `const projectInteraction=useRef({activeId:null as string|null})`; pass same ref to DOM and set piece. Register new scene piece and branch. Add CSS:

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
