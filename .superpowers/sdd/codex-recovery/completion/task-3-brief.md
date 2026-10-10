## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

### Task 3: Remove empty chapter sections, navigation ticks and camera waypoints together

**Files:** Create `src/scene/camera/activeChapters.ts`, `activeFlightPath.ts`, `activeFlightPath.test.ts`; modify `flightPath.ts`, `scrollGeometry.test.ts`, `VoyageScroll.tsx`, `VoyageRoot.tsx`, `SceneRoot.tsx`, `FlightRail.tsx`, `src/components/dock/Dock.tsx`.

**Interfaces:** `activeChapters({services,process,cases,testimonials,portfolio,still}): readonly Chapter[]`; `createActiveFlightPath(chapters): (progress:number,out?:CameraPose)=>CameraPose`. Preserve canonical ranges/indices. Store `chapterAt` is unchanged because the bridge never emits a removed span. `toScroll` in Slice 4 already clamps a gap target to the next retained section start. No global mutable configuration; pass active chapter array as root props and capture in bridge/scene effects.

- [ ] Add pure `activeChapters.ts`:

```ts
import { CHAPTERS } from "./flightPath";
export function activeChapters({services,process,cases,testimonials,portfolio,still}:{services:number;process:number;cases:number;testimonials:number;portfolio:number;still:boolean}) {
  return CHAPTERS.filter(c=>!(c.id==="approach"&&!services)&&!(c.id==="orbit"&&!process)&&!(c.id==="worlds"&&!cases)&&!(c.id==="belt"&&!testimonials)&&!(c.id==="constellation"&&!portfolio)&&!(c.id==="jump"&&still));
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
  const chapters=activeChapters({services:1,process:0,cases:0,testimonials:0,portfolio:1,still:false});
  expect(chapters.some(c=>["orbit","worlds","belt"].includes(c.id))).toBe(false);
  const pose=createActiveFlightPath(chapters);
  let z=Infinity;
  for(const c of chapters){for(let i=0;i<=100;i++){const p=pose(c.start+(c.end-c.start)*i/100);expect(p.position.z).toBeLessThanOrEqual(z+1e-6);expect(p.lookAt.z).toBeLessThan(p.position.z);z=p.position.z;}}
  const jump=chapters.find(c=>c.id==="jump")!,passage=chapters.find(c=>c.id==="passage")!;
  expect(pose(jump.end).position.distanceTo(pose(passage.start).position)).toBeLessThan(1e-6);
});
it("removes Jump in still but retains the static manifesto",()=>{
 const ids=activeChapters({services:1,process:4,cases:2,testimonials:0,portfolio:2,still:true}).map(c=>c.id);
 expect(ids).not.toContain("jump");expect(ids).toContain("passage");
});
```

- [ ] Add these additional assertions to `activeFlightPath.test.ts` (import `* as THREE` and `STAR_POSITION` from the existing modules). They check finite projected composition and continuity, not only depth:

```ts
it("keeps retained boundary poses finite, continuous and the pre-arrival star in frame",()=>{
 for(let mask=0;mask<32;mask++)for(const still of [false,true]){
  const cases=(mask&4)?0:2;
  const chapters=activeChapters({services:(mask&1)?0:3,process:(mask&2)?0:4,cases,testimonials:(mask&8)?0:2,portfolio:cases+((mask&16)?0:3),still});
  const sample=createActiveFlightPath(chapters);
  for(const aspect of [1440/900,390/844]){
   const camera=new THREE.PerspectiveCamera(60,aspect,.1,400);
   for(let i=0;i<chapters.length;i++){
    const chapter=chapters[i],pose=sample(chapter.start);
    expect([...pose.position.toArray(),...pose.lookAt.toArray()].every(Number.isFinite)).toBe(true);
    if(i){const previous=sample(chapters[i-1].end);expect(previous.position.distanceTo(pose.position)).toBeLessThan(1e-6);expect(previous.lookAt.distanceTo(pose.lookAt)).toBeLessThan(1e-6);}
    camera.position.copy(pose.position);camera.lookAt(pose.lookAt);camera.updateMatrixWorld(true);
    const target=pose.lookAt.clone().project(camera);expect(Math.abs(target.x)).toBeLessThan(1e-6);expect(Math.abs(target.y)).toBeLessThan(1e-6);
    if(chapter.start<=.74){const star=STAR_POSITION.clone().project(camera);expect(Number.isFinite(star.x)&&Number.isFinite(star.y)).toBe(true);expect(Math.abs(star.x)).toBeLessThan(1.4);expect(Math.abs(star.y)).toBeLessThan(1.4);}
   }
  }
 }
});
```

The ±1.4 guard catches subjects flung far out of frame; it does not replace the browser's readable composition review. Sample intermediate segments as well for finite pose and forward depth using the existing 100-sample loop. If a filtered curve fails, adjust only its lateral interpolation/target clamping and rerun all omission masks; do not change the tuned complete path or weaken the assertion blindly.

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

- [ ] Thread `projects: Project[]` into root now by fetching `getProjects()` alongside existing `getVoyageContent()` in the server route; this provides the portfolio count before Task 5 builds the graph. Then in root derive active array using service/process/case/testimonial counts, combined `cases.length + projects.length`, and `tier === "still"`. Empty Approach is removed as well; empty Constellation is removed only when both cases and projects are empty. Render its ordered entries instead of CHAPTERS, pass `chapters` into VoyageScroll, SceneRoot, FlightRail and Dock. Slice 4 already removed the track fixed minHeight. Preserve that behavior: natural section heights + surface tail set scroll limit; pending SSR reservation CSS may only reserve retained chapter elements. Process zero already filtered. In bridge measurement map the provided chapters only; remove zero-height rects (`if(rect.height<=0)return []`) defensively. Do not mutate voyageStore or server module constants. Tail stays surface's `100vh`.

For FlightRail add prop `{chapters:readonly Chapter[]}`; derive content chapters locally; filter out micro-beats. For Dock add same prop; replace `startOf` global with a function closed over these props. Omit Services and Process links when their chapters are absent; change Work destination to Constellation if Worlds is absent and Constellation exists, otherwise omit Work. Concrete resolution:

```ts
const links=DOCK_LINKS.flatMap(link=>{
  const chapter=link.chapter==="worlds"&&!chapters.some(c=>c.id==="worlds")?"constellation":link.chapter;
  return chapters.some(c=>c.id===chapter)?[{...link,chapter}]:[];
});
const startOf=(id:ChapterId)=>chapters.find(c=>c.id===id)?.start === undefined ? 0 : chapters.find(c=>c.id===id)!.start + .001;
```

Use `links` in both desktop/mobile maps. Keep `go()` programmatic suppression, sound gate and focus-return behavior. Rail can retain canonical vertical tick placement with gaps; no ghost ticks may remain. All chapter targets remain canonical and inverse bridge handles them. Fix Launch's existing See the work handler (currently aimed at Approach): pass `workChapter: ChapterId | null` from root using Worlds when cases exist, otherwise Constellation when combined portfolio is nonempty, otherwise null. Render the secondary CTA only for a real work target. Its handler resolves that retained chapter and uses `start + .001`; Book a call still uses Landing. Do not leave a Services/Work control pointing at a removed ID merely because the bridge can skip it.

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

Run all camera/store/scroll tests; expand active camera test over all 32 combinations of empty Approach/Orbit/Worlds/Belt/Constellation and both tiers (portfolio count must be ≥case count in valid fixtures), preserving same assertions. Confirm full-content camera tests still sample original tuned path. Commit `feat: skip empty voyage chapters and their camera waypoints`.
