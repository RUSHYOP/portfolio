import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { Topology, visibleNodeCount, topologyFade } from "./Topology";
import { TIER_SETTINGS } from "@/scene/quality";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { makeFrame } from "./testUtils";

beforeEach(() => voyageStore.reset());

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
  it("is full while panels are docked and fades out after", () => {
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
    expect(() => topo.update(makeFrame())).not.toThrow();
    topo.build(new THREE.Scene(), "high");
    topo.update(makeFrame());
    expect(topo.object?.visible).toBe(false);
    voyageStore.setScroll(0.1, 0);
    const midProgress = voyageStore.getState().chapterProgress;
    topo.update(makeFrame());
    expect(topo.object?.visible).toBe(true);
    const partial = visibleNodeCount(TIER_SETTINGS.high.topologyNodes, midProgress);
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(TIER_SETTINGS.high.topologyNodes);
    expect(nodesOf(topo).drawRange.count).toBe(partial);
    expect(edgesOf(topo).drawRange.count).toBe((partial - 1) * 2);
    voyageStore.setScroll(0.12, 0);
    topo.update(makeFrame());
    expect(nodesOf(topo).drawRange.count).toBe(TIER_SETTINGS.high.topologyNodes);
    expect(topo.nodeMaterial.opacity).toBeGreaterThan(0);
    voyageStore.setScroll(0.21, 0);
    topo.update(makeFrame());
    expect(topo.object?.visible).toBe(false);
  });
  it("sits in front of the camera and faces it", () => {
    const topo = new Topology();
    topo.build(new THREE.Scene(), "mid");
    voyageStore.setScroll(0.12, 0);
    const camera = new THREE.PerspectiveCamera();
    topo.update(makeFrame({ camera }));
    expect(topo.object!.position.z).toBeLessThan(-10);
    expect(topo.object!.quaternion.equals(camera.quaternion)).toBe(true);
  });
  it("builds an empty but valid graph on the still tier", () => {
    const scene = new THREE.Scene();
    const topo = new Topology();
    topo.build(scene, "still");
    expect(topo.count).toBe(0);
    expect(topo.edgeCount).toBe(0);
    expect(scene.children).toHaveLength(1);
    voyageStore.setScroll(0.12, 0);
    expect(() => topo.update(makeFrame())).not.toThrow();
  });
  it("links every node to one that is already placed", () => {
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
      expect(edges[e + 3]).toBe(nodes[i * 3]);
      expect(edges[e + 4]).toBe(nodes[i * 3 + 1]);
      expect(edges[e + 5]).toBe(nodes[i * 3 + 2]);
      const j = indexOf(edges[e], edges[e + 1], edges[e + 2]);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(i);
    }
  });
  it("fades both materials with the ignition curtain", () => {
    const topo = new Topology();
    topo.build(new THREE.Scene(), "high");
    voyageStore.setScroll(0.12, 0);
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
