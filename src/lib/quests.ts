import type { DayStats } from './progress';

export type Quest = {
  id: string;
  /** Quests from one group never appear on the same day. */
  group: string;
  icon: string;
  title: string;
  target: number;
  reward: number;
  value: (d: DayStats) => number;
};

/** Extra coins for claiming all of today's quests. */
export const CHEST_BONUS = 25;
export const QUESTS_PER_DAY = 3;

const POOL: Quest[] = [
  { id: 'rounds2', group: 'rounds', icon: '🎯', title: 'Пройди 2 раунда', target: 2, reward: 10, value: (d) => d.rounds },
  { id: 'rounds4', group: 'rounds', icon: '🎯', title: 'Пройди 4 раунда', target: 4, reward: 20, value: (d) => d.rounds },
  { id: 'answered30', group: 'answered', icon: '✏️', title: 'Реши 30 примеров', target: 30, reward: 15, value: (d) => d.answered },
  { id: 'correct25', group: 'answered', icon: '✅', title: 'Дай 25 верных ответов', target: 25, reward: 15, value: (d) => d.correct },
  { id: 'perfect1', group: 'perfect', icon: '💯', title: 'Пройди раунд без ошибок', target: 1, reward: 20, value: (d) => d.perfect ?? 0 },
  { id: 'combo7', group: 'combo', icon: '🔥', title: 'Ответь верно 7 раз подряд', target: 7, reward: 15, value: (d) => d.combo ?? 0 },
  { id: 'blitz1', group: 'blitz', icon: '⚡', title: 'Сыграй в «Молнию»', target: 1, reward: 10, value: (d) => d.blitz ?? 0 },
  { id: 'blitz12', group: 'blitz', icon: '⚡', title: 'Набери 12 очков в «Молнии»', target: 12, reward: 20, value: (d) => d.blitzBest ?? 0 },
];

/** Small seeded PRNG so every device shows the same quests on the same day. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function questsFor(day: string): Quest[] {
  const rand = seeded(day);
  const pool = [...POOL];
  const out: Quest[] = [];
  while (out.length < QUESTS_PER_DAY && pool.length) {
    const q = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    if (!out.some((o) => o.group === q.group)) out.push(q);
  }
  return out;
}
