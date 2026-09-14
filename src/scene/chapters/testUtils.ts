import * as THREE from "three";
import { voyageStore } from "@/scene/scroll/voyageStore";
import type { FrameContext } from "./types";

/**
 * Minimal one-frame context for SetPiece tests; per-test overrides go through the partial.
 * voyageStore.getState() is read per call, so a setScroll() before makeFrame() is picked up.
 * Not a *.test.ts file, so vitest's include pattern does not collect it as a suite.
 */
export function makeFrame(overrides: Partial<FrameContext> = {}): FrameContext {
  return {
    t: 1,
    dt: 1 / 60,
    voyage: voyageStore.getState(),
    camera: new THREE.PerspectiveCamera(),
    audioEnergy: 0,
    ignite: 1,
    ...overrides,
  };
}
