import * as THREE from "three";

export type ChapterId =
  | "launch" | "approach" | "jump" | "orbit" | "worlds" | "belt"
  | "passage" | "constellation" | "pilot" | "landing" | "surface";

export interface Chapter {
  id: ChapterId;
  label: string;
  /** Two-digit display index, e.g. "01". Micro-beats keep their index but are not rail ticks. */
  index: string;
  start: number;
  end: number;
  micro: boolean;
}

/** Normalized scroll ranges for every beat. Contiguous, ordered, sums to 1. */
export const CHAPTERS: readonly Chapter[] = [
  { id: "launch",        label: "LAUNCH",          index: "01", start: 0.00, end: 0.08, micro: false },
  { id: "approach",      label: "APPROACH VECTOR", index: "02", start: 0.08, end: 0.20, micro: false },
  { id: "jump",          label: "JUMP",            index: "03", start: 0.20, end: 0.22, micro: true  },
  { id: "orbit",         label: "ORBIT",           index: "04", start: 0.22, end: 0.34, micro: false },
  { id: "worlds",        label: "WORLDS",          index: "05", start: 0.34, end: 0.52, micro: false },
  { id: "belt",          label: "THE BELT",        index: "06", start: 0.52, end: 0.60, micro: false },
  { id: "passage",       label: "DARK PASSAGE",    index: "07", start: 0.60, end: 0.63, micro: true  },
  { id: "constellation", label: "CONSTELLATION",   index: "08", start: 0.63, end: 0.74, micro: false },
  { id: "pilot",         label: "THE PILOT",       index: "09", start: 0.74, end: 0.84, micro: false },
  { id: "landing",       label: "LANDING",         index: "10", start: 0.84, end: 0.95, micro: false },
  { id: "surface",       label: "SURFACE",         index: "11", start: 0.95, end: 1.00, micro: false },
];

export const CONTENT_CHAPTERS: readonly Chapter[] = CHAPTERS.filter((c) => !c.micro);

/** Total scroll track height in vh. Each chapter's section height = (end - start) * this. */
export const VOYAGE_SCROLL_VH = 1100;

// NaN (a 0/0 scroll ratio before layout) maps to 0 rather than propagating into
// three's getPoint, which throws on the per-frame render path. ±Infinity saturates
// normally, so +Infinity pins to the end of the voyage and -Infinity to the start.
const clamp01 = (v: number) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));

export function chapterAt(progress: number): { chapter: Chapter; chapterProgress: number } {
  const p = clamp01(progress);
  const last = CHAPTERS[CHAPTERS.length - 1];
  if (p >= 1) return { chapter: last, chapterProgress: 1 };
  const chapter = CHAPTERS.find((c) => p >= c.start && p < c.end) ?? last;
  const span = chapter.end - chapter.start;
  return { chapter, chapterProgress: span > 0 ? (p - chapter.start) / span : 1 };
}

/** The star is fixed in world space; the whole voyage approaches it. */
export const STAR_POSITION = new THREE.Vector3(6, -3, -140);

/** Launch framing: the camera looks up-left of the star, which projects the star
 *  low-right of frame instead of dead-centre behind the headline. */
export const LAUNCH_LOOK_OFFSET = new THREE.Vector3(-3, 2, 0);

/**
 * Camera waypoints: one per chapter start, plus a final end point (12 points for
 * 11 chapters). `progressToCurveT` aligns chapter starts to waypoints, so waypoint
 * `i` is reached exactly at `CHAPTERS[i].start`.
 * z is non-increasing so the camera never travels backward; the lookAt targets
 * always sit further down -z than the camera so it never turns around.
 */
const POSITION_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(0.0,  0.0,    0.0),   // launch start
  new THREE.Vector3(0.6, -0.2,  -18.0),   // approach start
  new THREE.Vector3(2.0, -1.0,  -46.0),   // jump start
  new THREE.Vector3(3.0, -1.5,  -70.0),   // orbit start (banked)
  new THREE.Vector3(5.5, -2.0, -100.0),   // worlds start
  new THREE.Vector3(2.5, -2.2, -118.0),   // belt start (lateral fly-by exit)
  new THREE.Vector3(4.0, -2.5, -125.0),   // passage start
  new THREE.Vector3(5.0, -2.8, -130.0),   // constellation start
  new THREE.Vector3(5.5, -2.9, -132.0),   // pilot start (hold, FOV/orb do the reveal)
  new THREE.Vector3(6.0, -3.0, -137.0),   // landing start (arrival at the star)
  new THREE.Vector3(6.0, -6.0, -150.0),   // surface start (descended)
  new THREE.Vector3(6.0, -7.0, -152.0),   // end
];

