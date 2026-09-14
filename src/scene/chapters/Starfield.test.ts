import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { Starfield } from "./Starfield";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import type { FrameContext } from "./types";

/** Minimal one-frame context; per-test overrides go through the partial. */
function frame(over: Partial<FrameContext> = {}): FrameContext {
  return {
    t: 1,
    dt: 1 / 60,
    voyage: voyageStore.getState(),
    camera: new THREE.PerspectiveCamera(),
    audioEnergy: 0,
    ignite: 1,
    ...over,
  };
}

describe("Starfield", () => {
  it("builds the tier's star count spread along the flight corridor", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "mid");
    expect(field.count).toBe(TIER_SETTINGS.mid.starCount);
    expect(scene.children).toHaveLength(1);
    const pos = field.positions;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < pos.length; i += 3) {
      minZ = Math.min(minZ, pos[i + 2]);
      maxZ = Math.max(maxZ, pos[i + 2]);
    }
    expect(minZ).toBeGreaterThanOrEqual(-220);
    expect(maxZ).toBeLessThanOrEqual(20);
    // Stars stay inside the corridor tube, not just its z-span.
    let maxR = 0;
    for (let i = 0; i < pos.length; i += 3) {
      maxR = Math.max(maxR, Math.hypot(pos[i], pos[i + 1]));
    }
    expect(maxR).toBeLessThan(45);
  });

  it("soften enlarges and dims relative to un-softened; fade makes it fully transparent; dispose empties the scene", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "high");
    // Baseline is the un-softened result of the same formula, so soften must move both values.
    field.applyControls(1);
    const baseSize = field.material.size;
    const baseOpacity = field.material.opacity;
    field.setSoften(1);
    field.applyControls(1);
    expect(field.material.size).toBeGreaterThan(baseSize);
    expect(field.material.opacity).toBeLessThan(baseOpacity);
    field.setSoften(0);
    field.setFade(1);
    field.applyControls(1);
    expect(field.material.opacity).toBe(0);
    field.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("update() drives opacity and drift, and is a no-op before build()", () => {
    const field = new Starfield();
    // update() before build() must not throw — SceneRoot may tick before the build lands.
    expect(() => field.update(frame())).not.toThrow();

    const scene = new THREE.Scene();
    field.build(scene, "mid");
    field.update(frame());
    expect(field.material.opacity).toBeGreaterThan(0);
    expect(field.object?.rotation.z).toBeGreaterThan(0);
  });

  it("is deterministic across instances for a given tier", () => {
    const a = new Starfield();
    const b = new Starfield();
    a.build(new THREE.Scene(), "high");
    b.build(new THREE.Scene(), "high");
    expect(a.positions).toEqual(b.positions);
  });

  it("builds an empty but valid field on the still tier", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "still");
    expect(field.count).toBe(0);
    expect(scene.children).toHaveLength(1);
    expect(() => field.update(frame())).not.toThrow();
  });

  it("replaces the previous field when build() is called twice", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "mid");
    field.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(field.count).toBe(TIER_SETTINGS.mid.starCount);
    // A rebuild after an explicit dispose must allocate a fresh geometry, not reuse a disposed one.
    field.dispose();
    field.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(field.count).toBe(TIER_SETTINGS.mid.starCount);
  });
});
