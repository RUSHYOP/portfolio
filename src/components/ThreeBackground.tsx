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
        powerPreference: "high-performance",
      });
    } catch {
      console.warn("WebGL not available");
      return;
    }

    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create particles
    const geometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
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
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    camera.position.z = 5;

    sceneRef.current = { scene, camera, particles, geometry, material };

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current || !rendererRef.current) return;
      sceneRef.current.camera.aspect = window.innerWidth / window.innerHeight;
      sceneRef.current.camera.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !rendererRef.current) return;

      animationIdRef.current = requestAnimationFrame(animate);

      const { scene, camera, particles } = sceneRef.current;

      particles.rotation.x += 0.001;
      particles.rotation.y += 0.001;

      camera.position.x += (mouseRef.current.x * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (mouseRef.current.y * 0.5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      rendererRef.current.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

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
