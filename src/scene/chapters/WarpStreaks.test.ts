import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import {
  WarpStreaks, streakLength, streakOpacity,
  hyperLength, hyperOpacity, hyperConverge,
  HYPER_LENGTH_MAX, HYPER_OPACITY_PEAK, HYPER_CONVERGE_MAX,
} from "./WarpStreaks";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";

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
    expect(() => streaks.update(makeFrame())).not.toThrow();

    const scene = new THREE.Scene();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.1, 1);
    streaks.update(makeFrame({ voyage: voyageStore.getState() }));

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

describe("hyperspace curves", () => {
  it("length starts where the velocity curve rests and ends at the tunnel maximum", () => {
    // Entry continuity: max(streakLength(v), hyperLength(0)) can never step down.
    expect(hyperLength(0)).toBeCloseTo(streakLength(0), 10);
    expect(hyperLength(1)).toBeCloseTo(HYPER_LENGTH_MAX, 5);
    expect(hyperLength(-1)).toBeCloseTo(streakLength(0), 10);
    expect(hyperLength(2)).toBeCloseTo(HYPER_LENGTH_MAX, 5);
    expect(hyperLength(0.5)).toBeGreaterThan(hyperLength(0.25));
    expect(hyperLength(0.5)).toBeLessThan(hyperLength(0.75));
  });

  it("opacity is zero at both ends and peaks mid-beat", () => {
    expect(hyperOpacity(0)).toBeCloseTo(0, 10);
    expect(hyperOpacity(1)).toBeCloseTo(0, 10);
    expect(hyperOpacity(0.5)).toBeCloseTo(HYPER_OPACITY_PEAK, 10);
    expect(hyperOpacity(-1)).toBeCloseTo(0, 10);
    expect(hyperOpacity(2)).toBeCloseTo(0, 10);
  });

  it("convergence grows monotonically and clamps", () => {
    expect(hyperConverge(0)).toBeCloseTo(0, 10);
    expect(hyperConverge(1)).toBeCloseTo(HYPER_CONVERGE_MAX, 10);
    expect(hyperConverge(-1)).toBeCloseTo(0, 10);
    expect(hyperConverge(2)).toBeCloseTo(HYPER_CONVERGE_MAX, 10);
    expect(hyperConverge(0.75)).toBeGreaterThan(hyperConverge(0.25));
  });
});

describe("WarpStreaks — chapter 03", () => {
  it("suppresses the tunnel during programmatic travel", () => {
    const streaks = new WarpStreaks();
    streaks.build(new THREE.Scene(), "mid");
    voyageStore.setScroll(0.21, 1);
    streaks.update(makeFrame({ voyage: { ...voyageStore.getState(), programmatic: true } }));
    expect(streaks.material.opacity).toBeCloseTo(streakOpacity(0), 5);
    const p = streaks.geometry.getAttribute("position").array as Float32Array;
    expect(p[5] - p[2]).toBeCloseTo(streakLength(0), 3);
    streaks.dispose();
  });
  it("stretches at zero scroll velocity inside the Jump", () => {
    // The regression this pins: a deliberate slow scroll through the 25vh beat has
    // velocity ~0, so anything keyed off velocity would show no hyperspace at all.
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.21, 0);
    const cp = voyageStore.getState().chapterProgress;
    expect(voyageStore.getState().chapter.id).toBe("jump");
    streaks.update(makeFrame());

    const positions = streaks.geometry.getAttribute("position").array as Float32Array;
    // 3 places: the buffer is Float32, and the length is read back as a difference of two
    // world-space z values around -100.
    const length = positions[5] - positions[2];
    expect(length).toBeCloseTo(hyperLength(cp), 3);
    expect(length).toBeGreaterThan(streakLength(1));
    expect(streaks.material.opacity).toBeCloseTo(hyperOpacity(cp), 5);
  });

  it("converges the far end of each streak toward the flight axis", () => {
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.215, 0);
    const cp = voyageStore.getState().chapterProgress;
    streaks.update(makeFrame());

    const p = streaks.geometry.getAttribute("position").array as Float32Array;
    const headR = Math.hypot(p[0], p[1]);
    const tailR = Math.hypot(p[3], p[4]);
    expect(tailR).toBeGreaterThan(0);
    expect(headR / tailR).toBeCloseTo(1 - hyperConverge(cp), 5);
  });

  it("floors the tunnel with the velocity curves rather than replacing them", () => {
    // Entering the band at speed: max() must keep the velocity values, which are the larger
    // pair this early in the beat. A bare assignment of the hyperspace curves steps them
    // down — every other jump-band test here runs at velocity 0, where max() and a plain
    // assignment are bit-identical, so this is the only test that can tell them apart.
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.2005, 1); // chapterProgress 0.025
    streaks.update(makeFrame());

    expect(streaks.material.opacity).toBeCloseTo(streakOpacity(1), 5); // 0.65, not 0.0706
    const p = streaks.geometry.getAttribute("position").array as Float32Array;
    expect(p[5] - p[2]).toBeCloseTo(0.4 + (streakLength(1) - 0.4) * 0.1, 3); // 1.76, not 0.5099
  });

  it("fades the tunnel with the ignition curtain", () => {
    // The new ctx.ignite multiplier on the hyperspace opacity is unreachable from every other
    // test here, because makeFrame() defaults to ignite: 1 — dropping it would leave the suite
    // green while the tunnel blazed at full brightness behind the ignition curtain.
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.21, 0);
    const cp = voyageStore.getState().chapterProgress;
    streaks.update(makeFrame({ ignite: 0.5 }));
    expect(streaks.material.opacity).toBeCloseTo(hyperOpacity(cp) * 0.5, 5);
  });

  it("leaves the Approach range exactly as it was", () => {
    // Guards WarpStreaks.test.ts's existing velocity assertions from the new branch.
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "mid");
    voyageStore.setScroll(0.1, 1);
    expect(voyageStore.getState().chapter.id).toBe("approach");
    streaks.update(makeFrame());

    expect(streaks.material.opacity).toBeCloseTo(streakOpacity(1), 5);
    const p = streaks.geometry.getAttribute("position").array as Float32Array;
    expect(Math.hypot(p[0], p[1])).toBeCloseTo(Math.hypot(p[3], p[4]), 5);
  });
});
