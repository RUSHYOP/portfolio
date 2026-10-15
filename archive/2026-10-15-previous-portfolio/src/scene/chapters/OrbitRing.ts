import * as THREE from "three";
import { STAR_POSITION, type ChapterId } from "@/scene/camera/flightPath";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import { ORBIT_PRESENCE_END, orbitCursor } from "./orbitSchedule";
import type { FrameContext, SetPiece } from "./types";

const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));
const smooth = (t: number) => t * t * (3 - 2 * t);

/* ---- Browser-review tunables (spec §3 row 04). Exported so the review can retune a value
 * without touching any logic below. ---- */

/** World-space radius of the ring around the star. Keep the nearest point >= ~15 units from
 *  the camera at orbit exit (z -100; tested), so R <~ 22. */
export const RING_RADIUS = 20;

/** Angle between the ring plane's normal and the view axis (-z). 0 = a face-on circle, 90° =
 *  edge-on. At 72° the ring is a shallow ellipse (minor/major = cos 72° = 0.31) whose near arc
 *  passes BELOW the star disc. */
export const RING_TILT = (72 * Math.PI) / 180;

/** Torus tube radius in world units (~3 px at mid-orbit). A tube, not a line: WebGL lines are 1 px. */
export const RING_TUBE = 0.1;
const RING_RADIAL_SEGMENTS = 6;

/** Node radius at rest, and how much the active node swells (scale 1 + boost). */
export const NODE_RADIUS = 0.55;
export const NODE_ACTIVE_BOOST = 0.9;

export const RING_OPACITY = 0.5;
export const NODE_OPACITY = 0.95;

/** Fade-in over Orbit's first tenth. The fade-out runs from ORBIT_PRESENCE_END (the end of the
 *  schedule's edge margin) to RING_FADE_OUT_END, after which the ring is hidden: the camera flies through this region
 *  in the chapters that follow. */
const RING_FADE_IN_END = 0.1;
export const RING_FADE_OUT_END = 0.9;

/** 0..1 overall presence of the ring. Zero everywhere but Orbit; fully out by cp 0.9. */
export function ringFade(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "orbit") return 0;
  const t = clamp01(chapterProgress);
  if (t <= 0 || t >= RING_FADE_OUT_END) return 0;
  if (t < RING_FADE_IN_END) return smooth(t / RING_FADE_IN_END);
  if (t <= ORBIT_PRESENCE_END) return 1;
  return smooth(1 - (t - ORBIT_PRESENCE_END) / (RING_FADE_OUT_END - ORBIT_PRESENCE_END));
}

/**
 * Rotation (radians, about the ring plane's normal) of the node group for a cursor value.
 * Node k sits at angle 2πk/n in the ring's own plane; this spin carries node `cursor` to
 * -90° — the lowest point of the near arc, "front-centre" — and turns the ring one
 * node-spacing per step. 0 for an empty ring.
 */
export function ringSpin(cursor: number, n: number): number {
  if (!(n >= 1)) return 0;
  return -Math.PI / 2 - (2 * Math.PI * cursor) / n;
}

/**
 * Chapter 04's set piece: one large monochrome ring around the star with a luminous node per
 * process step. Scroll turns it (via orbitCursor) so each node arrives front-centre as its
 * panel takes over.
 *
 * World space, not camera-relative: the ring orbits the star. Depth testing is kept as a guard
 * only: at the default tilt the ring does not overlap the disc (measured: the back arc clears it
 * by ~60 px), so the sphere read comes from the star's own shading (orbitLimb) and the ring's
 * perspective. Everything it owns is allocated in build(); update() only writes scalars, so
 * nothing is allocated per frame.
 */
export class OrbitRing implements SetPiece {
  private group: THREE.Group | null = null;
  private tiltGroup: THREE.Group | null = null;
  private nodeGroup: THREE.Group | null = null;
  private torusMesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> | null = null;
  private torusGeometry: THREE.TorusGeometry | null = null;
  private nodeGeometry: THREE.SphereGeometry | null = null;
  /** Exposed read-only for tests and debug overlays (opacity is the fade readout). */
  readonly ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  readonly nodeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private scene: THREE.Scene | null = null;
  /** Number of process steps (nodes). Fixed for the instance: SceneRoot rebuilds on change. */
  readonly count: number;

