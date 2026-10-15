/**
 * Singleton Web Audio engine.
 *
 * Graph:
 *   ambientBus (space.mp3 + noise pad + drone) ──┐
 *                                                 ├─► duckLowpass ──► masterGain ──► destination
 *   sfxBus (clicks, whooshes, impacts, keystrokes)┘
 *
 * - masterGain ramps smoothly for mute/unmute (no clicks).
 * - duckLowpass briefly drops cutoff on impact (sidechain-style feel).
 * - AnalyserNode taps masterGain for visualizers / Three.js reactivity.
 */

import {
  createDrone,
  createNoisePad,
  playBell,
  playClick,
  playImpact,
  playKeystroke,
  playWhoosh,
} from "./synths";

type EngineListener = (state: EngineState) => void;
export interface EngineState {
  muted: boolean;
  ready: boolean;
  theme: "dark" | "light";
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private duckLowpass: BiquadFilterNode | null = null;
  private scrollFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;

  private spaceAudio: HTMLAudioElement | null = null;
  private spaceSource: MediaElementAudioSourceNode | null = null;
  private noisePad: ReturnType<typeof createNoisePad> | null = null;
  private drone: ReturnType<typeof createDrone> | null = null;

  private listeners = new Set<EngineListener>();
  private state: EngineState = { muted: true, ready: false, theme: "dark" };
  private spaceUrl: string | null = null;

  /** Configure the URL of the looping background audio file. Idempotent. */
  setBackgroundUrl(url: string) {
    if (this.spaceUrl === url) return;
    this.spaceUrl = url;
    if (this.spaceAudio) this.spaceAudio.src = url;
  }

  /** Lazy-create the AudioContext + graph. Must be called inside a user gesture. */
  async ensureStarted(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    const duckLowpass = ctx.createBiquadFilter();
    duckLowpass.type = "lowpass";
    duckLowpass.frequency.value = 18000;
    duckLowpass.Q.value = 0.3;

    const scrollFilter = ctx.createBiquadFilter();
    scrollFilter.type = "lowpass";
    scrollFilter.frequency.value = 6000;
    scrollFilter.Q.value = 0.4;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;

    const ambientBus = ctx.createGain();
    ambientBus.gain.value = 0.6;
    const sfxBus = ctx.createGain();
    sfxBus.gain.value = 1.0;

    // Routing
    ambientBus.connect(scrollFilter).connect(duckLowpass);
    sfxBus.connect(duckLowpass);
    duckLowpass.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    this.masterGain = masterGain;
    this.duckLowpass = duckLowpass;
    this.scrollFilter = scrollFilter;
    this.ambientBus = ambientBus;
    this.sfxBus = sfxBus;
    this.analyser = analyser;

    // Background loop (space.mp3) via MediaElement
    if (this.spaceUrl) {
      const audio = new Audio();
      audio.src = this.spaceUrl;
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      audio.preload = "auto";
      try {
        const source = ctx.createMediaElementSource(audio);
        source.connect(ambientBus);
        this.spaceAudio = audio;
        this.spaceSource = source;
      } catch {
        // Some browsers may reject if URL has CORS issues; silently fall back
        this.spaceAudio = null;
      }
    }

    // Procedural pad + drone
    const noisePad = createNoisePad(ctx);
    noisePad.gain.connect(ambientBus);
    noisePad.source.start();
    this.noisePad = noisePad;

    const drone = createDrone(ctx);
    drone.gain.connect(ambientBus);
    drone.oscA.start();
    drone.oscB.start();
    this.drone = drone;

    this.state = { ...this.state, ready: true };
    this.emit();
  }

