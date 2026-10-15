import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { EnergyOrb, jumpGlare, orbitLimb } from "./EnergyOrb";
import { STAR_POSITION, starScale, progressAt } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

describe("EnergyOrb", () => {
  it("builds at STAR_POSITION with no glow sprite outside a document", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    // node env: the CanvasTexture guard skips the sprite, so the mesh is the only child.
    expect(orb.object?.children).toHaveLength(1);
    expect(orb.object?.position.equals(STAR_POSITION)).toBe(true);
    orb.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("update() scales the group by starScale(progress) and is a no-op before build()", () => {
    const orb = new EnergyOrb();
    // update() before build() must not throw — SceneRoot may tick before the build lands.
    expect(() => orb.update(makeFrame())).not.toThrow();

    const scene = new THREE.Scene();
    orb.build(scene, "mid");
    orb.update(makeFrame());
    expect(starScale(0)).toBeCloseTo(0.25, 5);
    expect(orb.object?.scale.x).toBeCloseTo(starScale(0), 5);
    expect(orb.material.uniforms.uTime.value).toBe(1);
  });

  it("setGlare clamps to 0..1 and reaches the shader on the next update", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    orb.setGlare(2);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBe(1);
    orb.setGlare(-1);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBe(0);
  });

  it("replaces the previous orb when build() is called twice", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    // build() disposes the previous geometry, so the rebuilt mesh must hold a different one.
    const firstGeometry = (orb.object!.children[0] as THREE.Mesh).geometry;
    orb.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(orb.object?.children).toHaveLength(1);
    const secondMesh = orb.object!.children[0];
    expect(secondMesh).toBeInstanceOf(THREE.Mesh);
    expect((secondMesh as THREE.Mesh).geometry).not.toBe(firstGeometry);
    // A rebuild after an explicit dispose must also allocate a fresh geometry, not reuse a disposed one.
    orb.dispose();
    orb.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect((orb.object!.children[0] as THREE.Mesh).geometry).not.toBe(
      (secondMesh as THREE.Mesh).geometry,
    );
    expect(() => orb.dispose()).not.toThrow();
    expect(() => orb.dispose()).not.toThrow();
  });
});

// Slice 3 / Task 4: chapter 03 (Jump) flare — the pure ramp and how update() combines it with setGlare.
describe("jumpGlare", () => {
  it("is zero at both ends of the beat and peaks in the middle", () => {
    expect(jumpGlare(0)).toBeCloseTo(0, 10);
    expect(jumpGlare(1)).toBeCloseTo(0, 10);
    expect(jumpGlare(0.5)).toBeCloseTo(1, 10);
    expect(jumpGlare(0.25)).toBeGreaterThan(0);
    expect(jumpGlare(0.25)).toBeLessThan(1);
  });

  it("clamps outside 0..1 so another chapter's progress cannot flare the star", () => {
    expect(jumpGlare(-1)).toBeCloseTo(0, 10);
    expect(jumpGlare(2)).toBeCloseTo(0, 10);
  });
});

