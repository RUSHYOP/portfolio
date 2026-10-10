import { CHAPTERS, chapterAt, distanceAU, type Chapter } from "@/scene/camera/flightPath";

export interface VoyageState {
  /** Canonical 0..1 story progress; measured geometry maps physical page scroll. */
  progress: number;
  /** 0..1 normalized scroll speed (sign-less). */
  velocity: number;
  chapter: Chapter;
  /** 0..1 within the current chapter. */
  chapterProgress: number;
  distanceAU: number;
  /** Wall-clock ms since the voyage mounted (drives the T+ readout). */
  elapsedMs: number;
  /** True while a scrollTo() is travelling to its target, for chapter-edge detectors. */
  programmatic: boolean;
}

type Listener = (state: VoyageState) => void;

// One story with flightPath.ts: Lenis reports `progress === 1` when `limit <= 0` (an
// unscrollable page), which VoyageScroll guards at the source — but NaN can still arrive
// from other callers, and mapping it to 0 keeps the HUD at the start rather than poisoning
// the state. ±Infinity saturates normally, so a runaway ratio pins to the end of the
// voyage rather than the start.
const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));

/** Scroll speed in px/frame that maps to velocity 1.0. */
export const VELOCITY_NORMALIZER = 40;

export function normalizeVelocity(pxPerFrame: number): number {
  return clamp01(Math.abs(pxPerFrame) / VELOCITY_NORMALIZER);
}

/** How close a scroll must land to the target before the flag clears. */
export const PROGRAMMATIC_EPS = 0.002;

/** Hard ceiling for a programmatic scroll whose animation stalls or is interrupted. */
export const PROGRAMMATIC_TIMEOUT_MS = 2000;

let programmaticTarget: number | null = null;
let programmaticDeadlineMs = 0;
let lastMovementMs = 0;

function resolveProgrammatic(progress: number): boolean {
  if (programmaticTarget === null) return false;
  if (Math.abs(progress - programmaticTarget) < PROGRAMMATIC_EPS || Date.now() >= programmaticDeadlineMs) {
    programmaticTarget = null;
    return false;
  }
  return true;
}

function initialState(): VoyageState {
  return {
    progress: 0,
    velocity: 0,
    chapter: CHAPTERS[0],
    chapterProgress: 0,
    distanceAU: distanceAU(0),
    elapsedMs: 0,
    programmatic: false,
  };
}

let state: VoyageState = initialState();
const listeners = new Set<Listener>();
let scroller: ((progress: number) => void) | null = null;

function emit() {
  for (const l of listeners) l(state);
}

export const voyageStore = {
  getState(): VoyageState {
    return state;
  },

  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },

  setScroll(progress: number, velocity01: number): void {
    const p = clamp01(progress);
    const wasProgrammatic = state.programmatic;
    if (p !== state.progress) lastMovementMs = Date.now();
    // A target or timeout can clear the flag even when progress and velocity match.
    const programmatic = resolveProgrammatic(p);
    const v = wasProgrammatic || programmatic ? 0 : clamp01(velocity01);
    if (p === state.progress && v === state.velocity && programmatic === state.programmatic) return;
    const { chapter, chapterProgress } = chapterAt(p);
    state = { ...state, progress: p, velocity: v, chapter, chapterProgress, distanceAU: distanceAU(p), programmatic };
    emit();
  },

  tick(dtMs: number): void {
    // NaN/Infinity deltas (a stalled or mis-timed interval) would poison elapsedMs permanently.
    if (!Number.isFinite(dtMs) || dtMs <= 0) return;
    // Scroll events may stop before the deadline; the clock still clears a stale trip.
    state = { ...state, velocity: Date.now() - lastMovementMs >= 100 ? 0 : state.velocity, elapsedMs: state.elapsedMs + dtMs, programmatic: resolveProgrammatic(state.progress) };
    emit();
  },

  registerScroller(fn: (progress: number) => void): void {
    scroller = fn;
  },

  /** Drops the registered scroller. The bridge calls this on unmount so a destroyed
   *  Lenis instance (or a stale native handler) can never be driven by a later scrollTo. */
  unregisterScroller(): void {
    scroller = null;
  },

  scrollTo(progress: number): void {
    if (!scroller) return;
    const p = clamp01(progress);
    // No scroll event will arrive if the reader is already at the destination.
    // A later request to stay here also cancels any earlier destination.
    if (Math.abs(p - state.progress) < PROGRAMMATIC_EPS) {
      programmaticTarget = null;
      programmaticDeadlineMs = 0;
      if (state.programmatic) {
        state = { ...state, programmatic: false };
        emit();
      }
      scroller(p);
      return;
    }
    programmaticTarget = p;
    programmaticDeadlineMs = Date.now() + PROGRAMMATIC_TIMEOUT_MS;
    if (!state.programmatic) {
      state = { ...state, programmatic: true, velocity: 0 };
      emit();
    }
    scroller(p);
  },

  /** Test-only: clears listeners as well as state. */
  reset(): void {
    state = initialState();
    listeners.clear();
    scroller = null;
    programmaticTarget = null;
    programmaticDeadlineMs = 0;
    lastMovementMs = 0;
  },
};
