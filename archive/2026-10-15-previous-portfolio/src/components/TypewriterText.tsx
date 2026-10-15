"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { parseSegments, type Segment } from "@/lib/format";
import { getAudioEngine } from "@/lib/audio/AudioEngine";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
  trigger?: boolean;
  /** Kept for API back-compat; engine handles mute state internally. */
  muted?: boolean;
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
  const cleanLength = useRef<number>(
    segments.current.reduce((sum, s) => sum + s.text.length, 0)
  );

  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const prevCountRef = useRef(0);

  useEffect(() => {
    segments.current = parseSegments(text);
    cleanLength.current = segments.current.reduce((sum, s) => sum + s.text.length, 0);
    setCount(0);
    setStarted(false);
    setDone(false);
    prevCountRef.current = 0;
  }, [text]);

  useEffect(() => {
    if (!trigger || started) return;
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [trigger, delay, started]);

  const playForChar = useCallback((newCount: number) => {
    if (newCount <= prevCountRef.current) return;
    const engine = getAudioEngine();
    let pos = 0;
    for (const seg of segments.current) {
      const segEnd = pos + seg.text.length;
      if (newCount > pos && newCount <= segEnd) {
        const ch = seg.text[newCount - pos - 1];
        if (ch !== " ") {
          const pan = ((newCount % 9) - 4) / 12;
          engine.keystroke(0.16, pan);
        }
        break;
      }
      pos = segEnd;
    }
    prevCountRef.current = newCount;
  }, []);

  useEffect(() => {
    if (!started || done) return;
    if (count >= cleanLength.current) {
      setDone(true);
      onCompleteRef.current?.();
      return;
    }
    const timer = setTimeout(() => {
      setCount((c) => {
        const next = c + 1;
        playForChar(next);
        return next;
      });
    }, speed);
    return () => clearTimeout(timer);
  }, [started, count, speed, done, playForChar]);

  return (
    <span className={className}>
      {renderUpTo(segments.current, count)}
      {started && !done && <span className="tw-cursor">|</span>}
    </span>
  );
}
