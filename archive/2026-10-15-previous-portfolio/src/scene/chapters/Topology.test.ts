import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { Topology, visibleNodeCount, topologyFade } from "./Topology";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { progressAt } from "@/scene/camera/flightPath";
import { makeFrame } from "./testUtils";

// The store is module-global; reset so scroll state cannot leak between tests.
beforeEach(() => voyageStore.reset());

// Approach's chapterProgress 1/3 — the last frame the 100vh pin is stationary (graph whole).
const DOCKED = progressAt("approach", 1 / 3);

const nodesOf = (t: Topology) => (t.object!.children[0] as THREE.Points).geometry;
const edgesOf = (t: Topology) => (t.object!.children[1] as THREE.LineSegments).geometry;

describe("visibleNodeCount", () => {
  it("assembles from none to all across the assembly window", () => {
    expect(visibleNodeCount(42, 0)).toBe(0);
    expect(visibleNodeCount(42, 0.06)).toBe(0);
    expect(visibleNodeCount(42, 0.3)).toBe(42);
    expect(visibleNodeCount(42, 1)).toBe(42);
    expect(visibleNodeCount(42, 0.18)).toBe(21);
  });

  it("never goes backwards and handles an empty graph", () => {
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const n = visibleNodeCount(42, i / 100);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(visibleNodeCount(0, 0.5)).toBe(0);
  });
});

describe("topologyFade", () => {
  it("is zero outside Approach and at both ends of it", () => {
    expect(topologyFade("launch", 0.5)).toBe(0);
    expect(topologyFade("jump", 0.5)).toBe(0);
    expect(topologyFade("approach", 0)).toBe(0);
    expect(topologyFade("approach", 1)).toBe(0);
  });

  it("is full while the panels are docked and fades out after", () => {
    expect(topologyFade("approach", 1 / 3)).toBeCloseTo(1, 10);
    expect(topologyFade("approach", 0.5)).toBeCloseTo(1, 10);
    expect(topologyFade("approach", 0.6)).toBeGreaterThan(0);
    expect(topologyFade("approach", 0.6)).toBeLessThan(1);
    expect(topologyFade("approach", 0.75)).toBe(0);
  });
});

