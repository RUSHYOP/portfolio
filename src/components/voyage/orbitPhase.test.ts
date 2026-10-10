import { expect, it } from "vitest";
import { orbitHeightVh, orbitPhase } from "./orbitPhase";

it("allocates four viewport holds and one exit", () => {
  expect(orbitHeightVh(4)).toBe(500);
  for (let i = 0; i < 4; i++) {
    const phase = orbitPhase((i + .5) / 5, 4);
    expect(phase.index).toBe(i);
    expect(phase.angle).toBeCloseTo(-i * Math.PI / 2);
    expect(phase.fade).toBe(1);
  }
  expect(orbitPhase(1, 4).index).toBe(3);
});

it("is finite for no steps and saturates oversized progress", () => {
  expect(orbitPhase(0, 0)).toEqual({ index: -1, angle: 0, fade: 0 });
  expect(orbitHeightVh(0)).toBe(150);
  expect(orbitPhase(2, 1)).toEqual({ index: 0, angle: 0, fade: 1 });
});
