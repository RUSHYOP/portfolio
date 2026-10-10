import * as THREE from "three";
import { STAR_POSITION, starScale } from "@/scene/camera/flightPath";
import type { Tier } from "@/scene/quality";
import type { FrameContext, SetPiece } from "./types";

export const AMBER = 0xf2b35c;

/** Sprite scale of the additive glow, in orb radii. Shared by build() and update(). */
const GLOW_SCALE = 4.2;

/** Floor for the glow in *world* units: at launch the orb is 0.25 radii at 140 units away,
 *  so a purely proportional halo is invisible — the destination must read as a warm point
 *  with a halo from frame one. */
const GLOW_MIN = 3.5;

/** World-space width of the additive burst at full flare. */
const BURST_WORLD = 5;

/** Chapter 03's flare ramp over Jump chapterProgress, clamped to this beat. */
export function jumpGlare(t01: number): number {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t01)));
}

/** AMBER as sRGB "r,g,b" bytes for canvas gradient stops. Unpacked from the hex rather than
 *  read off THREE.Color: ColorManagement is on by default in three >= r152, so Color.r/g/b
 *  hold linear-sRGB and would shift 242,179,92 to 226,115,27 in an sRGB canvas. */
const AMBER_RGB = `${(AMBER >> 16) & 255},${(AMBER >> 8) & 255},${AMBER & 255}`;

const VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uGlare;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vView;

  // compact 3D value noise + 4-octave fbm
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.02 + vec3(1.7); a *= 0.5; }
    return v;
  }

  void main() {
    vec3 p = normalize(vPos);
    float n = fbm(p * 2.5 + vec3(0.0, uTime * 0.05, uTime * 0.03));
    n = n * 0.6 + fbm(p * 6.0 - uTime * 0.08) * 0.4;
    float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
    vec3 body = mix(uColor * 0.5, uColor * 1.1, n);
    // Keep the destination amber even under acceleration.
    vec3 col = body + fresnel * uColor * 1.0 + uGlare * uColor * 0.25;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${AMBER_RGB},0.9)`);
  grad.addColorStop(0.35, `rgba(${AMBER_RGB},0.35)`);
  grad.addColorStop(1, `rgba(${AMBER_RGB},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft amber accent during movement. Browser-only, like the glow. */
function makeBurstTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${AMBER_RGB},0.45)`);
  grad.addColorStop(0.18, `rgba(${AMBER_RGB},0.75)`);
  grad.addColorStop(1, `rgba(${AMBER_RGB},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The amber star at STAR_POSITION: an FBM-shaded sphere with a fresnel rim and an
 * additive glow sprite. Scale follows starScale(progress); glare is a 0..1 control
 * used by The Pilot (slice 7).
 * Reference: ThreeUI "Energy Orb" (MIT, github.com/MengTo/threeui) — re-implemented, not imported.
 */
export class EnergyOrb implements SetPiece {
  // Group, mesh and geometry are allocated per build() so a rebuild neither stacks a
  // second sphere in the group nor reuses a disposed geometry.
  private group: THREE.Group | null = null;
  private geometry: THREE.SphereGeometry | null = null;
  /** Exposed read-only for tests and debug overlays (uTime / uGlare are the live controls). */
  readonly material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(AMBER) },
      uGlare: { value: 0 },
    },
  });
  private glowMaterial: THREE.SpriteMaterial | null = null;
  private glow: THREE.Sprite | null = null;
  private burstMaterial: THREE.SpriteMaterial | null = null;
  private burst: THREE.Sprite | null = null;
  private scene: THREE.Scene | null = null;
  private glare = 0;
  private jumpEnergy = 0;
  private readonly cameraSpace = new THREE.Vector3();
  private readonly framedPosition = new THREE.Vector3();

  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.Group | null {
    return this.group;
  }

  build(scene: THREE.Scene, _tier: Tier): void {
    // An unpaired second build() would leak the previous Group into the scene.
    if (this.group) this.dispose();
    this.jumpEnergy = 0;
    this.group = new THREE.Group();
    this.geometry = new THREE.SphereGeometry(1, 48, 48);
    this.group.add(new THREE.Mesh(this.geometry, this.material));
    if (typeof document !== "undefined") {
      this.glowMaterial = new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.glow = new THREE.Sprite(this.glowMaterial);
      this.glow.scale.set(GLOW_SCALE, GLOW_SCALE, 1);
      this.group.add(this.glow);
      this.burstMaterial = new THREE.SpriteMaterial({
        map: makeBurstTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      this.burst = new THREE.Sprite(this.burstMaterial);
      this.burst.visible = false;
      this.group.add(this.burst);
    }
    this.group.position.copy(STAR_POSITION);
    this.scene = scene;
    scene.add(this.group);
  }

  setGlare(v: number): void {
    this.glare = Math.min(1, Math.max(0, v));
  }

  update(ctx: FrameContext): void {
    // SceneRoot may tick before the build lands.
    if (!this.group) return;
    this.group.position.copy(STAR_POSITION);
    // During Launch keep the destination in the reserved negative space above mobile
    // copy / to the right of desktop copy. Blend back to its world destination in Approach.
    const framing = Math.min(1, Math.max(0, (.2 - ctx.voyage.progress) / .12));
    if (framing > 0) {
      this.cameraSpace.copy(STAR_POSITION).applyMatrix4(ctx.camera.matrixWorldInverse);
      const depth = Math.max(1, -this.cameraSpace.z);
      const halfHeight = depth * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
      this.framedPosition.set(halfHeight * ctx.camera.aspect * .68,
        halfHeight * (ctx.camera.aspect < 1 ? .72 : -.05), -depth).applyMatrix4(ctx.camera.matrixWorld);
      this.group.position.lerp(this.framedPosition, framing);
    }
    // Bound the physical core and halo in projection, including narrow portrait screens.
    this.cameraSpace.copy(this.group.position).applyMatrix4(ctx.camera.matrixWorldInverse);
    const depth = Math.max(.1, -this.cameraSpace.z);
    const viewHeight = 2 * depth * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
    const haloLimit = viewHeight * Math.min(.09, ctx.camera.aspect * .16);
    const s = Math.min(starScale(ctx.voyage.progress), haloLimit / 5) * ctx.ignite;
    const sc = Math.max(0.001, s);
    this.group.scale.setScalar(sc);
    this.material.uniforms.uTime.value = ctx.t;
    // Chapter 03's flare and The Pilot's setGlare combine by max so neither can cancel
    // the other, and setGlare keeps its meaning outside the Jump.
    const target = ctx.voyage.chapter.id === "jump" && !ctx.voyage.programmatic
      ? jumpGlare(ctx.voyage.chapterProgress) * ctx.voyage.velocity * .25 : 0;
    this.jumpEnergy += (target - this.jumpEnergy) * (1 - Math.exp(-Math.max(0, ctx.dt) * 18));
    if (ctx.voyage.programmatic) this.jumpEnergy = 0;
    const jump = this.jumpEnergy;
    const glare = Math.max(this.glare, jump);
    this.material.uniforms.uGlare.value = glare;
    if (this.glow) {
      // The sprite is a child of the scaled group, so its scale is in orb radii: divide the
      // world-space target back out by `sc`. The GLOW_MIN floor fades in with ignite so the
      // halo does not pop in at full size behind the ignition curtain.
      // A Sprite is a billboarded quad; z stays 1 so only its width/height breathe.
      const world = Math.min(haloLimit, Math.max(GLOW_MIN * ctx.ignite, GLOW_SCALE * sc));
      const g = Math.min(haloLimit, world * (1 + ctx.audioEnergy * 0.1) * (1 + glare * .2)) / sc;
      this.glow.scale.set(g, g, 1);
    }
    if (this.burst && this.burstMaterial) {
      // Hidden outside the beat rather than drawn at zero opacity.
      this.burst.visible = jump > 0.001;
      this.burstMaterial.opacity = jump * ctx.ignite;
      const b = Math.min(haloLimit, BURST_WORLD * jump * ctx.ignite) / sc;
      this.burst.scale.set(b, b, 1);
    }
  }

  dispose(): void {
    if (this.group && this.scene) this.scene.remove(this.group);
    this.geometry?.dispose();
    this.geometry = null;
    this.material.dispose();
    this.glowMaterial?.map?.dispose();
    this.glowMaterial?.dispose();
    this.glowMaterial = null;
    this.glow = null;
    this.burstMaterial?.map?.dispose();
    this.burstMaterial?.dispose();
    this.burstMaterial = null;
    this.burst = null;
    this.group = null;
    this.scene = null;
  }
}
