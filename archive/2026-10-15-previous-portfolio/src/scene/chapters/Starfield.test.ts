import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { Starfield, approachSoften, orbitSoften, worldsSoften, chapterSoften, ORBIT_SOFTEN_PEAK, WORLDS_SOFTEN_PEAK } from "./Starfield";
import { ORBIT_WINDOW, ORBIT_PRESENCE_END } from "./orbitSchedule";
import { WORLDS_WINDOW, WORLDS_PRESENCE_END } from "./worldsSchedule";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

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
    expect(() => field.update(makeFrame())).not.toThrow();

    const scene = new THREE.Scene();
    field.build(scene, "mid");
    field.update(makeFrame());
    expect(field.material.opacity).toBeGreaterThan(0);
    expect(field.object?.rotation.z).toBeGreaterThan(0);
  });

  it("is deterministic across instances for a given tier", () => {
    const a = new Starfield();
    const b = new Starfield();
    a.build(new THREE.Scene(), "high");
    b.build(new THREE.Scene(), "high");
    expect(a.positions).toEqual(b.positions);
    // Locks the seed-1337 sequence itself, so swapping mulberry32 to the shared module
    // (or re-ordering the rand() draws) cannot silently move every star.
    expect(a.positions[0]).toBeCloseTo(7.11501407623291, 6);
  });

  it("builds an empty but valid field on the still tier", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "still");
    expect(field.count).toBe(0);
    expect(scene.children).toHaveLength(1);
    expect(() => field.update(makeFrame())).not.toThrow();
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

describe("approachSoften", () => {
  it("is zero outside the Approach chapter", () => {
    expect(approachSoften("launch", 0.5)).toBe(0);
    expect(approachSoften("jump", 0.5)).toBe(0);
    expect(approachSoften("orbit", 0.5)).toBe(0);
  });

  it("is zero at both ends of the chapter and full while the panels are docked", () => {
    expect(approachSoften("approach", 0)).toBe(0);
    expect(approachSoften("approach", 1)).toBe(0);
    // The 100vh pin holds for chapterProgress 0..1/3, so the hold band covers it.
    expect(approachSoften("approach", 1 / 3)).toBeCloseTo(1, 10);
    expect(approachSoften("approach", 0.45)).toBeCloseTo(1, 10);
  });

  it("rises, then releases as the panel block leaves", () => {
    expect(approachSoften("approach", 0.12)).toBeGreaterThan(0);
    expect(approachSoften("approach", 0.12)).toBeLessThan(1);
    expect(approachSoften("approach", 0.18)).toBeGreaterThan(approachSoften("approach", 0.12));
    expect(approachSoften("approach", 0.55)).toBeLessThan(1);
    expect(approachSoften("approach", 0.55)).toBeGreaterThan(0);
    expect(approachSoften("approach", 0.7)).toBe(0);
  });

  it("clamps out-of-range progress", () => {
    expect(approachSoften("approach", -1)).toBe(0);
    expect(approachSoften("approach", 2)).toBe(0);
  });
});

// Slice 4: the focus pull generalises from Approach to Approach + Orbit.
describe("orbitSoften", () => {
  it("is the schedule's presence scaled to ORBIT_SOFTEN_PEAK, so it matches ORBIT_WINDOW", () => {
    expect(orbitSoften(0)).toBe(0);
    expect(orbitSoften(ORBIT_WINDOW[0])).toBeCloseTo(ORBIT_SOFTEN_PEAK, 12);
    expect(orbitSoften((ORBIT_WINDOW[0] + ORBIT_WINDOW[1]) / 2)).toBeCloseTo(ORBIT_SOFTEN_PEAK, 12);
    expect(orbitSoften(ORBIT_WINDOW[1])).toBeCloseTo(ORBIT_SOFTEN_PEAK, 12);
    expect(orbitSoften(ORBIT_PRESENCE_END)).toBe(0);
    expect(orbitSoften(1)).toBe(0);
    expect(ORBIT_SOFTEN_PEAK).toBeGreaterThan(0);
    expect(ORBIT_SOFTEN_PEAK).toBeLessThanOrEqual(1);
  });

  it("ramps in and out inside the margins of the hold", () => {
    expect(orbitSoften(ORBIT_WINDOW[0] / 2)).toBeGreaterThan(0);
    expect(orbitSoften(ORBIT_WINDOW[0] / 2)).toBeLessThan(ORBIT_SOFTEN_PEAK);
    expect(orbitSoften((ORBIT_WINDOW[1] + ORBIT_PRESENCE_END) / 2)).toBeGreaterThan(0);
    expect(orbitSoften((ORBIT_WINDOW[1] + ORBIT_PRESENCE_END) / 2)).toBeLessThan(ORBIT_SOFTEN_PEAK);
  });
});

