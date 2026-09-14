import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { WarpStreaks, streakLength, streakOpacity } from "./WarpStreaks";
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

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

describe("streak curves", () => {
  it("length and opacity grow with velocity and clamp", () => {
    expect(streakLength(0)).toBeCloseTo(0.4, 5);
    expect(streakLength(1)).toBeCloseTo(14, 5);
    expect(streakLength(2)).toBeCloseTo(14, 5);
    expect(streakLength(0.5)).toBeGreaterThan(streakLength(0.2));
    expect(streakOpacity(0)).toBeCloseTo(0.12, 5);
    expect(streakOpacity(1)).toBeCloseTo(0.65, 5);
    expect(streakOpacity(-1)).toBeCloseTo(0.12, 5);
  });
});

describe("WarpStreaks", () => {
  it("builds tier count as line segments (2 vertices each)", () => {
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "high");
    expect(streaks.count).toBe(TIER_SETTINGS.high.streakCount);
    const pos = streaks.geometry.getAttribute("position") as THREE.BufferAttribute;
    expect(pos.count).toBe(TIER_SETTINGS.high.streakCount * 2);
    streaks.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("replaces the previous streaks when build() is called twice", () => {
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    streaks.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(streaks.object).toBeInstanceOf(THREE.LineSegments);
    expect(streaks.count).toBe(TIER_SETTINGS.mid.streakCount);
    // A rebuild after an explicit dispose must allocate a fresh geometry, not reuse a disposed one.
    streaks.dispose();
    streaks.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(streaks.geometry.getAttribute("position").count).toBe(TIER_SETTINGS.mid.streakCount * 2);
  });

  it("update() drives opacity from velocity and eases the streak length up", () => {
    const streaks = new WarpStreaks();
    // update() before build() must not throw — SceneRoot may tick before the build lands.
    expect(() => streaks.update(frame())).not.toThrow();

    const scene = new THREE.Scene();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.1, 1);
    streaks.update(frame({ voyage: voyageStore.getState() }));

    expect(streaks.material.opacity).toBeCloseTo(streakOpacity(1), 5);
    const pos = streaks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const positions = pos.array as Float32Array;
    const length = positions[5] - positions[2];
    // One frame eases toward the target rather than snapping to it.
    expect(length).toBeGreaterThan(streakLength(0));
    expect(length).toBeLessThan(streakLength(1));
  });

  it("builds an empty but valid field on the still tier", () => {
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "still");
    expect(streaks.count).toBe(0);
    expect(scene.children).toHaveLength(1);
    expect(() => streaks.update(frame())).not.toThrow();
  });

  it("throws a descriptive error when geometry is read before build()", () => {
    const streaks = new WarpStreaks();
    expect(() => streaks.geometry).toThrow(/before build/);
  });
});
