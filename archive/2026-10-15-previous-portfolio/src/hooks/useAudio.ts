"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { getAudioEngine, type EngineState } from "@/lib/audio/AudioEngine";

const initialState: EngineState = { muted: true, ready: false, theme: "dark" };

/**
 * React hook for the singleton AudioEngine.
 * Returns the live engine state plus stable action callbacks.
 */
export function useAudio() {
  const [engine] = useState(() => getAudioEngine());

  const subscribe = useCallback(
    (cb: () => void) => engine.subscribe(() => cb()),
    [engine]
  );

  const getSnapshot = useCallback(() => engine.getState(), [engine]);
  const getServerSnapshot = useCallback(() => initialState, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMuted = useCallback((m: boolean) => engine.setMuted(m), [engine]);
  const toggleMuted = useCallback(
    () => engine.setMuted(!engine.getState().muted),
    [engine]
  );
  const setTheme = useCallback(
    (t: "dark" | "light") => engine.setTheme(t),
    [engine]
  );

  return { engine, state, setMuted, toggleMuted, setTheme };
}

/** Lightweight hook for components that only want to react to the analyser. */
export function useAudioAnalyser() {
  const engine = getAudioEngine();
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(() =>
    engine.getAnalyser()
  );
  useEffect(() => {
    const unsub = engine.subscribe((s) => {
      if (s.ready) setAnalyser(engine.getAnalyser());
    });
    return unsub;
  }, [engine]);
  return analyser;
}
