## Authoritative visual amendment — 2026-09-30

The user rejected the earlier visual result. Follow `.superpowers/sdd/codex-recovery/design-correction-brief.md` and its accepted restrained cinematic correction. An editorial foreground and meaningful real CMS content dominate. Do not default to equal glass cards; rings, planets and graphs are secondary sparse scene cues, with no invented project relationships. Decorative sample CSS, glass/blur prescriptions and old pinned-reader styling below are subordinate to the corrected tokens and composition. Visual review may simplify or decrease decoration. Keep pinned interaction only where a chapter needs it and all content remains accessible; Services uses intrinsic natural flow on every tier, authored order, no arc/150vh/card-strip treatment. Do not restore overlapping animated mobile service cards. Functional camera, data, navigation and accessibility contracts remain mandatory.

## Task 4: One monochrome orbital ring in the existing scene

**Files:** Create `src/scene/chapters/OrbitRing.ts`, `OrbitRing.test.ts`; modify `src/scene/SceneRoot.tsx`, `src/components/voyage/VoyageRoot.tsx`.

**Interfaces:** `new OrbitRing(count: number)` implements existing `SetPiece`. Consumes existing `FrameContext.camera` and canonical `voyage`, plus `orbitPhase`. Ring is view-composed inside the one scene, with perspective depth around its node circle; no extra renderer. A subtle bank is applied to the real camera's local z axis before piece updates.

- [ ] Add failing geometry/lifecycle test:

```ts
import { expect, it } from "vitest";
import * as THREE from "three";
import { OrbitRing } from "./OrbitRing";
import { voyageStore } from "@/scene/scroll/voyageStore";
import type { FrameContext } from "./types";
it("brings each process node to the same front point and releases resources", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1440/900, .1, 400);
  const ring = new OrbitRing(4);
  const ctx: FrameContext = { camera, voyage: voyageStore.getState(), t:0, dt:1/60, audioEnergy:0, ignite:1 };
  ring.update(ctx); // legal before build
  ring.build(scene, "high");
  let front: THREE.Vector3 | undefined;
  for (let i=0; i<4; i++) {
    voyageStore.setScroll(.22 + .12*(i+.5)/5, 0);
    ctx.voyage=voyageStore.getState();
    ring.update(ctx);
    scene.updateMatrixWorld(true);
    const node=scene.getObjectByName(`orbit-node-${i}`)!;
    const position=node.getWorldPosition(new THREE.Vector3());
    if (!front) front=position;
    expect(position.distanceTo(front)).toBeLessThan(.0001);
  }
  ring.dispose(); ring.dispose();
  expect(scene.children).toHaveLength(0);
  voyageStore.reset();
});
it("builds nothing for still tier or empty process", () => {
  const scene=new THREE.Scene();
  new OrbitRing(4).build(scene,"still");
  new OrbitRing(0).build(scene,"high");
  expect(scene.children).toHaveLength(0);
});
```

- [ ] Run `npx vitest run src/scene/chapters/OrbitRing.test.ts`; expect missing-module failure. Implement:

