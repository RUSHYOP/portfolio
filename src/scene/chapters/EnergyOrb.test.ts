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

describe("EnergyOrb — chapter 03 flare", () => {
  it("drives uGlare from chapterProgress inside the Jump", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    voyageStore.setScroll(0.21, 0);
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
    voyageStore.setScroll(0.2, 0);
    orb.setGlare(1);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value).toBeCloseTo(1, 6);
    // Mid-ramp with two sub-1 drivers: max picks the larger, a sum (clamped or not) does not.
    // At chapterProgress 0.25 the drivers are 0.7071… and 0.2 — max gives 0.7071, a plain sum
    // 0.9071, a clamped sum 0.9071. A probe at the peak could not tell any of them apart.
    voyageStore.setScroll(0.205, 0); // chapterProgress 0.25 → jumpGlare 0.7071067811865451
    orb.setGlare(0.2);
    orb.update(makeFrame());
    expect(orb.material.uniforms.uGlare.value)
      .toBeCloseTo(jumpGlare(voyageStore.getState().chapterProgress), 6);
  });

  it("leaves every other chapter on setGlare alone", () => {
    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    orb.build(scene, "mid");
    voyageStore.setScroll(0.1, 0);
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
    voyageStore.setScroll(0.21, 0);
    expect(() => orb.update(makeFrame({ ignite: 0.5 }))).not.toThrow();
    expect(orb.object?.children).toHaveLength(1);
    // uGlare is deliberately NOT gated by ignite — the burst's opacity is.
    expect(orb.material.uniforms.uGlare.value)
      .toBeCloseTo(jumpGlare(voyageStore.getState().chapterProgress), 6);
  });

  it("gates burst opacity and scale by ignition", () => {
    const gradient = { addColorStop: vi.fn() };
    const context = {
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      fillStyle: null as CanvasGradient | string | CanvasPattern | null,
    };
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => context),
      })),
    });

    const scene = new THREE.Scene();
    const orb = new EnergyOrb();
    try {
      orb.build(scene, "mid");
      voyageStore.setScroll(0.21, 0);
      const burst = orb.object?.children[2] as THREE.Sprite;

      orb.update(makeFrame({ ignite: 0.5 }));
      expect((burst.material as THREE.SpriteMaterial).opacity).toBeCloseTo(0.5, 6);
      expect(burst.scale.x).toBeGreaterThan(0);

      orb.update(makeFrame({ ignite: 0 }));
      expect((burst.material as THREE.SpriteMaterial).opacity).toBe(0);
      expect(burst.scale.x).toBe(0);
    } finally {
      orb.dispose();
      vi.unstubAllGlobals();
    }
  });
});
