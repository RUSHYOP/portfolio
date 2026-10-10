import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { EnergyOrb, jumpGlare } from "./EnergyOrb";
import { STAR_POSITION, starScale } from "@/scene/camera/flightPath";
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

describe("contained Jump destination", () => {
  it("rests quietly at the midpoint and suppresses programmatic flare", () => {
    const orb = new EnergyOrb(); orb.build(new THREE.Scene(), "mid");
    voyageStore.setScroll(.21, 1);
    for (let i = 0; i < 30; i++) orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeGreaterThan(0);
    voyageStore.setScroll(.21, 0);
    for (let i = 0; i < 24; i++) orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeLessThan(.003);
    orb.update(makeFrame({ voyage: { ...voyageStore.getState(), programmatic: true, velocity: 1 } }));
    expect(orb.material.uniforms.uGlare.value).toBe(0);
    orb.dispose();
  });
  it.each([390 / 844, 1440 / 900])("bounds core and halo in projection at aspect %f", aspect => {
    const gradient = { addColorStop: vi.fn() };
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0,
      getContext: () => ({ createRadialGradient: () => gradient, fillRect: vi.fn(), fillStyle: "" }) }) });
    const orb = new EnergyOrb();
    try {
      orb.build(new THREE.Scene(), "mid");
      const camera = new THREE.PerspectiveCamera(60, aspect);
      camera.position.set(STAR_POSITION.x, STAR_POSITION.y, STAR_POSITION.z + 6);
      camera.updateMatrixWorld();
      voyageStore.setScroll(.21, 1);
      orb.update(makeFrame({ camera, audioEnergy: 1 }));
      const group = orb.object!;
      const viewHeight = 12 * Math.tan(Math.PI / 6);
      for (const sprite of group.children.slice(1)) {
        const projectedHeight = sprite.scale.x * group.scale.x / viewHeight;
        expect(projectedHeight).toBeLessThanOrEqual(Math.min(.09, aspect * .16) + 1e-6);
      }
      expect(2 * group.scale.x / viewHeight).toBeLessThan(.04);
      orb.update(makeFrame({ camera, ignite: 0 }));
      expect((group.children[2] as THREE.Sprite).material.opacity).toBe(0);
    } finally { orb.dispose(); vi.unstubAllGlobals(); }
  });
});
