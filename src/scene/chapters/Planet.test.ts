import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import {
  Planet, planetPosition, planetTarget, planetPresenceTarget, planetFadeOut, planetWeight, planetOpacity,
  planetsKey, planetsFromKey,
  PLANET_RADIUS, PLANET_DEPTH, PLANET_TARGET_LANDSCAPE, PLANET_TARGET_PORTRAIT, PLANET_FADE_OUT_END,
  PLANET_FADE_IN_RATE, PLANET_RING_OPACITY, MOON_SPEED,
} from "./Planet";
import {
  WORLDS_WINDOW, WORLDS_PRESENCE_END, WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE, caseCentre, caseTarget, worldsCursor,
} from "./worldsSchedule";
import { TIER_SETTINGS } from "@/scene/quality";
import { AMBER } from "./EnergyOrb";
import { CHAPTERS, STAR_POSITION, getCameraPose, progressAt, starScale } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import type { PlanetFeature } from "@/lib/planetFeature";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

const [W0, W1] = WORLDS_WINDOW;
const scrollToWorlds = (cp: number) => voyageStore.setScroll(progressAt("worlds", cp), 0);
const FEATURES: PlanetFeature[] = ["ring", "moon", "storm"];

/** Viewports the browser review covers: landscape 16:10, 4:3, 16:9 and a phone. */
const VIEWPORTS: readonly (readonly [number, number])[] = [[1440, 900], [1024, 768], [1920, 1080], [390, 844]];

/** A camera placed exactly where the real one is at a Worlds chapterProgress (FOV 60, no parallax). */
function cameraAt(cp: number, w: number, h: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(60, w / h, 0.1, 400);
  const pose = getCameraPose(progressAt("worlds", cp));
  cam.position.copy(pose.position);
  cam.lookAt(pose.lookAt);
  cam.updateMatrixWorld();
  return cam;
}

/** Runs `frames` update() calls at `dt` (default 60 fps), re-reading the store each time, so the
 *  planets' dt-eased fade-in follower can settle. The follower is a trigger: it never reads scroll
 *  for its pace, only for its target. */
function settle(planet: Planet, frames = 90, extra: Partial<Parameters<typeof makeFrame>[0]> = {}) {
  for (let i = 0; i < frames; i++) planet.update(makeFrame({ dt: 1 / 60, ...extra }));
}

function built(features: PlanetFeature[] = FEATURES, tier: "high" | "mid" | "still" = "high") {
  const scene = new THREE.Scene();
  const planet = new Planet(features);
  planet.build(scene, tier);
  return { scene, planet };
}

describe("planetTarget", () => {
  it("is landscape from aspect 1 up and portrait below it", () => {
    expect(planetTarget(1.6)).toBe(PLANET_TARGET_LANDSCAPE);
    expect(planetTarget(1)).toBe(PLANET_TARGET_LANDSCAPE);
    expect(planetTarget(390 / 844)).toBe(PLANET_TARGET_PORTRAIT);
    expect(PLANET_TARGET_LANDSCAPE.x).toBeGreaterThanOrEqual(0.4);   // clear of a 4:3 star disc
    expect(PLANET_TARGET_PORTRAIT.x).toBe(0);                        // centred under the phone panel
  });
});