```ts
// Original orbital geometry inspired by the approved orbital-sphere ring concept.
import * as THREE from "three";
import type { Tier } from "@/scene/quality";
import type { SetPiece, FrameContext } from "./types";
import { orbitPhase } from "@/components/voyage/orbitPhase";

export class OrbitRing implements SetPiece {
  private root: THREE.Group | null = null;
  private wheel: THREE.Group | null = null;
  private ringMaterial: THREE.MeshBasicMaterial | null = null;
  private nodeMaterial: THREE.MeshBasicMaterial | null = null;
  private glowMaterial: THREE.MeshBasicMaterial | null = null;
  private geometries: THREE.BufferGeometry[] = [];
  private offset = new THREE.Vector3();
  constructor(private readonly count: number) {}
  build(scene: THREE.Scene, tier: Tier) {
    this.dispose();
    if (tier === "still" || this.count <= 0) return;
    const root = new THREE.Group(); root.name="orbit-ring"; root.visible=false;
    const tilt = new THREE.Group(); tilt.rotation.x=-.65; tilt.rotation.z=.15;
    const wheel = new THREE.Group(); tilt.add(wheel); root.add(tilt);
    const segments = tier === "high" ? 128 : 64;
    const torus = new THREE.TorusGeometry(3, .012, 6, segments);
    const sphere = new THREE.SphereGeometry(.09, 12, 8);
    const halo = new THREE.SphereGeometry(.20, 12, 8);
    this.geometries=[torus,sphere,halo];
    const material = (opacity: number, glow=false) => new THREE.MeshBasicMaterial({
      color:0xffffff, transparent:true, opacity, depthWrite:false,
      blending:glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.ringMaterial=material(.3);
    this.nodeMaterial=material(1);
    this.glowMaterial=material(.15,true);
    wheel.add(new THREE.Mesh(torus,this.ringMaterial));
    for(let i=0;i<this.count;i++) {
      // Front-center is the lower, near edge of the tilted circle.
      const angle=-Math.PI/2 + i*Math.PI*2/this.count;
      const node=new THREE.Mesh(sphere,this.nodeMaterial);
      node.name=`orbit-node-${i}`;
      node.position.set(3*Math.cos(angle),3*Math.sin(angle),0);
      const glow=new THREE.Mesh(halo,this.glowMaterial);
      glow.position.copy(node.position);
      wheel.add(node,glow);
    }
    scene.add(root); this.root=root; this.wheel=wheel;
  }
  update({ voyage, camera, ignite }: FrameContext) {
    if(!this.root || !this.wheel) return;
    const visible=voyage.chapter.id === "orbit";
    this.root.visible=visible;
    if(!visible) return;
    const p=voyage.chapterProgress;
    const phase=orbitPhase(p,this.count);
    const opacity=Math.min(1,p*(this.count+1)/.15,(1-p)*(this.count+1)/.4)*ignite;
    this.ringMaterial!.opacity=.38*opacity;
    this.nodeMaterial!.opacity=opacity;
    this.glowMaterial!.opacity=.16*opacity;
    this.wheel.rotation.z=phase.angle;
    const mobile=camera.aspect<1;
    // Plane sits 15 units in front of the camera; left half on desktop, above copy on mobile.
    const halfHeight=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*15;
    this.offset.set(mobile ? 0 : -halfHeight*camera.aspect*.40, mobile ? halfHeight*.48 : 0, -15);
    this.offset.applyQuaternion(camera.quaternion);
    this.root.position.copy(camera.position).add(this.offset);
    this.root.quaternion.copy(camera.quaternion);
    this.root.scale.setScalar(mobile ? Math.min(.78,halfHeight*camera.aspect*.78/3.2) : 1.35);
  }
  dispose() {
    this.root?.removeFromParent();
    for(const geometry of this.geometries) geometry.dispose();
    this.ringMaterial?.dispose(); this.nodeMaterial?.dispose(); this.glowMaterial?.dispose();
    this.geometries=[]; this.root=null; this.wheel=null;
    this.ringMaterial=null; this.nodeMaterial=null; this.glowMaterial=null;
  }
}
```

No wall-clock drift: a node remains on its front marker while its words are being read. Count-based geometry is built once, not per frame. Browser review decides whether the camera-relative composition reads convincingly as an orbit; moving to a world anchor is a deliberate follow-up if it reads as a HUD. Do not fake an inspected source attribution.

- [ ] Integrate with the completed Slice 3 scene. Add `processCount: number` to `SceneRootProps`; destructure it; include it in scene effect dependencies. Import OrbitRing and insert `new OrbitRing(processCount)` into the existing pieces array without dropping Topology or changing their update order. Thread `processCount={process.length}` from VoyageRoot. After `camera.lookAt(smoothLook)` and before piece updates, insert:

```ts
// A single bank-and-settle; rotateZ resets from lookAt each frame, never accumulates.
if (voyage.chapter.id === "orbit") {
  const bank = Math.sin(Math.PI * Math.min(1, voyage.chapterProgress / .2));
  camera.rotateZ(-Math.PI / 6 * bank);
}
```

Bank changes camera up orientation, not position or forward direction. With count=4 the bank resolves during the first viewport; it does not repeat per step. Do not alter waypoints or POSE_LERP. In still tier SceneRoot is absent, so no camera bank runs.

- [ ] Run `npx vitest run src/scene/chapters/OrbitRing.test.ts src/components/voyage/orbitPhase.test.ts src/scene/camera/flightPath.test.ts`, then `npm run typecheck` and lint the touched files; expect no new touched-file problems. Run `npm run lint` separately and compare against the recorded 10-error/6-warning baseline. Commit with `feat: render the scroll-driven process orbit`.
