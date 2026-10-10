import { CHAPTERS, type ChapterId } from "@/scene/camera/flightPath";

/**
 * *Minimum* wall-clock hold for the Jump letterbox, in ms. Letterbox.tsx:7 runs a 0.45s
 * transition each way, and a fast flick crosses the chapter's 25vh in well under that — so
 * the bars need a clock floor rather than a chapterProgress window. They also need a scroll
 * floor: the effective hold is `max(JUMP_HOLD_MS, the rest of the band)`, because every
 * in-band emit renews the deadline (see decideJumpBeat). Fast pass → the clock wins; slow or
 * keyboard pass → the band wins. The whoosh is not on this clock at all: it is a one-shot
 * 0.4s SFX fired once on the crossing edge.
 */
export const JUMP_HOLD_MS = 900;

/** Position of a chapter in CHAPTERS. */
export function chapterIndex(id: ChapterId): number {
  return CHAPTERS.findIndex((c) => c.id === id);
}

export const JUMP_INDEX = chapterIndex("jump");

export interface JumpBeatInput {
  /** Index of the chapter reported by the previous emit. */
  prevIndex: number;
  /** Index of the chapter reported by this emit. */
  nextIndex: number;
  /** voyageStore.programmatic as of the previous emit. */
  prevProgrammatic: boolean;
  /** voyageStore.programmatic as of this emit. */
  nextProgrammatic: boolean;
  nowMs: number;
  /** Wall-clock deadline of the hold currently in force (0 = none). */
  holdUntilMs: number;
}

export interface JumpBeatResult {
  /** One-shot: play the whoosh and log. */
  fire: boolean;
  /** Should the cinematic bars be down right now. */
  letterbox: boolean;
  /** Carry this back in as holdUntilMs on the next emit. */
  holdUntilMs: number;
}

/**
 * Chapter 03's whole decision, as one pure function.
 *
 * "Entered Jump forward" is an index comparison, not `id === "jump"`: a single emit can
 * carry approach → orbit and the store never reports the micro-beat at all.
 * Backward passes never fire. A programmatic scrollTo in flight on *either* side of the
 * emit suppresses it — the emit that lands on the target is also the emit that clears the
 * flag, and it can be the one that crossed.
 *
 * The hold is the one piece of state that is not a pure function of this emit alone: it is
 * renewed on every in-band emit, so the bars come up `JUMP_HOLD_MS` after the reader *leaves*
 * the band rather than `JUMP_HOLD_MS` after they entered it.
 */
export function decideJumpBeat(input: JumpBeatInput): JumpBeatResult {
  const { prevIndex, nextIndex, prevProgrammatic, nextProgrammatic, nowMs, holdUntilMs } = input;
  const forward = prevIndex < JUMP_INDEX && nextIndex >= JUMP_INDEX;
  const programmatic = prevProgrammatic || nextProgrammatic;
  // nowMs >= holdUntilMs also stops a jittering scroll from re-triggering mid-hold.
  const fire = forward && !programmatic && nowMs >= holdUntilMs;
  // Once the beat has fired, the bars stay down for the *whole* band, not for a flat 900ms:
  // while the reader is still inside Jump, every emit (including VoyageScroll's 250ms idle
  // tick) pushes the deadline out again. The band is 225px at a 900px viewport, so any pass
  // slower than 225 px/s — every arrow-key pass, ~40px per press — would otherwise lift the
  // bars while hyperLength was still growing. A cold backward entry has `nowMs < holdUntilMs`
  // false, so decision 2 (never fire backward) is untouched.
  const inBand = nextIndex === JUMP_INDEX;
  const hold = fire
    ? nowMs + JUMP_HOLD_MS
    : inBand && nowMs < holdUntilMs ? nowMs + JUMP_HOLD_MS : holdUntilMs;
  return { fire, letterbox: nowMs < hold, holdUntilMs: hold };
}
