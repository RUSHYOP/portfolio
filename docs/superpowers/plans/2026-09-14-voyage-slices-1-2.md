# Voyage Redesign — Slices 1–2 (Scene Foundation + Ignition/Launch) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the single persistent Three.js voyage scene (scroll-driven camera, quality tiers, telemetry, flight rail, dock, CTA) and ship the first two chapters — Ignition and Launch — on a `/voyage` route, reviewed in the browser at desktop and mobile.

**Architecture:** One vanilla Three.js scene owned by `SceneRoot`, fed imperatively by a framework-agnostic `voyageStore` that Lenis (or a native-scroll fallback) writes to. Chapter DOM lives in `src/components/voyage/*` and reads the same store for reveals. The camera follows a `CatmullRomCurve3` through 11 waypoints defined in `flightPath.ts`; set pieces (`Starfield`, `EnergyOrb`, `WarpStreaks`) implement one `SetPiece` interface. The voyage is built on `/voyage` (noindex) and promoted to `/` in slice 8.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, three@0.169, framer-motion 12, lenis 1.3, vitest 5 (new), MongoDB/Mongoose 9 (settings fields only).

**Spec:** `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`. Later slices (3–8) get their own plans after this slice's browser review.

## Global Constraints

- Exactly **one** WebGL context for the scene. `@designcodeio/threeui` is **not** a dependency (its dock is ported, see Task 10).
- Device pixel ratio capped at **1.5** (`high`), **1** (`mid`). Tiers: `high | mid | still`. A 1s FPS probe **demotes one tier if < 45 fps**.
- Amber accent **`#f2b35c`** appears only as: the star, primary CTA fill, flight-rail progress dot, cursor ring over CTA. All 3D geometry other than the star is **monochrome white on black**.
- Typography: display **Styrene A** (existing self-hosted) with `var(--font-space-grotesk)` fallback; instrument text **JetBrains Mono** via `var(--font-jetbrains-mono)`. Hero H1 `clamp(3.5rem, 8vw, 8rem)`, weight 500, letter-spacing −0.02em, line-height 0.95.
- Glass panel: border `1px solid rgba(255,255,255,.08)`, `backdrop-filter: blur(18px)`, background `rgba(10,10,10,.55)`, inner top highlight `rgba(255,255,255,.06)`, radius 20px.
- DOM motion: fade-up 12px, 0.5s, ease `[0.2, 0.7, 0.2, 1]`. Nothing bounces.
- FOV **60° → 70°** with scroll velocity. Camera **never reverses**: position `z` is non-increasing along the path and the forward vector always has negative `z`.
- `distanceAU` is monotonically non-increasing with progress and is `0` from chapter `pilot` onward.
- `prefers-reduced-motion`: tier `still`, no Lenis, no camera motion, Ignition skipped, Letterbox never shown.
- Ignition ≤ 1.2s, skippable (click / Escape / Enter / Space), plays once per session (`sessionStorage["voyage-ignition-played"]`).
- No `TypewriterText`, no keystroke sounds anywhere in new code.
- `/admin` and `/work/*` never mount the scene. `GlobalOverlays` already excludes `/admin`.
- Copy is data-driven: hero headline/subheadline come from `Settings` (new fields with defaults). Admin inputs for them are sub-project 2.
- Structured logs: client events POST to `/api/logs`, appended as JSON lines to `logs/<name>.jsonl` when the filesystem is writable.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config, `@/*` alias |
| `src/scene/camera/flightPath.ts` | Chapter table, camera path, FOV/star/distance curves — pure math |
| `src/scene/scroll/voyageStore.ts` | Framework-agnostic scroll state store |
| `src/scene/scroll/useVoyage.ts` | React hook over the store |
| `src/scene/scroll/VoyageScroll.tsx` | Lenis / native scroll → store bridge, `scrollTo` |
| `src/scene/quality.ts` | Tier settings, tier selection, FPS probe |
| `src/scene/chapters/types.ts` | `SetPiece` / `FrameContext` interfaces |
| `src/scene/chapters/Starfield.ts` | Depth-sorted point field, soften/fade controls |
| `src/scene/chapters/EnergyOrb.ts` | The amber star (FBM sphere + glow sprite) |
| `src/scene/chapters/WarpStreaks.ts` | Velocity-driven monochrome streaks |
| `src/scene/SceneRoot.tsx` | Canvas, renderer, loop, camera pose/FOV, set-piece orchestration |
| `src/scene/StillSky.tsx` | `still`-tier fallback (SVG starfield + gradient) |
| `src/lib/log.ts` | Server: append JSON lines to `logs/` |
| `src/lib/clientLog.ts` | Client: console + POST `/api/logs` |
| `src/app/api/logs/route.ts` | Allow-listed log ingest |
| `src/components/voyage/Telemetry.tsx` + `telemetry.ts` | HUD + pure formatter |
| `src/components/voyage/Letterbox.tsx` | Cinematic bars |
| `src/components/voyage/FlightRail.tsx` | Right-edge chapter rail |
| `src/components/dock/dockController.ts` | Ported ThreeUI proximity spring (MIT) |
| `src/components/dock/Dock.tsx` | Floating glass capsule nav |
| `src/components/dock/CallToAction.tsx` | Amber / ghost CTA |
| `src/components/voyage/Ignition.tsx` | Chapter 00 |
| `src/components/voyage/Launch.tsx` | Chapter 01 |
| `src/components/voyage/VoyageRoot.tsx` | Composes everything; tier lifecycle |
| `src/app/voyage/page.tsx` + `voyage.css` | Route (noindex) + all voyage styles |
| `src/lib/models.ts`, `src/lib/data.ts` | `heroHeadline`, `heroSubheadline` settings fields |

---

### Task 1: Flight path math + test harness

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDependencies)
- Create: `src/scene/camera/flightPath.ts`
- Test: `src/scene/camera/flightPath.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ChapterId = "launch"|"approach"|"jump"|"orbit"|"worlds"|"belt"|"passage"|"constellation"|"pilot"|"landing"|"surface";
  export interface Chapter { id: ChapterId; label: string; index: string; start: number; end: number; micro: boolean; }
  export const CHAPTERS: readonly Chapter[];
  export const CONTENT_CHAPTERS: readonly Chapter[];          // micro === false
  export const VOYAGE_SCROLL_VH = 1100;                        // total track height in vh
  export function chapterAt(progress: number): { chapter: Chapter; chapterProgress: number };
  export interface CameraPose { position: THREE.Vector3; lookAt: THREE.Vector3; }
  export function getCameraPose(progress: number, out?: CameraPose): CameraPose;
  export const STAR_POSITION: THREE.Vector3;                  // (6, -3, -140)
  export function starScale(progress: number): number;        // 0.25 → 2.4 (tuned from 6 in browser review), holds from pilot
  export function distanceAU(progress: number): number;       // 9.4 → 0, 0 from pilot
  export const FOV_MIN = 60; export const FOV_MAX = 70;
  export function fovForVelocity(velocity01: number): number;
  ```

- [ ] **Step 1: Install vitest and add scripts**

Run:
```bash
cd /Users/admin/Codes-2/portfolio && npm install -D vitest@^5.0.0
```
Then edit `package.json` scripts to add:
```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

- [ ] **Step 3: Write the failing tests**

`src/scene/camera/flightPath.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  CHAPTERS, CONTENT_CHAPTERS, chapterAt, getCameraPose, distanceAU, starScale,
  fovForVelocity, FOV_MIN, FOV_MAX, STAR_POSITION,
} from "./flightPath";

const STEPS = 400;

describe("chapters", () => {
  it("cover [0,1] contiguously in order", () => {
    expect(CHAPTERS[0].start).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1].end).toBe(1);
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].start).toBeCloseTo(CHAPTERS[i - 1].end, 10);
    }
  });
  it("has 9 content chapters and 2 micro-beats", () => {
    expect(CONTENT_CHAPTERS).toHaveLength(9);
    expect(CHAPTERS.filter((c) => c.micro).map((c) => c.id)).toEqual(["jump", "passage"]);
  });
  it("chapterAt maps progress to the right chapter and local progress", () => {
    expect(chapterAt(0).chapter.id).toBe("launch");
    expect(chapterAt(0).chapterProgress).toBe(0);
    expect(chapterAt(1).chapter.id).toBe("surface");
    expect(chapterAt(1).chapterProgress).toBe(1);
    const mid = chapterAt(0.27);
    expect(mid.chapter.id).toBe("orbit");
    expect(mid.chapterProgress).toBeGreaterThan(0);
    expect(mid.chapterProgress).toBeLessThan(1);
  });
  it("clamps out-of-range progress", () => {
    expect(chapterAt(-1).chapter.id).toBe("launch");
    expect(chapterAt(2).chapter.id).toBe("surface");
  });
});

describe("camera path", () => {
  it("never reverses: z is non-increasing and the forward vector always points to -z", () => {
    let prevZ = Infinity;
    for (let i = 0; i <= STEPS; i++) {
      const p = i / STEPS;
      const pose = getCameraPose(p);
      expect(pose.position.z).toBeLessThanOrEqual(prevZ + 1e-6);
      prevZ = pose.position.z;
      const fz = pose.lookAt.z - pose.position.z;
      expect(fz).toBeLessThan(0);
    }
  });
  it("starts at the origin looking at the star", () => {
    const pose = getCameraPose(0);
    expect(pose.position.length()).toBeLessThan(1e-6);
    expect(pose.lookAt.distanceTo(STAR_POSITION)).toBeLessThan(1e-6);
  });
});

