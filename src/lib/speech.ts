import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import type { Question } from './math';
import { VOICE_MAP } from './voice-map';

let enabled = true;
let player: AudioPlayer | null = null;
let failed = false;
// Every phrase gets an id; phrases with id <= cancelled stop at the next clip boundary.
let next = 0;
let cancelled = 0;
let current: Promise<unknown> = Promise.resolve();

/** All recorded phrases live in one audio sprite; we seek to each clip in turn. */
function getPlayer(): AudioPlayer | null {
  if (player || failed) return player;
  try {
    player = createAudioPlayer(require('../../assets/voice/voice.mp3'));
    player.volume = 1;
  } catch {
    failed = true;
  }
  return player;
}

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  if (on) getPlayer();
  else stop();
}

function stop() {
  cancelled = next;
  try {
    player?.pause();
    Speech.stop();
  } catch {
    // ignore
  }
}

const HUNDREDS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function numberClips(n: number): string[] | null {
  if (n < 100) return [`#${n}`];
  if (n === 1000) return ['#1000'];
  if (n > 1000) return null;
  const h = HUNDREDS[Math.floor(n / 100) - 1];
  return n % 100 ? [`#${h}`, `#${n % 100}`] : [`#${h}`];
}

/** Splits text into recorded clips (longest phrase first). Null if something isn't recorded. */
export function clipsFor(text: string): string[] | null {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    if (/^\d+$/.test(words[i])) {
      const n = numberClips(Number(words[i]));
      if (!n) return null;
      out.push(...n);
      i++;
      continue;
    }
    let found = 0;
    for (let j = Math.min(words.length, i + 8); j > i; j--) {
      if (VOICE_MAP[words.slice(i, j).join(' ')]) {
        found = j;
        break;
      }
    }
    if (!found) return null;
    out.push(words.slice(i, found).join(' '));
    i = found;
  }
  return out;
}

const tick = () => new Promise((r) => setTimeout(r, 15));

async function playClips(keys: string[], id: number) {
  const p = getPlayer();
  if (!p) return false;
  // On the web the sprite downloads on first use; give it a moment.
  for (let t = 0; !p.isLoaded && t < 200; t++) {
    await tick();
    if (id <= cancelled) return true;
  }
  if (!p.isLoaded) return false;
  for (const k of keys) {
    const [start, dur] = VOICE_MAP[k];
    if (id <= cancelled) return true;
    await p.seekTo(start);
    if (id <= cancelled) return true;
    p.play();
    const deadline = Date.now() + dur * 1000 + 700;
    while (id > cancelled && p.currentTime < start + dur - 0.02 && Date.now() < deadline) await tick();
    if (id <= cancelled) return true;
    p.pause();
  }
  return true;
}

function robot(text: string) {
  try {
    Speech.speak(text, { language: 'ru-RU', pitch: 1.2, rate: 0.95 });
  } catch {
    // Voice is a nice-to-have.
  }
}

/** Счётик says something out loud: recorded voice when every word is recorded, system voice otherwise. */
export function say(text: string, { wait = false }: { wait?: boolean } = {}) {
  if (!enabled) return;
  // wait: let the phrase that is playing finish first (e.g. "Правильно: 7" before the next question).
  if (!wait) stop();
  const id = ++next;
  const keys = clipsFor(text);
  if (!keys && __DEV__) console.warn('[voice] not recorded:', text);
  const run = async () => {
    if (id <= cancelled) return;
    const ok = keys ? await playClips(keys, id) : false;
    if (!ok && id > cancelled) robot(text);
  };
  current = (wait ? current.then(run) : run()).catch(() => {});
}

const OPS: Record<string, string> = { '+': 'плюс', '−': 'минус', '×': 'умножить на', '÷': 'разделить на' };

function readExpr(s: string): string {
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => OPS[w] ?? (w === '?' ? 'окошко' : w === '=' ? 'равно' : w))
    .join(' ');
}

/** How a question is read aloud. */
export function questionText(q: Question): string {
  switch (q.kind) {
    case 'count':
      return q.groups && q.groups.length > 1 ? 'Посчитай. Сколько всего?' : 'Посчитай. Сколько тут?';
    case 'compare': {
      const [l, r] = q.text.split('◯');
      return `Сравни: ${readExpr(l)}, и, ${readExpr(r)}`;
    }
    case 'missing':
      return `Какое число в окошке? ${readExpr(q.text)}`;
    default:
      return `Сколько будет ${readExpr(q.text.replace(' = ?', ''))}?`;
  }
}

export function sayQuestion(q: Question) {
  say(questionText(q), { wait: true });
}
