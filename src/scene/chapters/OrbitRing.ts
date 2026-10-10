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
    const root = new THREE.Group();
    root.name = "orbit-ring";
    root.visible = false;
    const tilt = new THREE.Group();
    tilt.rotation.x = -0.65;
    tilt.rotation.z = 0.15;
    const wheel = new THREE.Group();
    tilt.add(wheel);
    root.add(tilt);
    const segments = tier === "high" ? 128 : 64;
    const torus = new THREE.TorusGeometry(3, 0.012, 6, segments);
    const sphere = new THREE.SphereGeometry(0.09, 12, 8);
    const halo = new THREE.SphereGeometry(0.20, 12, 8);
    this.geometries = [torus, sphere, halo];
    const material = (opacity: number, glow = false) => new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.ringMaterial = material(0.3);
    this.nodeMaterial = material(1);
    this.glowMaterial = material(0.15, true);
    wheel.add(new THREE.Mesh(torus, this.ringMaterial));
    for (let i = 0; i < this.count; i++) {
      // Front-center is the lower, near edge of the tilted circle.
      const angle = -Math.PI / 2 + i * Math.PI * 2 / this.count;
      const node = new THREE.Mesh(sphere, this.nodeMaterial);
      node.name = `orbit-node-${i}`;
      node.position.set(3 * Math.cos(angle), 3 * Math.sin(angle), 0);
      const glow = new THREE.Mesh(halo, this.glowMaterial);
      glow.position.copy(node.position);
      wheel.add(node, glow);
    }
    scene.add(root);
    this.root = root;
    this.wheel = wheel;
  }

  update({ voyage, camera, ignite }: FrameContext) {
    if (!this.root || !this.wheel) return;
    const visible = voyage.chapter.id === "orbit";
    this.root.visible = visible;
    if (!visible) return;
    const p = voyage.chapterProgress;
    const phase = orbitPhase(p, this.count);
    const opacity = Math.min(1, p * (this.count + 1) / 0.15, (1 - p) * (this.count + 1) / 0.4) * ignite;
    this.ringMaterial!.opacity = 0.38 * opacity;
    this.nodeMaterial!.opacity = opacity;
    this.glowMaterial!.opacity = 0.16 * opacity;
    this.wheel.rotation.z = phase.angle;
    const mobile = camera.aspect < 1;
    // Plane sits 15 units in front of the camera; left half on desktop, above copy on mobile.
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 15;
    this.offset.set(mobile ? 0 : -halfHeight * camera.aspect * 0.40, mobile ? halfHeight * 0.48 : 0, -15);
    this.offset.applyQuaternion(camera.quaternion);
    this.root.position.copy(camera.position).add(this.offset);
    this.root.quaternion.copy(camera.quaternion);
    this.root.scale.setScalar(mobile ? Math.min(0.78, halfHeight * camera.aspect * 0.78 / 3.2) : 1.35);
  }

  dispose() {
    this.root?.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    this.ringMaterial?.dispose();
    this.nodeMaterial?.dispose();
    this.glowMaterial?.dispose();
    this.geometries = [];
    this.root = null;
    this.wheel = null;
    this.ringMaterial = null;
    this.nodeMaterial = null;
    this.glowMaterial = null;
  }
}
