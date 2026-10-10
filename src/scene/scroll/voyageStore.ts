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
  /** True while a voyageStore.scrollTo() is still travelling to its target. Chapter-edge
   *  detectors read it so a CTA that scrolls *through* a micro-beat does not fire it. */
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

/** How close a settled scroll must land to the programmatic target before the flag clears. */
export const PROGRAMMATIC_EPS = 0.002;

/** Hard ceiling on one programmatic scroll. Lenis animates for 1.4s (VoyageScroll.tsx:39),
 *  and a user wheel/touch interrupting it leaves the target unreached; without this exit an
 *  interrupted scrollTo would suppress the Jump beat for the rest of the session.
 *  Read via Date.now() (not performance.now()) so vitest fake timers can drive the timeout. */
export const PROGRAMMATIC_TIMEOUT_MS = 2000;

let programmaticTarget: number | null = null;
let programmaticDeadlineMs = 0;

/** Three exits: within EPS of the target, past the deadline, or replaced by a later
 *  scrollTo (which simply overwrites the target and the deadline). */
function resolveProgrammatic(p: number): boolean {
  if (programmaticTarget === null) return false;
  if (Math.abs(p - programmaticTarget) < PROGRAMMATIC_EPS || Date.now() >= programmaticDeadlineMs) {
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
    const v = clamp01(velocity01);
    // Resolved before the no-change guard: the emit that lands on the target is often
    // bit-identical to the previous one, and the flag still has to clear on it.
    const prog = resolveProgrammatic(p);
    if (p === state.progress && v === state.velocity && prog === state.programmatic) return;
    const { chapter, chapterProgress } = chapterAt(p);
    state = { ...state, progress: p, velocity: v, chapter, chapterProgress, distanceAU: distanceAU(p), programmatic: prog };
    emit();
  },

  tick(dtMs: number): void {
    // NaN/Infinity deltas (a stalled or mis-timed interval) would poison elapsedMs permanently.
    if (!Number.isFinite(dtMs) || dtMs <= 0) return;
    // Resolve the deadline here too: otherwise idle ticks re-emit a stale `true` after the
    // timeout, and a detector that carries it as its previous flag suppresses a real crossing.
    const prog = resolveProgrammatic(state.progress);
    state = { ...state, elapsedMs: state.elapsedMs + dtMs, programmatic: prog };
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
    // No scroller means nothing will move, so there is no programmatic travel to suppress.
    if (!scroller) return;
    const p = clamp01(progress);
    // Already there: no scroll event will fire, so nothing would ever clear the flag. This
    // call also replaces any earlier target, so disarm it (and emit) before re-asserting.
    if (Math.abs(p - state.progress) < PROGRAMMATIC_EPS) {
      programmaticTarget = null;
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
      state = { ...state, programmatic: true };
      emit();
    }
    scroller(p);
  },

  /** Test-only: clears listeners as well as state. */
  reset(): void {
    state = initialState();
    listeners.clear();
    scroller = null;
    // Disarm any programmatic scroll in flight so it cannot leak into the next test.
    programmaticTarget = null;
    programmaticDeadlineMs = 0;
  },
};
