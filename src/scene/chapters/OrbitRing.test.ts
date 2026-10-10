import { expect, it } from "vitest";
import * as THREE from "three";
import { OrbitRing } from "./OrbitRing";
import { voyageStore } from "@/scene/scroll/voyageStore";
import type { FrameContext } from "./types";

it("brings each process node to the same front point and releases resources", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1440 / 900, 0.1, 400);
  const ring = new OrbitRing(4);
  const ctx: FrameContext = { camera, voyage: voyageStore.getState(), t: 0, dt: 1 / 60, audioEnergy: 0, ignite: 1 };
  ring.update(ctx); // legal before build
  ring.build(scene, "high");
  let front: THREE.Vector3 | undefined;
  for (let i = 0; i < 4; i++) {
    voyageStore.setScroll(0.22 + 0.12 * (i + 0.5) / 5, 0);
    ctx.voyage = voyageStore.getState();
    ring.update(ctx);
    scene.updateMatrixWorld(true);
    const node = scene.getObjectByName(`orbit-node-${i}`)!;
    const position = node.getWorldPosition(new THREE.Vector3());
    if (!front) front = position;
    expect(position.distanceTo(front)).toBeLessThan(0.0001);
  }
  ring.dispose();
  ring.dispose();
  expect(scene.children).toHaveLength(0);
  voyageStore.reset();
});

it("builds nothing for still tier or empty process", () => {
  const scene = new THREE.Scene();
  new OrbitRing(4).build(scene, "still");
  new OrbitRing(0).build(scene, "high");
  expect(scene.children).toHaveLength(0);
});
