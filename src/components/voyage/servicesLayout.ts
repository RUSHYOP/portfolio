/* Pure layout math for chapter 02's panels. No React, no DOM — the component turns these
 * five numbers (dock, arc, tilt, solo, delay) into CSS custom properties and the media query
 * decides which it uses.
 *
 * The desktop dock is a trigger (see DOCK_TRIGGER), so pin arithmetic no longer bounds it.
 * It still governs the mobile SOLO_* window: that scrub is derived from the 64vh pin, which
 * is stationary until chapterProgress 0.573 — a window running past that would finish while
 * the block was already leaving.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Desktop: the dock is a trigger, not a scrub — every panel's target flips to 1 the moment
 *  the chapter is entered (chapterProgress > 0), and the CSS transition on .service-panel
 *  supplies the motion. Slice 4 browser review: the old scrub (0.02..0.28) left a half-built
 *  arc at every rest point inside it, and nav arrivals (start + 0.001) landed before it. */
const DOCK_TRIGGER = 0;
/** Delay between the first panel's transition and the last's, in ms. Fixed in total, so a
 *  fourth service narrows the step instead of stretching the entrance. */
const DOCK_STAGGER_MS = 240;

/** Mobile: one panel at a time inside a 64vh pin, which is stationary to chapterProgress
 *  0.573 (150 - 64 = 86vh of hold). */
const SOLO_START = 0.04;
const SOLO_END = 0.56;
/** Crossfade between adjacent mobile panels, as a fraction of one panel's slot — capped at
 *  SOLO_START in absolute terms so, for few panels, the first fade-in never leaks before
 *  the chapter starts (chapterProgress 0). */
const SOLO_CROSSFADE = 0.18; // module-private: no importer outside this file

export interface PanelPose {
  /** 0/1 desktop dock target — drives opacity and the lift (the CSS transition animates it). */
  dock: number;
  /** 0..1, 1 at the middle panel — the shallow arc's rise. */
  arc: number;
  /** -1..1 left to right — the arc's tilt. */
  tilt: number;
  /** 0..1 mobile replacement opacity. */
  solo: number;
  /** ms — this panel's desktop dock transition delay (the stagger). */
  delay: number;
}

/** Reduced motion / still tier: everything visible, nothing offset. */
export const STATIC_POSE: PanelPose = { dock: 1, arc: 0, tilt: 0, solo: 1, delay: 0 };

/**
 * Pose for panel `index` of `count` at Approach's `chapterProgress`.
 * Data-driven in `count` (Q1): the CMS has no cap, so a fourth service must not break the
 * arc — it narrows the stagger instead. `dock` is always exactly 0 or 1 (see DOCK_TRIGGER).
 */
export function panelPose(index: number, count: number, chapterProgress: number): PanelPose {
  const t = clamp01(chapterProgress);
  const n = Math.max(1, count);

  const dock = t > DOCK_TRIGGER ? 1 : 0;
  const delay = n > 1 ? (DOCK_STAGGER_MS * index) / (n - 1) : 0;

  // -1 at the left panel, +1 at the right; the arc is the parabola through them.
  const x = n > 1 ? (index / (n - 1)) * 2 - 1 : 0;

  const slot = (SOLO_END - SOLO_START) / n;
  // Absolute crossfade width: slot-relative, but never wider than SOLO_START (n < 3 would
  // otherwise start the fade-in before chapterProgress 0). Absolute units keep that edge
  // exact: for n < 3 at chapterProgress 0, dt === -fade, so the first panel is precisely 0.
  const fade = Math.min(SOLO_CROSSFADE * slot, SOLO_START);
  const dt = t - (SOLO_START + slot * index);
  let solo = 0;
  if (dt > -fade && dt < slot + fade) {
    solo = dt < 0 ? 1 + dt / fade
         : dt > slot ? 1 - (dt - slot) / fade
         : 1;
  }

  // A lone panel is flat: the parabola only means something once there is a left/right pair.
  return { dock, arc: n > 1 ? 1 - x * x : 0, tilt: x, solo: clamp01(solo), delay };
}
