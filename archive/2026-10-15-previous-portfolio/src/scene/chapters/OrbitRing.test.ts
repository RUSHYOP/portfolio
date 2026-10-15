import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import {
  OrbitRing, ringFade, ringSpin,
  RING_RADIUS, RING_TILT, RING_OPACITY, NODE_RADIUS, NODE_ACTIVE_BOOST,
} from "./OrbitRing";
import { ORBIT_WINDOW, ORBIT_PRESENCE_END } from "./orbitSchedule";
import { TIER_SETTINGS } from "@/scene/quality";
import { STAR_POSITION, getCameraPose, progressAt } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

const [W0, W1] = ORBIT_WINDOW;
/** Orbit chapterProgress at the middle of step `i`'s slot, i.e. where the cursor equals `i`. */
const centre = (i: number, n: number) => W0 + ((i + 0.5) / n) * (W1 - W0);
const scrollToOrbit = (cp: number) => voyageStore.setScroll(progressAt("orbit", cp), 0);

/** Build a ring in a fresh scene and return both. */
function built(stepCount: number, tier: "high" | "mid" | "still" = "high") {
  const scene = new THREE.Scene();
  const ring = new OrbitRing(stepCount);
  ring.build(scene, tier);
  return { scene, ring };
}
const worldPos = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());

describe("ringFade", () => {
  it("is 0 outside Orbit and at its first frame", () => {
    for (const id of ["launch", "approach", "jump", "worlds", "belt", "pilot", "surface"] as const) {
      expect(ringFade(id, 0.5)).toBe(0);
    }
    expect(ringFade("orbit", 0)).toBe(0);
  });

  it("fades in over the first 10% and holds through the schedule window and its edge margin", () => {
    expect(ringFade("orbit", 0.05)).toBeGreaterThan(0);
    expect(ringFade("orbit", 0.05)).toBeLessThan(1);
    for (const cp of [0.1, 0.3, 0.5, ORBIT_PRESENCE_END]) expect(ringFade("orbit", cp)).toBe(1);
  });

  it("is completely faded out by chapterProgress 0.9 and stays out (the camera flies through later)", () => {
    expect(ringFade("orbit", 0.8)).toBeGreaterThan(0);
    expect(ringFade("orbit", 0.8)).toBeLessThan(1);
    for (const cp of [0.9, 0.95, 1]) expect(ringFade("orbit", cp)).toBe(0);
  });

  it("never rises while fading out, and clamps NaN to the chapter start", () => {
    let prev = 2;
    for (let k = 0; k <= 100; k++) {
      const v = ringFade("orbit", ORBIT_PRESENCE_END + (k / 100) * (0.9 - ORBIT_PRESENCE_END));
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
    expect(ringFade("orbit", NaN)).toBe(0);
  });
});

describe("ringSpin", () => {
  it("puts node k at the front-centre (−90° in the ring plane) when the cursor is k", () => {
    for (const n of [1, 2, 4, 6]) {
      for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k) / n + ringSpin(k, n);
        expect(Math.cos(angle)).toBeCloseTo(0, 9);
        expect(Math.sin(angle)).toBeCloseTo(-1, 9);
      }
    }
  });

  it("turns the ring one node-spacing per step and is 0 for an empty ring", () => {
    expect(ringSpin(0, 4) - ringSpin(1, 4)).toBeCloseTo(Math.PI / 2, 12);
    expect(ringSpin(0, 0)).toBe(0);
    expect(ringSpin(3, -2)).toBe(0);
  });
});

