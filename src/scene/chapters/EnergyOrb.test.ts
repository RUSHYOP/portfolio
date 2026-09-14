import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { EnergyOrb } from "./EnergyOrb";
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
