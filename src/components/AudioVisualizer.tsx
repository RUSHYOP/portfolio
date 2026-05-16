"use client";

import { useEffect, useRef } from "react";
import { useAudioAnalyser } from "@/hooks/useAudio";

interface AudioVisualizerProps {
  active: boolean;
  width?: number;
  height?: number;
}

/**
 * Compact level/waveform meter rendered to a canvas.
 * Only animates when `active` is true (i.e. audio unmuted).
 */
export default function AudioVisualizer({
  active,
  width = 48,
  height = 18,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyser = useAudioAnalyser();
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const bins = 16;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, width, height);
      const step = Math.floor(data.length / bins);
      const barW = width / bins;
      const cs = getComputedStyle(document.documentElement);
      const color = cs.getPropertyValue("--white").trim() || "#fff";
      ctx.fillStyle = color;
      for (let i = 0; i < bins; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j];
        const avg = sum / step / 255;
        const h = Math.max(1, avg * height);
        ctx.fillRect(i * barW + 0.5, height - h, barW - 1, h);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, analyser, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="audio-visualizer"
      style={{ width, height, opacity: active ? 1 : 0 }}
      aria-hidden="true"
    />
  );
}