// Slice 4: chapter 04 (Orbit) limb darkening — the pure ramp, then how update() feeds the shader.
describe("orbitLimb", () => {
  it("is 0 in every chapter but Orbit", () => {
    for (const id of ["launch", "approach", "jump", "worlds", "belt", "pilot", "surface"] as const) {
      expect(orbitLimb(progressAt(id, 0.5))).toBe(0);
    }
  });

  it("ramps 0 → 1 over Orbit's first fifth, holds, and ramps back over its last fifth", () => {
    expect(orbitLimb(progressAt("orbit", 0))).toBe(0);
    expect(orbitLimb(progressAt("orbit", 0.1))).toBeGreaterThan(0);
    expect(orbitLimb(progressAt("orbit", 0.1))).toBeLessThan(1);
    for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) expect(orbitLimb(progressAt("orbit", t))).toBeCloseTo(1, 9);
    expect(orbitLimb(progressAt("orbit", 0.9))).toBeGreaterThan(0);
    expect(orbitLimb(progressAt("orbit", 0.9))).toBeLessThan(1);
    expect(orbitLimb(progressAt("orbit", 0.999))).toBeLessThan(1e-4);
    // Worlds starts with a plain star again.
    expect(orbitLimb(progressAt("worlds", 0))).toBe(0);
  });

  it("is symmetric, monotone on both ramps, and always inside 0..1", () => {
    for (const t of [0.02, 0.05, 0.1, 0.15, 0.19]) {
      expect(orbitLimb(progressAt("orbit", t))).toBeCloseTo(orbitLimb(progressAt("orbit", 1 - t)), 9);
    }
    let prev = -1;
    for (let k = 0; k <= 100; k++) {
      const v = orbitLimb(progressAt("orbit", (k / 100) * 0.2));
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    for (let k = 0; k <= 200; k++) {
      const v = orbitLimb(progressAt("orbit", Math.min(0.999, k / 200)));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("treats NaN progress as the voyage start", () => {
    expect(orbitLimb(NaN)).toBe(0);
  });
});

describe("EnergyOrb — chapter 04 limb", () => {
  it("starts at 0 and follows orbitLimb(progress) frame by frame", () => {
    const orb = new EnergyOrb();
    orb.build(new THREE.Scene(), "mid");
    expect(orb.material.uniforms.uLimb.value).toBe(0);
    voyageStore.setScroll(progressAt("orbit", 0.5), 0);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uLimb.value).toBeCloseTo(1, 9);
    voyageStore.setScroll(progressAt("orbit", 0.1), 0);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uLimb.value).toBeCloseTo(orbitLimb(voyageStore.getState().progress), 9);
    voyageStore.setScroll(progressAt("worlds", 0.5), 0);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uLimb.value).toBe(0);
  });

  it("leaves the Jump flare and the Pilot glare alone", () => {
    const orb = new EnergyOrb();
    orb.build(new THREE.Scene(), "mid");
    // Inside Orbit the limb is fully on, and setGlare still reaches the shader untouched.
    voyageStore.setScroll(progressAt("orbit", 0.5), 0);
    orb.setGlare(0.25);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeCloseTo(0.25, 6);
    // Inside the Jump the flare is at peak and the limb is off.
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    orb.setGlare(0);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeGreaterThan(0.99);
    expect(orb.material.uniforms.uLimb.value).toBe(0);
  });
});

describe("EnergyOrb — chapter 03 flare", () => {
  it("drives uGlare from chapterProgress inside the Jump", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    const cp = voyageStore.getState().chapterProgress;
    expect(voyageStore.getState().chapter.id).toBe("jump");
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeCloseTo(jumpGlare(cp), 6);
    expect(orb.material.uniforms.uGlare.value).toBeGreaterThan(0.99);
  });

  it("combines with setGlare by max, so neither driver can cancel the other", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    // chapterProgress 0 → jumpGlare 0, so the manual control wins.
    voyageStore.setScroll(progressAt("jump", 0), 0);
    orb.setGlare(1);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeCloseTo(1, 6);
    // Mid-ramp with two sub-1 drivers: max picks the larger, a sum (clamped or not) does not.
    // At chapterProgress 0.25 the drivers are 0.7071… and 0.2 — max gives 0.7071, a plain sum
    // 0.9071, a clamped sum 0.9071. A probe at the peak could not tell any of them apart.
    voyageStore.setScroll(progressAt("jump", 0.25), 0); // chapterProgress 0.25 → jumpGlare 0.7071067811865451
    orb.setGlare(0.2);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value)
      .toBeCloseTo(jumpGlare(voyageStore.getState().chapterProgress), 6);
  });

  it("leaves every other chapter on setGlare alone", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    voyageStore.setScroll(progressAt("approach", 1 / 6), 0);
    orb.setGlare(0.25);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeCloseTo(0.25, 6);
  });

  it("keeps the burst inside the document guard, so a node build stays a single child", () => {
    // The burst — and therefore its ctx.ignite multiplier — is unreachable under vitest's
    // global `node` environment: makeBurstTexture() calls canvas.getContext("2d"), which is
    // null even under jsdom without the optional `canvas` package. This pins the guard and
    // the frame path around it; the sprite's only regression net is Task 10's p21 captures.
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    expect(() => orb.update(makeFrame({ ignite: 0.5 }))).not.toThrow();
    expect(orb.object?.children).toHaveLength(1);
    // uGlare is deliberately NOT gated by ignite — the burst's opacity is.
    expect(orb.material.uniforms.uGlare.value)
      .toBeCloseTo(jumpGlare(voyageStore.getState().chapterProgress), 6);
  });
});
