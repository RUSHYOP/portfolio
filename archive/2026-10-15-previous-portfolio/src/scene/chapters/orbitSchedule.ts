/* Pure schedule for chapter 04 (Orbit), shared by the DOM panels (Process.tsx), the ring
 * (OrbitRing.ts) and the starfield focus pull (Starfield.ts). No React, no three, no DOM.
 *
 * Pin arithmetic (derived, not typed): Orbit's section is 300vh and `.chapter__pin` is
 * stationary for `section - pin`: 200vh on desktop (100vh pin) = chapterProgress 0..2/3, and
 * 236vh on mobile (64vh pin) = 0..0.787. ONE schedule serves both and every device: the ring is a
 * single WebGL instance and cannot be media-query-aware, so the schedule is sized to the
 * smaller (desktop) hold. The PANELS never fade out: the last step stays lit until the pin
 * releases (desktop cp 2/3, mobile 0.787), so a phone dwells on it for its extra 0.12 and the
 * pin's own release is the panel's exit. Only the ring and the starfield fade out (orbitPresence).
 * The panels take a 0/1 target (stepTarget) and CSS animates it; the ring's cursor is scrubbed.
 *
 * Layout of chapterProgress (cp); the pin is stationary for cp 0 .. 0.667 (desktop) / 0.787 (mobile):
 *   0 ......... 0.04 ........................ 0.62 ........ 0.66 .... 0.667 ........ 0.787
 *   [ fade in ][ window: ring turns         ][ ring/stars fade out ]
 *   panels: [ step 0 .. step n-1 (switch at each boundary) .. last step holds lit .........]
 *
 * Inside ORBIT_WINDOW the N steps share the window in equal slots. Around each slot boundary the
 * ring's cursor travels between two steps over a short stretch centred on it, and the panel
 * switches at that stretch's midpoint, so a node arrives front-centre as its panel replaces
 * the previous one.
 */
import { CHAPTERS } from "@/scene/camera/flightPath";

// NaN reads as the chapter start; everything else clamps to 0..1.
const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));
const smooth = (t: number) => t * t * (3 - 2 * t);

const orbit = CHAPTERS.find((c) => c.id === "orbit")!;

/** Desktop pin height and the mobile Approach/Orbit pin height, in vh (voyage.css). */
const PIN_DESKTOP_VH = 100;
const PIN_MOBILE_VH = 64;

/** Last chapterProgress at which the sticky pin is still stationary (hold = section - pin). */
export const ORBIT_HOLD_DESKTOP = (orbit.spanVh - PIN_DESKTOP_VH) / orbit.spanVh;
export const ORBIT_HOLD_MOBILE = (orbit.spanVh - PIN_MOBILE_VH) / orbit.spanVh;

/** Where the steps dwell, as chapterProgress `[start, end]`. Sits inside the desktop hold with
 *  margin for the edge fades. */
export const ORBIT_WINDOW: readonly [number, number] = [0.04, 0.62];

/** Width of the fade-in before the window and the fade-out after it, in chapterProgress — the
 *  ring and the starfield only (the panels are lit by stepTarget and dwell until the pin
 *  releases). Both margins sit inside the desktop hold. */
export const ORBIT_EDGE_FADE = 0.04;

/** Last chapterProgress at which the ring and the starfield pull are still held by the
 *  schedule's envelope (0.66 < 2/3); the ring then finishes its own fade by RING_FADE_OUT_END.
 *  The panels are not tied to it. */
export const ORBIT_PRESENCE_END = ORBIT_WINDOW[1] + ORBIT_EDGE_FADE;

/** Width of the ring's travel between two steps, as a fraction of one step's slot. */
export const STEP_CROSSFADE = 0.3;

/** 0..1 presence of the RING and the STARFIELD pull: 0 at cp 0, ramps to 1 by the window start,
 *  holds through the window, ramps back to 0 by ORBIT_PRESENCE_END and stays 0 after. */
export function orbitPresence(chapterProgress: number): number {
  const t = clamp01(chapterProgress);
  const [start, end] = ORBIT_WINDOW;
  if (t < start) return smooth(t / start);
  if (t <= end) return 1;
  if (t < ORBIT_PRESENCE_END) return smooth(1 - (t - end) / ORBIT_EDGE_FADE);
  return 0;
}

/** Whole numbers only: the CMS may hold any count, and a non-finite or negative one is empty. */
function sanitizeCount(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Position inside the window measured in step slots: 0 at the window start, `count` at its end. */
function slotPosition(chapterProgress: number, count: number): number {
  const [start, end] = ORBIT_WINDOW;
  return clamp01((clamp01(chapterProgress) - start) / (end - start)) * count;
}

/** 0 → 1 across the cross-fade centred on slot boundary `b`. Two different boundaries are
 *  never active at once (the cross-fade is 0.3 of a slot wide, boundaries are 1 apart). */
function crossed(b: number, x: number): number {
  return smooth(clamp01((x - b) / STEP_CROSSFADE + 0.5));
}

/**
 * Continuous step index in [0, n-1]: it sits on an integer while a step dwells and moves
 * between two integers only across a cross-fade. Monotone non-decreasing in chapterProgress;
 * 0 for n <= 1; 0 before the window and n-1 after it.
 */
export function orbitCursor(chapterProgress: number, n: number): number {
  const count = sanitizeCount(n);
  if (count <= 1) return 0;
  const x = slotPosition(chapterProgress, count);
  let cursor = 0;
  for (let b = 1; b < count; b++) cursor += crossed(b, x);
  return cursor;
}

/**
 * 0/1 TARGET visibility of step `i` of `n` for the DOM panels — never in between: the CSS
 * transition on .process-panel is the cross-fade, so no scroll position can rest on two
 * half-faded panels (slice 4 browser review; the old scrubbed stepSolo could). The lit step is
 * the nearest whole cursor, so a panel changes exactly half-way through the ring's travel.
 * Dark at chapterProgress 0, the first step from the chapter's first pixel (nav arrivals land
 * on start + 0.001), and the last step from the window end until the chapter ends — the pin's
 * release is its exit, so the caller (Process) must not show any step outside Orbit.
 * Out-of-range or non-integer `i`, and n <= 0, give 0; NaN progress is the chapter start.
 */
export function stepTarget(i: number, n: number, chapterProgress: number): number {
  const count = sanitizeCount(n);
  if (!Number.isInteger(i) || i < 0 || i >= count) return 0;
  const t = clamp01(chapterProgress);
  if (t <= 0) return 0;
  return Math.round(orbitCursor(t, count)) === i ? 1 : 0;
}