  /** Smoothly unmute / mute master output. */
  async setMuted(muted: boolean) {
    await this.ensureStarted();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    if (muted) {
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
      // Pause space.mp3 after ramp so cpu/data drops
      setTimeout(() => this.spaceAudio?.pause(), 450);
      // Fade the procedural layers fully
      this.noisePad?.gain.gain.cancelScheduledValues(now);
      this.noisePad?.gain.gain.linearRampToValueAtTime(0, now + 0.4);
      this.drone?.gain.gain.cancelScheduledValues(now);
      this.drone?.gain.gain.linearRampToValueAtTime(0, now + 0.4);
    } else {
      this.masterGain.gain.linearRampToValueAtTime(0.5, now + 0.6);
      this.spaceAudio?.play().catch(() => {});
      this.noisePad?.gain.gain.cancelScheduledValues(now);
      this.noisePad?.gain.gain.linearRampToValueAtTime(0.25, now + 0.8);
      this.drone?.gain.gain.cancelScheduledValues(now);
      this.drone?.gain.gain.linearRampToValueAtTime(0.18, now + 1.2);
    }
    this.state = { ...this.state, muted };
    this.emit();
  }

  /** Adjust master tone based on theme (lighter cutoff for light theme). */
  setTheme(theme: "dark" | "light") {
    this.state = { ...this.state, theme };
    if (this.scrollFilter && this.ctx) {
      const target = theme === "light" ? 9000 : 6000;
      const now = this.ctx.currentTime;
      this.scrollFilter.frequency.cancelScheduledValues(now);
      this.scrollFilter.frequency.linearRampToValueAtTime(target, now + 0.6);
    }
    this.emit();
  }

  /** Sidechain-style duck on the ambient bus for a short window. */
  duck(durationMs = 600, depthHz = 600) {
    if (!this.ctx || !this.duckLowpass) return;
    const now = this.ctx.currentTime;
    const dur = durationMs / 1000;
    this.duckLowpass.frequency.cancelScheduledValues(now);
    this.duckLowpass.frequency.setValueAtTime(18000, now);
    this.duckLowpass.frequency.exponentialRampToValueAtTime(depthHz, now + 0.04);
    this.duckLowpass.frequency.exponentialRampToValueAtTime(18000, now + dur);
  }

  /** Apply a scroll-velocity-derived bias to the ambient filter (0..1). */
  setScrollEnergy(energy: number) {
    if (!this.ctx || !this.scrollFilter) return;
    const base = this.state.theme === "light" ? 9000 : 6000;
    const target = base + Math.min(1, Math.max(0, energy)) * 4000;
    const now = this.ctx.currentTime;
    this.scrollFilter.frequency.setTargetAtTime(target, now, 0.15);
  }

  // ── SFX wrappers ──────────────────────────────────────────────────────
  click(opts?: Parameters<typeof playClick>[2]) {
    if (this.state.muted || !this.ctx || !this.sfxBus) return;
    playClick(this.ctx, this.sfxBus, opts);
  }
  bell(opts?: Parameters<typeof playBell>[2]) {
    if (this.state.muted || !this.ctx || !this.sfxBus) return;
    playBell(this.ctx, this.sfxBus, opts);
  }
  whoosh(opts?: Parameters<typeof playWhoosh>[2]) {
    if (this.state.muted || !this.ctx || !this.sfxBus) return;
    playWhoosh(this.ctx, this.sfxBus, opts);
  }
  impact(opts?: Parameters<typeof playImpact>[2]) {
    if (this.state.muted || !this.ctx || !this.sfxBus) return;
    playImpact(this.ctx, this.sfxBus, opts);
    this.duck();
  }
  /** Keystroke with optional stereo pan (-1..1). */
  keystroke(volume = 0.14, pan = 0) {
    if (this.state.muted || !this.ctx || !this.sfxBus) return;
    if (pan === 0) {
      playKeystroke(this.ctx, this.sfxBus, { volume });
      return;
    }
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    panner.connect(this.sfxBus);
    playKeystroke(this.ctx, panner, { volume });
  }

  /** Access the analyser for visualizers (may be null before init). */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /** Subscribe to state changes. Returns unsubscribe. */
  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): EngineState {
    return this.state;
  }

  private emit() {
    for (const l of this.listeners) l(this.state);
  }
}

// Module-level singleton (browser only)
let _engine: AudioEngine | null = null;
export function getAudioEngine(): AudioEngine {
  if (typeof window === "undefined") {
    // SSR no-op stub
    return new AudioEngine();
  }
  if (!_engine) _engine = new AudioEngine();
  return _engine;
}

export type { AudioEngine };
