import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import {
  Planet, planetPosition, planetTarget, planetPresenceTarget, planetFadeOut, planetOpacity,
  planetsKey, planetsFromKey,
  PLANET_RADIUS, PLANET_DEPTH, PLANET_TARGET_LANDSCAPE, PLANET_TARGET_PORTRAIT, PLANET_TARGET_PORTRAIT_WIDE, PHONE_MAX_WIDTH,
  PLANET_FADE_OUT_END,
  PLANET_FADE_IN_RATE, PLANET_SWAP_OUT_RATE, PLANET_SWAP_IN_RATE, PLANET_SWAP_CLEAR, PLANET_RING_OPACITY, MOON_SPEED,
} from "./Planet";
import {
  WORLDS_WINDOW, WORLDS_PRESENCE_END, WORLDS_HOLD_DESKTOP, WORLDS_HOLD_MOBILE, caseCentre, caseTarget,
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

/** x of the wide-portrait NDC target, named once for the F2 tests. */
const PLANET_TARGET_WIDE_X = PLANET_TARGET_PORTRAIT_WIDE.x;

/** Pixel gap between the planet's screen disc and the star's at a Worlds chapterProgress (> 0 = clear). */
function discGap(pos: THREE.Vector3, cp: number, w: number, h: number): number {
  const focal = h / 2 / Math.tan(THREE.MathUtils.degToRad(30));
  const cam = cameraAt(cp, w, h);
  const planetNdc = pos.clone().project(cam);
  const starNdc = STAR_POSITION.clone().project(cam);
  const separation = Math.hypot(((planetNdc.x - starNdc.x) * w) / 2, ((planetNdc.y - starNdc.y) * h) / 2);
  const planetR = (PLANET_RADIUS / pos.distanceTo(cam.position)) * focal;
  const starR = (starScale(progressAt("worlds", cp)) / STAR_POSITION.distanceTo(cam.position)) * focal;
  return separation - planetR - starR;
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

  // F2: a portrait window >= 768 px wide uses the desktop (left-panel) layout, so it gets its own target.
  it("gives a wide portrait (aspect < 1 and wide) its own target, and ignores `wide` everywhere else", () => {
    expect(PHONE_MAX_WIDTH).toBe(767);                               // matches CSS @media (max-width: 767px)
    expect(planetTarget(0.75, true)).toBe(PLANET_TARGET_PORTRAIT_WIDE);
    expect(planetTarget(0.75, false)).toBe(PLANET_TARGET_PORTRAIT);
    expect(planetTarget(0.75)).toBe(PLANET_TARGET_PORTRAIT);         // default is the phone's
    expect(planetTarget(1.6, true)).toBe(PLANET_TARGET_LANDSCAPE);   // landscape wins at aspect >= 1
    expect(planetTarget(1, true)).toBe(PLANET_TARGET_LANDSCAPE);
    expect(planetTarget(NaN, true)).toBe(PLANET_TARGET_LANDSCAPE);   // NaN stays landscape, as before
    expect(planetTarget(NaN)).toBe(PLANET_TARGET_LANDSCAPE);
    expect(PLANET_TARGET_PORTRAIT_WIDE).toEqual({ x: 0.5, y: -0.55 });
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
          if (planetOpacity("worlds", cp, k, n) < 1) continue;           // only where its case is lit (the settled planet)
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

  // F2: wide portraits (768x1024 and up) keep the desktop panel on the left, so the planet goes right of
  // centre and low; the landscape target would overlap the star there, the phone's would sit behind the panel.
  describe("wide portrait placement", () => {
    const WIDE: readonly (readonly [number, number])[] = [[768, 1024], [768, 941], [1024, 1366]];

    it("projects onto PLANET_TARGET_PORTRAIT_WIDE at each slot centre, clear of a left panel and of the star", () => {
      const n = 3;
      for (const [w, h] of WIDE) {
        const aspect = w / h;
        const focal = h / 2 / Math.tan(THREE.MathUtils.degToRad(30));
        for (let k = 0; k < n; k++) {
          const cp = caseCentre(k, n);
          const cam = cameraAt(cp, w, h);
          const pos = planetPosition(k, n, aspect, undefined, true);
          const ndc = pos.clone().project(cam);
          expect(ndc.x, `${w}x${h} k${k} x`).toBeCloseTo(PLANET_TARGET_WIDE_X, 6);
          expect(ndc.y, `${w}x${h} k${k} y`).toBeCloseTo(PLANET_TARGET_PORTRAIT_WIDE.y, 6);
          // Left edge of the screen disc, in NDC x: clear of a panel that ends before the screen centre.
          const radiusNdcX = (PLANET_RADIUS / pos.distanceTo(cam.position)) * focal / (w / 2);
          expect(ndc.x - radiusNdcX, `${w}x${h} k${k} left edge`).toBeGreaterThan(0);
          expect(discGap(pos, cp, w, h), `${w}x${h} k${k} star gap`).toBeGreaterThan(0);
        }
      }
    });

    it("keeps the planet and star discs apart across the whole slot, wherever the planet is shown", () => {
      const n = 3;
      const slot = (W1 - W0) / n;
      for (const [w, h] of WIDE) {
        for (let k = 0; k < n; k++) {
          const pos = planetPosition(k, n, w / h, undefined, true);
          for (const d of [-0.5, -0.25, 0, 0.25, 0.5]) {
            const cp = caseCentre(k, n) + d * slot;
            if (caseTarget(k, n, cp) !== 1) continue;
            expect(discGap(pos, cp, w, h), `${w}x${h} k${k} d${d}`).toBeGreaterThan(0);
          }
        }
      }
    });

    it("leaves the default (phone) placement and the landscape one unchanged", () => {
      expect(planetPosition(1, 3, 390 / 844).distanceTo(planetPosition(1, 3, 390 / 844, undefined, false))).toBe(0);
      expect(planetPosition(1, 3, 1.6, undefined, true).distanceTo(planetPosition(1, 3, 1.6))).toBe(0);   // aspect >= 1 ignores wide
      expect(planetPosition(1, 3, 0.75, undefined, true).distanceTo(planetPosition(1, 3, 0.75))).toBeGreaterThan(1);
    });
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
  // there would swallow the camera: clearance is only required while it is visible (A6). Since F1 a
  // planet is visible while its case is lit PLUS the ~0.2 s timed fade-out after the case changes, in
  // which a flick can still carry the camera on: SWAP_TAIL_CP (~22vh of scroll) covers that tail.
  it("keeps the camera at least 3 units off the surface for as long as each planet is visible, tail of the timed swap included", () => {
    const SWAP_TAIL_CP = 0.05;
    // [aspect, wide]: the wide-portrait placement (F2) must clear the camera too.
    for (const [aspect, wide] of [[1.6, false], [4 / 3, false], [390 / 844, false], [768 / 1024, true], [1024 / 1366, true]] as const) {
      for (const n of [3, 6, 8]) {
        for (let k = 0; k < n; k++) {
          const pos = planetPosition(k, n, aspect, undefined, wide);
          for (let i = 0; i <= 400; i++) {
            const cp = (0.9 * i) / 400;
            const litNearby = [-SWAP_TAIL_CP, -SWAP_TAIL_CP / 2, 0, SWAP_TAIL_CP / 2, SWAP_TAIL_CP].some((d) => planetOpacity("worlds", cp + d, k, n) > 0.001);
            if (!litNearby) continue;
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

// F1: planetOpacity is the SETTLED value the swap follower converges to: presence x fade-out x the
// 0/1 caseTarget the panels use. There is no scrubbed weight any more (planetWeight was deleted), so
// "exactly one planet is lit" holds by construction rather than by an invariant test.
describe("planetOpacity (settled)", () => {
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

  it("is presence x fade-out x caseTarget at every progress, so exactly one planet is lit through the window, boundaries included", () => {
    for (const n of [2, 3, 6]) {
      const slot = (W1 - W0) / n;
      const cps = [0.0001, W0, W1, WORLDS_PRESENCE_END];
      for (let b = 1; b < n; b++) for (const d of [-0.002, 0, 0.002]) cps.push(W0 + b * slot + d);
      for (let i = 1; i <= 300; i++) cps.push(W0 + ((W1 - W0) * i) / 300);
      for (const cp of cps) {
        const o = Array.from({ length: n }, (_, k) => planetOpacity("worlds", cp, k, n));
        o.forEach((v, k) => expect(v, `n${n} cp ${cp.toFixed(4)} k${k}`).toBe(planetPresenceTarget("worlds", cp) * planetFadeOut("worlds", cp) * caseTarget(k, n, cp)));
        expect(o.reduce((a, b) => a + b, 0), `n${n} cp ${cp.toFixed(4)} sum`).toBe(1);   // one planet, never two or none
      }
    }
  });

  it("is 0 for every planet outside the chapter, at its first frame, and once the last planet's fade-out has finished", () => {
    expect(planetOpacity("orbit", 0.4, 0, 3)).toBe(0);
    expect(planetOpacity("worlds", 0.95, 2, 3)).toBe(0);
    for (let k = 0; k < 3; k++) expect(planetOpacity("worlds", 0, k, 3)).toBe(0);
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

  // F2: `wide` comes from ctx.viewportWidth (>= 768 CSS px); undefined keeps the phone placement.
  it("re-places every planet when `wide` flips at a constant portrait aspect, and not otherwise", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    const cam = new THREE.PerspectiveCamera(60, 768 / 1024);
    planet.update(makeFrame({ camera: cam }));                        // viewportWidth undefined: not wide
    expect(planet.planets[0].group.position.distanceTo(planetPosition(0, 3, 768 / 1024))).toBeLessThan(1e-9);
    planet.update(makeFrame({ camera: cam, viewportWidth: PHONE_MAX_WIDTH }));
    expect(planet.planets[0].group.position.distanceTo(planetPosition(0, 3, 768 / 1024))).toBeLessThan(1e-9);
    planet.update(makeFrame({ camera: cam, viewportWidth: PHONE_MAX_WIDTH + 1 }));
    for (let k = 0; k < 3; k++) {
      expect(planet.planets[k].group.position.distanceTo(planetPosition(k, 3, 768 / 1024, undefined, true))).toBeLessThan(1e-9);
      // Lit toward the star from the new position.
      const toStar = STAR_POSITION.clone().sub(planet.planets[k].group.position).normalize();
      expect((planet.planets[k].material.uniforms.uLightDir.value as THREE.Vector3).distanceTo(toStar)).toBeLessThan(1e-9);
    }
    planet.update(makeFrame({ camera: cam, viewportWidth: 600 }));    // flips back
    expect(planet.planets[0].group.position.distanceTo(planetPosition(0, 3, 768 / 1024))).toBeLessThan(1e-9);
    // Landscape ignores `wide`: a flip there changes nothing visible, and NaN width reads as not wide.
    planet.update(makeFrame({ camera: cam, viewportWidth: NaN }));
    expect(planet.planets[0].group.position.distanceTo(planetPosition(0, 3, 768 / 1024))).toBeLessThan(1e-9);
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
// planet at once, not after 18vh of scroll. The last planet's long fade-out stays scroll-scrubbed.
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

  it("keeps the last planet's long fade-out scrubbed by scroll, not eased", () => {
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

// F1: the swap between planets is a TRIGGER too: each planet follows a 0/1 target (caseTarget, the one
// the panels use) with dt, and the outgoing planet clears BEFORE the incoming one eases in, so no
// frame ever shows two translucent planets (the standing "never rest half-built" rule).
describe("Planet update — the timed swap", () => {
  const swaps = (planet: Planet) => Array.from(planet.swaps);
  /** Opacity as drawn: a hidden group keeps a stale uniform, so it reads as 0. */
  const drawn = (planet: Planet, k: number) => (planet.planets[k].group.visible ? (planet.planets[k].material.uniforms.uOpacity.value as number) : 0);

  it("exports positive tunables with PLANET_SWAP_CLEAR a small fraction", () => {
    expect(PLANET_SWAP_OUT_RATE).toBeGreaterThan(0);
    expect(PLANET_SWAP_IN_RATE).toBeGreaterThan(0);
    expect(PLANET_SWAP_CLEAR).toBeGreaterThan(0);
    expect(PLANET_SWAP_CLEAR).toBeLessThan(0.1);
  });

  it("settles on exactly one visible planet, the caseTarget-lit one, at every progress incl. every boundary +/- 0.002", () => {
    for (const n of [2, 3, 6]) {
      const features = Array.from({ length: n }, (_, k) => FEATURES[k % FEATURES.length]);
      const { planet } = built(features);
      const slot = (W1 - W0) / n;
      const cps = [W0 + 0.001, W1];
      for (let b = 1; b < n; b++) for (const d of [-0.002, 0, 0.002]) cps.push(W0 + b * slot + d);
      for (let i = 1; i < 12; i++) cps.push(W0 + ((W1 - W0) * i) / 12);
      for (const cp of cps) {
        scrollToWorlds(cp);
        settle(planet, 60);                                           // 1 s at 60 fps, fixed cp
        const stored = voyageStore.getState().chapterProgress;         // not cp: the store round-trips through absolute progress (matters on an exact tie)
        const lit = Array.from({ length: n }, (_, k) => caseTarget(k, n, stored)).indexOf(1);
        const up = Array.from({ length: n }, (_, k) => k).filter((k) => drawn(planet, k) > 0.01);
        expect(up, `n${n} cp ${cp.toFixed(4)}`).toEqual([lit]);
      }
    }
  });

  it("never shows two planets above PLANET_SWAP_CLEAR during a swap, and the incoming one reaches 95% by 0.6 s (60 and 30 fps)", () => {
    for (const fps of [60, 30]) {
      const { planet } = built();
      scrollToWorlds(caseCentre(0, 3));
      settle(planet, 90);
      expect(swaps(planet)[0]).toBeGreaterThan(0.999);
      scrollToWorlds(W0 + (W1 - W0) / 3 + 0.01);                     // jump across the 0|1 boundary
      expect(caseTarget(1, 3, voyageStore.getState().chapterProgress)).toBe(1);
      let reached = -1;
      const frames = Math.round(fps * 1.2);
      for (let f = 1; f <= frames; f++) {
        planet.update(makeFrame({ dt: 1 / fps }));
        const above = swaps(planet).filter((v) => v > PLANET_SWAP_CLEAR);
        expect(above.length, `${fps} fps frame ${f}: ${swaps(planet).map((v) => v.toFixed(3))}`).toBeLessThanOrEqual(1);
        const visibleNow = [0, 1, 2].filter((k) => drawn(planet, k) > PLANET_SWAP_CLEAR);
        expect(visibleNow.length, `${fps} fps frame ${f} drawn`).toBeLessThanOrEqual(1);
        if (reached < 0 && swaps(planet)[1] >= 0.95) reached = f / fps;
      }
      expect(reached, `${fps} fps`).toBeGreaterThan(0);
      expect(reached, `${fps} fps`).toBeLessThanOrEqual(0.6);
    }
  });

  it("the outgoing planet clears below PLANET_SWAP_CLEAR within about 0.2 s", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    settle(planet, 90);
    scrollToWorlds(caseCentre(1, 3));
    settle(planet, 12);                                               // 0.2 s at 60 fps
    expect(swaps(planet)[0]).toBeLessThan(PLANET_SWAP_CLEAR);
  });

  it("holds the incoming planet at its start until every other planet is clear (the stage), then lets it in", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    settle(planet, 90);
    scrollToWorlds(caseCentre(1, 3));
    planet.update(makeFrame({ dt: 1 / 60 }));                         // outgoing is still above CLEAR: incoming holds
    expect(swaps(planet)[0]).toBeGreaterThan(PLANET_SWAP_CLEAR);
    expect(swaps(planet)[1]).toBe(0);
  });

  it("a reader who scrolls back mid-swap never gets two planets either", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    settle(planet, 90);
    for (let round = 0; round < 6; round++) {
      scrollToWorlds(caseCentre(round % 2 === 0 ? 1 : 0, 3));
      for (let f = 0; f < 5; f++) {                                   // a flip every 5 frames, well inside a swap
        planet.update(makeFrame({ dt: 1 / 60 }));
        expect(swaps(planet).filter((v) => v > PLANET_SWAP_CLEAR).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("treats a NaN, zero or negative dt as no step and a huge dt as landing exactly on the targets", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    settle(planet, 90);
    scrollToWorlds(caseCentre(1, 3));                                 // targets change; swaps must not move on a bad dt
    const before = swaps(planet);
    for (const dt of [NaN, 0, -1, -Infinity]) planet.update(makeFrame({ dt }));
    expect(swaps(planet)).toEqual(before);
    expect(swaps(planet).every(Number.isFinite)).toBe(true);
    planet.update(makeFrame({ dt: 10 }));                             // a resumed tab: out and in land in one frame
    expect(swaps(planet)).toEqual([0, 1, 0]);
  });

  it("snaps to the targets while the whole group is hidden, so an arrival shows the lit planet with no extra delay", () => {
    const { planet } = built();
    voyageStore.setScroll(progressAt("orbit", 0.5), 0);                // outside Worlds: shown stays ~0
    settle(planet, 5);
    expect(swaps(planet)).toEqual([0, 0, 0]);
    scrollToWorlds(caseCentre(2, 3));                                  // jump straight to the last case
    planet.update(makeFrame({ dt: 1 / 60 }));                         // first in-chapter frame
    expect(swaps(planet)).toEqual([0, 0, 1]);
    expect(planet.planets[2].group.visible).toBe(true);
    expect(drawn(planet, 2)).toBeGreaterThan(0.05);                    // = shown after one frame, with no swap delay on top
  });

  it("is hidden outside Worlds even if a stale chapterProgress would light a case (the follower targets 0 there)", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(1, 3));
    settle(planet, 90);
    voyageStore.setScroll(progressAt("belt", caseCentre(1, 3)), 0);
    settle(planet, 90);
    expect(swaps(planet)).toEqual([0, 0, 0]);
    expect(planet.object!.visible).toBe(false);
  });

  it("allocates its follower once: the swaps array is the same object across frames and rebuilds clear it", () => {
    const { planet } = built();
    const first = planet.swaps;
    scrollToWorlds(caseCentre(0, 3));
    settle(planet, 30);
    expect(planet.swaps).toBe(first);
    expect(planet.swaps).toHaveLength(3);
    planet.dispose();
    expect(planet.swaps).toHaveLength(0);
  });

  it("draws opacity as shown x fade-out x swap x ignite", () => {
    const { planet } = built();
    scrollToWorlds(caseCentre(0, 3));
    settle(planet, 90, { ignite: 0.25 });
    expect(drawn(planet, 0)).toBeCloseTo(0.25, 4);
    scrollToWorlds(WORLDS_HOLD_MOBILE);                               // inside the scrubbed fade-out of case 2
    settle(planet, 90, { ignite: 1 });
    expect(drawn(planet, 2)).toBeCloseTo(planetFadeOut("worlds", WORLDS_HOLD_MOBILE), 3);
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
