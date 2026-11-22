import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  win: require('../../assets/sounds/win.wav'),
  coin: require('../../assets/sounds/coin.wav'),
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

export function playSfx(name: Sfx) {
  if (!enabled) return;
  init();
  const p = players[name];
  if (!p) return;
  try {
    p.volume = name === 'tap' ? 0.5 : 0.9;
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // ignore
  }
}
