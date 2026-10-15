import type * as THREE from "three";
import type { Tier } from "@/scene/quality";
import type { VoyageState } from "@/scene/scroll/voyageStore";

export interface FrameContext {
  /** Seconds since the scene mounted. */
  t: number;
  /** Seconds since the previous frame. */
  dt: number;
  voyage: VoyageState;
  camera: THREE.PerspectiveCamera;
  /** 0..1 smoothed audio energy from the analyser (0 when muted). */
  audioEnergy: number;
  /** 0..1 ignite fade-in. */
  ignite: number;
  /** window.innerWidth in CSS px (SceneRoot keeps it beside camera.aspect). Optional: absent in tests
   *  and means "not wide", so the phone placement applies below aspect 1. */
  viewportWidth?: number;
}

export interface SetPiece {
  build(scene: THREE.Scene, tier: Tier): void;
  update(ctx: FrameContext): void;
  dispose(): void;
}
