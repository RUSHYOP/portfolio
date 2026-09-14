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
      // not accumulate live contexts (browsers cap them at ~16).
      renderer.forceContextLoss();
      renderer.dispose();
      if (host.contains(canvas)) host.removeChild(canvas);
    };
  }, [tier, onContextLost]);

  return <div ref={hostRef} className="voyage-scene" aria-hidden="true" />;
}
