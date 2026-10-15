import type { ChapterId } from "@/scene/camera/flightPath";
import type { VoyageState } from "@/scene/scroll/voyageStore";

export interface TelemetryReadout {
  time: string;
  vel: string;
  dist: string;
}

// Typed as ChapterId so a typo in a member is a compile error, not a silently dead branch.
const ARRIVED_FROM = new Set<ChapterId>(["pilot", "landing", "surface"]);

/** Pure HUD formatter: T+ saturates at 59:59, velocity01 reads up to 0.98c, distance
 *  becomes SIGNAL LOST in the dark passage and ARRIVED from The Pilot on. */
export function formatTelemetry(
  s: Pick<VoyageState, "elapsedMs" | "velocity" | "distanceAU" | "chapter">
): TelemetryReadout {
  const totalS = Math.floor(s.elapsedMs / 1000);
  const mm = String(Math.min(59, Math.floor(totalS / 60))).padStart(2, "0");
  const ss = String(totalS >= 3600 ? 59 : totalS % 60).padStart(2, "0");
  const time = `T+ ${mm}:${ss}`;
  const vel = `VEL ${(s.velocity * 0.98).toFixed(2)}c`;
  let dist: string;
  if (s.chapter.id === "passage") dist = "SIGNAL LOST";
  else if (ARRIVED_FROM.has(s.chapter.id)) dist = "0.0 AU · ARRIVED";
  else dist = `DIST ${s.distanceAU.toFixed(1)} AU`;
  return { time, vel, dist };
}
