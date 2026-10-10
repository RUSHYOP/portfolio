import { CHAPTERS, type ChapterId } from "@/scene/camera/flightPath";

/** Minimum wall-clock hold for the Jump letterbox, in milliseconds. */
export const JUMP_HOLD_MS = 900;

/** Position of a chapter in CHAPTERS. */
export function chapterIndex(id: ChapterId): number {
  return CHAPTERS.findIndex((chapter) => chapter.id === id);
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
  /** Whether the cinematic bars should be down right now. */
  letterbox: boolean;
  /** Carry this back in as holdUntilMs on the next emit. */
  holdUntilMs: number;
}

/** Decide whether this emit crosses into Jump and update its letterbox hold. */
export function decideJumpBeat(input: JumpBeatInput): JumpBeatResult {
  const { prevIndex, nextIndex, prevProgrammatic, nextProgrammatic, nowMs, holdUntilMs } = input;
  const forward = prevIndex < JUMP_INDEX && nextIndex >= JUMP_INDEX;
  const programmatic = prevProgrammatic || nextProgrammatic;
  const fire = forward && !programmatic && nowMs >= holdUntilMs;
  const inBand = nextIndex === JUMP_INDEX;
  const hold = fire
    ? nowMs + JUMP_HOLD_MS
    : inBand && nowMs < holdUntilMs ? nowMs + JUMP_HOLD_MS : holdUntilMs;

  return { fire, letterbox: nowMs < hold, holdUntilMs: hold };
}
