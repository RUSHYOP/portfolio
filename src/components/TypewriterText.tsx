"use client";

import { useState, useEffect, useRef } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
  trigger?: boolean;
}

interface Segment { text: string; italic: boolean; }

function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const parts = raw.split(/(\*[^*]+\*)/g);
  for (const part of parts) {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      segments.push({ text: part.slice(1, -1), italic: true });
    } else if (part) {
      segments.push({ text: part, italic: false });
    }
  }
  return segments;
}

function renderUpTo(segments: Segment[], count: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = count;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (remaining <= 0) break;
    const slice = seg.text.slice(0, remaining);
    nodes.push(seg.italic ? <em key={i}>{slice}</em> : <span key={i}>{slice}</span>);
    remaining -= seg.text.length;
  }
  return nodes;
}

export default function TypewriterText({
  text,
  speed = 50,
  delay = 0,
  className = "",
  onComplete,
  trigger = true,
}: TypewriterTextProps) {
  const segments = useRef<Segment[]>(parseSegments(text));
  const cleanLength = useRef<number>(segments.current.reduce((sum, s) => sum + s.text.length, 0));

  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    segments.current = parseSegments(text);
    cleanLength.current = segments.current.reduce((sum, s) => sum + s.text.length, 0);
    setCount(0);
    setStarted(false);
    setDone(false);
  }, [text]);

  useEffect(() => {
    if (!trigger || started) return;
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [trigger, delay, started]);

  // Play typewriter audio while typing
  useEffect(() => {
    if (started && !done) {
      if (!audioRef.current) {
        const audio = new Audio("/audio/typwriter.mp3");
        audio.loop = true;
        audio.volume = 0.15;
        audioRef.current = audio;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    if (done && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    return () => {
      if (done && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [started, done]);

  useEffect(() => {
    if (!started || done) return;
    if (count >= cleanLength.current) {
      setDone(true);
      onCompleteRef.current?.();
      return;
    }
    const timer = setTimeout(() => setCount((c) => c + 1), speed);
    return () => clearTimeout(timer);
  }, [started, count, speed, done]);

  return (
    <span className={className}>
      {renderUpTo(segments.current, count)}
      {started && !done && <span className="tw-cursor">|</span>}
    </span>
  );
}

export function useInView(threshold = 0.3) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
