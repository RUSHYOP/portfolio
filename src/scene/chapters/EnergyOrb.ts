import * as THREE from "three";
import { STAR_POSITION, starScale } from "@/scene/camera/flightPath";
import type { Tier } from "@/scene/quality";
import type { FrameContext, SetPiece } from "./types";

export const AMBER = 0xf2b35c;

/** Sprite scale of the additive glow, in orb radii. Shared by build() and update(). */
const GLOW_SCALE = 4.2;

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
    vec3 body = mix(uColor * 0.55, uColor * 1.35, n);
    // Glare blows out toward white but keeps uColor as the only chroma in the orb.
    vec3 col = body + fresnel * uColor * 1.6 + uGlare * mix(vec3(1.0), uColor, 0.35);
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
  private scene: THREE.Scene | null = null;
  private glare = 0;

  /** The scene object, exposed read-only for tests and debug overlays. */
  get object(): THREE.Group | null {
    return this.group;
  }

  build(scene: THREE.Scene, _tier: Tier): void {
    // An unpaired second build() would leak the previous Group into the scene.
    if (this.group) this.dispose();
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
    const s = starScale(ctx.voyage.progress) * ctx.ignite;
    this.group.scale.setScalar(Math.max(0.001, s));
    this.material.uniforms.uTime.value = ctx.t;
    this.material.uniforms.uGlare.value = this.glare;
    if (this.glow) {
      // A Sprite is a billboarded quad; z stays 1 so only its width/height breathe.
      const g = GLOW_SCALE * (1 + ctx.audioEnergy * 0.4) * (1 + this.glare * 2);
      this.glow.scale.set(g, g, 1);
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
    this.group = null;
    this.scene = null;
  }
}
