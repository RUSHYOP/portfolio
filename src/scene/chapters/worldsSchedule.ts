/* Pure schedule for chapter 05 (Worlds), shared by the DOM panels (Worlds.tsx), the planets
 * (Planet.ts) and the starfield focus pull (Starfield.ts). No React, no three, no DOM. It mirrors
 * orbitSchedule.ts exactly in shape — the two are deliberately duplicated, not abstracted, until a
 * third chapter needs the same maths (YAGNI); read orbitSchedule.ts first.
 *
 * Pin arithmetic (derived, not typed): Worlds' section is 450vh and `.chapter__pin` is stationary
 * for `section - pin`: 350vh on desktop (100vh pin) = chapterProgress 0..0.7778, and 386vh on
 * mobile (64vh pin) = 0..0.8578. ONE schedule serves both and every device: the planets are WebGL
 * and cannot be media-query-aware, so the schedule is sized to the smaller (desktop) hold. The
 * panels never fade out: the last case stays lit until the pin releases, so a phone dwells on it
 * for its extra 0.08 and the pin's own release is the panel's exit. The panels take a 0/1 target
 * (caseTarget) and CSS animates it; the planets swap on the same 0/1 target with a timed, staged
 * fade in Planet.ts (slice-5 browser review). Only their placement follows scroll.
 *
 * Layout of chapterProgress (cp); the pin is stationary for cp 0 .. 0.778 (desktop) / 0.858 (mobile):
 *   0 ......... 0.04 ........................ 0.73 ........ 0.77 .. 0.778 ........ 0.858
 *   [ fade in ][ window: planets carried past ][ presence fades out ]
 *   panels: [ case 0 .. case n-1 (switch at each boundary) .. last case holds lit ...........]
 *
 * Inside WORLDS_WINDOW the N cases share the window in equal slots (~103vh each at N = 3). Around
 * each slot boundary the cursor travels between two cases over a short stretch centred on it, and
 * the panel switches at that stretch's midpoint, so a planet arrives in frame as its panel
 * replaces the previous one.
 */
import { CHAPTERS } from "@/scene/camera/flightPath";

// NaN reads as the chapter start; everything else clamps to 0..1.
const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));
const smooth = (t: number) => t * t * (3 - 2 * t);

const worlds = CHAPTERS.find((c) => c.id === "worlds")!;

/** Desktop pin height and the mobile pin height, in vh (voyage.css; same values as orbitSchedule). */
const PIN_DESKTOP_VH = 100;
const PIN_MOBILE_VH = 64;

/** Last chapterProgress at which the sticky pin is still stationary (hold = section - pin). */
export const WORLDS_HOLD_DESKTOP = (worlds.spanVh - PIN_DESKTOP_VH) / worlds.spanVh;
export const WORLDS_HOLD_MOBILE = (worlds.spanVh - PIN_MOBILE_VH) / worlds.spanVh;

/** Where the cases dwell, as chapterProgress `[start, end]`. Sits inside the desktop hold with
 *  margin for the edge fades: 0.73 + 0.04 = 0.77 < 0.7778 (the draft end of 0.74 would not fit).
 *  N = 3 gives slot centres 0.155 / 0.385 / 0.615. Browser-review tunable. */
export const WORLDS_WINDOW: readonly [number, number] = [0.04, 0.73];

/** Width of the fade-in before the window and the fade-out after it, in chapterProgress — the
 *  planets and the starfield only (the panels are lit by caseTarget and dwell until the pin
 *  releases). Both margins sit inside the desktop hold. */
export const WORLDS_EDGE_FADE = 0.04;

/** Last chapterProgress at which the planets' and the starfield pull's envelope still holds
 *  (0.77 < 0.7778); the last planet then finishes its own fade by PLANET_FADE_OUT_END. */
export const WORLDS_PRESENCE_END = WORLDS_WINDOW[1] + WORLDS_EDGE_FADE;

/** Width of the cursor's travel between two cases, as a fraction of one case's slot. */
export const CASE_TRAVEL = 0.3;

/** 0..1 presence of the PLANETS (their fade-in) and the STARFIELD pull: 0 at cp 0, ramps to 1 by
 *  the window start, holds through the window, ramps back to 0 by WORLDS_PRESENCE_END, 0 after. */
export function worldsPresence(chapterProgress: number): number {
  const t = clamp01(chapterProgress);
  const [start, end] = WORLDS_WINDOW;
  if (t < start) return smooth(t / start);
  if (t <= end) return 1;
  if (t < WORLDS_PRESENCE_END) return smooth(1 - (t - end) / WORLDS_EDGE_FADE);
  return 0;
}

/** Whole numbers only: the CMS may hold any count, and a non-finite or negative one is empty. */
function sanitizeCount(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Position inside the window measured in case slots: 0 at the window start, `count` at its end. */
function slotPosition(chapterProgress: number, count: number): number {
  const [start, end] = WORLDS_WINDOW;
  return clamp01((clamp01(chapterProgress) - start) / (end - start)) * count;
}

/** 0 → 1 across the cross-fade centred on slot boundary `b`. Two different boundaries are
 *  never active at once (the cross-fade is 0.3 of a slot wide, boundaries are 1 apart). */
function crossed(b: number, x: number): number {
  return smooth(clamp01((x - b) / CASE_TRAVEL + 0.5));
}

/**
 * chapterProgress at the middle of case `i`'s slot, where the cursor rests exactly on `i`. The
 * planets are placed from the camera pose here. `i` clamps into [0, n - 1] and a nonsense count
 * gives the window start, so the result is never NaN.
 */
export function caseCentre(i: number, n: number): number {
  const count = sanitizeCount(n);
  const [start, end] = WORLDS_WINDOW;
  if (count === 0) return start;
  const k = Math.min(count - 1, Math.max(0, Number.isFinite(i) ? Math.floor(i) : 0));
  return start + ((k + 0.5) / count) * (end - start);
}

/**
 * Continuous case index in [0, n-1]: it sits on an integer while a case dwells and moves
 * between two integers only across a cross-fade. Monotone non-decreasing in chapterProgress;
 * 0 for n <= 1; 0 before the window and n-1 after it.
 */
export function worldsCursor(chapterProgress: number, n: number): number {
  const count = sanitizeCount(n);
  if (count <= 1) return 0;
  const x = slotPosition(chapterProgress, count);
  let cursor = 0;
  for (let b = 1; b < count; b++) cursor += crossed(b, x);
  return cursor;
}

/**
 * 0/1 TARGET visibility of case `i` of `n` for the DOM panels — never in between: the CSS
 * transition on .world-panel is the cross-fade, so no scroll position can rest on two half-faded
 * panels (the slice-4 rule). The lit case is the nearest whole cursor, so a panel changes exactly
 * half-way through the planets' travel. Dark at chapterProgress 0, the first case from the
 * chapter's first pixel (nav arrivals land on start + 0.001), and the last case from the window
 * end until the chapter ends — the pin's release is its exit, so the caller (Worlds) must not
 * show any case outside Worlds. Out-of-range or non-integer `i`, and n <= 0, give 0; NaN progress
 * is the chapter start.
 */
export function caseTarget(i: number, n: number, chapterProgress: number): number {
  const count = sanitizeCount(n);
  if (!Number.isInteger(i) || i < 0 || i >= count) return 0;
  const t = clamp01(chapterProgress);
  if (t <= 0) return 0;
  return Math.round(worldsCursor(t, count)) === i ? 1 : 0;
}
