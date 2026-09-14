import { CHAPTERS, chapterAt, distanceAU, type Chapter } from "@/scene/camera/flightPath";

export interface VoyageState {
  /** 0..1 normalized scroll through the whole voyage. */
  progress: number;
  /** 0..1 normalized scroll speed (sign-less). */
  velocity: number;
  chapter: Chapter;
  /** 0..1 within the current chapter. */
  chapterProgress: number;
  distanceAU: number;
  /** Wall-clock ms since the voyage mounted (drives the T+ readout). */
  elapsedMs: number;
}

type Listener = (state: VoyageState) => void;

// NaN (a 0/0 scroll ratio reported before layout) maps to 0; ±Infinity saturates
// normally, so a runaway ratio pins to the end of the voyage rather than the start.
const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));

/** Scroll speed in px/frame that maps to velocity 1.0. */
export const VELOCITY_NORMALIZER = 40;

export function normalizeVelocity(pxPerFrame: number): number {
  return clamp01(Math.abs(pxPerFrame) / VELOCITY_NORMALIZER);
}

function initialState(): VoyageState {
  return {
    progress: 0,
    velocity: 0,
    chapter: CHAPTERS[0],
    chapterProgress: 0,
    distanceAU: distanceAU(0),
    elapsedMs: 0,
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
    const v = clamp01(velocity01);
    if (p === state.progress && v === state.velocity) return;
    const { chapter, chapterProgress } = chapterAt(p);
    state = { ...state, progress: p, velocity: v, chapter, chapterProgress, distanceAU: distanceAU(p) };
    emit();
  },

  tick(dtMs: number): void {
    if (dtMs <= 0) return;
    state = { ...state, elapsedMs: state.elapsedMs + dtMs };
    emit();
  },

  registerScroller(fn: (progress: number) => void): void {
    scroller = fn;
  },

  scrollTo(progress: number): void {
    scroller?.(clamp01(progress));
  },

  reset(): void {
    state = initialState();
    listeners.clear();
    scroller = null;
  },
};