  /** `stepCount` comes from the CMS: anything non-finite or negative is an empty ring. */
  constructor(stepCount: number) {
    this.count = Number.isFinite(stepCount) ? Math.max(0, Math.floor(stepCount)) : 0;
  }

  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.Group | null {
    return this.group;
  }
  /** The ring's tilt frame (rotation.x = -RING_TILT). Null when nothing was built. */
  get tilt(): THREE.Group | null {
    return this.tiltGroup;
  }
  /** The group the nodes live in; its rotation.z is the spin. Null when nothing was built. */
  get nodes(): THREE.Group | null {
    return this.nodeGroup;
  }
  get torus(): THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> | null {
    return this.torusMesh;
  }

  build(scene: THREE.Scene, tier: Tier): void {
    // An unpaired second build() would leak the previous Group into the scene.
    if (this.group) this.dispose();
    this.group = new THREE.Group();
    this.group.position.copy(STAR_POSITION);
    this.group.visible = false;
    const segments = TIER_SETTINGS[tier].ringSegments;
    // No steps, or the `still` tier (which never reaches GL): an empty hidden group, no GPU resources.
    if (this.count > 0 && segments > 0) {
      this.torusGeometry = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, RING_RADIAL_SEGMENTS, segments);
      this.torusMesh = new THREE.Mesh(this.torusGeometry, this.ringMaterial);
      this.torusMesh.frustumCulled = false;

      this.nodeGeometry = new THREE.SphereGeometry(1, 12, 8);
      this.nodeGroup = new THREE.Group();
      for (let k = 0; k < this.count; k++) {
        const angle = (2 * Math.PI * k) / this.count;
        const node = new THREE.Mesh(this.nodeGeometry, this.nodeMaterial);
        node.position.set(Math.cos(angle) * RING_RADIUS, Math.sin(angle) * RING_RADIUS, 0);
        node.scale.setScalar(NODE_RADIUS);
        node.frustumCulled = false;
        this.nodeGroup.add(node);
      }

      this.tiltGroup = new THREE.Group();
      // The torus lies in its local XY plane; rotating about X by -tilt carries its near
      // (+z) arc to the bottom, below the star.
      this.tiltGroup.rotation.x = -RING_TILT;
      this.tiltGroup.add(this.torusMesh);
      this.tiltGroup.add(this.nodeGroup);
      this.group.add(this.tiltGroup);
    }
    this.scene = scene;
    scene.add(this.group);
  }

  update(ctx: FrameContext): void {
    // SceneRoot may tick before the build lands; an empty ring has nothing to drive.
    if (!this.group || !this.nodeGroup) return;
    const fade = ringFade(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
    this.group.visible = fade > 0.001;
    if (!this.group.visible) return;
    const cursor = orbitCursor(ctx.voyage.chapterProgress, this.count);
    this.nodeGroup.rotation.z = ringSpin(cursor, this.count);
    // The node nearest the cursor swells; the rest rest at NODE_RADIUS. Scalars only — no allocation.
    const nodes = this.nodeGroup.children;
    for (let k = 0; k < nodes.length; k++) {
      const nearness = clamp01(1 - Math.abs(cursor - k));
      nodes[k].scale.setScalar(NODE_RADIUS * (1 + NODE_ACTIVE_BOOST * smooth(nearness)));
    }
    this.ringMaterial.opacity = RING_OPACITY * fade * ctx.ignite;
    this.nodeMaterial.opacity = NODE_OPACITY * fade * ctx.ignite;
  }

  dispose(): void {
    if (this.group && this.scene) this.scene.remove(this.group);
    this.torusGeometry?.dispose();
    this.torusGeometry = null;
    this.nodeGeometry?.dispose();
    this.nodeGeometry = null;
    this.ringMaterial.dispose();
    this.nodeMaterial.dispose();
    this.torusMesh = null;
    this.nodeGroup = null;
    this.tiltGroup = null;
    this.group = null;
    this.scene = null;
  }
}
