import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { Starfield } from "./Starfield";
import { TIER_SETTINGS } from "@/scene/quality";

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
  });

  it("soften enlarges and dims; fade dims to black; dispose empties the scene", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "high");
    const base = field.material.size;
    field.setSoften(1);
    field.applyControls(1);
    expect(field.material.size).toBeGreaterThan(base);
    expect(field.material.opacity).toBeLessThan(1);
    field.setSoften(0);
    field.setFade(1);
    field.applyControls(1);
    expect(field.material.opacity).toBe(0);
    field.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
