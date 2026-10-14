"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { getAudioEngine } from "@/lib/audio/AudioEngine";
import { logClient } from "@/lib/clientLog";
import type { PlanetFeature } from "@/lib/planetFeature";
import { shaderErrorMessage } from "@/scene/shaderLog";
import { getCameraPose, bankForProgress, fovForVelocity, type CameraPose } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import { TIER_SETTINGS, type Tier } from "@/scene/quality";
import { Starfield } from "@/scene/chapters/Starfield";
import { EnergyOrb } from "@/scene/chapters/EnergyOrb";
import { WarpStreaks } from "@/scene/chapters/WarpStreaks";
import { Topology } from "@/scene/chapters/Topology";
// Chapter 04 ring, chapter 05 planets.
import { OrbitRing } from "@/scene/chapters/OrbitRing";
import { Planet, planetsKey, planetsFromKey } from "@/scene/chapters/Planet";
import type { FrameContext, SetPiece } from "@/scene/chapters/types";

interface SceneRootProps {
  tier: Exclude<Tier, "still">;
  /** Flip to true when Ignition completes; the scene fades in over ~1.2s. */
  ignite: boolean;
  onContextLost: () => void;
  /** Chapter 04's process-step count (one ring node each). Comes from the CMS: stable after
   *  load, never derived from scroll. 0 builds an empty, always-hidden ring. */
  stepCount: number;
  /** Chapter 05's planet features, one per published case study, in CMS order. Like `stepCount`
   *  it is CMS data, stable after load. Pass any array: the GL effect depends on its VALUE
   *  (planetsKey), never on its identity, so a fresh array every render rebuilds nothing. */
  planets: readonly PlanetFeature[];
}

const IGNITE_SECONDS = 1.2;
const POSE_LERP = 0.08;

/** Owns the single WebGL context. Reads voyageStore imperatively — no React re-renders per frame. */
export default function SceneRoot({ tier, ignite, onContextLost, stepCount, planets }: SceneRootProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // The effect below depends on this string, not on `planets`: VoyageRoot re-renders on every
  // letterbox / ignite / tier change and would otherwise rebuild the WebGL context each time.
  const planetKey = planetsKey(planets);
  const igniteRef = useRef(ignite);
  // Layout effect, not a render-phase write (react-hooks/refs). No dep array so it re-syncs
  // every commit; the RAF loop reads igniteRef.current, always after the commit has landed.
  useLayoutEffect(() => {
    igniteRef.current = ignite;
  });

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

    // Array order sets update() order only, not draw order: the orb's ShaderMaterial is opaque,
    // so three draws it first; the transparent pieces are depth-sorted after it.
    // OrbitRing (chapter 04) and Planet (chapter 05) are transparent too: depth-sorted with the
    // others, drawn after the orb (a planet in front of the star occludes its halo).
    const pieces: SetPiece[] = [
      new Starfield(), new WarpStreaks(), new Topology(), new OrbitRing(stepCount),
      new Planet(planetsFromKey(planetKey)), new EnergyOrb(),
    ];
    for (const p of pieces) p.build(scene, tier);
    // Compile every program now instead of on the first frame that draws it (the slice-4
    // first-entry hitch into Orbit: 23.7 ms median / p95 40 ms). On a first visit Ignition's
    // curtain is up and hides the block; on a repeat visit (sessionStorage says it played)
    // Ignition ends at mount, so the block lands before the first frame — Task 8 measures it.
    // It walks hidden objects too (scene.traverse), so the planets' and the ring's programs are
    // included. Synchronous on purpose: async would still stall the first render.
    // three reports a GLSL compile / link ERROR through renderer.debug.onShaderError (and
    // console.error), not as an exception, so that hook is what feeds the log; the try/catch only
    // guards the call itself. Neither may throw out of the effect — a failure only means programs
    // compile lazily, as before.
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      logClient("scene.compile_failed", { message: shaderErrorMessage(gl, program, vertexShader, fragmentShader) });
    };
    try {
      renderer.compile(scene, camera);
    } catch (e) {
      logClient("scene.compile_failed", { message: String(e).slice(0, 300) });
    }

    const pose: CameraPose = { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
    const smoothPos = new THREE.Vector3();
    const smoothLook = new THREE.Vector3(0, 0, -1);
    // Orbit's roll about the camera's forward axis, eased like the pose so a Dock click or a
    // scroll restore mid-orbit does not snap it while position and lookAt glide.
    let smoothBank = 0;
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
        // Re-apply the cap: devicePixelRatio changes when the window moves between
        // displays. Before setSize, which setPixelRatio would otherwise re-run at the
        // stale size.
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.dpr));
        renderer.setSize(window.innerWidth, window.innerHeight);
      }, 150);
    };

    let visible = !document.hidden;
    const onVisibility = () => {
      visible = !document.hidden;
    };

    // A context that is already lost has no live WEBGL_lose_context to call, so
    // forceContextLoss() in cleanup would only log three's "extension not supported" warning.
    let lost = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
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
      // Floored at 0: a RAF timestamp can step backwards (clock adjustment, tab resume),
      // and a negative dt would rewind igniteT and the set pieces' eased state.
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
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
      // After lookAt: lookAt rebuilds the orientation from scratch every frame, so the roll
      // never accumulates, and rotating about local Z leaves the view direction (and the
      // star's screen position) unchanged.
      smoothBank += (bankForProgress(voyage.progress) - smoothBank) * POSE_LERP;
      camera.rotateZ(smoothBank);
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

      // Skip the GPU draw on a zero-length frame (duplicate RAF timestamp).
      if (dt > 0) renderer.render(scene, camera);
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
      // Release the GL context eagerly so a StrictMode double-mount in dev does
      // not accumulate live contexts (browsers cap them at ~16). Skipped after a real
      // loss — the context is already gone and three would just warn.
      if (!lost) renderer.forceContextLoss();
      renderer.dispose();
      if (host.contains(canvas)) host.removeChild(canvas);
    };
    // stepCount and planetKey rebuild the context if the CMS data ever changes under a live page
    // (rare: it is server-rendered with revalidate 300).
  }, [tier, onContextLost, stepCount, planetKey]);

  return <div ref={hostRef} className="voyage-scene" aria-hidden="true" />;
}
