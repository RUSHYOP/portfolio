import * as THREE from "three";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
// Its own seed: sharing Starfield's 1337 sequence would couple the two layouts, and a
// draw-order change in either would move the other's pinned literal.
import { mulberry32 } from "@/scene/prng";
import { type ChapterId } from "@/scene/camera/flightPath";
import type { FrameContext, SetPiece } from "./types";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

const TOPOLOGY_SEED = 9901;

/** A flattened disc, so the graph reads as a diagram plane rather than a ball of points. */
const NODE_RADIUS = 9;
const NODE_FLATTEN = 0.62;
const NODE_DEPTH = 7;

/** Camera-space offset: just left of centre, 24 units ahead, so the graph sits behind the
 *  docked panels rather than behind the star (which projects low-right). Inside the
 *  camera's near 0.1 / far 400. */
const OFFSET_X = -0.9; // was -2.6: at OFFSET_Z -24 that projected the graph left of the middle panel; -0.9 centres it behind the panel so it spills past both edges
const OFFSET_Y = 1.4;
const OFFSET_Z = -24; // was -34: browser review (p12) — at -34 the graph sat entirely behind the blurred glass and vanished; -24 projects it ~1.4× larger so nodes spill past the panel edges

/** Assembly window over Approach's chapterProgress. Completes inside the 100vh pin's hold
 *  (chapterProgress 0..1/3) so the graph is whole while the panels are docked. */
const ASSEMBLE_START = 0.06;
const ASSEMBLE_END = 0.30;

/** Whole-piece fade window, same shape as Starfield's focus pull. */
const FADE_IN = 0.04;
const FADE_FULL = 0.10;
const FADE_HOLD_END = 0.50;
const FADE_OUT = 0.70;

const NODE_OPACITY = 0.9;
const EDGE_OPACITY = 0.28;

/** How many of the `count` nodes have arrived at this point in the chapter. */
export function visibleNodeCount(count: number, chapterProgress: number): number {
  if (count <= 0) return 0;
  const t = clamp01((clamp01(chapterProgress) - ASSEMBLE_START) / (ASSEMBLE_END - ASSEMBLE_START));
  return Math.round(count * t);
}

/** 0..1 overall presence of the graph. Zero everywhere but Approach. */
export function topologyFade(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "approach") return 0;
  const t = clamp01(chapterProgress);
  if (t <= FADE_IN || t >= FADE_OUT) return 0;
  if (t < FADE_FULL) return smooth((t - FADE_IN) / (FADE_FULL - FADE_IN));
  if (t <= FADE_HOLD_END) return 1;
  return smooth(1 - (t - FADE_HOLD_END) / (FADE_OUT - FADE_HOLD_END));
}

/**
 * Chapter 02's set piece: a monochrome node/edge graph that assembles node-by-node behind
 * the service panels ("Topology graph assembles node-by-node behind the middle panel",
 * spec §3 row 02).
 *
 * The panels it sits behind are screen-pinned, so the graph is camera-relative: it holds
 * its framing through the chapter's dolly-in and through the mouse parallax that
 * SceneRoot adds straight to camera.position.
 */
