import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { WarpStreaks, streakLength, streakOpacity } from "./WarpStreaks";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

describe("streak curves", () => {
  it("is quiet at rest and grows monotonically with bounded velocity", () => {
    expect(streakOpacity(0)).toBe(0);
    expect(streakLength(.5)).toBeGreaterThan(streakLength(.2));
    expect(streakLength(2)).toBe(streakLength(1));
    expect(streakOpacity(2)).toBe(streakOpacity(1));
    expect(streakOpacity(-1)).toBe(0);
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
    expect(() => streaks.update(makeFrame())).not.toThrow();

    const scene = new THREE.Scene();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.1, 1);
    streaks.update(makeFrame({ voyage: voyageStore.getState() }));

    expect(streaks.material.opacity).toBeGreaterThan(0);
    expect(streaks.material.opacity).toBeLessThan(streakOpacity(1));
    const pos = streaks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const positions = pos.array as Float32Array;
    const length = positions[5] - positions[2];
    // One frame eases toward the target rather than snapping to it.
    expect(length).toBeGreaterThan(0);
    expect(length).toBeLessThan(streakLength(1));
  });

  it("builds an empty but valid field on the still tier", () => {
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "still");
    expect(streaks.count).toBe(0);
    expect(scene.children).toHaveLength(1);
    expect(() => streaks.update(makeFrame())).not.toThrow();
  });

  it("is deterministic across instances for a given tier", () => {
    // Seeded placement is what makes the at-rest frame a stable screenshot baseline.
    const a = new WarpStreaks();
    const b = new WarpStreaks();
    a.build(new THREE.Scene(), "high");
    b.build(new THREE.Scene(), "high");
    expect(a.geometry.getAttribute("position").array).toEqual(
      b.geometry.getAttribute("position").array,
    );
  });

  it("reproduces the same layout when build() is called again", () => {
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "high");
    // Copy: the rebuild allocates a new Float32Array, but holding the old reference
    // would compare the snapshot against itself if it ever did not.
    const first = Float32Array.from(streaks.geometry.getAttribute("position").array);
    streaks.build(scene, "high");
    expect(streaks.geometry.getAttribute("position").array).toEqual(first);
  });

  it("throws a descriptive error when geometry is read before build()", () => {
    const streaks = new WarpStreaks();
    expect(() => streaks.geometry).toThrow(/before build/);
  });
});

describe("velocity-led Jump", () => {
  it("settles after a pause at the midpoint instead of retaining a progress-driven burst", () => {
    const streaks = new WarpStreaks();
    streaks.build(new THREE.Scene(), "mid");
    voyageStore.setScroll(.21, 1);
    for (let i = 0; i < 30; i++) streaks.update(makeFrame());
    const moving = streaks.material.opacity;
    expect(moving).toBeGreaterThan(0);
    voyageStore.setScroll(.21, 0);
    for (let i = 0; i < 24; i++) streaks.update(makeFrame());
    expect(streaks.material.opacity).toBeLessThan(moving * .01);
    expect([...streaks.geometry.getAttribute("position").array].every(Number.isFinite)).toBe(true);
    streaks.dispose();
  });
  it("has equivalent settling at 30 and 120fps", () => {
    const run = (fps: number) => {
      const streaks = new WarpStreaks(); streaks.build(new THREE.Scene(), "mid");
      voyageStore.setScroll(.21, 1);
      for (let i = 0; i < fps; i++) streaks.update(makeFrame({ dt: 1 / fps }));
      voyageStore.setScroll(.21, 0);
      for (let i = 0; i < fps / 2; i++) streaks.update(makeFrame({ dt: 1 / fps }));
      const opacity = streaks.material.opacity; streaks.dispose(); return opacity;
    };
    expect(run(30)).toBeCloseTo(run(120), 8);
  });
  it("suppresses programmatic travel even if a caller passes nonzero velocity", () => {
    const streaks = new WarpStreaks(); streaks.build(new THREE.Scene(), "mid");
    streaks.update(makeFrame({ voyage: { ...voyageStore.getState(), velocity: 1, programmatic: true } }));
    expect(streaks.material.opacity).toBe(0);
    streaks.dispose();
  });
  it("varies brightness and fades each additive streak endpoint", () => {
    const streaks = new WarpStreaks(); streaks.build(new THREE.Scene(), "mid");
    const colors = streaks.geometry.getAttribute("color");
    expect(colors.getX(0)).toBe(0);
    expect(colors.getX(1)).toBeGreaterThan(0);
    expect(colors.getX(1)).not.toBe(colors.getX(3));
    streaks.dispose();
  });
});