describe("chapterSoften", () => {
  it("is exactly approachSoften inside Approach — that behaviour is unchanged", () => {
    for (let k = 0; k <= 100; k++) {
      expect(chapterSoften("approach", k / 100)).toBe(approachSoften("approach", k / 100));
    }
  });

  // The comparison above is approachSoften against itself, so it cannot catch an edit to
  // approachSoften's own constants — these golden values are the "byte-identical" proof (E8).
  it("pins approachSoften to golden values — the byte-identical proof", () => {
    const f = (t: number) => approachSoften("approach", t);
    expect(f(0.02)).toBe(0);
    expect(f(0.12)).toBeCloseTo(0.5, 12);   // midpoint of the 0.02 → 0.22 ramp
    expect(f(0.22)).toBe(1);
    expect(f(0.45)).toBe(1);
    expect(f(0.55)).toBeCloseTo(0.5, 12);   // midpoint of the 0.45 → 0.65 ramp
    expect(f(0.65)).toBe(0);
    expect(approachSoften("orbit", 0.3)).toBe(0);
  });

  it("is orbitSoften inside Orbit, worldsSoften inside Worlds, and zero everywhere else", () => {
    for (let k = 0; k <= 100; k++) {
      expect(chapterSoften("orbit", k / 100)).toBe(orbitSoften(k / 100));
      expect(chapterSoften("worlds", k / 100)).toBe(worldsSoften(k / 100));
    }
    for (const id of ["launch", "jump", "belt", "passage", "constellation", "pilot", "landing", "surface"] as const) {
      expect(chapterSoften(id, 0.5)).toBe(0);
    }
  });
});

// Slice 5: the focus pull reaches Worlds, on the same clock as the planets.
describe("worldsSoften", () => {
  it("is the schedule's presence scaled to WORLDS_SOFTEN_PEAK, so it matches WORLDS_WINDOW", () => {
    expect(worldsSoften(0)).toBe(0);
    expect(worldsSoften(WORLDS_WINDOW[0])).toBeCloseTo(WORLDS_SOFTEN_PEAK, 12);
    expect(worldsSoften((WORLDS_WINDOW[0] + WORLDS_WINDOW[1]) / 2)).toBeCloseTo(WORLDS_SOFTEN_PEAK, 12);
    expect(worldsSoften(WORLDS_WINDOW[1])).toBeCloseTo(WORLDS_SOFTEN_PEAK, 12);
    expect(worldsSoften(WORLDS_PRESENCE_END)).toBe(0);
    expect(worldsSoften(1)).toBe(0);
    expect(WORLDS_SOFTEN_PEAK).toBeGreaterThan(0);
    expect(WORLDS_SOFTEN_PEAK).toBeLessThanOrEqual(1);
  });

  it("ramps in and out inside the margins of the hold", () => {
    expect(worldsSoften(WORLDS_WINDOW[0] / 2)).toBeGreaterThan(0);
    expect(worldsSoften(WORLDS_WINDOW[0] / 2)).toBeLessThan(WORLDS_SOFTEN_PEAK);
    expect(worldsSoften((WORLDS_WINDOW[1] + WORLDS_PRESENCE_END) / 2)).toBeGreaterThan(0);
    expect(worldsSoften((WORLDS_WINDOW[1] + WORLDS_PRESENCE_END) / 2)).toBeLessThan(WORLDS_SOFTEN_PEAK);
  });
});

