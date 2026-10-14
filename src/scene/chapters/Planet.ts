/*
 * Chapter 05's set piece: one planet per published case study, each carried across the frame
 * while its case panel is read.
 *
 * Surface shader — attribution. Taken from the "julian-vance-nebula" shader in MengTo/threeui
 * (src/shaders/neuform-isolated/sources/julian-vance-nebula.html, MIT,
 * https://github.com/MengTo/threeui): the fBm constants (four octaves, start amplitude 0.55,
 * gain 0.5, lacunarity 2.05) and the idea of a domain warp — offsetting the sample point by fBm
 * of itself. The warp here is NOT the source's: that one adds two fBm calls scaled by 0.35 to a
 * 2D point; this adds three, centred on their mean (value noise is not zero-mean) and scaled by
 * 0.7, to a 3D point. Not taken: the noise primitive (the source is 2D, screen-space simplex;
 * this is the 3D value noise EnergyOrb already uses, with EnergyOrb's per-octave `+ vec3(1.7)`
 * shift, sampled on the sphere's object-space direction so there is no UV seam or pole pinch).
 * Re-implemented against three@0.169; no source text was copied.
 */
import * as THREE from "three";
import { STAR_POSITION, FOV_MIN, getCameraPose, progressAt, type CameraPose, type ChapterId } from "@/scene/camera/flightPath";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import { toPlanetFeature, type PlanetFeature } from "@/lib/planetFeature";
import { AMBER } from "./EnergyOrb";
import { WORLDS_PRESENCE_END, caseCentre, caseTarget } from "./worldsSchedule";
import type { FrameContext, SetPiece } from "./types";

const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));
const smooth = (t: number) => t * t * (3 - 2 * t);

/* ---- Browser-review tunables (spec §3). Exported so the review can retune a value without
 * touching any logic below. ---- */

/** World-space radius of a planet: ~95 px at 1440x900, ~21% of the viewport height. Slice-5
 *  browser review: 2.5 (~110 px) out-weighed the star and pushed the ring into its halo. */
export const PLANET_RADIUS = 2.2;

/** Camera-space depth (along the view axis) at which a planet is placed at its slot centre. It
 *  sits in front of the star (25-37 units away there), so it occludes the star's halo. Smaller
 *  depths move the planet more across the frame but bring it within 3 units of the camera later
 *  in the voyage (the clearance test pins >= PLANET_RADIUS + 3 while visible). */
export const PLANET_DEPTH = 18;

/** Where a planet projects at the centre of its slot, in NDC (x right, y up). Landscape: centre-
 *  right, clear of the left panel and the star disc (x >= 0.40 keeps a 4:3 window clear of it);
 *  portrait: centred below the phone panel (no horizontal offset — the planet's motion there is
 *  vertical). */
// Slice-5 browser review: 0.40 → 0.50. At 0.40 case 1's ring ran into the star's halo at
// 1440x900 and the halo lapped planet 3's limb as the star grows through the chapter.
export const PLANET_TARGET_LANDSCAPE = { x: 0.5, y: -0.05 } as const;
export const PLANET_TARGET_PORTRAIT = { x: 0, y: -0.45 } as const;
/** Slice-5 browser review (F2): a portrait window >= 768 px wide (768x1024, 1024x1366) still gets the
 *  desktop layout, with the panel on the left up to ~half the width, so the phone's centred target
 *  would sit half behind it, and the landscape target (0.5, -0.05) would overlap the star, which sits
 *  near the screen centre at that aspect. Right of centre and low clears both. */
export const PLANET_TARGET_PORTRAIT_WIDE = { x: 0.5, y: -0.55 } as const;

/** Widest viewport (CSS px) that gets the phone layout: matches voyage.css `@media (max-width: 767px)`.
 *  A portrait window of PHONE_MAX_WIDTH + 1 or more is a "wide portrait". */
export const PHONE_MAX_WIDTH = 767;

/** The last planet's fade-out runs from WORLDS_PRESENCE_END to here (like OrbitRing's ringFade),
 *  so a phone, whose pin holds to cp 0.858, still shows it. Clearance holds to this point. */
export const PLANET_FADE_OUT_END = 0.9;

