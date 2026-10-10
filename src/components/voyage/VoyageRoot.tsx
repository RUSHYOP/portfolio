"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Settings } from "@/lib/data";
import type { Item } from "@/lib/collections/defineCollection";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import VoyageScroll from "@/scene/scroll/VoyageScroll";
import { detectEnv, selectTier, probeDemote, runFpsProbe, type Tier } from "@/scene/quality";
import { logClient } from "@/lib/clientLog";
import { useAudio } from "@/hooks/useAudio";
import AudioVisualizer from "@/components/AudioVisualizer";
import StillSky from "@/scene/StillSky";
import Letterbox from "./Letterbox";
import FlightRail from "./FlightRail";
import Dock from "@/components/dock/Dock";
import Ignition from "./Ignition";
import Launch from "./Launch";
import Services from "./Services";
import { useJumpBeat } from "./useJumpBeat";

const SceneRoot = dynamic(() => import("@/scene/SceneRoot"), { ssr: false });

/** Settle window before the FPS probe samples. On a repeat visit Ignition finishes at
 *  mount, so a shorter delay would sample the warm-up frames it means to exclude. */
const PROBE_DELAY_MS = 900;

/** Chapter 03 has no component of its own — it is 25vh of scroll and a beat. */
const jumpChapter = CHAPTERS.find((c) => c.id === "jump")!;

interface VoyageRootProps {
  settings: Settings;
  /** Chapter 02's panels. Untyped past Item's three base fields — narrowed in Services. */
  services: Item[];
}

export default function VoyageRoot({ settings, services }: VoyageRootProps) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [ignited, setIgnited] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
  const probedRef = useRef(false);
  const { engine, state, toggleMuted } = useAudio();

  useEffect(() => {
    const env = detectEnv();
    const t = selectTier(env);
    // Mount-only: the tier comes from browser env (UA, deviceMemory, DPR), which cannot be read
    // during render without a hydration mismatch — the server has no window and renders the
    // `tier === null` branch. `tier` is real state (also written by the FPS probe and by
    // context-lost), so a lazy initializer or useSyncExternalStore does not apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTier(t);
    logClient("quality.tier", { tier: t, ...env, dpr: window.devicePixelRatio });
  }, []);

  useEffect(() => {
    if (settings.audioFile) engine.setBackgroundUrl(settings.audioFile);
  }, [engine, settings.audioFile]);

  // Scroll velocity → audio filter, only while unmuted.
  useEffect(() => {
    if (state.muted) return;
    return voyageStore.subscribe((s) => engine.setScrollEnergy(s.programmatic ? 0 : s.velocity));
  }, [engine, state.muted]);

  // FPS probe after ignition; demote one tier if it can't hold 45fps.
  // The probe starts after a short settle so first-visit shader compilation and the ignite
  // fade are mostly excluded; armed once per page load so a demotion can never cascade
  // (a demotion changes `tier`, which rebuilds SceneRoot's GL context).
  useEffect(() => {
    if (!ignited || !tier || tier === "still") return;
    if (probedRef.current) return;
    probedRef.current = true;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      runFpsProbe(1000).then((fps) => {
        if (cancelled) return;
        // fps === null means the probe was inconclusive (tab hidden) — keep the tier.
        const next = probeDemote(tier, fps);
        logClient("quality.probe", { fps: fps === null ? null : Math.round(fps), from: tier, to: next });
        if (next !== tier) setTier(next);
      });
    }, PROBE_DELAY_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [ignited, tier]);

  // Dark-only scene and audio voicing share the same theme.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    engine.setTheme("dark");
  }, [engine, tier]);

  const onContextLost = useCallback(() => {
    logClient("scene.context_lost", {});
    setTier("still");
  }, []);
  const onIgnitionComplete = useCallback(() => setIgnited(true), []);

  // Chapters 01–03 own their own sections now; the rest are still placeholders.
  const placeholders = useMemo(
    () => CHAPTERS.filter((c) => c.id !== "launch" && c.id !== "approach" && c.id !== "jump"),
    [],
  );

  // Content is always rendered; quality selection only enhances its background.
  const animated = tier !== null && tier !== "still";
  const jumpLetterbox = useJumpBeat(animated);

  return (
    <div className="voyage-root" data-tier={tier ?? "pending"} data-jump={jumpLetterbox ? "true" : undefined}>
      <VoyageScroll smooth={animated} />
      {tier && tier !== "still" ? <SceneRoot tier={tier} ignite={ignited} onContextLost={onContextLost} /> : <StillSky />}

      {/* Ignition clears its own state on finish, independently from the Jump hold. */}
      <Letterbox active={animated && letterbox} />
      <FlightRail />
      <Dock visible />

      {tier && <Ignition enabled={animated} onComplete={onIgnitionComplete} onLetterbox={setLetterbox} />}

      {/* Measured child sections determine travel; Surface includes one final viewport tail. */}
      <main className="voyage-track">
        <Launch headline={settings.heroHeadline} subheadline={settings.heroSubheadline} ready={ignited} />
        <Services services={services} animated={animated} />
        {/* Chapter 03 carries 25vh of scroll and nothing else: no pin, label or aria-label. */}
        <section
          id="jump"
          className="chapter chapter--micro"
          style={{ height: `${sectionHeightVh(jumpChapter)}vh` }}
        />
        {placeholders.map((c) => (
          <section
            key={c.id}
            id={c.id}
            className={`chapter chapter--placeholder${c.micro ? " chapter--micro" : ""}`}
            style={{ height: `${sectionHeightVh(c)}vh` }}
          >
            {!c.micro && (
              <div className="chapter__pin">
                <p className="chapter__label chapter__label--placeholder">
                  {c.index} / {c.label}
                </p>
              </div>
            )}
          </section>
        ))}
      </main>

      <button type="button" className="voyage-audio" onClick={toggleMuted}
        aria-label={state.muted ? "Enable audio" : "Mute audio"} aria-pressed={!state.muted}>
        <AudioVisualizer active={!state.muted} />
        <span>Sound {state.muted ? "off" : "on"}</span>
      </button>
    </div>
  );
}
