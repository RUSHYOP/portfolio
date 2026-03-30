"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { parseSegments, type Segment } from "@/lib/format";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
  trigger?: boolean;
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

// Shared AudioContext for all TypewriterText instances
let sharedCtx: AudioContext | null = null;
let sharedBuffer: AudioBuffer | null = null;
let loadingPromise: Promise<void> | null = null;

function getAudioContext(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  return sharedCtx;
}

function loadKeystrokeBuffer(): Promise<void> {
  if (sharedBuffer) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("/audio/typwriter.mp3")
    .then((res) => res.arrayBuffer())
    .then((buf) => getAudioContext().decodeAudioData(buf))
    .then((decoded) => {
      // Extract a short ~40ms snippet from the start for a single keystroke
      const ctx = getAudioContext();
      const snippetDuration = 0.04;
      const snippetFrames = Math.min(
        Math.floor(ctx.sampleRate * snippetDuration),
        decoded.length
      );
      const snippet = ctx.createBuffer(decoded.numberOfChannels, snippetFrames, ctx.sampleRate);
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        snippet.copyToChannel(decoded.getChannelData(ch).slice(0, snippetFrames), ch);
      }
      sharedBuffer = snippet;
    })
    .catch(() => {
      loadingPromise = null;
    });
  return loadingPromise;
}

function playKeystroke(volume: number) {
  if (!sharedBuffer || !sharedCtx) return;
  if (sharedCtx.state === "suspended") sharedCtx.resume();

  const source = sharedCtx.createBufferSource();
  source.buffer = sharedBuffer;

  // Slight pitch variation for natural feel (±8%)
  source.playbackRate.value = 0.92 + Math.random() * 0.16;

  const gain = sharedCtx.createGain();
  gain.gain.value = volume * (0.7 + Math.random() * 0.3);

  source.connect(gain).connect(sharedCtx.destination);
  source.start();
}

export default function TypewriterText({
  text,
  speed = 50,
  delay = 0,
  className = "",
  onComplete,
  trigger = true,
  muted = true,
}: TypewriterTextProps) {
  const segments = useRef<Segment[]>(parseSegments(text));
  const cleanLength = useRef<number>(segments.current.reduce((sum, s) => sum + s.text.length, 0));

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

  // Preload the keystroke audio buffer
  useEffect(() => {
    loadKeystrokeBuffer();
  }, []);

  // Play a keystroke sound for each new character
  const playForChar = useCallback(
    (newCount: number) => {
      if (muted || newCount <= prevCountRef.current) return;
      // Get the character that was just typed
      let pos = 0;
      for (const seg of segments.current) {
        const segEnd = pos + seg.text.length;
        if (newCount > pos && newCount <= segEnd) {
          const ch = seg.text[newCount - pos - 1];
          // Skip sound for spaces (feels more natural)
          if (ch !== " ") playKeystroke(0.18);
          break;
        }
        pos = segEnd;
      }
      prevCountRef.current = newCount;
    },
    [muted]
  );

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