/** Rate (1/s) of the planets' chapter-level fade-IN, a trigger like the panels: a nav, rail or
 *  back-link arrival at `start + 0.001` must land on a complete frame, so the planet cannot wait
 *  for scroll to bring it in. 8 reaches 95 % in ~0.37 s at 60 fps (a test pins <= 0.5 s). */
export const PLANET_FADE_IN_RATE = 8;

/** Rate (1/s) at which a planet whose case is NOT lit eases to 0 (F1: the swap is a timed trigger, not
 *  scroll-scrubbed, so no scroll position can rest on two half-faded planets). 20 drops it below
 *  PLANET_SWAP_CLEAR in ~0.17 s at 60 fps. */
export const PLANET_SWAP_OUT_RATE = 20;

/** Rate (1/s) at which the planet whose case IS lit eases in, once every other planet is clear.
 *  8 reaches 95 % in ~0.35 s, so a whole swap lands in ~0.5 s at 60 fps (outgoing 0.17 + incoming 0.35). */
export const PLANET_SWAP_IN_RATE = 8;

/** Swap level (0..1) below which an outgoing planet counts as gone: the incoming planet waits for it, so
 *  no frame shows two planets above this opacity (the panels' staged 0.16 s / 0.32 s, as a follower). */
export const PLANET_SWAP_CLEAR = 0.02;

/** Ring (feature `ring`): inner / outer radius in planet radii, how far its plane is inclined
 *  toward the camera (radians) and its roll about the view axis. Additive grey. */
export const PLANET_RING_INNER = 1.4;
export const PLANET_RING_OUTER = 1.75;
export const PLANET_RING_INCLINE = (24 * Math.PI) / 180;
export const PLANET_RING_ROLL = (-16 * Math.PI) / 180;
export const PLANET_RING_OPACITY = 0.4;

/** Moon (feature `moon`): radius and orbit radius in planet radii, orbit-plane tilt and roll
 *  (radians) and angular speed (rad/s). Ambient motion off the scene clock — not scroll, and
 *  never in `still`. The roll stands the orbit's long axis nearly upright so the moon never
 *  swings left across the star (the star sits ~2 planet radii to the planet's left). */
export const MOON_RADIUS = 0.28;
export const MOON_ORBIT = 2.1;
export const MOON_TILT = (30 * Math.PI) / 180;
export const MOON_ROLL = (72 * Math.PI) / 180;
export const MOON_SPEED = 0.35;

/** Floor of the surface brightness on the night side, 0..1: the star lights a planet from behind
 *  and to the left, so most of the visible face is unlit and would otherwise be pure black. */
export const PLANET_NIGHT_FLOOR = 0.12;

/** Phase (radians) between the moons of different planets, so no two share an angle. */
const MOON_PHASE_STEP = 2.1;

/** Aspect the planets are first placed at, before the camera's real aspect is known. */
const DEFAULT_ASPECT = 16 / 10;

/** The NDC target for a viewport: landscape from aspect 1 up (and for NaN), the wide-portrait target
 *  below it when the window is >= 768 px wide (desktop layout, panel on the left), the phone's
 *  centred portrait target otherwise. */
export function planetTarget(aspect: number, wide = false): { readonly x: number; readonly y: number } {
  if (!(aspect < 1)) return PLANET_TARGET_LANDSCAPE;                 // aspect >= 1, and NaN as before
  return wide ? PLANET_TARGET_PORTRAIT_WIDE : PLANET_TARGET_PORTRAIT;
}

// Scratch objects for planetPosition: it runs on an aspect change, never per frame.
const UP = new THREE.Vector3(0, 1, 0);
const scratchPose: CameraPose = { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
const scratchFwd = new THREE.Vector3();
const scratchRight = new THREE.Vector3();
const scratchUp = new THREE.Vector3();

/**
 * World position of planet `k` of `n` for a viewport `aspect` (`wide`: >= 768 px, see planetTarget): the camera pose at the centre of
 * the planet's slot, plus the camera basis x (an offset derived from the NDC target and
 * PLANET_DEPTH). By construction the planet projects exactly onto the target at that scroll
 * position (at the base FOV, 60 degrees; wider FOV while the reader flicks pulls it toward the
 * centre), and real camera motion carries it across the frame either side of it.
 */
export function planetPosition(k: number, n: number, aspect: number, out: THREE.Vector3 = new THREE.Vector3(), wide = false): THREE.Vector3 {
  getCameraPose(progressAt("worlds", caseCentre(k, n)), scratchPose);
  // The basis Object3D.lookAt gives a camera: right = forward x up, up' = right x forward.
  scratchFwd.subVectors(scratchPose.lookAt, scratchPose.position).normalize();
  scratchRight.crossVectors(scratchFwd, UP).normalize();
  scratchUp.crossVectors(scratchRight, scratchFwd);
  const target = planetTarget(aspect, wide);
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(FOV_MIN) / 2) * PLANET_DEPTH;
  return out
    .copy(scratchPose.position)
    .addScaledVector(scratchFwd, PLANET_DEPTH)
    .addScaledVector(scratchRight, target.x * halfHeight * aspect)
    .addScaledVector(scratchUp, target.y * halfHeight);
}

