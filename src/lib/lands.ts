import type { Topic } from './math';

/** Each topic is its own land on the adventure map. */
export const LANDS: Record<Topic, { name: string; deco: string[] }> = {
  count: { name: 'Цветочная поляна', deco: ['🌻', '🐝', '🌷', '🦋', '🌼'] },
  add: { name: 'Весёлый лес', deco: ['🌳', '🦔', '🍄', '🌲', '🐿️'] },
  sub: { name: 'Морской берег', deco: ['🌊', '🐚', '⛵', '🦀', '🐠'] },
  mul: { name: 'Снежные горы', deco: ['🏔️', '⛄', '🌲', '🦅', '❄️'] },
  div: { name: 'Жаркая пустыня', deco: ['🌵', '🐪', '☀️', '🦎', '🏜️'] },
  missing: { name: 'Волшебная чаща', deco: ['🍄', '🧚', '🌙', '🦉', '✨'] },
  compare: { name: 'Сказочный замок', deco: ['🏰', '🐉', '🛡️', '🚩', '👑'] },
  mix: { name: 'Космос', deco: ['🪐', '🚀', '⭐', '🌙', '☄️'] },
};