describe("Starfield — chapter 04 focus pull", () => {
  it("eases the field out of focus inside Orbit's window, and back in The Belt", () => {
    const field = new Starfield();
    field.build(new THREE.Scene(), "mid");
    field.applyControls(1);
    const baseSize = field.material.size;
    const baseOpacity = field.material.opacity;

    voyageStore.setScroll(progressAt("orbit", 0.3), 0);
    expect(voyageStore.getState().chapter.id).toBe("orbit");
    for (let i = 0; i < 120; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize * (1 + ORBIT_SOFTEN_PEAK * 0.6), 3);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    // Worlds pulls focus now (slice 5), so "back in focus" is The Belt, the next quiet chapter.
    voyageStore.setScroll(progressAt("belt", 0.5), 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
  });
});

describe("Starfield — chapter 05 focus pull", () => {
  it("eases the field out of focus inside Worlds' window, and back in The Belt", () => {
    const field = new Starfield();
    field.build(new THREE.Scene(), "mid");
    field.applyControls(1);
    const baseSize = field.material.size;
    const baseOpacity = field.material.opacity;

    voyageStore.setScroll(progressAt("worlds", 0.4), 0);
    expect(voyageStore.getState().chapter.id).toBe("worlds");
    for (let i = 0; i < 120; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize * (1 + WORLDS_SOFTEN_PEAK * 0.6), 3);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    voyageStore.setScroll(progressAt("belt", 0.5), 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
  });
});

describe("Starfield — chapter 02 focus pull", () => {
  it("eases the field out of focus while Approach is docked, and back afterwards", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "mid");
    field.applyControls(1);
    const baseSize = field.material.size;
    const baseOpacity = field.material.opacity;

    voyageStore.setScroll(progressAt("approach", 1 / 3), 0);
    expect(voyageStore.getState().chapter.id).toBe("approach");
    // ~2s of frames: the ease is deliberate, so one frame proves nothing.
    for (let i = 0; i < 120; i++) field.update(makeFrame());
    expect(field.material.size).toBeGreaterThan(baseSize);
    expect(field.material.opacity).toBeLessThan(baseOpacity);

    voyageStore.setScroll(progressAt("belt", 0.5), 0);
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize, 4);
    expect(field.material.opacity).toBeCloseTo(baseOpacity, 4);
  });

  // Both drivers non-zero: they combine by max (0.5), where a sum would give 0.8.
  it("combines the manual and chapter pulls by max, not by sum", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "mid");
    field.applyControls(1);
    const baseSize = field.material.size;            // BASE_SIZE at ignite 1, no soften, no audio

    voyageStore.setScroll(progressAt("approach", 0.12), 0); // Approach, chapterProgress 0.12
    const s = voyageStore.getState();
    const chapter = approachSoften(s.chapter.id, s.chapterProgress);
    expect(chapter).toBeCloseTo(0.5, 6);
    field.setSoften(0.3);
    // ~3.3s of frames: the chapter ease has settled to within ~1e-5 of its target.
    for (let i = 0; i < 200; i++) field.update(makeFrame());
    expect(field.material.size).toBeCloseTo(baseSize * (1 + Math.max(0.3, chapter) * 0.6), 4);
  });

  it("still honours setSoften while the chapter driver is idle", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "mid");
    field.applyControls(1);
    const baseSize = field.material.size;
    field.setSoften(1);
    // Launch: the chapter driver contributes 0, so the manual control is what shows.
    field.update(makeFrame());
    expect(field.material.size).toBeGreaterThan(baseSize);
  });
});