/**
 * The 0/1 TARGET of the planets' chapter-level fade-in: 1 for any chapterProgress past 0 inside
 * Worlds, 0 at its first frame and everywhere else. Planet.update eases a private follower toward
 * it with dt (never scroll), exactly as the panels' CSS transition eases caseTarget, so an arrival
 * at start + 0.001 shows the planet within ~0.4 s instead of waiting for 18vh of scroll.
 */
export function planetPresenceTarget(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "worlds") return 0;
  return clamp01(chapterProgress) > 0 ? 1 : 0;
}

/**
 * 0..1 SCROLL-SCRUBBED fade-out of the planets: 0 outside Worlds, 1 through the window and its
 * edge margin, then the LAST planet's long fade to PLANET_FADE_OUT_END (the schedule's own
 * presence ends at 0.77, but a phone's pin holds the last case to 0.858). The camera flies through
 * this region in the chapters that follow, so it is 0 from PLANET_FADE_OUT_END on — hiding the
 * planet there is load-bearing (the clearance test only covers the visible interval).
 */
export function planetFadeOut(chapterId: ChapterId, chapterProgress: number): number {
  if (chapterId !== "worlds") return 0;
  const t = clamp01(chapterProgress);
  if (t >= PLANET_FADE_OUT_END) return 0;
  if (t <= WORLDS_PRESENCE_END) return 1;
  return smooth(1 - (t - WORLDS_PRESENCE_END) / (PLANET_FADE_OUT_END - WORLDS_PRESENCE_END));
}

/** SETTLED opacity of planet `k` of `n` (every follower at its target, before the ignition curtain):
 *  presence target x scrubbed fade-out x the 0/1 caseTarget the panels use. Planet.update does not
 *  scrub this: it eases a per-planet `swap` toward caseTarget with dt and multiplies the live follower
 *  in. Tests and the clearance sweep read this pure steady-state value. */
export function planetOpacity(chapterId: ChapterId, chapterProgress: number, k: number, n: number): number {
  const fade = planetPresenceTarget(chapterId, chapterProgress) * planetFadeOut(chapterId, chapterProgress);
  if (fade <= 0) return 0;
  return fade * caseTarget(k, n, chapterProgress);
}

/** SceneRoot's GL effect depends on this string, never on the `planets` array's identity: a new
 *  array every render would otherwise rebuild the WebGL context. `[]` is "" and `["none"]` is
 *  "none", so an empty list and a one-planet list never collide. */
export function planetsKey(features: readonly PlanetFeature[]): string {
  return features.join(",");
}

/** The inverse of planetsKey; anything that is not a known feature reads as `none`. */
export function planetsFromKey(key: string): PlanetFeature[] {
  return key === "" ? [] : key.split(",").map(toPlanetFeature);
}

