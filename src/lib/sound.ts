import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  correct2: require('../../assets/sounds/correct2.wav'),
  correct3: require('../../assets/sounds/correct3.wav'),
  streak1: require('../../assets/sounds/streak1.wav'),
  streak2: require('../../assets/sounds/streak2.wav'),
  streak3: require('../../assets/sounds/streak3.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  win: require('../../assets/sounds/win.wav'),
  levelup: require('../../assets/sounds/levelup.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  chest: require('../../assets/sounds/chest.wav'),
  start: require('../../assets/sounds/start.wav'),
  tick: require('../../assets/sounds/tick.wav'),
} as const;

export type Sfx = keyof typeof SOURCES;

let enabled = true;
let ready = false;
// Players live for the whole app session, so they are created once and never released.
const players: Partial<Record<Sfx, AudioPlayer>> = {};

function init() {
  if (ready) return;
  ready = true;
  // Respect the iPhone silent switch and don't stop music the child or parent is already playing.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const name of Object.keys(SOURCES) as Sfx[]) {
    try {
      players[name] = createAudioPlayer(SOURCES[name]);
    } catch {
      // Sound is a nice-to-have; never let it break the game.
    }
  }
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/** Several takes of the most frequent sound, so it doesn't get repetitive. */
const VARIANTS: Partial<Record<Sfx, Sfx[]>> = { correct: ['correct', 'correct2', 'correct3'] };

/** Sound for a correct answer that is part of a streak (3+ in a row). */
export function streakSfx(combo: number): Sfx {
  return combo >= 8 ? 'streak3' : combo >= 5 ? 'streak2' : 'streak1';
}

export function playSfx(sfx: Sfx) {
  if (!enabled) return;
  init();
  const pool = VARIANTS[sfx];
  const name = pool ? pool[Math.floor(Math.random() * pool.length)] : sfx;
  const p = players[name];
  if (!p) return;
  try {
    p.volume = name === 'tap' || name === 'tick' ? 0.5 : 0.9;
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // ignore
  }
}
