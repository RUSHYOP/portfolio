import * as THREE from "three";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
// Seeded PRNG so a given tier always renders the same sky (stable screenshots).
// Shared with WarpStreaks so both fields are reproducible from one implementation.
import { mulberry32 } from "@/scene/prng";
import type { FrameContext, SetPiece } from "./types";

const CORRIDOR_Z_NEAR = 20;
const CORRIDOR_Z_FAR = -220;
const CORRIDOR_RADIUS = 45;
const BASE_SIZE = 0.14;
const BASE_OPACITY = 0.85;

/**
 * A soft round sprite for the point material — the default PointsMaterial draws squares.
 * Browser-only: returns null outside a document (SSR and the node test env) so the
 * starfield silently falls back to untextured points there.
 */
function makeDiscTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // Gradient radius 32px == 0.5 of the sprite; the stop at 0.7 of it == r 0.35.
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.7, "rgba(255,255,255,1)");  // solid core out to r = 0.35
  g.addColorStop(1, "rgba(255,255,255,0)");    // soft edge, transparent by r = 0.5
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Monochrome point field filling a long corridor along -z that the camera flies through.
 * Controls: soften (focus pull behind pinned panels) and fade (Dark Passage).
 */
export class Starfield implements SetPiece {
  private points: THREE.Points | null = null;
  // Allocated per build() so a rebuild never reuses a disposed geometry.
  private geometry: THREE.BufferGeometry | null = null;
  readonly material = new THREE.PointsMaterial({
    size: BASE_SIZE,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false,
  });
  // Owned by this instance: created in build(), released in dispose().
  private disc: THREE.CanvasTexture | null = null;
  private _positions: Float32Array = new Float32Array(0);
  private soften = 0;
  private fade = 0;
  private scene: THREE.Scene | null = null;

  /** Read-only view of the packed xyz buffer (callers must not reassign it). */
  get positions(): Float32Array {
    return this._positions;
  }

  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.Points | null {
    return this.points;
  }

  get count(): number {
    return this._positions.length / 3;
  }

  build(scene: THREE.Scene, tier: Tier): void {
    // An unpaired second build() would leak the previous Points into the scene.
    if (this.points) this.dispose();
    // Round sprites instead of the default squares (no-op where there is no document).
    this.disc = makeDiscTexture();
    if (this.disc) {
      this.material.map = this.disc;
      this.material.alphaTest = 0.02;
      this.material.needsUpdate = true;
    }
    const n = TIER_SETTINGS[tier].starCount;
    const rand = mulberry32(1337);
    this._positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = CORRIDOR_RADIUS * Math.sqrt(rand());
      const a = rand() * Math.PI * 2;
      this._positions[i * 3 + 0] = Math.cos(a) * r;
      this._positions[i * 3 + 1] = Math.sin(a) * r;
      this._positions[i * 3 + 2] = CORRIDOR_Z_NEAR + (CORRIDOR_Z_FAR - CORRIDOR_Z_NEAR) * rand();
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this._positions, 3));
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene = scene;
    scene.add(this.points);
  }

  /** 0..1 — enlarge + dim so the field reads as out-of-focus behind a panel. */
  setSoften(v: number): void {
    this.soften = Math.min(1, Math.max(0, v));
  }

  /** 0..1 — fade the whole field to black (Dark Passage). */
  setFade(v: number): void {
    this.fade = Math.min(1, Math.max(0, v));
  }

  /** Apply control values to the material. Exposed for tests; update() calls it every frame. */
  applyControls(ignite: number, audioEnergy = 0): void {
    this.material.size = BASE_SIZE * (1 + this.soften * 0.6) * (1 + audioEnergy * 1.5);
    const focus = 1 - this.soften * 0.65;
    this.material.opacity = BASE_OPACITY * ignite * focus * (1 - this.fade) * (0.75 + audioEnergy * 0.5);
  }

  update(ctx: FrameContext): void {
    if (!this.points) return;
    this.applyControls(ctx.ignite, ctx.audioEnergy);
    this.points.rotation.z += ctx.dt * 0.004 * (1 + ctx.audioEnergy * 2);
  }

  dispose(): void {
    if (this.points && this.scene) this.scene.remove(this.points);
    this.geometry?.dispose();
    this.geometry = null;
    // Clear the map before disposing it so a rebuild never points at a dead texture.
    this.material.map = null;
    this.disc?.dispose();
    this.disc = null;
    this.material.dispose();
    this.points = null;
    this.scene = null;
  }
}
