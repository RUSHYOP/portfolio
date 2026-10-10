import * as THREE from "three";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import { mulberry32 } from "@/scene/prng";
import type { FrameContext, SetPiece } from "./types";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function streakLength(velocity01: number): number {
  return 0.2 + (5 - 0.2) * clamp01(velocity01);
}

export function streakOpacity(velocity01: number): number {
  return 0.0 + 0.2 * clamp01(velocity01);
}

/** Fixed PRNG seed: the at-rest frame must be identical on every load (screenshot baseline)
 *  and after a rebuild, so build() and the field initializer must not drift apart. */
const STREAK_SEED = 4242;

const RADIUS = 30;
const AHEAD = 150;   // streaks live from camera.z - 5 down to camera.z - AHEAD
const BEHIND = 5;

/**
 * Monochrome line streaks parallel to -z. Length and opacity follow scroll velocity;
 * streaks that fall behind the camera are recycled ahead of it.
 * Reference: ThreeUI "Warp Field" (MIT, github.com/MengTo/threeui) — re-implemented, not imported.
 */
export class WarpStreaks implements SetPiece {
  // Allocated per build() so a rebuild never reuses a disposed geometry.
  private _geometry: THREE.BufferGeometry | null = null;
  /** Exposed read-only for tests and debug overlays (opacity is the velocity readout). */
  readonly material = new THREE.LineBasicMaterial({
    color: 0xc9c3b9,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private lines: THREE.LineSegments | null = null;
  private heads: Float32Array = new Float32Array(0); // x,y,z per streak
  private positions: Float32Array = new Float32Array(0);
  private scene: THREE.Scene | null = null;
  private length = streakLength(0);
  private presence = 0;
  // Re-created in build() so a rebuild reproduces exactly the same layout.
  private rand: () => number = mulberry32(STREAK_SEED);

  /** The live geometry. Reading it before build() is a programming error, not a null case. */
  get geometry(): THREE.BufferGeometry {
    if (!this._geometry) throw new Error("WarpStreaks.geometry read before build()");
    return this._geometry;
  }

  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.LineSegments | null {
    return this.lines;
  }

  get count(): number {
    return this.heads.length / 3;
  }

  build(scene: THREE.Scene, tier: Tier): void {
    // An unpaired second build() would leak the previous LineSegments into the scene.
    if (this.lines) this.dispose();
    const n = TIER_SETTINGS[tier].streakCount;
    this.heads = new Float32Array(n * 3);
    this.positions = new Float32Array(n * 6);
    this.length = streakLength(0);
    this.presence = 0;
    this.rand = mulberry32(STREAK_SEED);
    // Heads are placed in the corridor ahead of the origin: the flight starts at
    // CAMERA_WAYPOINTS[0] (0,0,0), and update() recycles camera-relative from there on.
    for (let i = 0; i < n; i++) {
      const r = RADIUS * (0.25 + 0.75 * Math.sqrt(this.rand()));
      const a = this.rand() * Math.PI * 2;
      this.heads[i * 3 + 0] = Math.cos(a) * r;
      this.heads[i * 3 + 1] = Math.sin(a) * r;
      this.heads[i * 3 + 2] = -this.rand() * AHEAD;
    }
    this.writePositions();
    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    // A dark far endpoint fades additively into the sky; seeded per-line brightness
    // and length variation avoids a uniform radial diagram.
    const colors = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const brightness = .35 + this.rand() * .65;
      colors.set([0, 0, 0, brightness, brightness, brightness], i * 6);
    }
    this._geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.lines = new THREE.LineSegments(this._geometry, this.material);
    this.lines.frustumCulled = false;
    this.scene = scene;
    scene.add(this.lines);
  }

  /** `converge` 0..1 pulls the head (far end, most negative z) toward the flight axis while
   *  the tail keeps its full radius. build() always writes with 0, so the seeded layout
   *  assertions compare like with like. */
  private writePositions(converge = 0): void {
    const n = this.count;
    const k = 1 - converge;
    for (let i = 0; i < n; i++) {
      const x = this.heads[i * 3], y = this.heads[i * 3 + 1], z = this.heads[i * 3 + 2];
      this.positions[i * 6 + 0] = x * k; this.positions[i * 6 + 1] = y * k; this.positions[i * 6 + 2] = z;
      this.positions[i * 6 + 3] = x; this.positions[i * 6 + 4] = y; this.positions[i * 6 + 5] = z + this.length * (.45 + (i % 7) / 12);
    }
  }

  update(ctx: FrameContext): void {
    if (!this.lines || !this._geometry) return;
    const v = ctx.voyage.programmatic ? 0 : ctx.voyage.velocity;
    const blend = 1 - Math.exp(-Math.max(0, ctx.dt) * 18);
    this.length += (streakLength(v) - this.length) * blend;
    this.presence += (streakOpacity(v) - this.presence) * blend;
    if (ctx.voyage.programmatic) this.presence = 0;
    this.material.opacity = this.presence * ctx.ignite;
    const camZ = ctx.camera.position.z;
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const zi = i * 3 + 2;
      if (this.heads[zi] > camZ + BEHIND) this.heads[zi] = camZ - AHEAD + this.rand() * 10;
      if (this.heads[zi] < camZ - AHEAD - 20) this.heads[zi] = camZ - this.rand() * AHEAD;
    }
    this.writePositions();
    (this._geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    if (this.lines && this.scene) this.scene.remove(this.lines);
    this._geometry?.dispose();
    this._geometry = null;
    this.material.dispose();
    this.lines = null;
    this.scene = null;
  }
}