describe("curves", () => {
  it("distanceAU is monotonically non-increasing and 0 from pilot onward", () => {
    let prev = Infinity;
    for (let i = 0; i <= STEPS; i++) {
      const d = distanceAU(i / STEPS);
      expect(d).toBeLessThanOrEqual(prev + 1e-9);
      prev = d;
    }
    expect(distanceAU(0)).toBeCloseTo(9.4, 5);
    const pilot = CHAPTERS.find((c) => c.id === "pilot")!;
    expect(distanceAU(pilot.start)).toBe(0);
    expect(distanceAU(1)).toBe(0);
  });
  it("starScale grows monotonically to pilot then holds", () => {
    let prev = -Infinity;
    for (let i = 0; i <= STEPS; i++) {
      const s = starScale(i / STEPS);
      expect(s).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = s;
    }
    expect(starScale(0)).toBeCloseTo(0.25, 5);
    expect(starScale(1)).toBeCloseTo(6, 5);
  });
  it("fov stays within 60–70 and rises with velocity", () => {
    expect(fovForVelocity(0)).toBe(FOV_MIN);
    expect(fovForVelocity(1)).toBe(FOV_MAX);
    expect(fovForVelocity(-3)).toBe(FOV_MIN);
    expect(fovForVelocity(9)).toBe(FOV_MAX);
    expect(fovForVelocity(0.5)).toBeGreaterThan(FOV_MIN);
    expect(fovForVelocity(0.5)).toBeLessThan(FOV_MAX);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- src/scene/camera/flightPath.test.ts`
Expected: FAIL — `Cannot find module './flightPath'`

- [ ] **Step 5: Implement `src/scene/camera/flightPath.ts`**

```ts
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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

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

/**
 * Camera waypoints, one per chapter boundary (12 points for 11 chapters).
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

const LOOKAT_POINTS: THREE.Vector3[] = [
  STAR_POSITION.clone(),                    // launch: eyes on the destination
  STAR_POSITION.clone(),
  STAR_POSITION.clone(),
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

export function getCameraPose(progress: number, out?: CameraPose): CameraPose {
  const p = clamp01(progress);
  const pose = out ?? { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
  positionCurve.getPoint(p, pose.position);
  lookAtCurve.getPoint(p, pose.lookAt);
  // Guarantee the invariant even if the spline overshoots between waypoints.
  if (pose.lookAt.z >= pose.position.z) pose.lookAt.z = pose.position.z - 1;
  return pose;
}

const PILOT_START = CHAPTERS.find((c) => c.id === "pilot")!.start;

const smooth = (t: number) => t * t * (3 - 2 * t);

/** 0.25 (a distant point) → 6 (fills the frame) by the start of The Pilot, then holds. */
export function starScale(progress: number): number {
  const t = clamp01(progress / PILOT_START);
  return 0.25 + (6 - 0.25) * smooth(t);
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/scene/camera/flightPath.test.ts`
Expected: PASS (all 9 tests). If "never reverses" fails, the spline overshot between two waypoints: nudge the offending `POSITION_POINTS` z to be strictly decreasing with larger gaps — do **not** loosen the test.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/scene/camera/flightPath.ts src/scene/camera/flightPath.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): flight path math + vitest harness

Chapter table (9 content + 2 micro-beats), CatmullRom camera path with the
never-reverse invariant, star scale / distance / FOV curves, all under test.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Voyage store + React hook

**Files:**
- Create: `src/scene/scroll/voyageStore.ts`
- Create: `src/scene/scroll/useVoyage.ts`
- Test: `src/scene/scroll/voyageStore.test.ts`

**Interfaces:**
- Consumes: `chapterAt`, `distanceAU`, `Chapter` from Task 1.
- Produces:
  ```ts
  export interface VoyageState { progress: number; velocity: number; chapter: Chapter; chapterProgress: number; distanceAU: number; elapsedMs: number; }
  export const voyageStore: {
    getState(): VoyageState;
    subscribe(cb: (s: VoyageState) => void): () => void;
    setScroll(progress: number, velocity01: number): void;
    tick(dtMs: number): void;
    registerScroller(fn: (progress: number) => void): void;
    scrollTo(progress: number): void;
    reset(): void;
  };
  export const VELOCITY_NORMALIZER = 40; // px/frame that maps to velocity 1.0
  export function normalizeVelocity(pxPerFrame: number): number;
  export function useVoyage(): VoyageState;                 // in useVoyage.ts
  ```

- [ ] **Step 1: Write the failing tests**

`src/scene/scroll/voyageStore.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { voyageStore, normalizeVelocity, VELOCITY_NORMALIZER } from "./voyageStore";

beforeEach(() => voyageStore.reset());

describe("voyageStore", () => {
  it("starts at launch with zero progress", () => {
    const s = voyageStore.getState();
    expect(s.progress).toBe(0);
    expect(s.velocity).toBe(0);
    expect(s.chapter.id).toBe("launch");
    expect(s.distanceAU).toBeCloseTo(9.4, 5);
    expect(s.elapsedMs).toBe(0);
  });

  it("setScroll clamps progress and velocity and derives chapter + distance", () => {
    voyageStore.setScroll(0.27, 0.4);
    let s = voyageStore.getState();
    expect(s.progress).toBe(0.27);
    expect(s.velocity).toBe(0.4);
    expect(s.chapter.id).toBe("orbit");
    expect(s.distanceAU).toBeLessThan(9.4);

    voyageStore.setScroll(1.7, 5);
    s = voyageStore.getState();
    expect(s.progress).toBe(1);
    expect(s.velocity).toBe(1);
    expect(s.chapter.id).toBe("surface");

    voyageStore.setScroll(-0.2, -1);
    s = voyageStore.getState();
    expect(s.progress).toBe(0);
    expect(s.velocity).toBe(0);
  });

  it("notifies subscribers once per change and supports unsubscribe", () => {
    const cb = vi.fn();
    const off = voyageStore.subscribe(cb);
    voyageStore.setScroll(0.1, 0);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].progress).toBe(0.1);
    off();
    voyageStore.setScroll(0.2, 0);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("does not notify when nothing changed", () => {
    const cb = vi.fn();
    voyageStore.subscribe(cb);
    voyageStore.setScroll(0, 0);
    expect(cb).not.toHaveBeenCalled();
  });

  it("tick accumulates elapsed time", () => {
    voyageStore.tick(250);
    voyageStore.tick(250);
    expect(voyageStore.getState().elapsedMs).toBe(500);
  });

  it("scrollTo forwards to the registered scroller with clamped progress", () => {
    const scroller = vi.fn();
    voyageStore.registerScroller(scroller);
    voyageStore.scrollTo(0.5);
    voyageStore.scrollTo(3);
    expect(scroller).toHaveBeenNthCalledWith(1, 0.5);
    expect(scroller).toHaveBeenNthCalledWith(2, 1);
  });

  it("scrollTo is a no-op without a scroller", () => {
    expect(() => voyageStore.scrollTo(0.3)).not.toThrow();
  });
});

describe("normalizeVelocity", () => {
  it("maps px/frame to 0..1 using the normalizer, ignoring sign", () => {
    expect(normalizeVelocity(0)).toBe(0);
    expect(normalizeVelocity(VELOCITY_NORMALIZER)).toBe(1);
    expect(normalizeVelocity(-VELOCITY_NORMALIZER / 2)).toBe(0.5);
    expect(normalizeVelocity(1000)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/scene/scroll/voyageStore.test.ts`
Expected: FAIL — `Cannot find module './voyageStore'`

- [ ] **Step 3: Implement `src/scene/scroll/voyageStore.ts`**

```ts
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
}

type Listener = (state: VoyageState) => void;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Scroll speed in px/frame that maps to velocity 1.0. */
export const VELOCITY_NORMALIZER = 40;

export function normalizeVelocity(pxPerFrame: number): number {
  return clamp01(Math.abs(pxPerFrame) / VELOCITY_NORMALIZER);
}

function initialState(): VoyageState {
  return {
    progress: 0,
    velocity: 0,
    chapter: CHAPTERS[0],
    chapterProgress: 0,
    distanceAU: distanceAU(0),
    elapsedMs: 0,
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
    if (p === state.progress && v === state.velocity) return;
    const { chapter, chapterProgress } = chapterAt(p);
    state = { ...state, progress: p, velocity: v, chapter, chapterProgress, distanceAU: distanceAU(p) };
    emit();
  },

  tick(dtMs: number): void {
    if (dtMs <= 0) return;
    state = { ...state, elapsedMs: state.elapsedMs + dtMs };
    emit();
  },

  registerScroller(fn: (progress: number) => void): void {
    scroller = fn;
  },

  scrollTo(progress: number): void {
    scroller?.(clamp01(progress));
  },

  reset(): void {
    state = initialState();
    listeners.clear();
    scroller = null;
  },
};
```

- [ ] **Step 4: Implement `src/scene/scroll/useVoyage.ts`**

```ts
"use client";

import { useSyncExternalStore } from "react";
import { voyageStore, type VoyageState } from "./voyageStore";

const serverSnapshot: VoyageState = voyageStore.getState();

/** Subscribe a component to voyage state. Re-renders on every store change — use for DOM, not per-frame 3D. */
export function useVoyage(): VoyageState {
  return useSyncExternalStore(voyageStore.subscribe, voyageStore.getState, () => serverSnapshot);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/scene/scroll/voyageStore.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add src/scene/scroll/voyageStore.ts src/scene/scroll/useVoyage.ts src/scene/scroll/voyageStore.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): framework-agnostic voyage store + useVoyage hook

Single source of truth for progress/velocity/chapter/distance/elapsed that the
Three loop reads imperatively and React reads via useSyncExternalStore.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Quality tiers + structured logging

**Files:**
- Create: `src/scene/quality.ts`
- Create: `src/lib/log.ts`
- Create: `src/lib/clientLog.ts`
- Create: `src/app/api/logs/route.ts`
- Modify: `.gitignore` (add `logs/`)
- Test: `src/scene/quality.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Tier = "high" | "mid" | "still";
  export interface TierSettings { dpr: number; starCount: number; streakCount: number; bloom: boolean; animate: boolean; }
  export const TIER_SETTINGS: Record<Tier, TierSettings>;
  export interface QualityEnv { isMobile: boolean; reducedMotion: boolean; webgl: boolean; }
  export function selectTier(env: QualityEnv): Tier;
  export function probeDemote(tier: Tier, fps: number | null): Tier; // < 45 → one tier down; null/NaN → unchanged
  export function detectEnv(): QualityEnv;                          // server → { isMobile:false, reducedMotion:true, webgl:false }
  export function runFpsProbe(durationMs?: number): Promise<number | null>; // null = inconclusive (tab hidden / no document)
  export function logClient(event: LogEvent, data?: Record<string, unknown>): void; // clientLog.ts
  export type LogEvent = "quality.tier" | "quality.probe" | "scene.context_lost";
  ```

- [ ] **Step 1: Write the failing tests**

`src/scene/quality.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { selectTier, probeDemote, TIER_SETTINGS } from "./quality";

describe("selectTier", () => {
  it("returns still when reduced motion is requested", () => {
    expect(selectTier({ isMobile: false, reducedMotion: true, webgl: true })).toBe("still");
    expect(selectTier({ isMobile: true, reducedMotion: true, webgl: true })).toBe("still");
  });
  it("returns still when WebGL is unavailable", () => {
    expect(selectTier({ isMobile: false, reducedMotion: false, webgl: false })).toBe("still");
  });
  it("returns mid on mobile and high on desktop", () => {
    expect(selectTier({ isMobile: true, reducedMotion: false, webgl: true })).toBe("mid");
    expect(selectTier({ isMobile: false, reducedMotion: false, webgl: true })).toBe("high");
  });
});

describe("probeDemote", () => {
  it("demotes exactly one tier below 45 fps", () => {
    expect(probeDemote("high", 44.9)).toBe("mid");
    expect(probeDemote("mid", 30)).toBe("still");
    expect(probeDemote("still", 10)).toBe("still");
  });
  it("keeps the tier at or above 45 fps", () => {
    expect(probeDemote("high", 45)).toBe("high");
    expect(probeDemote("mid", 60)).toBe("mid");
  });
});

describe("TIER_SETTINGS", () => {
  it("respects the DPR caps and disables animation only for still", () => {
    expect(TIER_SETTINGS.high.dpr).toBe(1.5);
    expect(TIER_SETTINGS.mid.dpr).toBe(1);
    expect(TIER_SETTINGS.high.animate).toBe(true);
    expect(TIER_SETTINGS.mid.animate).toBe(true);
    expect(TIER_SETTINGS.still.animate).toBe(false);
    expect(TIER_SETTINGS.mid.starCount).toBeLessThan(TIER_SETTINGS.high.starCount);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/scene/quality.test.ts`
Expected: FAIL — `Cannot find module './quality'`

- [ ] **Step 3: Implement `src/scene/quality.ts`**

```ts
export type Tier = "high" | "mid" | "still";

export interface TierSettings {
  dpr: number;
  starCount: number;
  streakCount: number;
  bloom: boolean;
  animate: boolean;
}

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high:  { dpr: 1.5, starCount: 2400, streakCount: 260, bloom: true,  animate: true },
  mid:   { dpr: 1,   starCount: 1200, streakCount: 120, bloom: false, animate: true },
  still: { dpr: 1,   starCount: 0,    streakCount: 0,   bloom: false, animate: false },
};

export interface QualityEnv {
  isMobile: boolean;
  reducedMotion: boolean;
  webgl: boolean;
}

export function selectTier(env: QualityEnv): Tier {
  if (env.reducedMotion || !env.webgl) return "still";
  return env.isMobile ? "mid" : "high";
}

export const PROBE_MIN_FPS = 45;

export function probeDemote(tier: Tier, fps: number): Tier {
  if (fps >= PROBE_MIN_FPS) return tier;
  if (tier === "high") return "mid";
  return "still";
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Browser-only. */
export function detectEnv(): QualityEnv {
  return {
    isMobile: window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: hasWebGL(),
  };
}

/** Browser-only. Counts rAF ticks for `durationMs` and resolves the average fps. */
export function runFpsProbe(durationMs = 1000): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - start >= durationMs) {
        resolve((frames * 1000) / (now - start));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
```

- [ ] **Step 4: Implement server log helper `src/lib/log.ts`**

```ts
import { promises as fs } from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "logs");

/** Append one JSON line to logs/<name>.jsonl. Silently no-ops on read-only filesystems (Vercel). */
export async function appendLog(name: string, record: Record<string, unknown>): Promise<void> {
  const safe = name.replace(/[^a-z0-9_-]/gi, "_");
  const line = JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n";
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(path.join(LOG_DIR, `${safe}.jsonl`), line, "utf8");
  } catch {
    // read-only FS or permissions — logging must never break a request
  }
}
```

- [ ] **Step 5: Implement client log helper `src/lib/clientLog.ts`**

```ts
export type LogEvent = "quality.tier" | "quality.probe" | "scene.context_lost";

/** Logs to the console as one JSON line and fire-and-forgets to /api/logs. */
export function logClient(event: LogEvent, data: Record<string, unknown> = {}): void {
  const record = { event, ...data };
  console.info(JSON.stringify(record));
  if (typeof fetch !== "function") return;
  try {
    void fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never throw from logging */
  }
}
```

- [ ] **Step 6: Implement the ingest route `src/app/api/logs/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { appendLog } from "@/lib/log";

const ALLOWED_EVENTS = new Set(["quality.tier", "quality.probe", "scene.context_lost"]);
const MAX_BODY_BYTES = 2048;

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const event = body.event;
  if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }
  await appendLog("client", body);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 7: Ignore the logs directory**

Append to `.gitignore` (root-anchored — an unanchored `logs/` would also ignore `src/app/api/logs/`):
```
# runtime logs
/logs/
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- src/scene/quality.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 9: Commit**

```bash
git add src/scene/quality.ts src/scene/quality.test.ts src/lib/log.ts src/lib/clientLog.ts src/app/api/logs/route.ts .gitignore
git commit -m "$(cat <<'EOF'
feat(voyage): quality tiers with FPS-probe demotion + structured client logs

Tier selection matrix (device x reduced-motion x WebGL) under test; allow-listed
/api/logs appends JSON lines to logs/ where the filesystem permits.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `SetPiece` interface + Starfield

**Files:**
- Create: `src/scene/chapters/types.ts`
- Create: `src/scene/chapters/Starfield.ts`
- Test: `src/scene/chapters/Starfield.test.ts`

**Interfaces:**
- Consumes: `Tier`, `TIER_SETTINGS` (Task 3); `VoyageState` (Task 2).
- Produces:
  ```ts
  export interface FrameContext { t: number; dt: number; voyage: VoyageState; camera: THREE.PerspectiveCamera; audioEnergy: number; ignite: number; }
  export interface SetPiece { build(scene: THREE.Scene, tier: Tier): void; update(ctx: FrameContext): void; dispose(): void; }
  export class Starfield implements SetPiece { setSoften(v: number): void; setFade(v: number): void; get count(): number; }
  ```

- [ ] **Step 1: Write the failing test**

`src/scene/chapters/Starfield.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { Starfield } from "./Starfield";
import { TIER_SETTINGS } from "@/scene/quality";

describe("Starfield", () => {
  it("builds the tier's star count spread along the flight corridor", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "mid");
    expect(field.count).toBe(TIER_SETTINGS.mid.starCount);
    expect(scene.children).toHaveLength(1);
    const pos = field.positions;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < pos.length; i += 3) {
      minZ = Math.min(minZ, pos[i + 2]);
      maxZ = Math.max(maxZ, pos[i + 2]);
    }
    expect(minZ).toBeGreaterThanOrEqual(-220);
    expect(maxZ).toBeLessThanOrEqual(20);
  });

  it("soften enlarges and dims; fade dims to black; dispose empties the scene", () => {
    const scene = new THREE.Scene();
    const field = new Starfield();
    field.build(scene, "high");
    const base = field.material.size;
    field.setSoften(1);
    field.applyControls(1);
    expect(field.material.size).toBeGreaterThan(base);
    expect(field.material.opacity).toBeLessThan(1);
    field.setSoften(0);
    field.setFade(1);
    field.applyControls(1);
    expect(field.material.opacity).toBe(0);
    field.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scene/chapters/Starfield.test.ts`
Expected: FAIL — `Cannot find module './Starfield'`

- [ ] **Step 3: Create `src/scene/chapters/types.ts`**

```ts
import type * as THREE from "three";
import type { Tier } from "@/scene/quality";
import type { VoyageState } from "@/scene/scroll/voyageStore";

export interface FrameContext {
  /** Seconds since the scene mounted. */
  t: number;
  /** Seconds since the previous frame. */
  dt: number;
  voyage: VoyageState;
  camera: THREE.PerspectiveCamera;
  /** 0..1 smoothed audio energy from the analyser (0 when muted). */
  audioEnergy: number;
  /** 0..1 ignite fade-in. */
  ignite: number;
}

export interface SetPiece {
  build(scene: THREE.Scene, tier: Tier): void;
  update(ctx: FrameContext): void;
  dispose(): void;
}
```

- [ ] **Step 4: Implement `src/scene/chapters/Starfield.ts`**

```ts
import * as THREE from "three";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import type { FrameContext, SetPiece } from "./types";

const CORRIDOR_Z_NEAR = 20;
const CORRIDOR_Z_FAR = -220;
const CORRIDOR_RADIUS = 45;
const BASE_SIZE = 0.14;
const BASE_OPACITY = 0.85;

/** Seeded PRNG so a given tier always renders the same sky (stable screenshots). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Monochrome point field filling a long corridor along -z that the camera flies through.
 * Controls: soften (focus pull behind pinned panels) and fade (Dark Passage).
 */
export class Starfield implements SetPiece {
  private points: THREE.Points | null = null;
  private geometry = new THREE.BufferGeometry();
  readonly material = new THREE.PointsMaterial({
    size: BASE_SIZE,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false,
  });
  positions: Float32Array = new Float32Array(0);
  private soften = 0;
  private fade = 0;
  private scene: THREE.Scene | null = null;

  get count(): number {
    return this.positions.length / 3;
  }

  build(scene: THREE.Scene, tier: Tier): void {
    const n = TIER_SETTINGS[tier].starCount;
    const rand = mulberry32(1337);
    this.positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = CORRIDOR_RADIUS * Math.sqrt(rand());
      const a = rand() * Math.PI * 2;
      this.positions[i * 3 + 0] = Math.cos(a) * r;
      this.positions[i * 3 + 1] = Math.sin(a) * r;
      this.positions[i * 3 + 2] = CORRIDOR_Z_NEAR + (CORRIDOR_Z_FAR - CORRIDOR_Z_NEAR) * rand();
    }
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene = scene;
    scene.add(this.points);
  }

  /** 0..1 — enlarge + dim so the field reads as out-of-focus behind a panel. */
  setSoften(v: number): void {
    this.soften = Math.min(1, Math.max(0, v));
  }

  /** 0..1 — fade the whole field to black (Dark Passage). */
  setFade(v: number): void {
    this.fade = Math.min(1, Math.max(0, v));
  }

  /** Apply control values to the material. Exposed for tests; update() calls it every frame. */
  applyControls(ignite: number, audioEnergy = 0): void {
    this.material.size = BASE_SIZE * (1 + this.soften * 0.6) * (1 + audioEnergy * 1.5);
    const focus = 1 - this.soften * 0.65;
    this.material.opacity = BASE_OPACITY * ignite * focus * (1 - this.fade) * (0.75 + audioEnergy * 0.5);
  }

  update(ctx: FrameContext): void {
    if (!this.points) return;
    this.applyControls(ctx.ignite, ctx.audioEnergy);
    this.points.rotation.z += ctx.dt * 0.004 * (1 + ctx.audioEnergy * 2);
  }

  dispose(): void {
    if (this.points && this.scene) this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.points = null;
    this.scene = null;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/scene/chapters/Starfield.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/scene/chapters/types.ts src/scene/chapters/Starfield.ts src/scene/chapters/Starfield.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): SetPiece interface + seeded Starfield with soften/fade controls

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: EnergyOrb (the star) and WarpStreaks

**Files:**
- Create: `src/scene/chapters/EnergyOrb.ts`
- Create: `src/scene/chapters/WarpStreaks.ts`
- Test: `src/scene/chapters/WarpStreaks.test.ts`

**Interfaces:**
- Consumes: `SetPiece`, `FrameContext` (Task 4); `STAR_POSITION`, `starScale` (Task 1); `TIER_SETTINGS` (Task 3).
- Produces:
  ```ts
  export const AMBER = 0xf2b35c;
  export class EnergyOrb implements SetPiece { setGlare(v: number): void; }
  export class WarpStreaks implements SetPiece { get count(): number; }
  export function streakLength(velocity01: number): number;   // 0.4 → 14
  export function streakOpacity(velocity01: number): number;  // 0.12 → 0.65
  ```

- [ ] **Step 1: Write the failing test**

`src/scene/chapters/WarpStreaks.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { WarpStreaks, streakLength, streakOpacity } from "./WarpStreaks";
import { TIER_SETTINGS } from "@/scene/quality";

describe("streak curves", () => {
  it("length and opacity grow with velocity and clamp", () => {
    expect(streakLength(0)).toBeCloseTo(0.4, 5);
    expect(streakLength(1)).toBeCloseTo(14, 5);
    expect(streakLength(2)).toBeCloseTo(14, 5);
    expect(streakLength(0.5)).toBeGreaterThan(streakLength(0.2));
    expect(streakOpacity(0)).toBeCloseTo(0.12, 5);
    expect(streakOpacity(1)).toBeCloseTo(0.65, 5);
    expect(streakOpacity(-1)).toBeCloseTo(0.12, 5);
  });
});

describe("WarpStreaks", () => {
  it("builds tier count as line segments (2 vertices each)", () => {
    const scene = new THREE.Scene();
    const streaks = new WarpStreaks();
    streaks.build(scene, "high");
    expect(streaks.count).toBe(TIER_SETTINGS.high.streakCount);
    const pos = streaks.geometry.getAttribute("position") as THREE.BufferAttribute;
    expect(pos.count).toBe(TIER_SETTINGS.high.streakCount * 2);
    streaks.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scene/chapters/WarpStreaks.test.ts`
Expected: FAIL — `Cannot find module './WarpStreaks'`

- [ ] **Step 3: Implement `src/scene/chapters/WarpStreaks.ts`**

```ts
import * as THREE from "three";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import type { FrameContext, SetPiece } from "./types";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function streakLength(velocity01: number): number {
  return 0.4 + (14 - 0.4) * clamp01(velocity01);
}

export function streakOpacity(velocity01: number): number {
  return 0.12 + (0.65 - 0.12) * clamp01(velocity01);
}

const RADIUS = 30;
const AHEAD = 150;   // streaks live from camera.z - 5 down to camera.z - AHEAD
const BEHIND = 5;

/**
 * Monochrome line streaks parallel to -z. Length and opacity follow scroll velocity;
 * streaks that fall behind the camera are recycled ahead of it.
 * Reference: ThreeUI "Warp Field" (MIT, github.com/MengTo/threeui) — re-implemented, not imported.
 */
export class WarpStreaks implements SetPiece {
  readonly geometry = new THREE.BufferGeometry();
  private readonly material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private lines: THREE.LineSegments | null = null;
  private heads: Float32Array = new Float32Array(0); // x,y,z per streak
  private positions: Float32Array = new Float32Array(0);
  private scene: THREE.Scene | null = null;
  private length = streakLength(0);

  get count(): number {
    return this.heads.length / 3;
  }

  build(scene: THREE.Scene, tier: Tier): void {
    const n = TIER_SETTINGS[tier].streakCount;
    this.heads = new Float32Array(n * 3);
    this.positions = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const r = RADIUS * (0.25 + 0.75 * Math.sqrt(Math.random()));
      const a = Math.random() * Math.PI * 2;
      this.heads[i * 3 + 0] = Math.cos(a) * r;
      this.heads[i * 3 + 1] = Math.sin(a) * r;
      this.heads[i * 3 + 2] = -Math.random() * AHEAD;
    }
    this.writePositions();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.lines.frustumCulled = false;
    this.scene = scene;
    scene.add(this.lines);
  }

  private writePositions(): void {
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const x = this.heads[i * 3], y = this.heads[i * 3 + 1], z = this.heads[i * 3 + 2];
      this.positions[i * 6 + 0] = x; this.positions[i * 6 + 1] = y; this.positions[i * 6 + 2] = z;
      this.positions[i * 6 + 3] = x; this.positions[i * 6 + 4] = y; this.positions[i * 6 + 5] = z + this.length;
    }
  }

  update(ctx: FrameContext): void {
    if (!this.lines) return;
    const v = ctx.voyage.velocity;
    // ease toward the target length so a scroll stop doesn't snap the streaks
    this.length += (streakLength(v) - this.length) * Math.min(1, ctx.dt * 6);
    this.material.opacity = streakOpacity(v) * ctx.ignite;
    const camZ = ctx.camera.position.z;
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const zi = i * 3 + 2;
      if (this.heads[zi] > camZ + BEHIND) this.heads[zi] = camZ - AHEAD + Math.random() * 10;
      if (this.heads[zi] < camZ - AHEAD - 20) this.heads[zi] = camZ - Math.random() * AHEAD;
    }
    this.writePositions();
    (this.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    if (this.lines && this.scene) this.scene.remove(this.lines);
    this.geometry.dispose();
    this.material.dispose();
    this.lines = null;
    this.scene = null;
  }
}
```

- [ ] **Step 4: Implement `src/scene/chapters/EnergyOrb.ts`**

```ts
import * as THREE from "three";
import { STAR_POSITION, starScale } from "@/scene/camera/flightPath";
import type { Tier } from "@/scene/quality";
import type { FrameContext, SetPiece } from "./types";

export const AMBER = 0xf2b35c;

const VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uGlare;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vView;

  // compact 3D value noise + 4-octave fbm
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.02 + vec3(1.7); a *= 0.5; }
    return v;
  }

  void main() {
    vec3 p = normalize(vPos);
    float n = fbm(p * 2.5 + vec3(0.0, uTime * 0.05, uTime * 0.03));
    n = n * 0.6 + fbm(p * 6.0 - uTime * 0.08) * 0.4;
    float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
    vec3 body = mix(uColor * 0.55, uColor * 1.35, n);
    vec3 col = body + fresnel * uColor * 1.6 + uGlare * vec3(1.0, 0.92, 0.8);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(242,179,92,0.9)");
  grad.addColorStop(0.35, "rgba(242,179,92,0.35)");
  grad.addColorStop(1, "rgba(242,179,92,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The amber star at STAR_POSITION: an FBM-shaded sphere with a fresnel rim and an
 * additive glow sprite. Scale follows starScale(progress); glare is a 0..1 control
 * used by The Pilot (slice 7).
 * Reference: ThreeUI "Energy Orb" (MIT, github.com/MengTo/threeui) — re-implemented, not imported.
 */
export class EnergyOrb implements SetPiece {
  private group = new THREE.Group();
  private geometry = new THREE.SphereGeometry(1, 48, 48);
  private material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(AMBER) },
      uGlare: { value: 0 },
    },
  });
  private glowMaterial: THREE.SpriteMaterial | null = null;
  private glow: THREE.Sprite | null = null;
  private scene: THREE.Scene | null = null;
  private glare = 0;

  build(scene: THREE.Scene, _tier: Tier): void {
    const sphere = new THREE.Mesh(this.geometry, this.material);
    this.group.add(sphere);
    if (typeof document !== "undefined") {
      this.glowMaterial = new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.glow = new THREE.Sprite(this.glowMaterial);
      this.glow.scale.set(4.2, 4.2, 1);
      this.group.add(this.glow);
    }
    this.group.position.copy(STAR_POSITION);
    this.scene = scene;
    scene.add(this.group);
  }

  setGlare(v: number): void {
    this.glare = Math.min(1, Math.max(0, v));
  }

  update(ctx: FrameContext): void {
    const s = starScale(ctx.voyage.progress) * ctx.ignite;
    this.group.scale.setScalar(Math.max(0.001, s));
    this.material.uniforms.uTime.value = ctx.t;
    this.material.uniforms.uGlare.value = this.glare;
    if (this.glow) this.glow.scale.setScalar(4.2 * (1 + ctx.audioEnergy * 0.4) * (1 + this.glare * 2));
  }

  dispose(): void {
    if (this.scene) this.scene.remove(this.group);
    this.geometry.dispose();
    this.material.dispose();
    this.glowMaterial?.map?.dispose();
    this.glowMaterial?.dispose();
    this.scene = null;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/scene/chapters/WarpStreaks.test.ts`
Expected: PASS (2 tests)

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/scene/chapters/EnergyOrb.ts src/scene/chapters/WarpStreaks.ts src/scene/chapters/WarpStreaks.test.ts
git commit -m "$(cat <<'EOF'
feat(voyage): EnergyOrb star (FBM + fresnel + glow) and velocity-driven WarpStreaks

Both are re-implementations of ThreeUI (MIT) references against three@0.169.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: SceneRoot + StillSky

**Files:**
- Create: `src/scene/SceneRoot.tsx`
- Create: `src/scene/StillSky.tsx`

**Interfaces:**
- Consumes: `voyageStore` (Task 2); `getCameraPose`, `fovForVelocity` (Task 1); `TIER_SETTINGS`, `Tier` (Task 3); `Starfield`, `EnergyOrb`, `WarpStreaks` (Tasks 4–5); `getAudioEngine` (existing).
- Produces:
  ```tsx
  export default function SceneRoot(props: { tier: Exclude<Tier, "still">; ignite: boolean; onContextLost: () => void }): JSX.Element;
  export default function StillSky(): JSX.Element;
  ```

- [ ] **Step 1: Implement `src/scene/SceneRoot.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import { getCameraPose, fovForVelocity, type CameraPose } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import { Starfield } from "@/scene/chapters/Starfield";
import { EnergyOrb } from "@/scene/chapters/EnergyOrb";
import { WarpStreaks } from "@/scene/chapters/WarpStreaks";
import type { FrameContext, SetPiece } from "@/scene/chapters/types";

interface SceneRootProps {
  tier: Exclude<Tier, "still">;
  /** Flip to true when Ignition completes; the scene fades in over ~1.2s. */
  ignite: boolean;
  onContextLost: () => void;
}

const IGNITE_SECONDS = 1.2;
const POSE_LERP = 0.08;

/** Owns the single WebGL context. Reads voyageStore imperatively — no React re-renders per frame. */
export default function SceneRoot({ tier, ignite, onContextLost }: SceneRootProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const igniteRef = useRef(ignite);
  igniteRef.current = ignite;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const settings = TIER_SETTINGS[tier];

    const canvas = document.createElement("canvas");
    canvas.id = "voyage-canvas";
    host.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        powerPreference: "high-performance",
        stencil: false,
      });
    } catch {
      host.removeChild(canvas);
      onContextLost();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.dpr));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);

    const pieces: SetPiece[] = [new Starfield(), new WarpStreaks(), new EnergyOrb()];
    for (const p of pieces) p.build(scene, tier);

    const pose: CameraPose = { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
    const smoothPos = new THREE.Vector3();
    const smoothLook = new THREE.Vector3(0, 0, -1);
    getCameraPose(0, pose);
    smoothPos.copy(pose.position);
    smoothLook.copy(pose.lookAt);

    const mouse = { x: 0, y: 0 };
    let mouseThrottle = 0;
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - mouseThrottle < 32) return;
      mouseThrottle = now;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }, 150);
    };

    let visible = !document.hidden;
    const onVisibility = () => {
      visible = !document.hidden;
    };

    const onLost = (e: Event) => {
      e.preventDefault();
      onContextLost();
    };
    canvas.addEventListener("webglcontextlost", onLost, false);
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    const engine = getAudioEngine();
    const freq = new Uint8Array(128);
    let energy = 0;
    let igniteT = 0;
    let last = performance.now();
    const start = last;
    let raf = 0;

    const ctx: FrameContext = { t: 0, dt: 0, voyage: voyageStore.getState(), camera, audioEnergy: 0, ignite: 0 };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      if (igniteRef.current && igniteT < 1) igniteT = Math.min(1, igniteT + dt / IGNITE_SECONDS);

      const analyser = engine.getAnalyser();
      if (analyser) {
        const len = Math.min(freq.length, analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < len; i++) sum += freq[i];
        energy = energy * 0.85 + (sum / len / 255) * 0.15;
      } else {
        energy *= 0.95;
      }

      const voyage = voyageStore.getState();
      getCameraPose(voyage.progress, pose);
      smoothPos.lerp(pose.position, POSE_LERP);
      smoothLook.lerp(pose.lookAt, POSE_LERP);
      camera.position.set(smoothPos.x + mouse.x * 0.35, smoothPos.y + mouse.y * 0.25, smoothPos.z);
      camera.lookAt(smoothLook);
      const targetFov = fovForVelocity(voyage.velocity);
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov += (targetFov - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
      }

      ctx.t = (now - start) / 1000;
      ctx.dt = dt;
      ctx.voyage = voyage;
      ctx.audioEnergy = energy;
      ctx.ignite = igniteT;
      for (const p of pieces) p.update(ctx);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      canvas.removeEventListener("webglcontextlost", onLost);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const p of pieces) p.dispose();
      renderer.dispose();
      if (host.contains(canvas)) host.removeChild(canvas);
    };
  }, [tier, onContextLost]);

  return <div ref={hostRef} className="voyage-scene" aria-hidden="true" />;
}
```

- [ ] **Step 2: Implement `src/scene/StillSky.tsx`**

```tsx
/** `still`-tier fallback: a deterministic SVG starfield over a black-to-charcoal gradient. No WebGL, no motion. */
export default function StillSky() {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const stars = Array.from({ length: 160 }, () => ({
    cx: (rand() * 100).toFixed(2),
    cy: (rand() * 100).toFixed(2),
    r: (0.05 + rand() * 0.18).toFixed(3),
    o: (0.35 + rand() * 0.65).toFixed(2),
  }));
  return (
    <div className="voyage-scene voyage-still" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="voyage-still__svg">
        {stars.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff" opacity={s.o} />
        ))}
        <circle cx="72" cy="66" r="1.1" fill="#f2b35c" opacity="0.95" />
        <circle cx="72" cy="66" r="3.5" fill="#f2b35c" opacity="0.18" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/SceneRoot.tsx src/scene/StillSky.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): SceneRoot (single WebGL context, scroll-driven camera) + StillSky fallback

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Lenis scroll bridge

**Files:**
- Modify: `package.json` (add `lenis`)
- Create: `src/scene/scroll/VoyageScroll.tsx`

**Interfaces:**
- Consumes: `voyageStore`, `normalizeVelocity` (Task 2).
- Produces:
  ```tsx
  export default function VoyageScroll(props: { smooth: boolean }): null;
  ```
  Side effects: writes `setScroll` on every scroll, `tick` every 250ms, registers `scrollTo`.

- [ ] **Step 1: Install Lenis**

Run: `cd /Users/admin/Codes-2/portfolio && npm install lenis@^1.3.0`

- [ ] **Step 2: Implement `src/scene/scroll/VoyageScroll.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { voyageStore, normalizeVelocity } from "./voyageStore";

interface VoyageScrollProps {
  /** false → native scroll (reduced motion / still tier). */
  smooth: boolean;
}

function maxScroll(): number {
  return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
}

/** Bridges page scroll (Lenis or native) into voyageStore. Renders nothing. */
export default function VoyageScroll({ smooth }: VoyageScrollProps) {
  useEffect(() => {
    const tick = setInterval(() => voyageStore.tick(250), 250);

    if (smooth) {
      const lenis = new Lenis({ autoRaf: true, lerp: 0.1, smoothWheel: true });
      lenis.on("scroll", (e: { progress: number; velocity: number }) => {
        voyageStore.setScroll(e.progress, normalizeVelocity(e.velocity));
      });
      voyageStore.registerScroller((p) => lenis.scrollTo(p * maxScroll(), { duration: 1.4 }));
      return () => {
        clearInterval(tick);
        lenis.destroy();
      };
    }

    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const frames = Math.max(1, (now - lastT) / 16.67);
      const vel = normalizeVelocity((y - lastY) / frames);
      lastY = y;
      lastT = now;
      voyageStore.setScroll(y / maxScroll(), vel);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    voyageStore.registerScroller((p) => window.scrollTo({ top: p * maxScroll(), behavior: "auto" }));
    onScroll();
    return () => {
      clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
    };
  }, [smooth]);

  return null;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `lenis/dist/lenis.css` cannot be resolved by TypeScript, add `declare module "lenis/dist/lenis.css";` to `src/types/global.d.ts`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/scene/scroll/VoyageScroll.tsx src/types/global.d.ts
git commit -m "$(cat <<'EOF'
feat(voyage): Lenis smooth-scroll bridge with native fallback

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Telemetry HUD + Letterbox

**Files:**
- Create: `src/components/voyage/telemetry.ts`
- Create: `src/components/voyage/Telemetry.tsx`
- Create: `src/components/voyage/Letterbox.tsx`
- Test: `src/components/voyage/telemetry.test.ts`

**Interfaces:**
- Consumes: `VoyageState`, `useVoyage` (Task 2).
- Produces:
  ```ts
  export interface TelemetryReadout { time: string; vel: string; dist: string; }
  export function formatTelemetry(s: Pick<VoyageState, "elapsedMs" | "velocity" | "distanceAU" | "chapter">): TelemetryReadout;
  export default function Telemetry(): JSX.Element;
  export default function Letterbox(props: { active: boolean }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing tests**

`src/components/voyage/telemetry.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatTelemetry } from "./telemetry";
import { CHAPTERS } from "@/scene/camera/flightPath";

const ch = (id: string) => CHAPTERS.find((c) => c.id === id)!;

describe("formatTelemetry", () => {
  it("formats T+ as mm:ss", () => {
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).time).toBe("T+ 00:00");
    expect(formatTelemetry({ elapsedMs: 65_000, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).time).toBe("T+ 01:05");
    expect(formatTelemetry({ elapsedMs: 3_600_000, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).time).toBe("T+ 59:59");
  });
  it("formats velocity in c with two decimals", () => {
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).vel).toBe("VEL 0.00c");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 1, distanceAU: 9.4, chapter: ch("launch") }).vel).toBe("VEL 0.98c");
  });
  it("formats distance, SIGNAL LOST in the passage, ARRIVED from pilot on", () => {
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).dist).toBe("DIST 9.4 AU");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 2.25, chapter: ch("belt") }).dist).toBe("DIST 2.3 AU");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 1, chapter: ch("passage") }).dist).toBe("SIGNAL LOST");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 0, chapter: ch("pilot") }).dist).toBe("0.0 AU · ARRIVED");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 0, chapter: ch("surface") }).dist).toBe("0.0 AU · ARRIVED");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/voyage/telemetry.test.ts`
Expected: FAIL — `Cannot find module './telemetry'`

- [ ] **Step 3: Implement `src/components/voyage/telemetry.ts`**

```ts
import type { VoyageState } from "@/scene/scroll/voyageStore";