describe("Topology", () => {
  it("builds the tier's node count plus one edge per node after the first", () => {
    const scene = new THREE.Scene();
    const topo = new Topology();
    topo.build(scene, "high");
    expect(topo.count).toBe(TIER_SETTINGS.high.topologyNodes);
    expect(topo.edgeCount).toBe(TIER_SETTINGS.high.topologyNodes - 1);
    expect(scene.children).toHaveLength(1);
    expect(topo.object?.children).toHaveLength(2);
    expect(nodesOf(topo).getAttribute("position").count).toBe(TIER_SETTINGS.high.topologyNodes);
    expect(edgesOf(topo).getAttribute("position").count).toBe((TIER_SETTINGS.high.topologyNodes - 1) * 2);
  });

  it("keeps every node inside the graph's own volume", () => {
    const topo = new Topology();
    topo.build(new THREE.Scene(), "high");
    const p = topo.positions;
    let maxR = 0, maxZ = 0;
    for (let i = 0; i < p.length; i += 3) {
      maxR = Math.max(maxR, Math.hypot(p[i], p[i + 1]));
      maxZ = Math.max(maxZ, Math.abs(p[i + 2]));
    }
    expect(maxR).toBeLessThanOrEqual(9);
    expect(maxZ).toBeLessThanOrEqual(3.5);
  });

  it("is deterministic across instances and rebuilds", () => {
    const a = new Topology();
    const b = new Topology();
    a.build(new THREE.Scene(), "high");
    b.build(new THREE.Scene(), "high");
    expect(a.positions).toEqual(b.positions);
    // Locks the seed-9901 sequence itself, so re-ordering the rand() draws (or moving the
    // edge pass in front of the placement loop) cannot silently move every node.
    expect(a.positions[0]).toBeCloseTo(-4.798959255218506, 6);

    const scene = new THREE.Scene();
    const c = new Topology();
    c.build(scene, "mid");
    const first = Float32Array.from(c.positions);
    c.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(c.positions).toEqual(first);
  });

  it("is hidden outside Approach and assembles across it", () => {
    const topo = new Topology();
    // update() before build() must not throw — SceneRoot may tick before the build lands.
    expect(() => topo.update(makeFrame())).not.toThrow();

    topo.build(new THREE.Scene(), "high");
    topo.update(makeFrame());                        // launch
    expect(topo.object?.visible).toBe(false);

    voyageStore.setScroll(progressAt("approach", 1 / 6), 0); // approach, mid-assembly
    const midProgress = voyageStore.getState().chapterProgress;
    topo.update(makeFrame());
    expect(topo.object?.visible).toBe(true);
    const partial = visibleNodeCount(TIER_SETTINGS.high.topologyNodes, midProgress);
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(TIER_SETTINGS.high.topologyNodes);
    expect(nodesOf(topo).drawRange.count).toBe(partial);
    expect(edgesOf(topo).drawRange.count).toBe((partial - 1) * 2);

    voyageStore.setScroll(DOCKED, 0);                // docked: whole graph
    topo.update(makeFrame());
    expect(nodesOf(topo).drawRange.count).toBe(TIER_SETTINGS.high.topologyNodes);
    expect(topo.nodeMaterial.opacity).toBeGreaterThan(0);

    voyageStore.setScroll(progressAt("jump", 0.5), 0); // jump: gone again
    topo.update(makeFrame());
    expect(topo.object?.visible).toBe(false);
  });

  // A translated, yawed camera: with an identity camera a world-axis offset would produce
  // the same position, so only this pose proves the offset is applied in *camera* space.
  it("sits at its camera-space offset in front of the camera and faces it", () => {
    const topo = new Topology();
    topo.build(new THREE.Scene(), "mid");
    voyageStore.setScroll(DOCKED, 0);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 0, 0);
    camera.rotation.y = Math.PI / 2;                 // looking down world -x
    camera.updateMatrixWorld();
    topo.update(makeFrame({ camera }));
    const local = topo.object!.position.clone()
      .sub(camera.position)
      .applyQuaternion(camera.quaternion.clone().invert());
    // Literals pin Topology's OFFSET_X / OFFSET_Y / OFFSET_Z.
    expect(local.x).toBeCloseTo(-0.9, 6);
    expect(local.y).toBeCloseTo(1.4, 6);
    expect(local.z).toBeCloseTo(-24, 6);
    expect(topo.object!.quaternion.equals(camera.quaternion)).toBe(true);
  });

  it("builds an empty but valid graph on the still tier", () => {
    const scene = new THREE.Scene();
    const topo = new Topology();
    topo.build(scene, "still");
    expect(topo.count).toBe(0);
    expect(topo.edgeCount).toBe(0);
    expect(scene.children).toHaveLength(1);
    voyageStore.setScroll(DOCKED, 0);
    expect(() => topo.update(makeFrame())).not.toThrow();
  });

  it("links every node to one that is already placed", () => {
    // The load-bearing invariant behind the draw-range assembly: the first k edges may only
    // join the first k+1 nodes. Every other assertion here reads buffer lengths, the seed
    // literal or draw-range counts, all of which a forward-referencing edge loop leaves
    // byte-identical. Exact float comparison is valid because the edge pass copies node
    // vertices straight out of _positions. Vertices 0-2 are the neighbour, 3-5 are node i.
    const topo = new Topology();
    topo.build(new THREE.Scene(), "high");
    const nodes = topo.positions;
    const edges = edgesOf(topo).getAttribute("position").array as Float32Array;
    const indexOf = (x: number, y: number, z: number) => {
      for (let k = 0; k < topo.count; k++) {
        if (nodes[k * 3] === x && nodes[k * 3 + 1] === y && nodes[k * 3 + 2] === z) return k;
      }
      return -1;
    };
    for (let i = 1; i < topo.count; i++) {
      const e = (i - 1) * 6;
      expect(edges[e + 3]).toBe(nodes[i * 3]);       // the far vertex is node i
      expect(edges[e + 4]).toBe(nodes[i * 3 + 1]);
      expect(edges[e + 5]).toBe(nodes[i * 3 + 2]);
      const j = indexOf(edges[e + 0], edges[e + 1], edges[e + 2]);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(i);                     // …and the near vertex precedes it
    }
  });

  it("fades both materials with the ignition curtain", () => {
    // The new ctx.ignite multipliers are unreachable from every other test in this file,
    // because makeFrame() defaults to ignite: 1 — dropping them would leave the suite green
    // while the graph popped in at full brightness behind the ignition curtain.
    const topo = new Topology();
    topo.build(new THREE.Scene(), "high");
    voyageStore.setScroll(DOCKED, 0);                // topologyFade === 1 at chapterProgress 1/3
    topo.update(makeFrame({ ignite: 0.5 }));
    expect(topo.nodeMaterial.opacity).toBeCloseTo(0.45, 6);
    expect(topo.edgeMaterial.opacity).toBeCloseTo(0.14, 6);
  });

  it("disposes idempotently and rebuilds after a dispose", () => {
    const scene = new THREE.Scene();
    const topo = new Topology();
    topo.build(scene, "mid");
    const firstGeometry = nodesOf(topo);
    topo.dispose();
    expect(scene.children).toHaveLength(0);
    expect(() => topo.dispose()).not.toThrow();
    topo.build(scene, "mid");
    expect(scene.children).toHaveLength(1);
    expect(nodesOf(topo)).not.toBe(firstGeometry);
  });
});
