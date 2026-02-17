"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    particles: THREE.Points;
    geometry: THREE.BufferGeometry;
    material: THREE.PointsMaterial;
  } | null>(null);
  const animationIdRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    // Check if renderer already exists (Strict Mode re-run)
    if (rendererRef.current) return;

    const container = containerRef.current;

    // Create canvas element
    const canvas = document.createElement("canvas");
    canvas.id = "canvas-bg";
    container.appendChild(canvas);

    // Detect mobile for reduced particles
    const isMobile = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5);

    // Setup Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

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

    // Create particles - fewer on mobile
    const geometry = new THREE.BufferGeometry();
    const particlesCount = isMobile ? 400 : 800;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 50;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));

    const material = new THREE.PointsMaterial({
      size: 0.005,
      color: "#ffffff",
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    camera.position.z = 5;

    sceneRef.current = { scene, camera, particles, geometry, material };

    // Throttled mouse interaction
    let mouseThrottle = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - mouseThrottle < 32) return; // ~30fps throttle
      mouseThrottle = now;
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    // Throttled resize handler
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

    // Pause when tab is hidden
    const handleVisibility = () => {
      visibleRef.current = !document.hidden;
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    // Animation loop with visibility check
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (!visibleRef.current || !sceneRef.current || !rendererRef.current) return;

      const { scene, camera, particles } = sceneRef.current;

      particles.rotation.x += 0.0008;
      particles.rotation.y += 0.0008;

      camera.position.x += (mouseRef.current.x * 0.5 - camera.position.x) * 0.03;
      camera.position.y += (mouseRef.current.y * 0.5 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      rendererRef.current.render(scene, camera);
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

  return <div ref={containerRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: -1, opacity: 0.8 }} />;
}
