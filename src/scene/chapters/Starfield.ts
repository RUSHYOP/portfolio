import * as THREE from "three";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
// Seeded PRNG so a given tier always renders the same sky (stable screenshots).
// Shared with WarpStreaks so both fields are reproducible from one implementation.
import { mulberry32 } from "@/scene/prng";
import type { FrameContext, SetPiece } from "./types";
// Chapter ids drive the Approach focus pull (slice 3).
import { type ChapterId } from "@/scene/camera/flightPath";

const CORRIDOR_Z_NEAR = 20;
const CORRIDOR_Z_FAR = -220;
const CORRIDOR_RADIUS = 45;
const BASE_SIZE = 0.14;
const BASE_OPACITY = 0.85;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/* Focus-pull window over Approach's chapterProgress (spec §3: "when a chapter panel pins,
 * background particles behind it soften"). Approach's section is 150vh and .chapter__pin is
 * 100vh, so the pin is stationary only for chapterProgress 0..1/3 — the field is fully soft
 * across that docked frame and releases as the panel block scrolls away. */
const SOFTEN_IN = 0.02;
const SOFTEN_FULL = 0.22;
const SOFTEN_HOLD_END = 0.45;
const SOFTEN_OUT = 0.65;

/** 0..1 focus pull for a chapter + its local progress. Zero everywhere but Approach. */
export function approachSoften(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "approach") return 0;
  const t = clamp01(chapterProgress);
  if (t <= SOFTEN_IN || t >= SOFTEN_OUT) return 0;
  if (t < SOFTEN_FULL) return smooth((t - SOFTEN_IN) / (SOFTEN_FULL - SOFTEN_IN));
  if (t <= SOFTEN_HOLD_END) return 1;
  return smooth(1 - (t - SOFTEN_HOLD_END) / (SOFTEN_OUT - SOFTEN_HOLD_END));
}

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
  /** Chapter-driven focus pull, owned by update(). Kept apart from `soften` so the external
   *  setSoften control (later slices) and the chapter cannot overwrite each other. */
  private chapterSoften = 0;
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
    // A rebuild starts in focus; the chapter pull re-eases from the next update().
    this.chapterSoften = 0;
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

  /** Apply control values to the material. Exposed for tests; update() calls it every frame.
   *  The manual and chapter-driven pulls are combined by max. */
  applyControls(ignite: number, audioEnergy = 0): void {
    const soften = Math.max(this.soften, this.chapterSoften);
    this.material.size = BASE_SIZE * (1 + soften * 0.6) * (1 + audioEnergy * 1.5);
    const focus = 1 - soften * 0.65;
    this.material.opacity = BASE_OPACITY * ignite * focus * (1 - this.fade) * (0.75 + audioEnergy * 0.5);
  }

  update(ctx: FrameContext): void {
    if (!this.points) return;
    // Chapter 02 owns the focus pull. Eased (tau ~0.33s) so a flick through Approach
    // blurs and recovers rather than strobing.
    const target = approachSoften(ctx.voyage.chapter.id, ctx.voyage.chapterProgress);
    this.chapterSoften += (target - this.chapterSoften) * Math.min(1, ctx.dt * 3);
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