/** The position waypoints, exposed for tests. Defensive clones: the live curve reads
 *  POSITION_POINTS every frame, so a caller mutating an exported Vector3 would corrupt the path. */
export const CAMERA_WAYPOINTS: readonly THREE.Vector3[] = POSITION_POINTS.map((v) => v.clone());

/** LookAt targets, one per chapter start plus a final end point (aligned the same way). */
const LOOKAT_POINTS: THREE.Vector3[] = [
  STAR_POSITION.clone().add(LAUNCH_LOOK_OFFSET),  // launch: star sits low-right of frame
  STAR_POSITION.clone().add(LAUNCH_LOOK_OFFSET),
  STAR_POSITION.clone().add(LAUNCH_LOOK_OFFSET),
  new THREE.Vector3(6, -3, -150),           // orbit: past the star, banked
  new THREE.Vector3(0, -2, -160),           // worlds: ahead-left for the fly-by
  new THREE.Vector3(6, -2.5, -170),
  new THREE.Vector3(5, -2.8, -175),
  new THREE.Vector3(5.5, -2.9, -180),       // constellation: straight ahead (dolly-zoom via FOV)
  STAR_POSITION.clone(),                    // pilot: into the glare
  new THREE.Vector3(6, -8, -175),           // landing: down toward the horizon
  new THREE.Vector3(6, -9, -190),
  new THREE.Vector3(6, -9.5, -195),
];

const positionCurve = new THREE.CatmullRomCurve3(POSITION_POINTS, false, "centripetal");
const lookAtCurve = new THREE.CatmullRomCurve3(LOOKAT_POINTS, false, "centripetal");

export interface CameraPose {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

/**
 * Maps voyage progress (0..1, unequal chapter spans) to the curve parameter
 * (0..1, one uniform segment per chapter). CatmullRomCurve3 parameterizes
 * uniformly over its control points, so waypoint `i` sits at `i / CHAPTERS.length`.
 */
export function progressToCurveT(progress: number): number {
  const { chapter, chapterProgress } = chapterAt(progress);
  const i = CHAPTERS.indexOf(chapter);
  return (i + chapterProgress) / CHAPTERS.length;
}

export function getCameraPose(progress: number, out?: CameraPose): CameraPose {
  // Remap through the chapter table so chapter starts land on their waypoints.
  const p = progressToCurveT(progress);
  const pose = out ?? { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
  positionCurve.getPoint(p, pose.position);
  lookAtCurve.getPoint(p, pose.lookAt);
  // Guarantee the invariant even if the spline overshoots between waypoints.
  if (pose.lookAt.z >= pose.position.z) pose.lookAt.z = pose.position.z - 1;
  return pose;
}

const PILOT_START = CHAPTERS.find((c) => c.id === "pilot")!.start;

const smooth = (t: number) => t * t * (3 - 2 * t);

/** The camera approach already magnifies the star ~6x, and The Pilot's glare does the
 *  "fills the frame" beat — so the geometric scale only needs to reach 2.4. */
const STAR_SCALE_MAX = 2.4;

/** 0.25 (a distant point) → 2.4 by the start of The Pilot, then holds. */
export function starScale(progress: number): number {
  const t = clamp01(progress / PILOT_START);
  return 0.25 + (STAR_SCALE_MAX - 0.25) * smooth(t);
}

/** 9.4 AU at launch → 0.0 at The Pilot ("ARRIVED"), then 0. */
export function distanceAU(progress: number): number {
  const t = clamp01(progress / PILOT_START);
  if (t >= 1) return 0;
  return 9.4 * (1 - t);
}

export const FOV_MIN = 60;
export const FOV_MAX = 70;

/** velocity01 is the store's normalized 0..1 speed. */
export function fovForVelocity(velocity01: number): number {
  return FOV_MIN + (FOV_MAX - FOV_MIN) * clamp01(velocity01);
}
