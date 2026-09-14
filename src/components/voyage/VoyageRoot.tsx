"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Settings } from "@/lib/data";
import { CHAPTERS, VOYAGE_SCROLL_VH } from "@/scene/camera/flightPath";
import { voyageStore } from "@/scene/scroll/voyageStore";
import VoyageScroll from "@/scene/scroll/VoyageScroll";
import { detectEnv, selectTier, probeDemote, runFpsProbe, type Tier } from "@/scene/quality";
import { logClient } from "@/lib/clientLog";
import { useAudio } from "@/hooks/useAudio";
import { FloatingControls } from "@/components/ThemeToggle";
import StillSky from "@/scene/StillSky";
import Telemetry from "./Telemetry";
import Letterbox from "./Letterbox";
import FlightRail from "./FlightRail";
import Dock from "@/components/dock/Dock";
import Ignition from "./Ignition";
import Launch from "./Launch";

const SceneRoot = dynamic(() => import("@/scene/SceneRoot"), { ssr: false });

/** Settle window before the FPS probe samples. On a repeat visit Ignition finishes at
 *  mount, so a shorter delay would sample the warm-up frames it means to exclude. */
const PROBE_DELAY_MS = 900;

interface VoyageRootProps {
  settings: Settings;
}

export default function VoyageRoot({ settings }: VoyageRootProps) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [ignited, setIgnited] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
  const probedRef = useRef(false);
  const { engine, state, toggleMuted } = useAudio();

  useEffect(() => {
    const env = detectEnv();
    const t = selectTier(env);
    setTier(t);
    logClient("quality.tier", { tier: t, ...env, dpr: window.devicePixelRatio });
  }, []);

  useEffect(() => {
    if (settings.audioFile) engine.setBackgroundUrl(settings.audioFile);
  }, [engine, settings.audioFile]);

  // Scroll velocity → audio filter, only while unmuted.
  useEffect(() => {
    if (state.muted) return;
    return voyageStore.subscribe((s) => engine.setScrollEnergy(s.velocity));
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

  const onContextLost = useCallback(() => {
    logClient("scene.context_lost", {});
    setTier("still");
  }, []);
  const onIgnitionComplete = useCallback(() => setIgnited(true), []);

  const placeholders = useMemo(() => CHAPTERS.filter((c) => c.id !== "launch"), []);

  if (tier === null) return <div className="voyage-root voyage-root--booting" />;

  const animated = tier !== "still";

  return (
    <div className="voyage-root" data-tier={tier}>
      <VoyageScroll smooth={animated} />
      {animated ? <SceneRoot tier={tier} ignite={ignited} onContextLost={onContextLost} /> : <StillSky />}

      <Letterbox active={animated && letterbox} />
      <Telemetry />
      <FlightRail />
      <Dock visible={ignited} />

      <Ignition enabled={animated} onComplete={onIgnitionComplete} onLetterbox={setLetterbox} />

      <main className="voyage-track" style={{ minHeight: `${VOYAGE_SCROLL_VH}vh` }}>
        <Launch headline={settings.heroHeadline} subheadline={settings.heroSubheadline} ready={ignited} />
        {placeholders.map((c) => (
          <section
            key={c.id}
            id={c.id}
            className={`chapter chapter--placeholder${c.micro ? " chapter--micro" : ""}`}
            style={{ height: `${(c.end - c.start) * VOYAGE_SCROLL_VH}vh` }}
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

      <FloatingControls muted={state.muted} onToggleMute={toggleMuted} />
    </div>
  );
}
