// Synthesizes the app's sound effects into assets/sounds/*.wav.
// Every sound is generated from scratch here (additive synthesis, pitch glides, filtered noise, echo),
// so the app ships no third-party audio.
// Run: npm run sounds
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;
const TAU = Math.PI * 2;

// Deterministic randomness so every build produces identical files.
let seed = 12345;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

/** Note name → Hz, e.g. hz('C5'), hz('F#4'). */
function hz(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((semis + (Number(m[3]) - 4) * 12 - 9) / 12);
}

/** Timbres: partials as [frequency multiple, amplitude, extra decay]. */
const TIMBRE = {
  sine: [[1, 1, 0]],
  // wooden, bouncy: strong fundamental + a quickly fading upper partial ("tock")
  marimba: [
    [1, 1, 0],
    [3.99, 0.35, 25],
    [9.9, 0.08, 60],
  ],
  // glassy bell with slightly inharmonic overtones
  bell: [
    [1, 1, 0],
    [2.01, 0.45, 2],
    [3.02, 0.22, 5],
    [4.17, 0.12, 9],
    [5.43, 0.06, 14],
  ],
  // soft chiptune square (odd harmonics only)
  square: [
    [1, 1, 0],
    [3, 0.3, 0],
    [5, 0.15, 0],
    [7, 0.07, 0],
  ],
  // warm cartoon voice
  tri: [
    [1, 1, 0],
    [3, 0.11, 0],
    [5, 0.04, 0],
  ],
};

/**
 * One voice. `f` may glide to `to` over the note (exponential, like a slide whistle).
 * `vib` adds vibrato: [rate Hz, depth in semitones].
 */
function voice(buf, { f, to, at = 0, len, vol = 0.5, timbre = 'marimba', attack = 0.004, decay = 6, vib, curve = 1 }) {
  const parts = TIMBRE[timbre];
  const start = Math.floor(at * RATE);
  const n = Math.floor(len * RATE);
  const phases = parts.map(() => 0);
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    let freq = to ? f * Math.pow(to / f, Math.pow(t / len, curve)) : f;
    if (vib) freq *= 2 ** ((vib[1] * Math.sin(TAU * vib[0] * t)) / 12);
    const env = Math.min(1, t / attack) * Math.exp(-decay * t) * Math.min(1, (len - t) / 0.015);
    let v = 0;
    parts.forEach(([mul, amp, extra], p) => {
      phases[p] += (freq * mul) / RATE;
      v += Math.sin(TAU * phases[p]) * amp * Math.exp(-extra * t);
    });
    buf[start + i] += v * env * vol;
  }
}

/** Filtered noise: `hp` true = airy hiss (sparkle, whoosh), false = soft thump (drum). */
function noise(buf, { at = 0, len, vol = 0.3, decay = 20, hp = true, cutoff = 0.2, attack = 0.002, swell = false }) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(len * RATE);
  let lp = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const w = rand() * 2 - 1;
    lp += cutoff * (w - lp);
    const s = hp ? w - lp : lp * 3;
    const env = swell ? Math.sin((Math.PI * t) / len) ** 2 : Math.min(1, t / attack) * Math.exp(-decay * t);
    buf[start + i] += s * env * vol;
  }
}

/** A shower of tiny high bell pings — the "magic" glitter. */
function sparkle(buf, { at = 0, len = 0.4, count = 8, vol = 0.12, low = 2200, high = 4200 }) {
  for (let i = 0; i < count; i++) {
    voice(buf, {
      f: low + rand() * (high - low),
      at: at + (i / count) * len + rand() * 0.02,
      len: 0.18,
      vol: vol * (0.6 + rand() * 0.4),
      timbre: 'sine',
      decay: 22,
    });
  }
}

/** Feedback echo — gives the sounds a bit of space so they feel less "flat". */
function echo(buf, { delay = 0.11, feedback = 0.28, mix = 0.35 } = {}) {
  const d = Math.floor(delay * RATE);
  const wet = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) wet[i] = buf[i] + (i >= d ? wet[i - d] * feedback : 0);
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * (1 - mix) + wet[i] * mix;
}