const VERT = /* glsl */ `
  varying vec3 vObjDir;
  varying vec3 vWorldNormal;
  void main() {
    // The object-space direction drives the noise: a sphere has no UV seam to hide.
    vObjDir = normalize(position);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uSeed;
  uniform vec3 uLightDir;
  uniform vec3 uAmber;
  uniform float uStorm;
  uniform float uOpacity;
  varying vec3 vObjDir;
  varying vec3 vWorldNormal;

  // 3D value noise + fbm (the same idiom as EnergyOrb), with the nebula's constants.
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.55;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.05 + vec3(1.7); a *= 0.5; }
    return v;
  }

  void main() {
    vec3 p = vObjDir * 2.2 + uSeed;
    // Domain warp: the nebula's idiom, centred because value noise is not zero-mean.
    vec3 w = vec3(fbm(p + vec3(0.0, 3.1, 1.3)), fbm(p - vec3(2.7, 0.0, 4.2)), fbm(p + vec3(5.5, 1.9, 0.0)));
    p += (w - 0.52) * 0.7;
    float tone = smoothstep(0.22, 0.8, fbm(p));

    // Storm: a brighter, more turbulent latitude band (a uniform, not extra geometry).
    float lat = vObjDir.y;
    float d = (lat - 0.22) / 0.13;
    float band = exp(-d * d);
    float turb = 0.0;
    // A uniform branch: only a storm planet pays for the three extra fBm calls.
    if (uStorm > 0.5) {
      vec3 sp = vec3(vObjDir.x * 3.5, lat * 9.0, vObjDir.z * 3.5) + uSeed;
      turb = fbm(sp + 1.8 * vec3(fbm(sp * 1.7), fbm(sp * 1.7 + 4.1), 0.0));
      tone = mix(tone, clamp(tone * 0.55 + turb * 0.95 + 0.15, 0.0, 1.0), uStorm * band);
      tone = clamp(tone + uStorm * band * 0.2, 0.0, 1.0);
    }

    // Lit by the direction to the star: a dark night side and a narrow amber terminator band.
    float ndl = dot(normalize(vWorldNormal), normalize(uLightDir));
    float day = smoothstep(-0.02, 0.5, ndl);
    float e = ndl / 0.075;
    float terminator = exp(-e * e);
    vec3 col = vec3(tone) * (${PLANET_NIGHT_FLOOR.toFixed(3)} + (1.0 - ${PLANET_NIGHT_FLOOR.toFixed(3)}) * day) * 0.9;
    // The storm band glows a little on its own, so it still reads on the unlit face.
    col += vec3(uStorm * band * (0.10 + 0.22 * turb));
    col += uAmber * terminator * (0.25 + 0.75 * tone) * 0.55;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/** Exposed read-only for tests and debug overlays. */
export interface PlanetView {
  readonly feature: PlanetFeature;
  /** Positioned at the planet's world position; hidden while the planet's opacity is 0. */
  readonly group: THREE.Group;
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  readonly material: THREE.ShaderMaterial;
  /** Present for feature `ring` only. */
  readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null;
  /** Present for feature `moon` only: the orbit pivot and the moon on it. */
  readonly moon: { readonly pivot: THREE.Group; readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> } | null;
}

/** A deterministic seed per planet: no two surfaces match, and a reload never reshuffles them. */
const seedFor = (k: number, salt: number) =>
  new THREE.Vector3(Math.sin((k + 1) * 12.9898 + salt) * 43.7585, Math.sin((k + 1) * 78.233 + salt) * 24.1431, Math.sin((k + 1) * 37.719 + salt) * 31.6027);

function surfaceMaterial(seed: THREE.Vector3, storm: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    uniforms: {
      uSeed: { value: seed },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
      uAmber: { value: new THREE.Color(AMBER) },
      uStorm: { value: storm },
      uOpacity: { value: 0 },
    },
  });
}

/**
 * Owns every planet of chapter 05 (one Group each), the way OrbitRing owns its nodes, so
 * SceneRoot gains ONE piece. Everything is allocated in build(); update() only writes scalars
 * and, when the camera's aspect changes, re-places the N planets (no rebuild, no per-frame
 * allocation). Unknown features build as `none`; no cases, or the `still` tier, build an empty
 * hidden group with no GPU resources.
 */
export class Planet implements SetPiece {
  /** Sanitised, in CMS order: one entry per planet. */
  readonly features: readonly PlanetFeature[];
  private group: THREE.Group | null = null;
  private views: PlanetView[] = [];
  private sphereGeometry: THREE.SphereGeometry | null = null;
  private ringGeometry: THREE.RingGeometry | null = null;
  private ringMaterials: THREE.MeshBasicMaterial[] = [];
  private scene: THREE.Scene | null = null;
  private aspect = Number.NaN;
  /** The `wide` flag the planets were last placed for (F2): a flip at a constant aspect re-places. */
  private wide = false;
  /** The dt-eased chapter-level fade-in (0..1): eased toward planetPresenceTarget every frame. */
  private shown = 0;
  /** F1: per-planet dt-eased swap followers (0..1), preallocated in build(); the planet's own 0/1 target
   *  is caseTarget. Float64 so a step of 1 lands exactly on the target. */
  private swap = new Float64Array(0);
  private readonly scratch = new THREE.Vector3();

  constructor(features: readonly PlanetFeature[]) {
    this.features = features.map(toPlanetFeature);
  }

  get count(): number {
    return this.features.length;
  }
  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.Group | null {
    return this.group;
  }
  get planets(): readonly PlanetView[] {
    return this.views;
  }
  /** The per-planet swap followers, exposed read-only for tests and debug overlays. */
  get swaps(): ArrayLike<number> {
    return this.swap;
  }

  build(scene: THREE.Scene, tier: Tier): void {
    // An unpaired second build() would leak the previous Group into the scene.
    if (this.group) this.dispose();
    this.group = new THREE.Group();
    this.group.visible = false;
    const segments = TIER_SETTINGS[tier].planetSegments;
    if (this.features.length > 0 && segments > 0) {
      this.sphereGeometry = new THREE.SphereGeometry(1, segments, Math.max(8, segments >> 1));
      if (this.features.includes("ring")) {
        this.ringGeometry = new THREE.RingGeometry(PLANET_RING_INNER, PLANET_RING_OUTER, Math.max(32, segments));
      }
      this.features.forEach((feature, k) => this.views.push(this.buildPlanet(feature, k)));
      this.swap = new Float64Array(this.views.length);                // F1: once, never per frame
      this.place(DEFAULT_ASPECT);
    }
    this.scene = scene;
    scene.add(this.group);
  }

  private buildPlanet(feature: PlanetFeature, k: number): PlanetView {
    const group = new THREE.Group();
    group.visible = false;
    const material = surfaceMaterial(seedFor(k, 0), feature === "storm" ? 1 : 0);
    const mesh = new THREE.Mesh(this.sphereGeometry!, material);
    mesh.scale.setScalar(PLANET_RADIUS);
    group.add(mesh);

    let ring: PlanetView["ring"] = null;
    if (feature === "ring" && this.ringGeometry) {
      // Additive grey, depth-tested against the sphere (the planet writes depth) so the far
      // half of the ring passes behind it. Drawn after the sphere at equal distance.
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      this.ringMaterials.push(ringMaterial);
      ring = new THREE.Mesh(this.ringGeometry, ringMaterial);
      ring.scale.setScalar(PLANET_RADIUS);
      // RingGeometry lies in its local XY plane facing +z; lay it flat, then incline it toward the camera.
      ring.rotation.x = -Math.PI / 2 + PLANET_RING_INCLINE;
      ring.renderOrder = 1;
      const roll = new THREE.Group();
      roll.rotation.z = PLANET_RING_ROLL;
      roll.add(ring);
      group.add(roll);
    }

    let moon: PlanetView["moon"] = null;
    if (feature === "moon") {
      const tilt = new THREE.Group();
      tilt.rotation.set(MOON_TILT, 0, MOON_ROLL);
      const pivot = new THREE.Group();
      pivot.rotation.y = k * MOON_PHASE_STEP;
      const moonMesh = new THREE.Mesh(this.sphereGeometry!, surfaceMaterial(seedFor(k, 5.5), 0));
      moonMesh.scale.setScalar(PLANET_RADIUS * MOON_RADIUS);
      moonMesh.position.set(PLANET_RADIUS * MOON_ORBIT, 0, 0);
      pivot.add(moonMesh);
      tilt.add(pivot);
      group.add(tilt);
      moon = { pivot, mesh: moonMesh };
    }

    this.group!.add(group);
    return { feature, group, mesh, material, ring, moon };
  }

  /** Positions every planet for `aspect` / `wide` and points each surface's light at the star. */
  private place(aspect: number, wide = false): void {
    this.aspect = aspect;
    this.wide = wide;
    const n = this.views.length;
    this.views.forEach((view, k) => {
      planetPosition(k, n, aspect, view.group.position, wide);
      const light = this.scratch.copy(STAR_POSITION).sub(view.group.position).normalize();
      (view.material.uniforms.uLightDir.value as THREE.Vector3).copy(light);
      if (view.moon) (view.moon.mesh.material.uniforms.uLightDir.value as THREE.Vector3).copy(light);
    });
  }

  update(ctx: FrameContext): void {
    // SceneRoot may tick before the build lands; an empty set has nothing to drive.
    if (!this.group || this.views.length === 0) return;
    const { chapter, chapterProgress } = ctx.voyage;
    // The follower runs BEFORE the visibility early-out so it keeps settling while hidden. A step
    // is clamped to 1 (a resumed tab's long dt lands on the target, never past it); a non-finite
    // or non-positive dt is a zero step, so NaN can never reach a uniform.
    const step = ctx.dt > 0 ? Math.min(1, ctx.dt * PLANET_FADE_IN_RATE) : 0;
    const wasHidden = this.shown < 0.01;                              // F1: judged BEFORE this frame's fade-in step
    this.shown += (planetPresenceTarget(chapter.id, chapterProgress) - this.shown) * step;
    this.stepSwap(chapter.id, chapterProgress, ctx.dt, wasHidden);
    const fade = this.shown * planetFadeOut(chapter.id, chapterProgress);
    this.group.visible = fade > 0.001;
    if (!this.group.visible) return;
    const aspect = ctx.camera.aspect;
    // F2: `wide` from the CSS-px width (undefined / NaN read as not wide); re-place on an aspect OR wide change.
    const wide = ctx.viewportWidth !== undefined && ctx.viewportWidth > PHONE_MAX_WIDTH;
    if (Number.isFinite(aspect) && aspect > 0 && (aspect !== this.aspect || wide !== this.wide)) this.place(aspect, wide);
    const n = this.views.length;
    for (let k = 0; k < n; k++) {
      const view = this.views[k];
      const opacity = fade * this.swap[k] * ctx.ignite;
      view.group.visible = opacity > 0.001;
      if (!view.group.visible) continue;
      view.material.uniforms.uOpacity.value = opacity;
      if (view.ring) view.ring.material.opacity = PLANET_RING_OPACITY * opacity;
      if (view.moon) {
        view.moon.mesh.material.uniforms.uOpacity.value = opacity;
        view.moon.pivot.rotation.y = k * MOON_PHASE_STEP + ctx.t * MOON_SPEED;
      }
    }
  }

  /**
   * F1: eases every planet's `swap` toward its 0/1 target (caseTarget while in Worlds, else 0) with dt,
   * staged like the panels: planets whose target is 0 ease out first; the lit planet eases in only once
   * every other swap is below PLANET_SWAP_CLEAR, so no frame shows two planets. While the whole group is
   * hidden (`shown` ~ 0 before this frame's step) the swaps snap to their targets, so an arrival lands on the lit planet with no
   * extra delay. dt is handled as the fade-in follower does: non-finite or <= 0 is no step, a huge dt
   * lands on the target. Allocation-free.
   */
  private stepSwap(chapterId: ChapterId, chapterProgress: number, dt: number, snap: boolean): void {
    const n = this.views.length;
    const outStep = dt > 0 ? Math.min(1, dt * PLANET_SWAP_OUT_RATE) : 0;
    let lit = -1;
    for (let k = 0; k < n; k++) {
      const target = chapterId === "worlds" ? caseTarget(k, n, chapterProgress) : 0;
      if (snap) this.swap[k] = target;
      else if (target === 1) lit = k;
      else this.swap[k] -= this.swap[k] * outStep;
    }
    if (snap || lit < 0) return;
    for (let k = 0; k < n; k++) if (k !== lit && this.swap[k] >= PLANET_SWAP_CLEAR) return;   // hold: the stage
    const inStep = dt > 0 ? Math.min(1, dt * PLANET_SWAP_IN_RATE) : 0;
    this.swap[lit] += (1 - this.swap[lit]) * inStep;
  }

  dispose(): void {
    if (this.group && this.scene) this.scene.remove(this.group);
    this.sphereGeometry?.dispose();
    this.ringGeometry?.dispose();
    for (const view of this.views) {
      view.material.dispose();
      view.moon?.mesh.material.dispose();
    }
    for (const m of this.ringMaterials) m.dispose();
    this.sphereGeometry = null;
    this.ringGeometry = null;
    this.ringMaterials = [];
    this.views = [];
    this.group = null;
    this.scene = null;
    this.aspect = Number.NaN;
    this.wide = false;
    this.swap = new Float64Array(0);
    this.shown = 0;
  }
}
