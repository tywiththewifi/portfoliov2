// The site's music: one track, looped without a gap, plus a live read-out
// of it for the 3D scene. Nothing downloads until the first play (browsers
// only allow sound after a click anyway).
//
// The track is decoded whole and played from an AudioBufferSourceNode set to
// loop, so the seam is sample-accurate (an <audio loop> leaves a gap with
// MP3s). Pausing suspends the AudioContext after a short fade.

export type Levels = {
  left: number; // channel levels for the meters, 0..1
  right: number;
  bass: number; // smoothed band energies, 0..1
  mid: number;
  high: number;
  kick: number; // decaying envelope, 1 on each detected beat
  beat: boolean; // true on the frame a beat lands
};

export type MusicState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

const SILENT: Levels = { left: 0, right: 0, bass: 0, mid: 0, high: 0, kick: 0, beat: false };

export function createMusic(url: string) {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let mix: AnalyserNode, left: AnalyserNode, right: AnalyserNode, kick: AnalyserNode;
  let mono = false;
  let state: MusicState = 'idle';
  const listeners = new Set<(s: MusicState) => void>();
  const set = (s: MusicState) => { state = s; listeners.forEach((f) => f(s)); };

  // analysis state. Each band is measured in linear magnitude and scaled to
  // its own recent peak (so a bass-heavy or a lo-fi, high-cut mix both use
  // the full range). Beats come from a separate path: the track low-passed
  // at 150 Hz, read in short (~12 ms) windows; a beat is a sudden rise in
  // that energy well above its average over the last second or so.
  let freq: Float32Array<ArrayBuffer>, wave: Float32Array<ArrayBuffer>, low: Float32Array<ArrayBuffer>;
  const env = { bass: 0, mid: 0, high: 0, kick: 0, since: 1, prev: 0, fluxMean: 0, fluxVar: 0, lowPeak: 1e-4 };
  const peak = { bass: 1e-4, mid: 1e-4, high: 1e-4 };

  function build() {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    mix = ctx.createAnalyser();
    mix.fftSize = 2048;
    mix.smoothingTimeConstant = 0.2; // light smoothing keeps the kicks sharp
    left = ctx.createAnalyser();
    right = ctx.createAnalyser();
    left.fftSize = right.fftSize = 1024;
    kick = ctx.createAnalyser();
    kick.fftSize = 512;
    // the meters' analysers only listen; a muted gain keeps them in the
    // processed graph
    const sink = ctx.createGain();
    sink.gain.value = 0;
    left.connect(sink); right.connect(sink); kick.connect(sink);
    sink.connect(ctx.destination);
    mix.connect(master);
    master.connect(ctx.destination);
    freq = new Float32Array(mix.frequencyBinCount);
    wave = new Float32Array(left.fftSize);
    low = new Float32Array(kick.fftSize);
  }

  async function start() {
    const c = ctx!;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`music: ${res.status}`);
    const buffer = await c.decodeAudioData(await res.arrayBuffer());
    mono = buffer.numberOfChannels < 2;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const split = c.createChannelSplitter(2);
    const lowpass = c.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 150;
    src.connect(lowpass);
    lowpass.connect(kick);
    src.connect(mix);
    src.connect(split);
    split.connect(left, 0);
    split.connect(right, mono ? 0 : 1);
    src.start();
  }

  const fade = (to: number, secs: number) => {
    const g = master.gain, now = ctx!.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(to, now + secs);
  };

  async function play() {
    if (state === 'playing' || state === 'loading') return;
    // create and resume inside the click, before any await, so iOS unlocks
    // the context
    const first = !ctx;
    if (first) build();
    const resumed = ctx!.resume();
    if (first) {
      set('loading');
      try { await start(); } catch (e) { console.warn(e); set('error'); return; }
    }
    await resumed;
    fade(1, first ? 0.6 : 0.3);
    set('playing');
  }

  async function pause() {
    if (state !== 'playing' || !ctx) return;
    set('paused');
    fade(0, 0.25);
    await new Promise((r) => setTimeout(r, 260));
    // (unless play was pressed again during the fade)
    if ((state as MusicState) === 'paused') await ctx.suspend();
  }

  // RMS of one channel as a meter level: -42 dB .. 0 dB → 0..1
  const level = (a: AnalyserNode) => {
    a.getFloatTimeDomainData(wave);
    let s = 0;
    for (let i = 0; i < wave.length; i++) s += wave[i] * wave[i];
    const db = 10 * Math.log10(s / wave.length + 1e-10);
    return Math.max(0, Math.min(1, (db + 42) / 42));
  };
  // mean linear magnitude of the spectrum between two frequencies
  const band = (lo: number, hi: number) => {
    const hz = ctx!.sampleRate / 2 / freq.length;
    const a = Math.max(1, Math.floor(lo / hz)), b = Math.max(a + 1, Math.ceil(hi / hz));
    let s = 0;
    for (let i = a; i < b; i++) s += Math.pow(10, freq[i] / 20);
    return s / (b - a);
  };
  // a band against its own slowly falling peak, 0..1
  const norm = (k: keyof typeof peak, v: number, dt: number) => {
    peak[k] = Math.max(v, peak[k] * Math.exp(-dt * 0.25), 1e-6);
    return v / peak[k];
  };

  // Call once a frame with the frame's dt (seconds).
  function read(dt: number): Levels {
    if (state !== 'playing' || !ctx) {
      env.kick = Math.max(0, env.kick - dt * 4);
      return { ...SILENT, kick: env.kick };
    }
    mix.getFloatFrequencyData(freq);
    const bass = norm('bass', band(35, 160), dt), mid = norm('mid', band(400, 2500), dt), high = norm('high', band(2500, 9000), dt);
    // envelopes: quick to rise, slower to fall; the bass envelope keeps only
    // the top of its range, so it swells on hits rather than sitting high
    const follow = (cur: number, to: number, down: number) => (to > cur ? to : cur + (to - cur) * Math.min(1, dt * down));
    env.bass = follow(env.bass, Math.max(0, (bass - 0.55) / 0.45), 5);
    env.mid = follow(env.mid, mid, 6);
    env.high = follow(env.high, high, 12);
    // a beat: the low band's energy rises much faster than usual (1.5
    // deviations over its running mean), and not too soon after the last
    kick.getFloatTimeDomainData(low);
    let e = 0;
    for (let i = 0; i < low.length; i++) e += low[i] * low[i];
    e = Math.sqrt(e / low.length);
    env.lowPeak = Math.max(e, env.lowPeak * Math.exp(-dt * 0.25));
    env.since += dt;
    const flux = Math.max(0, e - env.prev) / env.lowPeak;
    env.prev = e;
    const beat = flux > env.fluxMean + 1.5 * Math.sqrt(env.fluxVar) && flux > 0.08 && env.since > 0.28;
    const a = Math.min(1, dt * 1.2), d = flux - env.fluxMean;
    env.fluxMean += d * a;
    env.fluxVar += (d * d - env.fluxVar) * a;
    if (beat) { env.since = 0; env.kick = 1; } else env.kick = Math.max(0, env.kick - dt * 4);
    const l = level(left), r = mono ? l : level(right);
    return { left: l, right: r, bass: env.bass, mid: env.mid, high: env.high, kick: env.kick, beat };
  }

  return {
    play, pause,
    toggle: () => (state === 'playing' ? pause() : play()),
    read,
    get state() { return state; },
    get playing() { return state === 'playing'; },
    onChange(f: (s: MusicState) => void) { listeners.add(f); return () => listeners.delete(f); },
  };
}

export type Music = ReturnType<typeof createMusic>;