function render(length, draw, { space } = {}) {
  const buf = new Float32Array(Math.ceil(length * RATE));
  draw(buf);
  if (space) echo(buf, space === true ? undefined : space);
  // gentle fade-out at the very end so nothing clicks
  const fade = Math.min(buf.length, Math.floor(0.03 * RATE));
  for (let i = 0; i < fade; i++) buf[buf.length - 1 - i] *= i / fade;
  let peak = 1e-9;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const gain = 0.85 / peak;
  return buf.map((v) => v * gain);
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

/** Quick arpeggio: notes played `step` seconds apart. */
function arp(buf, notes, { at = 0, step = 0.07, len = 0.35, vol = 0.45, timbre = 'marimba', decay = 7 } = {}) {
  notes.forEach((nm, i) => voice(buf, { f: hz(nm), at: at + i * step, len, vol, timbre, decay }));
}

const SOUNDS = {
  // UI touch: a bubbly "bloop" (quick upward pitch flick)
  tap: render(0.09, (b) => {
    voice(b, { f: 380, to: 820, len: 0.08, vol: 0.5, timbre: 'sine', decay: 30, curve: 0.6 });
  }),

  // Correct answer — three variants so it doesn't get boring
  correct: render(
    0.6,
    (b) => {
      arp(b, ['E5', 'B5'], { step: 0.08, len: 0.4 });
      sparkle(b, { at: 0.08, len: 0.2, count: 4, vol: 0.08 });
    },
    { space: true },
  ),
  correct2: render(
    0.6,
    (b) => {
      arp(b, ['G5', 'C6', 'E6'], { step: 0.06, len: 0.35, vol: 0.4 });
    },
    { space: true },
  ),
  correct3: render(
    0.6,
    (b) => {
      voice(b, { f: hz('A5'), at: 0, len: 0.12, vol: 0.35, timbre: 'bell', decay: 14 });
      voice(b, { f: hz('E6'), at: 0.07, len: 0.45, vol: 0.45, timbre: 'bell', decay: 7 });
      sparkle(b, { at: 0.1, len: 0.25, count: 5, vol: 0.07 });
    },
    { space: true },
  ),

  // Streak of correct answers: each tier climbs higher and sparkles more
  streak1: render(
    0.7,
    (b) => {
      arp(b, ['C6', 'E6', 'G6'], { step: 0.055, len: 0.35, vol: 0.4 });
      sparkle(b, { at: 0.12, len: 0.3, count: 6, vol: 0.09 });
    },
    { space: true },
  ),
  streak2: render(
    0.8,
    (b) => {
      arp(b, ['D6', 'F#6', 'A6', 'D7'], { step: 0.05, len: 0.35, vol: 0.38 });
      sparkle(b, { at: 0.1, len: 0.4, count: 9, vol: 0.1, low: 2800, high: 5200 });
    },
    { space: true },
  ),
  streak3: render(
    1.0,
    (b) => {
      voice(b, { f: 600, to: 2400, len: 0.22, vol: 0.18, timbre: 'sine', decay: 2 });
      arp(b, ['E6', 'G#6', 'B6', 'E7'], { at: 0.12, step: 0.045, len: 0.45, vol: 0.38, timbre: 'bell', decay: 6 });
      sparkle(b, { at: 0.15, len: 0.5, count: 14, vol: 0.1, low: 3000, high: 6000 });
    },
    { space: true },
  ),

  // Wrong answer: a soft, funny "wah-wah" slide — never scary
  wrong: render(0.6, (b) => {
    voice(b, { f: hz('G4'), to: hz('E4'), at: 0, len: 0.2, vol: 0.45, timbre: 'tri', decay: 3, vib: [9, 0.3] });
    voice(b, { f: hz('E4'), to: hz('C4'), at: 0.2, len: 0.36, vol: 0.45, timbre: 'tri', decay: 3, vib: [7, 0.6] });
  }),

  // End of a round: little fanfare with drum, chord and glitter
  win: render(
    1.6,
    (b) => {
      noise(b, { at: 0, len: 0.12, vol: 0.35, hp: false, cutoff: 0.05, decay: 30 });
      arp(b, ['C5', 'E5', 'G5', 'C6'], { step: 0.09, len: 0.3, vol: 0.4 });
      noise(b, { at: 0.36, len: 0.15, vol: 0.4, hp: false, cutoff: 0.05, decay: 25 });
      for (const [nm, v] of [
        ['C6', 0.4],
        ['E6', 0.28],
        ['G5', 0.28],
        ['C5', 0.22],
      ]) {
        voice(b, { f: hz(nm), at: 0.36, len: 1.1, vol: v, timbre: 'bell', decay: 2.6, vib: [5, 0.08] });
      }
      sparkle(b, { at: 0.4, len: 0.8, count: 16, vol: 0.09 });
    },
    { space: { delay: 0.13, feedback: 0.3, mix: 0.3 } },
  ),

  // New level unlocked / new record: rising whoosh into a big bright chord
  levelup: render(
    1.9,
    (b) => {
      noise(b, { at: 0, len: 0.45, vol: 0.22, hp: true, cutoff: 0.3, swell: true });
      voice(b, { f: 300, to: 1200, len: 0.42, vol: 0.25, timbre: 'square', decay: 1, curve: 1.4 });
      noise(b, { at: 0.42, len: 0.15, vol: 0.45, hp: false, cutoff: 0.04, decay: 22 });
      arp(b, ['G5', 'C6', 'E6', 'G6'], { at: 0.42, step: 0.07, len: 0.3, vol: 0.32, timbre: 'square', decay: 9 });
      for (const [nm, v] of [
        ['C6', 0.38],
        ['E6', 0.3],
        ['G6', 0.26],
        ['C7', 0.18],
        ['C5', 0.25],
      ]) {
        voice(b, { f: hz(nm), at: 0.72, len: 1.15, vol: v, timbre: 'bell', decay: 2.4, vib: [5.5, 0.1] });
      }
      sparkle(b, { at: 0.7, len: 0.9, count: 22, vol: 0.1, low: 2500, high: 6000 });
    },
    { space: { delay: 0.14, feedback: 0.32, mix: 0.3 } },
  ),

  // Coin: classic two-step "bling" with a chiptune edge
  coin: render(
    0.55,
    (b) => {
      voice(b, { f: hz('B5'), at: 0, len: 0.07, vol: 0.35, timbre: 'square', decay: 6 });
      voice(b, { f: hz('E6'), at: 0.065, len: 0.42, vol: 0.4, timbre: 'square', decay: 7 });
      sparkle(b, { at: 0.08, len: 0.2, count: 5, vol: 0.08, low: 3500, high: 5500 });
    },
    { space: { delay: 0.09, feedback: 0.25, mix: 0.25 } },
  ),

  // Daily chest opened: magic harp glissando + coin shower
  chest: render(
    1.7,
    (b) => {
      noise(b, { at: 0, len: 0.1, vol: 0.35, hp: false, cutoff: 0.05, decay: 30 });
      ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7'].forEach((nm, i) =>
        voice(b, { f: hz(nm), at: 0.05 + i * 0.045, len: 0.5, vol: 0.28, timbre: 'bell', decay: 5 }),
      );
      for (let i = 0; i < 5; i++) {
        voice(b, { f: hz('B6'), at: 0.6 + i * 0.12, len: 0.06, vol: 0.15, timbre: 'square', decay: 8 });
        voice(b, { f: hz('E7'), at: 0.66 + i * 0.12, len: 0.2, vol: 0.18, timbre: 'square', decay: 12 });
      }
      sparkle(b, { at: 0.5, len: 0.9, count: 20, vol: 0.09 });
    },
    { space: true },
  ),

  // «Молния» start: whoosh + "ready-go" double ding
  start: render(
    0.9,
    (b) => {
      noise(b, { at: 0, len: 0.35, vol: 0.3, hp: true, cutoff: 0.35, swell: true });
      voice(b, { f: hz('C6'), at: 0.28, len: 0.15, vol: 0.4, timbre: 'bell', decay: 12 });
      voice(b, { f: hz('G6'), at: 0.42, len: 0.45, vol: 0.45, timbre: 'bell', decay: 5 });
    },
    { space: true },
  ),

  // Last seconds of «Молния»: a wooden clock tick
  tick: render(0.08, (b) => {
    voice(b, { f: 1750, len: 0.07, vol: 0.5, timbre: 'marimba', decay: 55 });
    noise(b, { len: 0.02, vol: 0.15, hp: true, cutoff: 0.5, decay: 200 });
  }),
};

mkdirSync(new URL('../assets/sounds/', import.meta.url), { recursive: true });
for (const [name, samples] of Object.entries(SOUNDS)) {
  const file = new URL(`../assets/sounds/${name}.wav`, import.meta.url);
  writeFileSync(file, wav(samples));
  console.log(`assets/sounds/${name}.wav  ${(samples.length / RATE).toFixed(2)}s`);
}