describe("OrbitRing build", () => {
  it("builds a torus with the tier's segment count and one node per step", () => {
    for (const tier of ["high", "mid"] as const) {
      const { scene, ring } = built(4, tier);
      expect(scene.children).toHaveLength(1);
      expect(ring.torus!.geometry.parameters.tubularSegments).toBe(TIER_SETTINGS[tier].ringSegments);
      expect(ring.torus!.geometry.parameters.radius).toBe(RING_RADIUS);
      expect(ring.nodes!.children).toHaveLength(4);
      expect(ring.count).toBe(4);
    }
  });

  it("sits on the star, in world space, tilted so the ring is a shallow ellipse", () => {
    const { ring } = built(4);
    expect(ring.object!.position.equals(STAR_POSITION)).toBe(true);
    expect(ring.tilt!.rotation.x).toBeCloseTo(-RING_TILT, 12);
    expect(RING_TILT).toBeGreaterThan(Math.PI / 3);      // well past 60°: shallow, not a face-on circle
    expect(RING_TILT).toBeLessThan(Math.PI / 2);         // …but not edge-on
  });

  it("uses additive, depth-tested materials (a guard: at the default tilt the back arc never reaches the disc)", () => {
    const { ring } = built(4);
    for (const m of [ring.ringMaterial, ring.nodeMaterial]) {
      expect(m).toBeInstanceOf(THREE.MeshBasicMaterial);
      expect(m.depthTest).toBe(true);
      expect(m.depthWrite).toBe(false);
      expect(m.transparent).toBe(true);
      expect(m.blending).toBe(THREE.AdditiveBlending);
      expect(m.color.getHex()).toBe(0xffffff);           // monochrome: amber is the star's alone
    }
  });

  it("sanitises the step count: negatives, NaN and Infinity are empty, fractions floor", () => {
    expect(new OrbitRing(-3).count).toBe(0);
    expect(new OrbitRing(NaN).count).toBe(0);
    expect(new OrbitRing(Infinity).count).toBe(0);
    expect(new OrbitRing(2.9).count).toBe(2);
  });

  it("builds nothing visible for zero steps or the still tier (no GPU resources for nothing)", () => {
    for (const { ring } of [built(0), built(4, "still")]) {
      expect(ring.object!.children).toHaveLength(0);
      expect(ring.torus).toBeNull();
      scrollToOrbit(0.3);
      expect(() => ring.update(makeFrame())).not.toThrow();
      expect(ring.object!.visible).toBe(false);
    }
  });
});