export interface TelemetryReadout {
  time: string;
  vel: string;
  dist: string;
}

const ARRIVED_FROM = new Set(["pilot", "landing", "surface"]);

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
```

- [ ] **Step 4: Implement `src/components/voyage/Telemetry.tsx`**

```tsx
"use client";

import { useVoyage } from "@/scene/scroll/useVoyage";
import { formatTelemetry } from "./telemetry";

/** Mono HUD, top-left. Hidden under 768px via CSS. */
export default function Telemetry() {
  const s = useVoyage();
  const r = formatTelemetry(s);
  return (
    <div className="telemetry" aria-hidden="true">
      <span>{r.time}</span>
      <span>{r.vel}</span>
      <span className={s.chapter.id === "passage" ? "telemetry__lost" : undefined}>{r.dist}</span>
    </div>
  );
}
```

- [ ] **Step 5: Implement `src/components/voyage/Letterbox.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";

/** Cinematic bars (8vh each). Shown only during Ignition and the Jump. */
export default function Letterbox({ active }: { active: boolean }) {
  const t = { duration: 0.45, ease: [0.7, 0, 0.2, 1] as const };
  return (
    <div className="letterbox" aria-hidden="true">
      <motion.div className="letterbox__bar letterbox__bar--top" initial={false} animate={{ y: active ? 0 : "-100%" }} transition={t} />
      <motion.div className="letterbox__bar letterbox__bar--bottom" initial={false} animate={{ y: active ? 0 : "100%" }} transition={t} />
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/components/voyage/telemetry.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/voyage/telemetry.ts src/components/voyage/telemetry.test.ts src/components/voyage/Telemetry.tsx src/components/voyage/Letterbox.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): telemetry HUD formatter/component + letterbox bars

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: FlightRail

**Files:**
- Create: `src/components/voyage/FlightRail.tsx`

**Interfaces:**
- Consumes: `CONTENT_CHAPTERS` (Task 1); `useVoyage`, `voyageStore` (Task 2).
- Produces: `export default function FlightRail(): JSX.Element;`

- [ ] **Step 1: Implement `src/components/voyage/FlightRail.tsx`**

```tsx
"use client";

import { CONTENT_CHAPTERS } from "@/scene/camera/flightPath";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { voyageStore } from "@/scene/scroll/voyageStore";

/** Right-edge 1px rail: a tick per content chapter, an amber progress dot. Hidden under 1024px via CSS. */
export default function FlightRail() {
  const s = useVoyage();
  return (
    <nav className="rail" aria-label="Voyage chapters">
      <div className="rail__line" />
      <div className="rail__dot" style={{ top: `${s.progress * 100}%` }} aria-hidden="true" />
      {CONTENT_CHAPTERS.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`rail__tick${s.chapter.id === c.id ? " is-active" : ""}`}
          style={{ top: `${c.start * 100}%` }}
          onClick={() => voyageStore.scrollTo(c.start + 0.001)}
          aria-label={`Go to chapter ${c.index} ${c.label}`}
          aria-current={s.chapter.id === c.id ? "step" : undefined}
          data-cursor="hover"
        >
          <span className="rail__label">
            {c.index} / {c.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/voyage/FlightRail.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): flight-path rail with chapter ticks and progress dot

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Dock (ported controller) + CallToAction

**Files:**
- Create: `src/components/dock/dockController.ts`
- Create: `src/components/dock/CallToAction.tsx`
- Create: `src/components/dock/Dock.tsx`

**Interfaces:**
- Consumes: `voyageStore`, `useVoyage` (Task 2); `CHAPTERS` (Task 1); existing `MagneticButton`; existing `getAudioEngine`.
- Produces:
  ```ts
  export function createDockController(root: HTMLElement, getOptions: () => DockOptions): () => void;
  export interface DockOptions { proximity: number; spring: number; damping: number; widthGrowth: number; heightGrowth: number; drop: number; }
  export default function CallToAction(props: { label: string; onClick?: () => void; variant?: "primary" | "ghost"; ariaLabel?: string }): JSX.Element;
  export default function Dock(props: { visible: boolean }): JSX.Element;
  export const DOCK_LINKS: readonly { label: string; chapter: ChapterId }[];
  ```

- [ ] **Step 1: Port the controller to `src/components/dock/dockController.ts`**

```ts
/**
 * Proximity-spring dock controller.
 * Ported from ThreeUI "Animated Top Dock" — topDockController.ts
 * (c) Meng To / DesignCode, MIT License, https://github.com/MengTo/threeui
 * Adapted: horizontal-only, no distribute/lockTrack modes, TS strictness.
 */

export interface DockOptions {
  proximity: number;
  spring: number;
  damping: number;
  widthGrowth: number;
  heightGrowth: number;
  drop: number;
}

interface ItemState {
  element: HTMLElement;
  baseWidth: number;
  baseHeight: number;
  value: number;
  velocity: number;
  target: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function createDockController(root: HTMLElement, getOptions: () => DockOptions): () => void {
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const precisionQuery = window.matchMedia("(hover:hover) and (pointer:fine)");
  const items: ItemState[] = Array.from(root.querySelectorAll<HTMLElement>("[data-dock-item]")).map((element) => ({
    element, baseWidth: 0, baseHeight: 0, value: 0, velocity: 0, target: 0,
  }));

  let enabled = false;
  let pointerActive = false;
  let dirty = false;
  let frame = 0;
  let released = false;

  const canAnimate = () => !reducedQuery.matches && root.clientWidth > 0 && window.innerWidth > 600 && precisionQuery.matches;

  const measure = () => {
    enabled = canAnimate();
    for (const s of items) {
      s.element.style.width = "";
      s.element.style.height = "";
      s.element.style.transform = "";
      s.element.dataset.dockNear = "false";
    }
    for (const s of items) {
      const r = s.element.getBoundingClientRect();
      s.baseWidth = r.width;
      s.baseHeight = r.height;
      s.value = 0; s.velocity = 0; s.target = 0;
    }
    pointerActive = false;
    dirty = false;
    root.dataset.dockState = enabled ? "idle" : "static";
  };

  const setTargets = (clientX: number) => {
    if (!enabled) return;
    const { proximity } = getOptions();
    for (const s of items) {
      const r = s.element.getBoundingClientRect();
      const center = r.left + r.width * 0.5;
      const p = clamp(1 - Math.abs(clientX - center) / Math.max(1, proximity), 0, 1);
      const influence = p * p * (3 - 2 * p);
      s.target = influence;
      s.element.dataset.dockNear = influence > 0.08 ? "true" : "false";
    }
    pointerActive = true;
    dirty = true;
    root.dataset.dockState = "active";
  };

  const focusItem = (item: HTMLElement) => {
    if (!enabled) return;
    const index = items.findIndex((s) => s.element === item);
    if (index < 0) return;
    items.forEach((s, i) => {
      s.target = i === index ? 1 : Math.abs(i - index) === 1 ? 0.24 : 0;
      s.element.dataset.dockNear = s.target > 0.08 ? "true" : "false";
    });
    pointerActive = false;
    dirty = true;
    root.dataset.dockState = "focus";
  };

  const reset = () => {
    pointerActive = false;
    dirty = true;
    for (const s of items) {
      s.target = 0;
      s.element.dataset.dockNear = "false";
    }
  };

  const applyLayout = () => {
    const o = getOptions();
    for (const s of items) {
      const v = clamp(s.value, 0, 1.08);
      const extraW = Math.min(o.widthGrowth, s.baseWidth * 0.24);
      s.element.style.width = `${(s.baseWidth + extraW * v).toFixed(2)}px`;
      s.element.style.height = `${(s.baseHeight + o.heightGrowth * v).toFixed(2)}px`;
      s.element.style.transform = `translateY(${(v * o.drop).toFixed(2)}px)`;
    }
  };

  const draw = () => {
    if (enabled && dirty) {
      const o = getOptions();
      let moving = false;
      for (const s of items) {
        s.velocity += (s.target - s.value) * o.spring;
        s.velocity *= o.damping;
        s.value += s.velocity;
        if (Math.abs(s.target - s.value) < 0.001 && Math.abs(s.velocity) < 0.001) {
          s.value = s.target; s.velocity = 0;
        } else {
          moving = true;
        }
      }
      applyLayout();
      if (!moving) {
        dirty = false;
        if (items.every((s) => s.target === 0)) root.dataset.dockState = "idle";
      }
    }
    frame = requestAnimationFrame(draw);
  };

  const onPointerMove = (e: PointerEvent) => setTargets(e.clientX);
  const onWindowPointerMove = (e: PointerEvent) => {
    if (!pointerActive) return;
    const r = root.getBoundingClientRect();
    const bottom = Math.max(r.bottom, ...items.map((s) => s.element.getBoundingClientRect().bottom));
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > bottom) reset();
  };
  const onFocusIn = (e: FocusEvent) => {
    const item = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-dock-item]");
    if (item) focusItem(item);
  };
  const onFocusOut = () => requestAnimationFrame(() => { if (!root.contains(document.activeElement)) reset(); });
  const onClick = () => reset();

  const remeasure = () => { if (!released) measure(); };
  document.fonts?.ready.then(remeasure);
  const ro = new ResizeObserver(remeasure);
  ro.observe(root.closest<HTMLElement>("[data-dock-frame]") ?? root.parentElement ?? root);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerleave", reset);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  root.addEventListener("click", onClick);
  window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
  reducedQuery.addEventListener("change", remeasure);
  precisionQuery.addEventListener("change", remeasure);
  measure();
  frame = requestAnimationFrame(draw);

  return () => {
    released = true;
    cancelAnimationFrame(frame);
    ro.disconnect();
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerleave", reset);
    root.removeEventListener("focusin", onFocusIn);
    root.removeEventListener("focusout", onFocusOut);
    root.removeEventListener("click", onClick);
    window.removeEventListener("pointermove", onWindowPointerMove);
    reducedQuery.removeEventListener("change", remeasure);
    precisionQuery.removeEventListener("change", remeasure);
  };
}
```

- [ ] **Step 2: Implement `src/components/dock/CallToAction.tsx`**

```tsx
"use client";

