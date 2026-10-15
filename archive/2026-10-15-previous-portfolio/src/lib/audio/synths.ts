/**
 * Procedural synthesizer primitives.
 * All sounds are generated with Web Audio nodes — no external audio assets.
 */

/** Trigger a short, glassy "click" tick. Used for hovers and micro-feedback. */
export function playClick(
  ctx: AudioContext,
  destination: AudioNode,
  opts: { volume?: number; pitch?: number } = {}
) {
  const { volume = 0.06, pitch = 1 } = opts;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(2200 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(1400 * pitch, now + 0.04);

  filter.type = "highpass";
  filter.frequency.value = 800;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  osc.connect(filter).connect(gain).connect(destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

/** Soft bell-like tone for cinematic intro letters. */
export function playBell(
  ctx: AudioContext,
  destination: AudioNode,
  opts: { volume?: number; freq?: number; detune?: number } = {}
) {
  const { volume = 0.12, freq = 440, detune = 0 } = opts;
  const now = ctx.currentTime;

  // FM-style: carrier + modulator
  const carrier = ctx.createOscillator();
  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();
  const gain = ctx.createGain();

  carrier.type = "sine";
  carrier.frequency.value = freq;
  carrier.detune.value = detune;

  modulator.type = "sine";
  modulator.frequency.value = freq * 2.01;
  modGain.gain.value = freq * 0.6;

  modulator.connect(modGain).connect(carrier.frequency);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

  carrier.connect(gain).connect(destination);
  carrier.start(now);
  modulator.start(now);
  carrier.stop(now + 1.3);
  modulator.stop(now + 1.3);
}

/** Filtered noise sweep — used for carousel transitions / section reveals. */
export function playWhoosh(
  ctx: AudioContext,
  destination: AudioNode,
  opts: { volume?: number; direction?: 1 | -1 } = {}
) {
  const { volume = 0.08, direction = 1 } = opts;
  const now = ctx.currentTime;
  const duration = 0.4;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  if (direction === 1) {
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + duration);
  } else {
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + duration);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noise.connect(filter).connect(gain).connect(destination);
  noise.start(now);
  noise.stop(now + duration);
}

/** Sub-bass impact "kick" — used for CTA press. Returns a duration in seconds. */
export function playImpact(
  ctx: AudioContext,
  destination: AudioNode,
  opts: { volume?: number } = {}
) {
  const { volume = 0.5 } = opts;
  const now = ctx.currentTime;

  // Body: pitched sine drop
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(140, now);
  body.frequency.exponentialRampToValueAtTime(38, now + 0.18);
  bodyGain.gain.setValueAtTime(0, now);
  bodyGain.gain.linearRampToValueAtTime(volume, now + 0.005);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  body.connect(bodyGain).connect(destination);
  body.start(now);
  body.stop(now + 0.6);

  // Click transient (noise burst through highpass)
  const bufferSize = Math.floor(ctx.sampleRate * 0.04);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1800;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(volume * 0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  noise.connect(hp).connect(noiseGain).connect(destination);
  noise.start(now);
  noise.stop(now + 0.06);

  return 0.6;
}

/** Single-shot keystroke (snappier than playClick). */
export function playKeystroke(
  ctx: AudioContext,
  destination: AudioNode,
  opts: { volume?: number } = {}
) {
  const { volume = 0.14 } = opts;
  const now = ctx.currentTime;

  const bufferSize = Math.floor(ctx.sampleRate * 0.04);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Decaying noise envelope baked in for a tight transient
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.exp(-i / (bufferSize * 0.25));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = 0.85 + Math.random() * 0.3;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800 + Math.random() * 600;
  bp.Q.value = 0.9;

  const gain = ctx.createGain();
  gain.gain.value = volume * (0.7 + Math.random() * 0.3);

  src.connect(bp).connect(gain).connect(destination);
  src.start(now);
}

/** Procedural ambient pad — filtered pink-ish noise. Loops indefinitely. */
export function createNoisePad(ctx: AudioContext): {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
} {
  const duration = 4; // seconds — loop length
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Simple pink-noise approximation (Paul Kellet)
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  filter.Q.value = 0.4;

  const gain = ctx.createGain();
  gain.gain.value = 0; // ramp in via engine

  source.connect(filter).connect(gain);
  return { source, filter, gain };
}

/** Procedural sub-bass drone — two detuned sines for a subtle beat. */
export function createDrone(ctx: AudioContext): {
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  gain: GainNode;
} {
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  oscA.type = "sine";
  oscB.type = "sine";
  oscA.frequency.value = 55; // A1
  oscB.frequency.value = 55.4; // slight detune → slow beating

  const gain = ctx.createGain();
  gain.gain.value = 0;

  oscA.connect(gain);
  oscB.connect(gain);
  return { oscA, oscB, gain };
}