describe("OrbitRing update", () => {
  it("is a no-op before build() and after dispose()", () => {
    const ring = new OrbitRing(4);
    expect(() => ring.update(makeFrame())).not.toThrow();
    const { ring: b } = built(4);
    b.dispose();
    expect(() => b.update(makeFrame())).not.toThrow();
  });

  it("is hidden outside Orbit and once its fade has finished, visible between", () => {
    const { ring } = built(4);
    ring.update(makeFrame());                                         // launch
    expect(ring.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("approach", 0.9), 0);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("jump", 0.5), 0);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(false);
    scrollToOrbit(0.3);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(true);
    scrollToOrbit(0.9);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(false);
    voyageStore.setScroll(progressAt("worlds", 0.1), 0);
    ring.update(makeFrame());
    expect(ring.object!.visible).toBe(false);
  });

  it("brings node round(cursor) to the lowest point of the near arc, below the star disc", () => {
    const n = 4;
    const { ring } = built(n);
    for (let i = 0; i < n; i++) {
      scrollToOrbit(centre(i, n));
      ring.update(makeFrame());
      ring.object!.updateMatrixWorld(true);
      const p = ring.nodes!.children.map(worldPos);
      // Front-centre: where the ring's lowest near-arc point is — below the star by R·cos(tilt)
      // and R·sin(tilt) nearer the camera (+z).
      expect(p[i].x).toBeCloseTo(STAR_POSITION.x, 6);
      expect(p[i].y).toBeCloseTo(STAR_POSITION.y - RING_RADIUS * Math.cos(RING_TILT), 6);
      expect(p[i].z).toBeCloseTo(STAR_POSITION.z + RING_RADIUS * Math.sin(RING_TILT), 6);
      // …and it is the nearest node to the camera and the lowest node on the ring.
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        expect(p[i].z).toBeGreaterThan(p[j].z);
        expect(p[i].y).toBeLessThan(p[j].y);
      }
      // Below the star disc: even the biggest star (2.4 radii) leaves the node clear.
      expect(STAR_POSITION.y - p[i].y).toBeGreaterThan(2.4);
    }
  });

  it("keeps every node on the ring while it turns", () => {
    const { ring } = built(6);
    scrollToOrbit(0.3);
    ring.update(makeFrame());
    ring.object!.updateMatrixWorld(true);
    for (const node of ring.nodes!.children) {
      const local = ring.tilt!.worldToLocal(worldPos(node));
      expect(Math.hypot(local.x, local.y)).toBeCloseTo(RING_RADIUS, 6);
      expect(local.z).toBeCloseTo(0, 6);
    }
  });

  it("swells the active node and shrinks the rest", () => {
    const n = 4;
    const { ring } = built(n);
    scrollToOrbit(centre(1, n));
    ring.update(makeFrame());
    const scale = (k: number) => ring.nodes!.children[k].scale.x;
    expect(scale(1)).toBeCloseTo(NODE_RADIUS * (1 + NODE_ACTIVE_BOOST), 9);
    for (const k of [0, 2, 3]) expect(scale(k)).toBeCloseTo(NODE_RADIUS, 9);
  });

  it("rotates the nodes by ringSpin(cursor) and keeps a lone node static", () => {
    const { ring } = built(1);
    for (const cp of [0.1, 0.3, 0.55]) {
      scrollToOrbit(cp);
      ring.update(makeFrame());
      expect(ring.nodes!.rotation.z).toBe(ringSpin(0, 1));
    }
  });

  it("scales both materials by the fade and by the ignition curtain", () => {
    const { ring } = built(4);
    scrollToOrbit(0.3);                                               // ringFade === 1
    ring.update(makeFrame({ ignite: 0.5 }));
    expect(ring.ringMaterial.opacity).toBeCloseTo(RING_OPACITY * 0.5, 6);
    expect(ring.nodeMaterial.opacity).toBeGreaterThan(ring.ringMaterial.opacity);
    scrollToOrbit(0.05);                                              // mid fade-in
    ring.update(makeFrame());
    expect(ring.ringMaterial.opacity).toBeGreaterThan(0);
    expect(ring.ringMaterial.opacity).toBeLessThan(RING_OPACITY);
  });

  // Spec/decision: nearest ring point ≥ ~15 units from the camera at orbit exit. The ring is
  // checked against the real camera path at every point it can be visible (cp ≤ 0.9).
  it("never comes within 15 world units of the camera while it is visible", () => {
    const { ring } = built(4, "high");
    ring.object!.updateMatrixWorld(true);
    const torusMatrix = ring.torus!.matrixWorld;
    let nearest = Infinity;
    for (const cp of [0, 0.25, 0.5, 0.75, 0.9]) {
      const cam = getCameraPose(progressAt("orbit", cp)).position;
      for (let k = 0; k < 720; k++) {
        const a = (k / 720) * Math.PI * 2;
        const pt = new THREE.Vector3(Math.cos(a) * RING_RADIUS, Math.sin(a) * RING_RADIUS, 0).applyMatrix4(torusMatrix);
        nearest = Math.min(nearest, pt.distanceTo(cam));
      }
    }
    expect(nearest).toBeGreaterThanOrEqual(15);
  });
});

describe("OrbitRing lifecycle", () => {
  it("replaces the previous ring when build() is called twice", () => {
    const scene = new THREE.Scene();
    const ring = new OrbitRing(4);
    ring.build(scene, "high");
    const first = ring.torus!.geometry;
    ring.build(scene, "high");
    expect(scene.children).toHaveLength(1);
    expect(ring.torus!.geometry).not.toBe(first);
    expect(ring.nodes!.children).toHaveLength(4);
  });

  it("disposes idempotently and rebuilds after a dispose", () => {
    const scene = new THREE.Scene();
    const ring = new OrbitRing(4);
    ring.build(scene, "mid");
    const first = ring.torus!.geometry;
    const onDispose = vi.fn();
    first.addEventListener("dispose", onDispose);        // the torus' GPU buffers are freed, exactly once
    ring.dispose();
    expect(onDispose).toHaveBeenCalledTimes(1);
    expect(scene.children).toHaveLength(0);
    expect(ring.object).toBeNull();
    expect(() => ring.dispose()).not.toThrow();
    expect(onDispose).toHaveBeenCalledTimes(1);          // a second dispose frees nothing twice
    ring.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(ring.torus!.geometry).not.toBe(first);
  });
});