import MagneticButton from "@/components/motion/MagneticButton";

interface CallToActionProps {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  ariaLabel?: string;
  className?: string;
}

/** The one CTA component: amber primary or hairline ghost, mono label, sliding arrow, magnetic. */
export default function CallToAction({ label, onClick, variant = "primary", ariaLabel, className }: CallToActionProps) {
  return (
    <MagneticButton
      className={`cta cta--${variant}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      strength={0.3}
    >
      <span className="cta__label">{label}</span>
      <span className="cta__arrow" aria-hidden="true">→</span>
    </MagneticButton>
  );
}
```

- [ ] **Step 3: Implement `src/components/dock/Dock.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CHAPTERS, type ChapterId } from "@/scene/camera/flightPath";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import { createDockController } from "./dockController";
import CallToAction from "./CallToAction";

export const DOCK_LINKS: readonly { label: string; chapter: ChapterId }[] = [
  { label: "Services", chapter: "approach" },
  { label: "Process", chapter: "orbit" },
  { label: "Work", chapter: "worlds" },
  { label: "About", chapter: "pilot" },
];

const DOCK_OPTIONS = { proximity: 122, spring: 0.19, damping: 0.7, widthGrowth: 17, heightGrowth: 10, drop: 2.5 };

function startOf(id: ChapterId): number {
  return CHAPTERS.find((c) => c.id === id)!.start + 0.001;
}

interface DockProps {
  /** false until Ignition completes. */
  visible: boolean;
}

/** Floating glass capsule nav. Compacts after the hero; collapses to a sheet under 768px. */
export default function Dock({ visible }: DockProps) {
  const capsuleRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const s = useVoyage();
  const compact = s.progress > 0.05;

  useEffect(() => {
    const root = capsuleRef.current;
    if (!root || !visible) return;
    return createDockController(root, () => DOCK_OPTIONS);
  }, [visible]);

  const go = (id: ChapterId) => {
    getAudioEngine().click({ volume: 0.05 });
    voyageStore.scrollTo(startOf(id));
    setOpen(false);
  };
  const book = () => {
    getAudioEngine().whoosh({ volume: 0.08 });
    voyageStore.scrollTo(startOf("landing"));
    setOpen(false);
  };

  return (
    <motion.header
      className="dock"
      data-dock-frame
      data-compact={compact ? "true" : "false"}
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: visible ? 0 : -40, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div ref={capsuleRef} className="dock__capsule" data-dock-state="idle">
        <button type="button" className="dock__mono" data-dock-item onClick={() => go("launch")} aria-label="Back to launch" data-cursor="hover">
          P
        </button>
        <nav className="dock__links" aria-label="Primary">
          {DOCK_LINKS.map((l) => (
            <button
              key={l.chapter}
              type="button"
              className={`dock__link${s.chapter.id === l.chapter ? " is-active" : ""}`}
              data-dock-item
              onClick={() => go(l.chapter)}
              aria-current={s.chapter.id === l.chapter ? "page" : undefined}
              data-cursor="hover"
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="dock__cta">
          <CallToAction label="Book a call" onClick={book} />
        </div>
        <button type="button" className="dock__menu" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
          <span /><span />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="dock__sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {DOCK_LINKS.map((l) => (
              <button key={l.chapter} type="button" className="dock__sheet-link" onClick={() => go(l.chapter)}>
                {l.label}
              </button>
            ))}
            <CallToAction label="Book a call" onClick={book} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dock/dockController.ts src/components/dock/CallToAction.tsx src/components/dock/Dock.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): floating dock (ported ThreeUI proximity spring, MIT) + CallToAction

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Settings fields for hero copy

**Files:**
- Modify: `src/lib/models.ts:53-71` (interface) and `:97-130` (schema)
- Modify: `src/lib/data.ts:39-55` (interface) and `:216-242` (`docToSettings`)
- Modify: `src/app/admin/components/types.ts` (Settings type, if it lists fields explicitly)

**Interfaces:**
- Produces: `Settings.heroHeadline: string`, `Settings.heroSubheadline: string` on both the Mongoose document and the `data.ts` DTO, with defaults.

- [ ] **Step 1: Add to the Mongoose interface and schema**

In `src/lib/models.ts`, inside `ISettings` after `audioFile: string;` add:
```ts
  heroHeadline: string;
  heroSubheadline: string;
```
Inside `SettingsSchema` after the `audioFile` line add:
```ts
    heroHeadline: { type: String, default: "I build AI-powered products, end to end.", trim: true },
    heroSubheadline: { type: String, default: "Full-stack builds and system architecture for founders and teams who want it shipped, not just scoped.", trim: true },
```

- [ ] **Step 2: Add to the DTO and mapper**

In `src/lib/data.ts`, inside `export interface Settings` after `audioFile: string;` add:
```ts
  heroHeadline: string;
  heroSubheadline: string;
```
Inside `docToSettings` after the `audioFile:` line add:
```ts
    heroHeadline: (doc.heroHeadline as string) ?? "I build AI-powered products, end to end.",
    heroSubheadline:
      (doc.heroSubheadline as string) ??
      "Full-stack builds and system architecture for founders and teams who want it shipped, not just scoped.",
```

- [ ] **Step 3: Keep the admin types compiling**

Open `src/app/admin/components/types.ts`. If its `Settings` type enumerates fields explicitly, add the same two `string` fields and defaults to `DEFAULT_SETTINGS`:
```ts
  heroHeadline: "I build AI-powered products, end to end.",
  heroSubheadline: "Full-stack builds and system architecture for founders and teams who want it shipped, not just scoped.",
```
(Admin inputs for editing these arrive in sub-project 2; defaults make the fields data-driven today.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/models.ts src/lib/data.ts src/app/admin/components/types.ts
git commit -m "$(cat <<'EOF'
feat(settings): heroHeadline / heroSubheadline fields with consulting defaults

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Ignition + Launch chapters

**Files:**
- Create: `src/components/voyage/Ignition.tsx`
- Create: `src/components/voyage/Launch.tsx`

**Interfaces:**
- Consumes: `useVoyage`, `voyageStore` (Task 2); `CHAPTERS` (Task 1); `CallToAction` (Task 10); `Settings` (Task 11).
- Produces:
  ```tsx
  export const IGNITION_STORAGE_KEY = "voyage-ignition-played";
  export default function Ignition(props: { enabled: boolean; onComplete: () => void; onLetterbox: (active: boolean) => void }): JSX.Element | null;
  export default function Launch(props: { headline: string; subheadline: string; ready: boolean }): JSX.Element;
  ```

- [ ] **Step 1: Implement `src/components/voyage/Ignition.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const IGNITION_STORAGE_KEY = "voyage-ignition-played";

interface IgnitionProps {
  /** false → skip immediately (still tier / reduced motion). */
  enabled: boolean;
  onComplete: () => void;
  onLetterbox: (active: boolean) => void;
}

type Phase = "resolve" | "fill" | "ignite" | "done";

/**
 * Chapter 00. ≤1.2s: title resolves blur→sharp, hairline fills, then hands off to the scene's ignite fade.
 * Plays once per session; click / Escape / Enter / Space skips.
 */
export default function Ignition({ enabled, onComplete, onLetterbox }: IgnitionProps) {
  const [phase, setPhase] = useState<Phase>("resolve");
  const [visible, setVisible] = useState(true);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    try { sessionStorage.setItem(IGNITION_STORAGE_KEY, "1"); } catch { /* private mode */ }
    setPhase("done");
    setVisible(false);
    onLetterbox(false);
    onComplete();
  }, [onComplete, onLetterbox]);

  useEffect(() => {
    let played = false;
    try { played = sessionStorage.getItem(IGNITION_STORAGE_KEY) === "1"; } catch { /* ignore */ }
    if (!enabled || played) {
      finish();
      return;
    }
    onLetterbox(true);
    const timers = [
      setTimeout(() => setPhase("fill"), 500),
      setTimeout(() => setPhase("ignite"), 900),
      setTimeout(finish, 1200),
    ];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, finish, onLetterbox]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="ignition"
          role="presentation"
          onClick={finish}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
        >
          <motion.p
            className="ignition__title"
            initial={{ opacity: 0, filter: "blur(14px)", letterSpacing: "0.3em" }}
            animate={{ opacity: 1, filter: "blur(0px)", letterSpacing: "0.12em" }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          >
            DESTINATION · PURAV S
          </motion.p>
          <motion.p
            className="ignition__sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "resolve" ? 0 : 0.7 }}
            transition={{ duration: 0.3 }}
          >
            SYSTEMS · AI · PRODUCT
          </motion.p>
          <div className="ignition__rule">
            <motion.div
              className="ignition__rule-fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: phase === "resolve" ? 0 : 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="ignition__skip">CLICK TO SKIP</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Implement `src/components/voyage/Launch.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import { CHAPTERS, VOYAGE_SCROLL_VH } from "@/scene/camera/flightPath";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import CallToAction from "@/components/dock/CallToAction";

interface LaunchProps {
  headline: string;
  subheadline: string;
  /** true once Ignition has completed; content fades up then. */
  ready: boolean;
}

const chapter = CHAPTERS.find((c) => c.id === "launch")!;
const landing = CHAPTERS.find((c) => c.id === "landing")!;
const approach = CHAPTERS.find((c) => c.id === "approach")!;

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Chapter 01. Hero over the parked camera; the distant star sits low-right in the scene. */
export default function Launch({ headline, subheadline, ready }: LaunchProps) {
  const s = useVoyage();
  const inChapter = s.chapter.id === "launch";
  const hintOpacity = inChapter ? 0.4 * (1 - s.chapterProgress) : 0;

  const book = () => {
    getAudioEngine().whoosh({ volume: 0.08 });
    voyageStore.scrollTo(landing.start + 0.001);
  };
  const seeWork = () => {
    getAudioEngine().click({ volume: 0.05 });
    voyageStore.scrollTo(approach.start + 0.001);
  };

  return (
    <section
      id="launch"
      className="chapter chapter--launch"
      style={{ height: `${(chapter.end - chapter.start) * VOYAGE_SCROLL_VH}vh` }}
      aria-label="Launch"
    >
      <div className="chapter__pin">
        <motion.div
          className="launch"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        >
          <p className="chapter__label">
            {chapter.index} / {chapter.label}
          </p>
          <h1 className="launch__title">{headline}</h1>
          <p className="launch__sub">{subheadline}</p>
          <div className="launch__ctas">
            <CallToAction label="Book a call" onClick={book} />
            <CallToAction label="See the work" variant="ghost" onClick={seeWork} />
          </div>
        </motion.div>
        <p className="launch__hint" style={{ opacity: hintOpacity }} aria-hidden="true">
          SCROLL TO DEPART ↓
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/voyage/Ignition.tsx src/components/voyage/Launch.tsx
git commit -m "$(cat <<'EOF'
feat(voyage): Ignition (00) and Launch (01) chapters

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: VoyageRoot, route, and styles

**Files:**
- Create: `src/components/voyage/VoyageRoot.tsx`
- Create: `src/app/voyage/page.tsx`
- Create: `src/app/voyage/voyage.css`

**Interfaces:**
- Consumes: everything above; existing `FloatingControls` (`src/components/ThemeToggle.tsx`), `useAudio`, `Settings`.
- Produces: `export default function VoyageRoot(props: { settings: Settings }): JSX.Element;` and the `/voyage` route.

- [ ] **Step 1: Implement `src/components/voyage/VoyageRoot.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Settings } from "@/lib/data";
import { CHAPTERS, VOYAGE_SCROLL_VH } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import VoyageScroll from "@/scene/scroll/VoyageScroll";
import { detectEnv, selectTier, probeDemote, runFpsProbe, type Tier } from "@/scene/quality";
import { logClient } from "@/lib/clientLog";
import { useAudio } from "@/hooks/useAudio";
import { FloatingControls } from "@/components/ThemeToggle";
import StillSky from "@/scene/StillSky";
import Telemetry from "./Telemetry";
import Letterbox from "./Letterbox";
import FlightRail from "./FlightRail";
import Dock from "@/components/dock/Dock";
import Ignition from "./Ignition";
import Launch from "./Launch";

const SceneRoot = dynamic(() => import("@/scene/SceneRoot"), { ssr: false });

interface VoyageRootProps {
  settings: Settings;
}

export default function VoyageRoot({ settings }: VoyageRootProps) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [ignited, setIgnited] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
  const { engine, state, toggleMuted } = useAudio();

  useEffect(() => {
    const env = detectEnv();
    const t = selectTier(env);
    setTier(t);
    logClient("quality.tier", { tier: t, ...env, dpr: window.devicePixelRatio });
  }, []);

  useEffect(() => {
    if (settings.audioFile) engine.setBackgroundUrl(settings.audioFile);
  }, [engine, settings.audioFile]);

  // Scroll velocity → audio filter, only while unmuted.
  useEffect(() => {
    if (state.muted) return;
    return voyageStore.subscribe((s) => engine.setScrollEnergy(s.velocity));
  }, [engine, state.muted]);

  // FPS probe after ignition; demote one tier if it can't hold 45fps.
  useEffect(() => {
    if (!ignited || !tier || tier === "still") return;
    let cancelled = false;
    runFpsProbe(1000).then((fps) => {
      if (cancelled) return;
      // fps === null means the probe was inconclusive (tab hidden) — keep the tier.
      const next = probeDemote(tier, fps);
      logClient("quality.probe", { fps: fps === null ? null : Math.round(fps), from: tier, to: next });
      if (next !== tier) setTier(next);
    });
    return () => { cancelled = true; };
  }, [ignited, tier]);

  const onContextLost = useCallback(() => {
    logClient("scene.context_lost", {});
    setTier("still");
  }, []);
  const onIgnitionComplete = useCallback(() => setIgnited(true), []);

  const placeholders = useMemo(() => CHAPTERS.filter((c) => c.id !== "launch"), []);

  if (tier === null) return <div className="voyage-root voyage-root--booting" />;

  const animated = tier !== "still";

  return (
    <div className="voyage-root" data-tier={tier}>
      <VoyageScroll smooth={animated} />
      {animated ? <SceneRoot tier={tier} ignite={ignited} onContextLost={onContextLost} /> : <StillSky />}

      <Letterbox active={animated && letterbox} />
      <Telemetry />
      <FlightRail />
      <Dock visible={ignited} />

      <Ignition enabled={animated} onComplete={onIgnitionComplete} onLetterbox={setLetterbox} />

      <main className="voyage-track" style={{ minHeight: `${VOYAGE_SCROLL_VH}vh` }}>
        <Launch headline={settings.heroHeadline} subheadline={settings.heroSubheadline} ready={ignited} />
        {placeholders.map((c) => (
          <section
            key={c.id}
            id={c.id}
            className={`chapter chapter--placeholder${c.micro ? " chapter--micro" : ""}`}
            style={{ height: `${(c.end - c.start) * VOYAGE_SCROLL_VH}vh` }}
            aria-label={c.label}
          >
            {!c.micro && (
              <div className="chapter__pin">
                <p className="chapter__label chapter__label--placeholder">
                  {c.index} / {c.label}
                </p>
              </div>
            )}
          </section>
        ))}
      </main>

      <FloatingControls muted={state.muted} onToggleMute={toggleMuted} />
    </div>
  );
}
```

- [ ] **Step 2: Create the route `src/app/voyage/page.tsx`**

```tsx
import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import VoyageRoot from "@/components/voyage/VoyageRoot";
import "./voyage.css";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Voyage",
  robots: { index: false, follow: false },
};

export default async function VoyagePage() {
  const settings = await getSettings();
  return <VoyageRoot settings={settings} />;
}
```

- [ ] **Step 3: Create `src/app/voyage/voyage.css`**

```css
/* ====== Voyage: root & scene ====== */
.voyage-root { position: relative; background: #000; color: var(--white); }
.voyage-root--booting { min-height: 100vh; }
.voyage-scene { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.voyage-scene canvas { display: block; width: 100%; height: 100%; }
.voyage-still { background: radial-gradient(ellipse at 70% 65%, #141210 0%, #000 60%); }
.voyage-still__svg { width: 100%; height: 100%; }

/* ====== Track & chapters ====== */
.voyage-track { position: relative; z-index: 1; }
.chapter { position: relative; }
.chapter__pin {
  position: sticky; top: 0; height: 100vh;
  display: flex; flex-direction: column; justify-content: center;
  padding: 0 clamp(1.5rem, 6vw, 6rem);
}
.chapter__label {
  font-family: var(--font-jetbrains-mono), "JetBrains Mono", monospace;
  font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--gray-mid); margin-bottom: 1.5rem;
}
.chapter__label--placeholder { opacity: 0.35; }

/* ====== Glass panel (shared) ====== */
.glass {
  position: relative; border-radius: 20px;
  background: rgba(10, 10, 10, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* ====== Launch ====== */
.launch { max-width: 62rem; }
.launch__title {
  font-family: "Styrene A", var(--font-space-grotesk), sans-serif;
  font-size: clamp(3.5rem, 8vw, 8rem); font-weight: 500;
  letter-spacing: -0.02em; line-height: 0.95; margin: 0 0 1.5rem;
}
.launch__sub {
  font-weight: 300; font-size: clamp(1.05rem, 1.4vw, 1.35rem); line-height: 1.7;
  color: var(--gray-light); max-width: 62ch; margin: 0 0 2.5rem;
}
.launch__ctas { display: flex; gap: 1rem; flex-wrap: wrap; }
.launch__hint {
  position: absolute; left: 50%; bottom: 2rem; transform: translateX(-50%);
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.7rem; letter-spacing: 0.2em;
  color: var(--white); animation: hintPulse 2.4s ease-in-out infinite; transition: opacity 0.3s;
}
@keyframes hintPulse { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, 6px); } }

/* ====== CTA ====== */
.cta {
  display: inline-flex; align-items: center; gap: 0.6rem;
  padding: 0.95rem 1.5rem; border-radius: 999px; cursor: pointer;
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
  transition: background 0.3s, color 0.3s, border-color 0.3s;
}
.cta--primary { background: #f2b35c; color: #000; border: 1px solid #f2b35c; }
.cta--primary:hover { background: #ffc46f; border-color: #ffc46f; }
.cta--ghost { background: transparent; color: var(--white); border: 1px solid rgba(255, 255, 255, 0.22); }
.cta--ghost:hover { border-color: rgba(255, 255, 255, 0.6); }
.cta__arrow { display: inline-block; transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.2, 1); }
.cta:hover .cta__arrow { transform: translateX(4px); }
body:has(.cursor-dot) .cta:hover ~ .cursor-ring { border-color: #f2b35c; }

/* ====== Dock ====== */
.dock { position: fixed; top: 20px; left: 0; right: 0; z-index: 9400; display: flex; justify-content: center; pointer-events: none; }
.dock__capsule {
  pointer-events: auto; display: flex; align-items: center; gap: 0.25rem;
  padding: 0.35rem 0.4rem 0.35rem 0.5rem; border-radius: 999px;
  background: rgba(10, 10, 10, 0.55); border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 10px 40px rgba(0, 0, 0, 0.45);
  transition: transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1), background 0.4s;
}
.dock[data-compact="true"] .dock__capsule { transform: scale(0.88); background: rgba(10, 10, 10, 0.72); }
.dock__mono {
  width: 36px; height: 36px; border-radius: 50%; border: 0; cursor: pointer;
  background: #f2b35c; color: #000; font-weight: 700; font-family: "Styrene A", var(--font-space-grotesk), sans-serif;
  display: grid; place-items: center;
}
.dock__links { display: flex; align-items: center; }
.dock__link {
  background: transparent; border: 0; color: var(--gray-light); cursor: pointer;
  padding: 0.55rem 0.85rem; border-radius: 999px;
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase;
  transition: color 0.25s, background 0.25s; white-space: nowrap;
}
.dock__link[data-dock-near="true"], .dock__link:hover { color: var(--white); background: rgba(255, 255, 255, 0.06); }
.dock__link.is-active { color: var(--white); text-shadow: 0 0 12px rgba(255, 255, 255, 0.35); }
.dock__cta .cta { padding: 0.6rem 1.1rem; font-size: 0.68rem; }
.dock__menu { display: none; }
.dock__sheet {
  position: fixed; inset: 0; z-index: 9399; pointer-events: auto;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.25rem;
  background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
}
.dock__sheet-link {
  background: transparent; border: 0; color: var(--white); cursor: pointer;
  font-family: "Styrene A", var(--font-space-grotesk), sans-serif; font-size: 2rem; font-weight: 500; letter-spacing: -0.02em;
}
@media (max-width: 767px) {
  .dock__links, .dock__cta { display: none; }
  .dock__menu {
    display: grid; gap: 5px; place-content: center; width: 36px; height: 36px; border-radius: 50%;
    background: transparent; border: 1px solid rgba(255, 255, 255, 0.15); cursor: pointer;
  }
  .dock__menu span { display: block; width: 14px; height: 1px; background: var(--white); }
}

/* ====== Telemetry ====== */
.telemetry {
  position: fixed; top: 22px; left: 24px; z-index: 9300; display: flex; gap: 1.25rem; pointer-events: none;
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.66rem; letter-spacing: 0.14em; color: var(--white); opacity: 0.6;
  font-variant-numeric: tabular-nums;
}
.telemetry__lost { color: #f2b35c; }
@media (max-width: 767px) { .telemetry { display: none; } }

/* ====== Letterbox ====== */
.letterbox { position: fixed; inset: 0; z-index: 9600; pointer-events: none; overflow: hidden; }
.letterbox__bar { position: absolute; left: 0; right: 0; height: 8vh; background: #000; }
.letterbox__bar--top { top: 0; }
.letterbox__bar--bottom { bottom: 0; }

/* ====== Flight rail ====== */
.rail { position: fixed; top: 12vh; bottom: 12vh; right: 22px; width: 1px; z-index: 9300; }
.rail__line { position: absolute; inset: 0; background: rgba(255, 255, 255, 0.14); }
.rail__dot {
  position: absolute; left: 50%; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%;
  background: #f2b35c; box-shadow: 0 0 12px rgba(242, 179, 92, 0.8); transition: top 0.12s linear;
}
.rail__tick {
  position: absolute; left: 50%; width: 22px; height: 22px; margin: -11px 0 0 -11px;
  background: transparent; border: 0; cursor: pointer; padding: 0;
}
.rail__tick::before {
  content: ""; position: absolute; left: 50%; top: 50%; width: 9px; height: 1px; margin-left: -4.5px;
  background: rgba(255, 255, 255, 0.5); transition: width 0.2s, background 0.2s;
}
.rail__tick.is-active::before, .rail__tick:hover::before { width: 14px; margin-left: -7px; background: var(--white); }
.rail__label {
  position: absolute; right: 22px; top: 50%; transform: translateY(-50%);
  font-family: var(--font-jetbrains-mono), monospace; font-size: 0.62rem; letter-spacing: 0.14em; white-space: nowrap;
  color: var(--white); opacity: 0; transition: opacity 0.2s; pointer-events: none;
}
.rail__tick:hover .rail__label, .rail__tick:focus-visible .rail__label { opacity: 0.8; }
@media (max-width: 1023px) { .rail { display: none; } }

/* ====== Ignition ====== */
.ignition {
  position: fixed; inset: 0; z-index: 10000; background: #000; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem;
}
.ignition__title {
  font-family: "Styrene A", var(--font-space-grotesk), sans-serif;
  font-size: clamp(1.4rem, 3.2vw, 2.6rem); font-weight: 500; color: #fff; margin: 0;
}
.ignition__sub { font-family: var(--font-jetbrains-mono), monospace; font-size: 0.7rem; letter-spacing: 0.28em; color: #fff; margin: 0; }
.ignition__rule { width: clamp(140px, 18vw, 260px); height: 1px; background: rgba(255, 255, 255, 0.15); overflow: hidden; }
.ignition__rule-fill { width: 100%; height: 100%; background: #f2b35c; transform-origin: left center; }
.ignition__skip {
  position: absolute; bottom: 2rem; font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.6rem; letter-spacing: 0.2em; color: rgba(255, 255, 255, 0.35);
}

/* ====== Reduced motion ====== */
@media (prefers-reduced-motion: reduce) {
  .launch__hint { animation: none; }
  .rail__dot { transition: none; }
}
```

- [ ] **Step 4: Typecheck and start the dev server**

Run: `npm run typecheck`
Expected: no errors.

Run: `npm run dev` (background) and `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/voyage`
Expected: `200`

- [ ] **Step 5: Commit**

```bash
git add src/components/voyage/VoyageRoot.tsx src/app/voyage/page.tsx src/app/voyage/voyage.css
git commit -m "$(cat <<'EOF'
feat(voyage): VoyageRoot composition, /voyage route (noindex), voyage styles

Ignition + Launch live; remaining chapters are labelled placeholders that give
the flight path its full scroll length.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Browser review, baseline screenshots, and docs

**Files:**
- Create: `screenshots/voyage/slice-1-2/*.png`
- Modify: `worklog.md`, `insights.md`

This is the see-it step. Do not mark the slice done without it.

- [ ] **Step 0: Repair the lint script (Next 16 removed `next lint`)**

`npm run lint` currently fails with "Invalid project directory provided, no such directory: …/lint". `eslint@9.39` and `eslint-config-next@16.0.7` are already installed and the latter exports flat configs. Create `eslint.config.mjs`:

```js
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "screenshots/**", "docs/**", "logs/**", "audio/**", "images/**", "public/**"],
  },
];
```

Change the `lint` script in `package.json` to `"lint": "eslint ."`. Run `npm run lint`; fix any errors it reports in files this plan created (do not touch pre-existing violations in unrelated files — list them in the worklog instead). Commit:

```bash
git add eslint.config.mjs package.json
git commit -m "$(cat <<'EOF'
chore: restore lint — flat ESLint config for Next 16 (next lint was removed)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 1: Desktop review at 1440×900**

With `npm run dev` running, use the chrome-devtools MCP:
1. `new_page` → `http://localhost:3000/voyage`, `resize_page` 1440×900.
2. Capture during Ignition (immediately) → `screenshots/voyage/slice-1-2/desktop-00-ignition.png`.
3. `wait_for` text `SCROLL TO DEPART` → capture → `desktop-01-launch.png`.
4. Scroll to 8%, 15%, 50%, 100% via `evaluate_script` (`window.scrollTo(0, document.documentElement.scrollHeight * P)`), wait 1s each, capture → `desktop-p08.png`, `desktop-p15.png`, `desktop-p50.png`, `desktop-p100.png`.
5. Hover the dock (`hover` on a link uid from `take_snapshot`) → capture `desktop-dock-hover.png`.
6. `list_console_messages` → expect zero errors; copy the `quality.tier` and `quality.probe` JSON lines into the worklog.

Checklist to judge against the spec: star is a small amber point low-right at launch and visibly grows by 50%; streaks lengthen while scrolling and relax on stop; telemetry distance counts down; rail dot tracks; dock compacts after the hero; H1 is legible over the scene; no layout shift when Ignition lifts.

Then a **mid-page hard reload**: scroll to ~50%, `navigate_page` type `reload`, wait 1s without scrolling, capture `desktop-reload-p50.png`. The telemetry, rail dot, and dock active-link must already reflect ~50% (chapter "worlds"), not "launch" — this verifies the Lenis-branch store seed from Task 7.

- [ ] **Step 2: Mobile review at 390×844**

`resize_page` 390×844 → reload → capture `mobile-01-launch.png`, `mobile-p50.png`; open the dock sheet (`click` the menu button) → `mobile-dock-sheet.png`. Confirm telemetry and rail are hidden, CTAs wrap, tier is `mid`.

- [ ] **Step 3: Reduced-motion and still-tier check**

`emulate` with `prefers-reduced-motion: reduce` → reload → confirm no Ignition, no letterbox, `StillSky` renders, `data-tier="still"`, page scrolls natively. Capture `desktop-still.png`.

- [ ] **Step 4: Record findings**

Append to `worklog.md` under today's date: what shipped (Tasks 1–13), the probe fps values, and the review verdicts. Append to `insights.md`: anything weaker than the script, anything better than the script, and concrete tuning decisions (star size, streak counts, dock proximity) with the reason.

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all pass.

```bash
git add screenshots/voyage/slice-1-2 worklog.md insights.md
git commit -m "$(cat <<'EOF'
docs(voyage): slice 1-2 browser review — baseline screenshots, worklog, insights

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
git push origin master
```

- [ ] **Step 6: Decide the next plan**

With the review in hand, write the plan for slice 3 (Approach Vector + Jump) — services panels, topology set piece, hyperspace burst — carrying forward any tuning constants changed in this review.

---

## Self-Review

**Spec coverage (slices 1–2):** Chapter table → `CHAPTERS` (Task 1). Never-reverse camera, FOV 60–70, `distanceAU`, `starScale` → Task 1 + tests. Store with velocity/chapter/distance → Task 2. Tiers, DPR caps, FPS probe demotion, structured logs → Task 3. Starfield with soften/fade → Task 4. Star + streaks → Task 5. Single WebGL context, context-lost → `still` → Task 6. Lenis with native fallback → Task 7. Telemetry (incl. `SIGNAL LOST`, `ARRIVED`) + Letterbox → Task 8. Rail (9 ticks, amber dot, click-to-jump, hidden <1024) → Task 9. Dock (ported, compact on scroll, mobile sheet) + single CTA → Task 10. Data-driven hero copy → Task 11. Ignition ≤1.2s, skippable, once per session, no typewriter → Task 12. Launch copy/CTAs/hint → Task 12. `/voyage` noindex, `/admin` untouched → Task 13. Browser review at both viewports, reduced motion, screenshots committed → Task 14. Audio scroll filter via store → Task 13. Out of scope here by design: Jump/Dark-Passage visuals, focus-pull wiring, `manifesto`, removals — later slices.

**Placeholder scan:** none. Every code step shows the code.

**Type consistency:** `voyageStore.setScroll(progress, velocity01)` used identically in Task 7; `useVoyage()` returns `VoyageState` consumed in Tasks 8–10, 12; `SetPiece.build(scene, tier)` / `update(ctx)` / `dispose()` used by Tasks 4–6; `Tier` includes `"still"` and `SceneRoot` narrows it with `Exclude<Tier, "still">`; `CallToAction` props `{label, onClick, variant, ariaLabel}` used in Tasks 10 and 12; `createDockController(root, getOptions)` matches Task 10 usage; `Settings.heroHeadline/heroSubheadline` (Task 11) consumed in Task 13.
