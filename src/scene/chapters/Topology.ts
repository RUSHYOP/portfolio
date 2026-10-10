import * as THREE from "three";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import { mulberry32 } from "@/scene/prng";
import type { ChapterId } from "@/scene/camera/flightPath";
import type { FrameContext, SetPiece } from "./types";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const TOPOLOGY_SEED = 9901;
const NODE_RADIUS = 9;
const NODE_FLATTEN = 0.62;
const NODE_DEPTH = 7;
const OFFSET_X = -2.6;
const OFFSET_Y = 1.4;
const OFFSET_Z = -34;
const ASSEMBLE_START = 0.06;
const ASSEMBLE_END = 0.3;
const FADE_IN = 0.04;
const FADE_FULL = 0.1;
const FADE_HOLD_END = 0.5;
const FADE_OUT = 0.7;
const NODE_OPACITY = 0.9;
const EDGE_OPACITY = 0.28;

/** How many of the `count` nodes have arrived at this point in chapter progress. */
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

/** Seeded monochrome node/edge graph assembled behind the service panels in Approach. */
export class Topology implements SetPiece {
  private group: THREE.Group | null = null;
  private nodeGeometry: THREE.BufferGeometry | null = null;
  private edgeGeometry: THREE.BufferGeometry | null = null;
  private scene: THREE.Scene | null = null;
  private _positions: Float32Array = new Float32Array(0);
  /** Scratch vector keeps update() allocation-free. */
  private readonly offset = new THREE.Vector3();

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

  get positions(): Float32Array { return this._positions; }
  get object(): THREE.Group | null { return this.group; }
  get count(): number { return this._positions.length / 3; }
  get edgeCount(): number { return Math.max(0, this.count - 1); }

  build(scene: THREE.Scene, tier: Tier): void {
    if (this.group) this.dispose();
    const n = TIER_SETTINGS[tier].topologyNodes;
    const rand = mulberry32(TOPOLOGY_SEED);
    this._positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = NODE_RADIUS * Math.sqrt(rand());
      const a = rand() * Math.PI * 2;
      this._positions[i * 3] = Math.cos(a) * r;
      this._positions[i * 3 + 1] = Math.sin(a) * r * NODE_FLATTEN;
      this._positions[i * 3 + 2] = (rand() - 0.5) * NODE_DEPTH;
    }

    // Each node links to its nearest previously placed node. Thus the first k edges
    // reference only the first k+1 nodes and a draw range can assemble the graph.
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
      edges[e] = this._positions[best * 3];
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
    this.group.add(points, lines);
    this.scene = scene;
    scene.add(this.group);
  }

  update(ctx: FrameContext): void {
    if (!this.group || !this.nodeGeometry || !this.edgeGeometry) return;
    const fade = topologyFade(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
    this.group.visible = fade > 0.001;
    if (!this.group.visible) return;

    // Apply the offset in camera space so the graph follows the lens and always faces it.
    this.offset.set(OFFSET_X, OFFSET_Y, OFFSET_Z).applyQuaternion(ctx.camera.quaternion);
    this.group.position.copy(ctx.camera.position).add(this.offset);
    this.group.quaternion.copy(ctx.camera.quaternion);

    const nodes = visibleNodeCount(this.count, ctx.voyage.chapterProgress);
    this.nodeGeometry.setDrawRange(0, nodes);
    this.edgeGeometry.setDrawRange(0, Math.max(0, nodes - 1) * 2);
    this.nodeMaterial.opacity = NODE_OPACITY * fade * ctx.ignite;
    this.edgeMaterial.opacity = EDGE_OPACITY * fade * ctx.ignite;
  }

  dispose(): void {
    if (this.group && this.scene) this.scene.remove(this.group);
    this.nodeGeometry?.dispose();
    this.edgeGeometry?.dispose();
    this.nodeGeometry = null;
    this.edgeGeometry = null;
    this.nodeMaterial.dispose();
    this.edgeMaterial.dispose();
    this.group = null;
    this.scene = null;
    this._positions = new Float32Array(0);
  }
}
