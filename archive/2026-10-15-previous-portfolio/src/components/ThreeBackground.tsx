"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getAudioEngine } from "@/lib/audio/AudioEngine";

export default function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    particles: THREE.Points;
    geometry: THREE.BufferGeometry;
    material: THREE.PointsMaterial;
    baseSize: number;
    baseOpacity: number;
  } | null>(null);
  const animationIdRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(true);
  const igniteRef = useRef(0); // 0..1 — fade in
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    if (rendererRef.current) return;

    const container = containerRef.current;
    const canvas = document.createElement("canvas");
    canvas.id = "canvas-bg";
    container.appendChild(canvas);

    const isMobile = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: false,
      });
    } catch {
      console.warn("WebGL not available");
      return;
    }
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(dpr);

    const geometry = new THREE.BufferGeometry();
    const particlesCount = isMobile ? 400 : 800;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 50;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));

    const baseSize = 0.005;
    const baseOpacity = 0.8;
    const material = new THREE.PointsMaterial({
      size: baseSize,
      color: "#ffffff",
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    camera.position.z = 5;

    sceneRef.current = { scene, camera, particles, geometry, material, baseSize, baseOpacity };

    let mouseThrottle = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - mouseThrottle < 32) return;
      mouseThrottle = now;
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!sceneRef.current || !rendererRef.current) return;
        sceneRef.current.camera.aspect = window.innerWidth / window.innerHeight;
        sceneRef.current.camera.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }, 150);
    };

    const handleVisibility = () => {
      visibleRef.current = !document.hidden;
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    // Audio analyser (may be null until user unmutes; we re-query each frame)
    const engine = getAudioEngine();
    const freqData = new Uint8Array(128);
    let energy = 0;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      if (!visibleRef.current || !sceneRef.current || !rendererRef.current) return;

      const s = sceneRef.current;

      // Ignite fade-in (~1.2s)
      if (igniteRef.current < 1) {
        igniteRef.current = Math.min(1, igniteRef.current + 1 / 72);
      }

      // Audio reactivity
      const analyser = engine.getAnalyser();
      if (analyser) {
        const len = Math.min(freqData.length, analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < len; i++) sum += freqData[i];
        const avg = sum / len / 255; // 0..1
        // Smooth energy via exponential moving average
        energy = energy * 0.85 + avg * 0.15;
      } else {
        energy *= 0.95;
      }

      const reactSize = s.baseSize * (1 + energy * 4);
      s.material.size = reactSize;
      s.material.opacity = s.baseOpacity * igniteRef.current * (0.7 + energy * 0.6);

      const rotBoost = 1 + energy * 2.5;
      s.particles.rotation.x += 0.0008 * rotBoost;
      s.particles.rotation.y += 0.0008 * rotBoost;

      s.camera.position.x += (mouseRef.current.x * 0.5 - s.camera.position.x) * 0.03;
      s.camera.position.y += (mouseRef.current.y * 0.5 - s.camera.position.y) * 0.03;
      s.camera.lookAt(s.scene.position);

      rendererRef.current.render(s.scene, s.camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      clearTimeout(resizeTimeout);
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);

      if (sceneRef.current) {
        sceneRef.current.geometry.dispose();
        sceneRef.current.material.dispose();
        sceneRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, [mounted]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        opacity: 0.8,
      }}
    />
  );
}
