// Synthesizes the app's sound effects into assets/sounds/*.wav.
// Every sound is generated from scratch here (sine/triangle tones), so the app ships no third-party audio.
// Run: npm run sounds
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;

const sine = (f, t) => Math.sin(2 * Math.PI * f * t);
const tri = (f, t) => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * t));

/** A note: frequency, start (s), length (s), volume, waveform. Exponential decay with a soft attack. */
function note(buf, { f, at, len, vol = 0.5, wave = 'bell', decay = 6 }) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(len * RATE);
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.005);
    const env = attack * Math.exp(-decay * t) * Math.min(1, (len - t) / 0.02);
    let v;
    if (wave === 'tri') v = tri(f, t);
    else if (wave === 'bell') v = sine(f, t) + 0.35 * sine(2 * f, t) + 0.12 * sine(3 * f, t);
    else v = sine(f, t);
    buf[start + i] += v * env * vol;
  }
}

function render(length, notes) {
  const buf = new Float32Array(Math.ceil(length * RATE));
  for (const n of notes) note(buf, n);
  const peak = Math.max(...buf.map(Math.abs), 1e-9);
  const gain = Math.min(1, 0.8 / peak);
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

// Note frequencies (Hz)
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568, B5 = 987.77;
const G4 = 392, E4 = 329.63;

const SOUNDS = {
  // soft UI click
  tap: render(0.06, [{ f: 1200, at: 0, len: 0.06, vol: 0.35, wave: 'sine', decay: 60 }]),
  // bright two-note "ding-ding" going up
  correct: render(0.45, [
    { f: E6, at: 0, len: 0.2, vol: 0.5, decay: 10 },
    { f: G6, at: 0.09, len: 0.36, vol: 0.55, decay: 7 },
  ]),
  // gentle, non-scary "oh-oh" going down
  wrong: render(0.45, [
    { f: G4, at: 0, len: 0.2, vol: 0.45, wave: 'tri', decay: 6 },
    { f: E4, at: 0.16, len: 0.29, vol: 0.45, wave: 'tri', decay: 6 },
  ]),
  // round finished: rising arpeggio with a final chord
  win: render(1.1, [
    { f: C5, at: 0, len: 0.25, vol: 0.45 },
    { f: E5, at: 0.11, len: 0.25, vol: 0.45 },
    { f: G5, at: 0.22, len: 0.25, vol: 0.45 },
    { f: C6, at: 0.33, len: 0.75, vol: 0.5, decay: 3.5 },
    { f: E6, at: 0.33, len: 0.75, vol: 0.3, decay: 3.5 },
    { f: G5, at: 0.33, len: 0.75, vol: 0.3, decay: 3.5 },
  ]),
  // buying a hat: quick sparkle
  coin: render(0.4, [
    { f: B5, at: 0, len: 0.08, vol: 0.45, wave: 'sine', decay: 20 },
    { f: E6, at: 0.07, len: 0.33, vol: 0.5, wave: 'sine', decay: 9 },
  ]),
};

mkdirSync(new URL('../assets/sounds/', import.meta.url), { recursive: true });
for (const [name, samples] of Object.entries(SOUNDS)) {
  const file = new URL(`../assets/sounds/${name}.wav`, import.meta.url);
  writeFileSync(file, wav(samples));
  console.log(`assets/sounds/${name}.wav  ${(samples.length / RATE).toFixed(2)}s`);
}