export class Topology implements SetPiece {
  // Group, geometries and buffers are allocated per build() so a rebuild neither stacks a
  // second graph in the scene nor reuses a disposed geometry.
  private group: THREE.Group | null = null;
  private nodeGeometry: THREE.BufferGeometry | null = null;
  private edgeGeometry: THREE.BufferGeometry | null = null;
  /** Exposed read-only for tests and debug overlays (opacity is the fade readout). */
  readonly nodeMaterial = new THREE.PointsMaterial({
    size: 0.42,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  readonly edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private _positions: Float32Array = new Float32Array(0);
  private scene: THREE.Scene | null = null;
  /** Scratch vector, so update() allocates nothing per frame. */
  private readonly offset = new THREE.Vector3();

  /** Read-only view of the packed xyz node buffer (callers must not reassign it). */
  get positions(): Float32Array {
    return this._positions;
  }

  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.Group | null {
    return this.group;
  }

  get count(): number {
    return this._positions.length / 3;
  }

  /** One edge per node after the first: node i links to its nearest already-placed
   *  neighbour, so the first k edges only ever join the first k+1 nodes — which is what
   *  makes the draw-range assembly correct. */
  get edgeCount(): number {
    return Math.max(0, this.count - 1);
  }

  build(scene: THREE.Scene, tier: Tier): void {
    // An unpaired second build() would leak the previous Group into the scene.
    if (this.group) this.dispose();
    const n = TIER_SETTINGS[tier].topologyNodes;
    const rand = mulberry32(TOPOLOGY_SEED);
    this._positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = NODE_RADIUS * Math.sqrt(rand());
      const a = rand() * Math.PI * 2;
      this._positions[i * 3 + 0] = Math.cos(a) * r;
      this._positions[i * 3 + 1] = Math.sin(a) * r * NODE_FLATTEN;
      this._positions[i * 3 + 2] = (rand() - 0.5) * NODE_DEPTH;
    }
    // The edge pass draws no random numbers and runs *after* placement, so the pinned
    // layout literal stays valid.
    const edges = new Float32Array(Math.max(0, n - 1) * 6);
    for (let i = 1; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let j = 0; j < i; j++) {
        const dx = this._positions[i * 3] - this._positions[j * 3];
        const dy = this._positions[i * 3 + 1] - this._positions[j * 3 + 1];
        const dz = this._positions[i * 3 + 2] - this._positions[j * 3 + 2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD) { bestD = d; best = j; }
      }
      const e = (i - 1) * 6;
      edges[e + 0] = this._positions[best * 3];
      edges[e + 1] = this._positions[best * 3 + 1];
      edges[e + 2] = this._positions[best * 3 + 2];
      edges[e + 3] = this._positions[i * 3];
      edges[e + 4] = this._positions[i * 3 + 1];
      edges[e + 5] = this._positions[i * 3 + 2];
    }

    this.nodeGeometry = new THREE.BufferGeometry();
    this.nodeGeometry.setAttribute("position", new THREE.BufferAttribute(this._positions, 3));
    this.nodeGeometry.setDrawRange(0, 0);
    this.edgeGeometry = new THREE.BufferGeometry();
    this.edgeGeometry.setAttribute("position", new THREE.BufferAttribute(edges, 3));
    this.edgeGeometry.setDrawRange(0, 0);

    const points = new THREE.Points(this.nodeGeometry, this.nodeMaterial);
    const lines = new THREE.LineSegments(this.edgeGeometry, this.edgeMaterial);
    points.frustumCulled = false;
    lines.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.add(points);
    this.group.add(lines);
    this.scene = scene;
    scene.add(this.group);
  }

  update(ctx: FrameContext): void {
    // SceneRoot may tick before the build lands.
    if (!this.group || !this.nodeGeometry || !this.edgeGeometry) return;
    const fade = topologyFade(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
    this.group.visible = fade > 0.001;
    if (!this.group.visible) return;
    // Camera-relative, offset in *camera* space: Approach's lookAt is up-left of the flight
    // direction, so a world-axis offset would drift out of frame as the camera dollies.
    this.offset.set(OFFSET_X, OFFSET_Y, OFFSET_Z).applyQuaternion(ctx.camera.quaternion);
    this.group.position.copy(ctx.camera.position).add(this.offset);
    this.group.quaternion.copy(ctx.camera.quaternion);
    // Assembly is a draw range, not a buffer rewrite: nothing is allocated per frame.
    const nodes = visibleNodeCount(this.count, ctx.voyage.chapterProgress);
    this.nodeGeometry.setDrawRange(0, nodes);
    this.edgeGeometry.setDrawRange(0, Math.max(0, nodes - 1) * 2);
    this.nodeMaterial.opacity = NODE_OPACITY * fade * ctx.ignite;
    this.edgeMaterial.opacity = EDGE_OPACITY * fade * ctx.ignite;
  }

  dispose(): void {
    if (this.group && this.scene) this.scene.remove(this.group);
    this.nodeGeometry?.dispose();
    this.nodeGeometry = null;
    this.edgeGeometry?.dispose();
    this.edgeGeometry = null;
    this.nodeMaterial.dispose();
    this.edgeMaterial.dispose();
    this.group = null;
    this.scene = null;
  }
}
