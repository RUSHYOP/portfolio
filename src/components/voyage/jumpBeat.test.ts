import { describe, it, expect } from "vitest";
import type { ChapterId } from "@/scene/camera/flightPath";
import { decideJumpBeat, chapterIndex, JUMP_INDEX, JUMP_HOLD_MS, type JumpBeatInput } from "./jumpBeat";

const at = (id: ChapterId) => chapterIndex(id);

const input = (o: Partial<JumpBeatInput>): JumpBeatInput => ({
  prevIndex: at("launch"),
  nextIndex: at("launch"),
  prevProgrammatic: false,
  nextProgrammatic: false,
  nowMs: 10_000,
  holdUntilMs: 0,
  ...o,
});

describe("chapterIndex", () => {
  it("maps ids to their position in CHAPTERS", () => {
    expect(at("launch")).toBe(0);
    expect(at("approach")).toBe(1);
    expect(at("jump")).toBe(2);
    expect(at("orbit")).toBe(3);
    expect(JUMP_INDEX).toBe(2);
  });
});

describe("decideJumpBeat — forward crossings", () => {
  it("fires on approach → jump", () => {
    const r = decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("jump") }));
    expect(r.fire).toBe(true);
    expect(r.letterbox).toBe(true);
    expect(r.holdUntilMs).toBe(10_000 + JUMP_HOLD_MS);
  });
  it("fires on approach → orbit, where the store never reports jump", () => {
    expect(decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("orbit") })).fire).toBe(true);
  });
  it("fires on launch → landing (a flick past everything)", () => {
    expect(decideJumpBeat(input({ prevIndex: at("launch"), nextIndex: at("landing") })).fire).toBe(true);
  });
});

describe("decideJumpBeat — non-firing cases", () => {
  it("never fires backward", () => {
    expect(decideJumpBeat(input({ prevIndex: at("orbit"), nextIndex: at("approach") })).fire).toBe(false);
    expect(decideJumpBeat(input({ prevIndex: at("jump"), nextIndex: at("approach") })).fire).toBe(false);
    expect(decideJumpBeat(input({ prevIndex: at("orbit"), nextIndex: at("launch") })).fire).toBe(false);
  });
  it("does not re-fire once already inside or past the band", () => {
    expect(decideJumpBeat(input({ prevIndex: at("jump"), nextIndex: at("orbit") })).fire).toBe(false);
    expect(decideJumpBeat(input({ prevIndex: at("orbit"), nextIndex: at("worlds") })).fire).toBe(false);
  });
  it("does not fire without a crossing", () => {
    expect(decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("approach") })).fire).toBe(false);
  });
  it("is suppressed while a programmatic scroll is in flight", () => {
    expect(decideJumpBeat(input({ prevIndex: at("launch"), nextIndex: at("landing"), nextProgrammatic: true })).fire).toBe(false);
  });
  it("is suppressed when the flag cleared on the very emit that crossed", () => {
    expect(decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("orbit"), prevProgrammatic: true, nextProgrammatic: false })).fire).toBe(false);
  });
});

describe("decideJumpBeat — minimum hold", () => {
  it("renews the hold on every in-band emit, without re-firing", () => {
    const first = decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("jump") }));
    expect(first.holdUntilMs).toBe(10_000 + JUMP_HOLD_MS);
    const idle = decideJumpBeat(input({ prevIndex: at("jump"), nextIndex: at("jump"), nowMs: 10_400, holdUntilMs: first.holdUntilMs }));
    expect(idle.fire).toBe(false);
    expect(idle.letterbox).toBe(true);
    expect(idle.holdUntilMs).toBe(10_400 + JUMP_HOLD_MS);
  });
  it("retracts once the hold has expired outside the band", () => {
    const r = decideJumpBeat(input({ nowMs: 10_000 + JUMP_HOLD_MS, holdUntilMs: 10_000 + JUMP_HOLD_MS }));
    expect(r.letterbox).toBe(false);
    expect(r.holdUntilMs).toBe(10_000 + JUMP_HOLD_MS);
  });
  it("stops renewing the moment the band is left", () => {
    const r = decideJumpBeat(input({ prevIndex: at("jump"), nextIndex: at("orbit"), nowMs: 10_300, holdUntilMs: 10_900 }));
    expect(r.letterbox).toBe(true);
    expect(r.holdUntilMs).toBe(10_900);
  });
  it("a second crossing inside the hold does not re-fire", () => {
    const r = decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("jump"), nowMs: 10_300, holdUntilMs: 10_900 }));
    expect(r.fire).toBe(false);
    expect(r.letterbox).toBe(true);
    expect(r.holdUntilMs).toBe(10_300 + JUMP_HOLD_MS);
  });
  it("re-arms for a fresh crossing after the hold expires", () => {
    const r = decideJumpBeat(input({ prevIndex: at("approach"), nextIndex: at("jump"), nowMs: 20_000, holdUntilMs: 10_900 }));
    expect(r.fire).toBe(true);
    expect(r.holdUntilMs).toBe(20_000 + JUMP_HOLD_MS);
  });
});
