"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Settings } from "@/lib/data";
// Type-only (erased at compile time) — keeps mongoose out of the client bundle.
import type { Item } from "@/lib/collections/defineCollection";
import type { WorldCase } from "@/lib/worldCase";
import { CHAPTERS, VOYAGE_SCROLL_VH, VOYAGE_TAIL_VH, sectionHeightVh } from "@/scene/camera/flightPath";
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
// Slice 3: chapter 02's panels and chapter 03's beat. Slice 4: chapter 04's step panels.
// Slice 5: chapter 05's case panels and the /voyage#<chapter> arrival.
import Services from "./Services";
import Process from "./Process";
import Worlds from "./Worlds";
import { useHashArrival } from "./useHashArrival";
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
  /** Chapter 04's steps. Untyped past Item's three base fields — narrowed in Process. */
  process: Item[];
  /** Chapter 05's published case studies, already slimmed server-side (see page.tsx). */
  worlds: WorldCase[];
}

// The prop is named `process` (the content key); it is destructured as `steps` so it never
// shadows Node's `process` global inside this module.
export default function VoyageRoot({ settings, services, process: steps, worlds }: VoyageRootProps) {
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

  // The voyage is dark-only; the theme toggle is removed in slice 8. Keyed on `tier` because
  // FloatingControls (which writes the stored/OS theme on mount) only mounts once `tier` is
  // resolved — so this effect must re-run in that same commit to win over it.
  // The audio engine keys its voicing off the theme too, and FloatingControls sets it from
  // the stored/OS theme on mount — so pin it here in the same commit, not just the attribute.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    engine.setTheme("dark");
  }, [engine, tier]);

  const onContextLost = useCallback(() => {
    logClient("scene.context_lost", {});
    setTier("still");
  }, []);
  const onIgnitionComplete = useCallback(() => setIgnited(true), []);

  // /voyage#<chapter> arrivals land here once the boot gate below has lifted (see the hook).
  useHashArrival(tier);

  // Chapters 01–05 own their own sections now; the rest are still placeholders. (`worlds` is
  // filtered out so its `id="worlds"` lives in <Worlds> alone — the dock and #worlds target it.)
  const placeholders = useMemo(
    () => CHAPTERS.filter((c) => c.id !== "launch" && c.id !== "approach" && c.id !== "jump" && c.id !== "orbit" && c.id !== "worlds"),
    [],
  );

  // Computed before the early return so the hook below is never called conditionally.
  const animated = tier !== null && tier !== "still";
  const jumpLetterbox = useJumpBeat(animated);

  if (tier === null) return <div className="voyage-root voyage-root--booting" />;

  return (
    <div className="voyage-root" data-tier={tier}>
      <VoyageScroll smooth={animated} />
      {/* Narrowed on the literal: SceneRoot takes Exclude<Tier, "still">, and `animated` is a
          plain boolean TypeScript cannot tie back to `tier`. */}
      {tier !== "still" ? (
        <SceneRoot
          tier={tier}
          ignite={ignited}
          onContextLost={onContextLost}
          stepCount={steps.length}
          planets={worlds.map((w) => w.planetFeature)}
        />
      ) : (
        <StillSky />
      )}

      {/* Two independent sources, OR'd here. Ignition writes `letterbox` and clears it
          unconditionally in finish() (Ignition.tsx:49), so sharing one boolean would let it
          stomp a Jump-driven true. */}
      <Letterbox active={animated && (letterbox || jumpLetterbox)} />
      <Telemetry />
      <FlightRail />
      <Dock visible={ignited} />

      <Ignition enabled={animated} onComplete={onIgnitionComplete} onLetterbox={setLetterbox} />

      {/* Track height = scrollable range + the final section's tail viewport, so that
          `scrollHeight - innerHeight` equals VOYAGE_SCROLL_VH — the store's denominator. */}
      <main className="voyage-track" style={{ minHeight: `${VOYAGE_SCROLL_VH + VOYAGE_TAIL_VH}vh` }}>
        <Launch headline={settings.heroHeadline} subheadline={settings.heroSubheadline} ready={ignited} />
        {/* Inside the `tier === null` boot gate: Services calls useReducedMotion(), which must
            never server-render. */}
        <Services services={services} animated={animated} />
        {/* Chapter 03 carries 25vh of scroll and nothing else: no pin, no label, and no
            aria-label — an empty labelled region is a screen-reader dead end. The beat it
            names is entirely in useJumpBeat + the set pieces. */}
        <section
          id="jump"
          className="chapter chapter--micro"
          style={{ height: `${sectionHeightVh(jumpChapter)}vh` }}
        />
        {/* Chapter 04, in chapter order (DOM order is scroll order). Inside the boot gate for the
            same reason as Services: it calls useReducedMotion(). */}
        <Process steps={steps} animated={animated} />
        {/* Chapter 05, same reason (useReducedMotion, useMediaQuery). Owns id="worlds". */}
        <Worlds cases={worlds} animated={animated} />
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

      <FloatingControls muted={state.muted} onToggleMute={toggleMuted} />
    </div>
  );
}
