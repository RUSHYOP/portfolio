/* Pure layout math for chapter 02's panels. No React, no DOM — the component turns these
 * four numbers into CSS custom properties and the media query decides which it uses.
 *
 * Every window is derived from the pin geometry: Approach's section is 150vh and
 * .chapter__pin is 100vh, so a sticky pin is stationary for only 50vh — chapterProgress
 * 0..1/3. Docking that ran past that would finish while the block was already leaving.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Desktop: the first panel starts here and the last is fully docked by DOCK_END. */
const DOCK_START = 0.02;
const DOCK_END = 0.28;
/** How much of the chapter one panel takes to dock. */
const DOCK_SPAN = 0.16;

/** Mobile: one panel at a time inside a 64vh pin, which is stationary to chapterProgress
 *  0.573 (150 - 64 = 86vh of hold). */
const SOLO_START = 0.04;
const SOLO_END = 0.56;
/** Crossfade between adjacent mobile panels, as a fraction of one panel's slot. */
const SOLO_CROSSFADE = 0.18;

export interface PanelPose {
  /** 0..1 desktop dock progress — drives opacity and the lift. */
  dock: number;
  /** 0..1, 1 at the middle panel — the shallow arc's rise. */
  arc: number;
  /** -1..1 left to right — the arc's tilt. */
  tilt: number;
  /** 0..1 mobile replacement opacity. */
  solo: number;
}

/** Reduced motion / still tier: everything visible, nothing offset. */
export const STATIC_POSE: PanelPose = { dock: 1, arc: 0, tilt: 0, solo: 1 };

/**
 * Pose for panel `index` of `count` at Approach's `chapterProgress`.
 * Data-driven in `count` (Q1): the CMS has no cap, so a fourth service must not break the
 * arc — it narrows the stagger instead.
 */
export function panelPose(index: number, count: number, chapterProgress: number): PanelPose {
  const t = clamp01(chapterProgress);
  const n = Math.max(1, count);

  const stagger = n > 1 ? (DOCK_END - DOCK_SPAN - DOCK_START) / (n - 1) : 0;
  const dock = smooth(clamp01((t - (DOCK_START + stagger * index)) / DOCK_SPAN));

  // -1 at the left panel, +1 at the right; the arc is the parabola through them.
  const x = n > 1 ? (index / (n - 1)) * 2 - 1 : 0;

  const slot = (SOLO_END - SOLO_START) / n;
  const local = (t - (SOLO_START + slot * index)) / slot;
  let solo = 0;
  if (local > -SOLO_CROSSFADE && local < 1 + SOLO_CROSSFADE) {
    solo = local < 0 ? 1 + local / SOLO_CROSSFADE
         // The final panel has no successor to overlap, so finish its exit at SOLO_END.
         : index === n - 1 ? clamp01((1 - local) / SOLO_CROSSFADE)
         : local > 1 ? 1 - (local - 1) / SOLO_CROSSFADE
         : 1;
  }

  // A lone panel is flat: the parabola only means something once there is a left/right pair.
  return { dock, arc: n > 1 ? 1 - x * x : 0, tilt: x, solo: clamp01(solo) };
}
