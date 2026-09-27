// All sound is synthesised with Web Audio for now (placeholder until real
// recordings are dropped in). Nothing plays until the visitor opts in.

let ctx: AudioContext | null = null;
let master: GainNode;

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBuffer(seconds: number, brown = false) {
  const c = ac();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}

// ------------------------------------------------------------------ ambient
let ambient: { gain: GainNode; stop: () => void } | null = null;

export function ambientOn() {
  return ambient !== null;
}

export function startAmbient() {
  if (ambient) return;
  const c = ac();
  const out = c.createGain();
  out.gain.value = 0;
  out.connect(master);
  const nodes: AudioScheduledSourceNode[] = [];

  // room tone
  const room = c.createBufferSource();
  room.buffer = noiseBuffer(4, true);
  room.loop = true;
  const roomLp = c.createBiquadFilter();
  roomLp.type = 'lowpass'; roomLp.frequency.value = 400;
  const roomG = c.createGain(); roomG.gain.value = 0.22;
  room.connect(roomLp).connect(roomG).connect(out);
  nodes.push(room);

  // rain on the window
  const rain = c.createBufferSource();
  rain.buffer = noiseBuffer(3);
  rain.loop = true;
  const rainBp = c.createBiquadFilter();
  rainBp.type = 'bandpass'; rainBp.frequency.value = 2400; rainBp.Q.value = 0.6;
  const rainG = c.createGain(); rainG.gain.value = 0.035;
  rain.connect(rainBp).connect(rainG).connect(out);
  nodes.push(rain);

  // vinyl crackle: sparse clicks in a looping buffer
  const crackleBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const cd = crackleBuf.getChannelData(0);
  for (let i = 0; i < 90; i++) {
    const p = Math.floor(Math.random() * cd.length);
    const amp = Math.random() * 0.6 + 0.1;
    for (let k = 0; k < 30; k++) if (p + k < cd.length) cd[p + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / 6);
  }
  const crackle = c.createBufferSource();
  crackle.buffer = crackleBuf; crackle.loop = true;
  const crackleG = c.createGain(); crackleG.gain.value = 0.18;
  crackle.connect(crackleG).connect(out);
  nodes.push(crackle);

  // a slow lo-fi chord loop
  const pad = c.createGain(); pad.gain.value = 0.05;
  const padLp = c.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = 900;
  pad.connect(padLp).connect(out);
  const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]];
  const oscs = [0, 1, 2, 3].map(() => {
    const o = c.createOscillator(); o.type = 'triangle';
    const g = c.createGain(); g.gain.value = 0.25;
    o.connect(g).connect(pad); o.start();
    nodes.push(o);
    return o;
  });
  const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
  let step = 0;
  const schedule = () => {
    const now = c.currentTime;
    chords[step % chords.length].forEach((m, i) => oscs[i].frequency.setTargetAtTime(mtof(m) * (1 + (Math.random() - 0.5) * 0.004), now, 0.08));
    step++;
  };
  schedule();
  const timer = window.setInterval(schedule, 3200);

  out.gain.setTargetAtTime(1, c.currentTime, 0.6);
  nodes.forEach((n) => { try { n.start(); } catch { /* oscillators already started */ } });

  ambient = {
    gain: out,
    stop: () => {
      window.clearInterval(timer);
      out.gain.setTargetAtTime(0, c.currentTime, 0.3);
      setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }), 1500);
    },
  };
}

export function stopAmbient() {
  ambient?.stop();
  ambient = null;
}

// ------------------------------------------------------------------ MPC voices
export const PAD_NAMES = ['KICK', 'SNARE', 'HAT', 'OPEN', 'CLAP', 'TOM L', 'TOM H', 'RIM', 'BASS C', 'BASS E', 'BASS G', 'BASS A', 'CHORD 1', 'CHORD 2', 'CHORD 3', 'VOX'];

export function playPad(i: number) {
  const c = ac();
  const t = c.currentTime;
  const env = (g: GainNode, a: number, d: number, peak = 1) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  };
  const noise = (dur: number, type: BiquadFilterType, freq: number, peak: number) => {
    const s = c.createBufferSource(); s.buffer = noiseBuffer(dur);
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain(); env(g, 0.002, dur, peak);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.05);
  };
  const tone = (f0: number, f1: number, dur: number, type: OscillatorType, peak: number) => {
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    const g = c.createGain(); env(g, 0.003, dur, peak);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  };
  const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
  switch (i) {
    case 0: tone(150, 42, 0.45, 'sine', 0.9); break;
    case 1: tone(220, 160, 0.12, 'triangle', 0.35); noise(0.2, 'highpass', 1500, 0.5); break;
    case 2: noise(0.05, 'highpass', 7000, 0.35); break;
    case 3: noise(0.3, 'highpass', 6500, 0.3); break;
    case 4: [0, 0.012, 0.024].forEach((d) => setTimeout(() => noise(0.12, 'bandpass', 1200, 0.45), d * 1000)); break;
    case 5: tone(140, 90, 0.35, 'sine', 0.6); break;
    case 6: tone(220, 150, 0.3, 'sine', 0.55); break;
    case 7: tone(900, 700, 0.05, 'square', 0.18); break;
    case 8: case 9: case 10: case 11: tone(mtof([36, 40, 43, 45][i - 8]), mtof([36, 40, 43, 45][i - 8]) * 0.99, 0.5, 'sawtooth', 0.25); break;
    case 12: case 13: case 14:
      [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72]][i - 12].forEach((m) => tone(mtof(m), mtof(m), 0.7, 'triangle', 0.12));
      break;
    default: tone(520, 300, 0.25, 'sawtooth', 0.15); tone(780, 450, 0.25, 'sine', 0.1);
  }
}

// small UI blip for clicks when audio is on
export function blip(freq = 880) {
  if (!ambient) return;
  const c = ac();
  const o = c.createOscillator(); o.type = 'square'; o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.04, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.08);
  o.connect(g).connect(master); o.start(); o.stop(c.currentTime + 0.1);
}

export function shutter() {
  if (!ambient) return;
  const c = ac();
  const t = c.currentTime;
  const s = c.createBufferSource(); s.buffer = noiseBuffer(0.12);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  s.connect(f).connect(g).connect(master); s.start(t);
}