describe("planetPosition", () => {
  it("projects onto the NDC target at the centre of its own slot, for every viewport and count", () => {
    for (const [w, h] of VIEWPORTS) {
      const target = planetTarget(w / h);
      for (const n of [1, 3, 5]) {
        for (let k = 0; k < n; k++) {
          const ndc = planetPosition(k, n, w / h).project(cameraAt(caseCentre(k, n), w, h));
          expect(ndc.x, `${w}x${h} n${n} k${k} x`).toBeCloseTo(target.x, 6);
          expect(ndc.y, `${w}x${h} n${n} k${k} y`).toBeCloseTo(target.y, 6);
        }
      }
    }
  });

  it("sits PLANET_DEPTH in front of the camera along the view axis at that point", () => {
    const cam = cameraAt(caseCentre(1, 3), 1440, 900);
    const local = planetPosition(1, 3, 1440 / 900).applyMatrix4(cam.matrixWorldInverse);
    expect(-local.z).toBeCloseTo(PLANET_DEPTH, 6);
  });

  it("writes into the caller's vector without allocating, and never returns NaN for an empty or odd count", () => {
    const out = new THREE.Vector3();
    expect(planetPosition(0, 3, 1.6, out)).toBe(out);
    for (const n of [0, -1, NaN, 2.9]) {
      const p = planetPosition(0, n, 1.6);
      expect([p.x, p.y, p.z].every(Number.isFinite)).toBe(true);
    }
  });

  // The planet is in front of the star (it occludes the halo), so the disc must stay clear of it
  // everywhere it is mostly visible, not just at the slot centre: the camera drifts the planet
  // ~23 px toward the star by the edge of a slot at 4:3 (measured: 7 px of gap at 1024x768, k = 2).
  it("keeps a visible gap between the planet disc and the star disc across the whole slot, not only at its centre", () => {
    const n = 3;
    const slot = (W1 - W0) / n;
    for (const [w, h] of VIEWPORTS) {
      const focal = h / 2 / Math.tan(THREE.MathUtils.degToRad(30));
      for (let k = 0; k < n; k++) {
        const pos = planetPosition(k, n, w / h);
        let sampled = 0;
        for (const d of [-0.5, -0.4, -0.25, -0.1, 0, 0.1, 0.25, 0.4, 0.5]) {
          const cp = caseCentre(k, n) + d * slot;
          if (planetOpacity("worlds", cp, k, n) <= 0.5) continue;       // only where the planet is mostly shown
          sampled++;
          const cam = cameraAt(cp, w, h);
          const planetNdc = pos.clone().project(cam);
          const starNdc = STAR_POSITION.clone().project(cam);
          const separation = Math.hypot(((planetNdc.x - starNdc.x) * w) / 2, ((planetNdc.y - starNdc.y) * h) / 2);
          const planetR = (PLANET_RADIUS / pos.distanceTo(cam.position)) * focal;
          const starR = (starScale(progressAt("worlds", cp)) / STAR_POSITION.distanceTo(cam.position)) * focal;
          expect(separation - planetR - starR, `${w}x${h} k${k} d${d}`).toBeGreaterThan(0);
          // At the slot centre the margin is the composed one: 4:3 is the tightest landscape window.
          if (d === 0) expect(separation - planetR - starR, `${w}x${h} k${k} centre`).toBeGreaterThan(w < h ? 25 : 10);
        }
        expect(sampled, `${w}x${h} k${k} samples`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  // Landscape: real camera motion carries each planet left -> right across the frame (A5).
  it("moves right on screen through its whole slot in landscape, by a visible amount", () => {
    const [w, h] = [1440, 900];
    const slot = (W1 - W0) / 3;
    for (let k = 0; k < 3; k++) {
      const pos = planetPosition(k, 3, w / h);
      const xs = Array.from({ length: 21 }, (_, i) => pos.clone().project(cameraAt(W0 + k * slot + (slot * i) / 20, w, h)).x);
      for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
      expect(xs[20] - xs[0]).toBeGreaterThan(0.05);                  // ~0.09 NDC, about 60 px at 1440
    }
  });

  // Portrait: the planet drops down the frame instead, and barely moves sideways (A5).
  it("moves down on screen through its slot in portrait, and stays centred sideways", () => {
    const [w, h] = [390, 844];
    const slot = (W1 - W0) / 3;
    for (let k = 0; k < 3; k++) {
      const pos = planetPosition(k, 3, w / h);
      const pts = Array.from({ length: 21 }, (_, i) => pos.clone().project(cameraAt(W0 + k * slot + (slot * i) / 20, w, h)));
      for (let i = 1; i < pts.length; i++) expect(pts[i].y).toBeLessThan(pts[i - 1].y);
      for (const p of pts) expect(Math.abs(p.x)).toBeLessThan(0.05);
    }
  });

  // The corridor after Worlds passes within ~4 units of this spot, so a planet that stays drawn
  // there would swallow the camera: clearance is only required while it is visible (A6).
  it("keeps the camera at least 3 units off the surface for as long as each planet is visible", () => {
    for (const aspect of [1.6, 4 / 3, 390 / 844]) {
      for (const n of [3, 6, 8]) {
        for (let k = 0; k < n; k++) {
          const pos = planetPosition(k, n, aspect);
          for (let i = 0; i <= 400; i++) {
            const cp = (0.9 * i) / 400;
            if (planetOpacity("worlds", cp, k, n) <= 0.001) continue;
            const camPos = getCameraPose(progressAt("worlds", cp)).position;
            expect(pos.distanceTo(camPos) - PLANET_RADIUS, `aspect ${aspect.toFixed(2)} n${n} k${k} cp ${cp.toFixed(3)}`).toBeGreaterThanOrEqual(3);
          }
        }
      }
    }
  });
});

describe("planetPresenceTarget / planetFadeOut", () => {
  it("the fade-in target is 0 outside Worlds and at its first frame, 1 for any progress past it", () => {
    for (const id of ["launch", "approach", "jump", "orbit", "belt", "pilot", "surface"] as const) {
      expect(planetPresenceTarget(id, 0.4)).toBe(0);
    }
    expect(planetPresenceTarget("worlds", 0)).toBe(0);
    expect(planetPresenceTarget("worlds", NaN)).toBe(0);
    for (const cp of [0.0036, W0 / 2, 0.3, W1, WORLDS_HOLD_MOBILE, 0.95, 1]) expect(planetPresenceTarget("worlds", cp)).toBe(1);
  });

  it("the fade-out is 0 outside Worlds, 1 from its first frame through the window and its edge margin", () => {
    for (const id of ["launch", "approach", "jump", "orbit", "belt", "pilot", "surface"] as const) {
      expect(planetFadeOut(id, 0.4)).toBe(0);
    }
    for (const cp of [0, 0.0036, W0, 0.3, (W0 + W1) / 2, W1, WORLDS_PRESENCE_END]) expect(planetFadeOut("worlds", cp)).toBe(1);
  });

  it("is still showing when the desktop pin releases and when the phone's does, and gone by PLANET_FADE_OUT_END", () => {
    expect(planetFadeOut("worlds", WORLDS_HOLD_DESKTOP)).toBeGreaterThan(0.9);
    expect(planetFadeOut("worlds", WORLDS_HOLD_MOBILE)).toBeGreaterThan(0);          // the last planet, on a phone
    expect(planetFadeOut("worlds", WORLDS_HOLD_MOBILE)).toBeLessThan(1);
    for (const cp of [PLANET_FADE_OUT_END, 0.95, 1]) expect(planetFadeOut("worlds", cp)).toBe(0);
  });

  it("never rises while fading out", () => {
    let prev = 2;
    for (let k = 0; k <= 100; k++) {
      const v = planetFadeOut("worlds", WORLDS_PRESENCE_END + (k / 100) * (PLANET_FADE_OUT_END - WORLDS_PRESENCE_END));
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("planetWeight / planetOpacity", () => {
  it("shows exactly one planet while its case dwells, and none of the others", () => {
    for (const n of [2, 3, 6]) {
      for (let k = 0; k < n; k++) {
        const cp = caseCentre(k, n);
        const opacities = Array.from({ length: n }, (_, j) => planetOpacity("worlds", cp, j, n));
        expect(opacities[k]).toBe(1);
        expect(opacities.filter((o) => o > 0)).toHaveLength(1);
      }
    }
  });

  it("cross-fades only inside the cursor's travel: weights always sum to 1 and never show two full planets", () => {
    const n = 3;
    for (let i = 0; i <= 600; i++) {
      const cp = W0 + ((W1 - W0) * i) / 600;
      const w = Array.from({ length: n }, (_, k) => planetOpacity("worlds", cp, k, n));
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      expect(Math.max(...w)).toBeGreaterThanOrEqual(0.5);
    }
    expect(planetWeight(0.5, 0)).toBeCloseTo(0.5, 12);
    expect(planetWeight(0.5, 1)).toBeCloseTo(0.5, 12);
    expect(planetWeight(0, 2)).toBe(0);
  });

  // Planet and Worlds are each tested against caseCentre, but not against each other: a future edit
  // to either Math.round (panel) or planetWeight (planet) must not let them disagree about which
  // case is "current". Exact .5 ties (the middle of a cross-fade) have no single answer.
  it("shows the planet of the case whose panel is lit: the max-weight index equals the caseTarget-lit index", () => {
    for (const n of [2, 3, 6]) {
      for (let i = 1; i <= 600; i++) {
        const cp = i / 600;
        const cursor = worldsCursor(cp, n);
        const weights = Array.from({ length: n }, (_, k) => planetWeight(cursor, k));
        const max = Math.max(...weights);
        if (weights.filter((w) => Math.abs(w - max) < 1e-9).length > 1) continue;          // an exact tie
        const lit = Array.from({ length: n }, (_, k) => caseTarget(k, n, cp)).indexOf(1);
        expect(weights.indexOf(max), `n${n} cp ${cp.toFixed(4)}`).toBe(lit);
      }
    }
  });

  it("is 0 for every planet outside the chapter", () => {
    expect(planetOpacity("orbit", 0.4, 0, 3)).toBe(0);
    expect(planetOpacity("worlds", 0.95, 2, 3)).toBe(0);
  });
});

describe("planetsKey / planetsFromKey", () => {
  it("round-trips every list, and keeps an empty list apart from a one-planet list", () => {
    for (const list of [[], ["none"], ["ring"], ["ring", "moon", "storm"], ["none", "none"]] as PlanetFeature[][]) {
      expect(planetsFromKey(planetsKey(list))).toEqual(list);
    }
    expect(planetsKey([])).toBe("");
    expect(planetsKey(["none"])).toBe("none");
  });

  it("is a stable value: two equal lists give the same key, so SceneRoot does not rebuild the context", () => {
    expect(planetsKey(["ring", "moon"])).toBe(planetsKey(["ring", "moon"]));
    expect(planetsKey(["ring", "moon"])).not.toBe(planetsKey(["moon", "ring"]));
  });

  it("reads anything unknown as none", () => {
    expect(planetsFromKey("ring,comet,,storm")).toEqual(["ring", "none", "none", "storm"]);
  });
});

describe("Planet build", () => {
  it("builds one group per planet with the parts its feature asks for, in CMS order", () => {
    const { scene, planet } = built(["ring", "moon", "storm", "none"]);
    expect(scene.children).toHaveLength(1);
    const [ring, moon, storm, none] = planet.planets;
    expect(planet.count).toBe(4);
    expect(ring.ring).not.toBeNull();
    expect(ring.moon).toBeNull();
    expect(moon.moon).not.toBeNull();
    expect(moon.ring).toBeNull();
    expect(storm.material.uniforms.uStorm.value).toBe(1);
    for (const v of [ring, moon, none]) expect(v.material.uniforms.uStorm.value).toBe(0);
    expect(none.ring).toBeNull();
    expect(none.moon).toBeNull();
  });

  it("tessellates the spheres from the tier settings", () => {
    for (const tier of ["high", "mid"] as const) {
      const { planet } = built(["ring"], tier);
      expect(planet.planets[0].mesh.geometry.parameters.widthSegments).toBe(TIER_SETTINGS[tier].planetSegments);
    }
    expect(TIER_SETTINGS.high.planetSegments).toBeGreaterThan(TIER_SETTINGS.mid.planetSegments);
  });

  it("treats an unknown feature as none and never throws on one", () => {
    const { planet } = built(["comet" as unknown as PlanetFeature, "ring"]);
    expect(planet.features).toEqual(["none", "ring"]);
    expect(planet.planets[0].ring).toBeNull();
  });

  it("gives every planet its own surface seed, so no two surfaces match", () => {
    const { planet } = built(["none", "none", "none", "none"]);
    const seeds = planet.planets.map((p) => (p.material.uniforms.uSeed.value as THREE.Vector3).toArray().join());
    expect(new Set(seeds).size).toBe(4);
  });

  it("is monochrome except the terminator: the only colour a surface carries is the star's amber", () => {
    const { planet } = built(["ring"]);
    const v = planet.planets[0];
    expect((v.material.uniforms.uAmber.value as THREE.Color).getHex()).toBe(AMBER);
    expect(v.material.transparent).toBe(true);
    expect(v.ring!.material.color.getHex()).toBe(0xffffff);           // grey/white ring, additive
    expect(v.ring!.material.blending).toBe(THREE.AdditiveBlending);
    expect(v.ring!.material.depthWrite).toBe(false);
  });

  it("builds nothing for no cases or the still tier (no GPU resources for nothing)", () => {
    for (const { planet } of [built([]), built(FEATURES, "still")]) {
      expect(planet.object!.children).toHaveLength(0);
      expect(planet.planets).toHaveLength(0);
      scrollToWorlds(0.3);
      expect(() => planet.update(makeFrame())).not.toThrow();
      expect(planet.object!.visible).toBe(false);
    }
  });

  it("places each planet at its world position and lights it from the star", () => {
    const { planet } = built();
    planet.planets.forEach((v, k) => {
      expect(v.group.position.distanceTo(planetPosition(k, 3, 16 / 10))).toBeLessThan(1e-9);
      const toStar = STAR_POSITION.clone().sub(v.group.position).normalize();
      expect((v.material.uniforms.uLightDir.value as THREE.Vector3).distanceTo(toStar)).toBeLessThan(1e-9);
    });
  });
});

describe("Planet update", () => {
  it("is a no-op before build() and after dispose()", () => {
    const planet = new Planet(FEATURES);
    expect(() => planet.update(makeFrame())).not.toThrow();
    const { planet: b } = built();
    b.dispose();
    expect(() => b.update(makeFrame())).not.toThrow();
  });

  it("is hidden outside Worlds and once its fade has finished, visible between", () => {
    const { planet } = built();
    settle(planet, 5);                                                // launch
    expect(planet.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("orbit", 0.9), 0);
    settle(planet, 5);
    expect(planet.object!.visible).toBe(false);
    scrollToWorlds(caseCentre(0, 3));
    settle(planet);
    expect(planet.object!.visible).toBe(true);
    scrollToWorlds(PLANET_FADE_OUT_END);
    settle(planet, 5);
    expect(planet.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("belt", 0.1), 0);
    settle(planet, 5);
    expect(planet.object!.visible).toBe(false);
  });

  it("shows exactly the planet whose case is lit at each slot centre", () => {
    const { planet } = built();
    for (let k = 0; k < 3; k++) {
      scrollToWorlds(caseCentre(k, 3));
      settle(planet);
      expect(planet.planets.map((v) => v.group.visible)).toEqual([0, 1, 2].map((j) => j === k));
      expect(planet.planets[k].material.uniforms.uOpacity.value).toBeCloseTo(1, 4);
    }
  });

  it("keeps the last planet up through the desktop and phone pin releases (A6)", () => {
    const { planet } = built();
    for (const cp of [WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE]) {
      scrollToWorlds(cp);
      settle(planet);
      expect(planet.planets.map((v) => v.group.visible)).toEqual([false, false, true]);
    }
  });

  it("scales the surface, ring and moon opacity by the fade and by the ignition curtain", () => {
    const { planet } = built(["ring", "moon"]);
    scrollToWorlds(caseCentre(0, 2));
    settle(planet, 90, { ignite: 0.5 });
    expect(planet.planets[0].material.uniforms.uOpacity.value).toBeCloseTo(0.5, 4);
    expect(planet.planets[0].ring!.material.opacity).toBeCloseTo(PLANET_RING_OPACITY * 0.5, 4);
    scrollToWorlds(caseCentre(1, 2));
    settle(planet, 90, { ignite: 0.5 });
    expect(planet.planets[1].moon!.mesh.material.uniforms.uOpacity.value).toBeCloseTo(0.5, 4);
  });

  it("re-places every planet when the camera's aspect changes, without rebuilding", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    settle(planet, 5);
    const sphere = planet.planets[0].mesh.geometry;
    const landscape = planet.planets[0].group.position.clone();
    const portrait = new THREE.PerspectiveCamera(60, 390 / 844);
    planet.update(makeFrame({ camera: portrait }));
    expect(planet.planets[0].group.position.distanceTo(planetPosition(0, 3, 390 / 844))).toBeLessThan(1e-9);
    expect(planet.planets[0].group.position.distanceTo(landscape)).toBeGreaterThan(1);
    expect(planet.planets[0].mesh.geometry).toBe(sphere);
    // A non-finite aspect (a zero-height window mid-resize) leaves the placement alone.
    const before = planet.planets[0].group.position.clone();
    const broken = new THREE.PerspectiveCamera(60, 1);
    broken.aspect = NaN;
    planet.update(makeFrame({ camera: broken }));
    expect(planet.planets[0].group.position.equals(before)).toBe(true);
  });

  it("orbits the moon off the scene clock, not off scroll", () => {
    const { planet } = built(["moon"]);
    scrollToWorlds(caseCentre(0, 1));
    settle(planet, 5);                                                // the planet must be up for the moon to move
    planet.update(makeFrame({ t: 2 }));
    const a = planet.planets[0].moon!.pivot.rotation.y;
    planet.update(makeFrame({ t: 6 }));
    expect(planet.planets[0].moon!.pivot.rotation.y - a).toBeCloseTo(4 * MOON_SPEED, 9);
  });
});

// The planets' chapter-level fade-in is a TRIGGER eased by dt (the panels' CSS transition does the
// same for caseTarget): a nav / rail / back-link arrival lands at start + 0.001 and must show the
// planet at once, not after 18vh of scroll. The per-planet cross-fade and the last planet's long
// fade-out stay scroll-scrubbed.
describe("Planet update — the fade-in follower", () => {
  const opacity = (planet: Planet, k = 0) => planet.planets[k].material.uniforms.uOpacity.value as number;

  it("reaches 95% within half a second of an arrival at start + 0.001, and is not there yet on the first frame", () => {
    const { planet } = built();
    voyageStore.setScroll(CHAPTERS.find((c) => c.id === "worlds")!.start + 0.001, 0);
    expect(voyageStore.getState().chapter.id).toBe("worlds");
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(opacity(planet)).toBeLessThan(0.3);                         // eased in, not a pop
    settle(planet, 29);                                               // 30 frames = 0.5 s at 60 fps
    expect(opacity(planet)).toBeGreaterThanOrEqual(0.95);
    expect(PLANET_FADE_IN_RATE).toBeGreaterThan(0);
    expect(planet.planets[0].group.visible).toBe(true);
  });

  it("does not depend on the frame rate to arrive: 30 fps gets there in the same half second", () => {
    const { planet } = built();
    voyageStore.setScroll(CHAPTERS.find((c) => c.id === "worlds")!.start + 0.001, 0);
    settle(planet, 15, { dt: 1 / 30 });
    expect(opacity(planet)).toBeGreaterThanOrEqual(0.95);
  });

  it("converges to 0 at the chapter's first frame and outside Worlds, and comes back in from 0, not from a stale 1", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    settle(planet);
    expect(opacity(planet)).toBeGreaterThan(0.99);
    scrollToWorlds(0);                                                // back to cp 0 inside Worlds: target 0
    settle(planet);
    expect(planet.object!.visible).toBe(false);
    scrollToWorlds(caseCentre(0, 3));
    settle(planet);
    voyageStore.setScroll(progressAt("orbit", 0.5), 0);               // outside Worlds: hidden at once
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(planet.object!.visible).toBe(false);
    settle(planet);                                                   // ...and the follower settles to 0 while hidden
    voyageStore.setScroll(progressAt("worlds", caseCentre(0, 3)), 0);
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(opacity(planet)).toBeLessThan(0.3);
  });

  it("never overshoots on a huge dt (a resumed tab) and treats a NaN, zero or negative dt as no step", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    planet.update(makeFrame({ dt: 30 }));
    expect(opacity(planet)).toBe(1);                                  // lands on the target, no further
    const { planet: p2 } = built();
    scrollToWorlds(caseCentre(0, 3));
    for (const dt of [NaN, 0, -1]) p2.update(makeFrame({ dt }));
    expect(opacity(p2)).toBe(0);
    expect(Number.isFinite(opacity(p2))).toBe(true);
    expect(p2.object!.visible).toBe(false);
  });

  it("keeps the per-planet cross-fade and the last planet's fade-out scrubbed by scroll, not eased", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(2, 3));
    settle(planet);
    scrollToWorlds(WORLDS_HOLD_MOBILE);                                // 0.858: inside the scrubbed fade-out
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(opacity(planet, 2)).toBeCloseTo(planetOpacity("worlds", WORLDS_HOLD_MOBILE, 2, 3), 2);
    scrollToWorlds(PLANET_FADE_OUT_END);
    planet.update(makeFrame({ dt: 1 / 60 }));
    expect(planet.object!.visible).toBe(false);                        // gone the same frame
  });
});

describe("Planet lifecycle", () => {
  it("replaces the previous build when build() is called twice", () => {
    const scene = new THREE.Scene();
    const planet = new Planet(FEATURES);
    planet.build(scene, "high");
    const first = planet.planets[0].mesh.geometry;
    planet.build(scene, "high");
    expect(scene.children).toHaveLength(1);
    expect(planet.planets).toHaveLength(3);
    expect(planet.planets[0].mesh.geometry).not.toBe(first);
  });

  it("disposes idempotently, frees every GPU resource once (sphere, ring, ring material, surface and moon materials), and rebuilds after a dispose", () => {
    const scene = new THREE.Scene();
    const planet = new Planet(FEATURES);                               // ring, moon, storm
    planet.build(scene, "mid");
    const [ringPlanet, moonPlanet, stormPlanet] = planet.planets;
    const spies = {
      sphere: vi.fn(),
      ringGeometry: vi.fn(),
      ringMaterial: vi.fn(),
      ringSurface: vi.fn(),
      moonSurface: vi.fn(),
      moonMesh: vi.fn(),
      stormSurface: vi.fn(),
    };
    ringPlanet.mesh.geometry.addEventListener("dispose", spies.sphere);
    ringPlanet.ring!.geometry.addEventListener("dispose", spies.ringGeometry);
    ringPlanet.ring!.material.addEventListener("dispose", spies.ringMaterial);
    ringPlanet.material.addEventListener("dispose", spies.ringSurface);
    moonPlanet.material.addEventListener("dispose", spies.moonSurface);
    moonPlanet.moon!.mesh.material.addEventListener("dispose", spies.moonMesh);
    stormPlanet.material.addEventListener("dispose", spies.stormSurface);
    const sphere = ringPlanet.mesh.geometry;
    planet.dispose();
    for (const [name, spy] of Object.entries(spies)) expect(spy, name).toHaveBeenCalledTimes(1);
    expect(scene.children).toHaveLength(0);
    expect(planet.object).toBeNull();
    expect(() => planet.dispose()).not.toThrow();
    for (const [name, spy] of Object.entries(spies)) expect(spy, `${name} after a second dispose`).toHaveBeenCalledTimes(1);
    planet.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(planet.planets[0].mesh.geometry).not.toBe(sphere);
  });
});
