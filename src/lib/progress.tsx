import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { MAX_LEVEL, starsFor, type Topic } from './math';
import { HATS, type HatId } from './hats';
import { CHEST_BONUS, questsFor } from './quests';
import { setSoundEnabled } from './sound';

const STORAGE_KEY = 'schetik/progress/v1';

export type DayStats = {
  answered: number;
  correct: number;
  seconds: number;
  rounds: number;
  /** Rounds finished with 3 stars. */
  perfect?: number;
  /** Longest run of correct answers that day. */
  combo?: number;
  /** «Молния» games played and best score that day. */
  blitz?: number;
  blitzBest?: number;
};

export type Progress = {
  coins: number;
  /** Highest unlocked level per topic. */
  unlocked: Record<Topic, number>;
  /** Best stars per `${topic}-${level}`. */
  best: Record<string, number>;
  hats: HatId[];
  hat: HatId;
  streak: number;
  bestStreak: number;
  lastDay: string | null;
  days: Record<string, DayStats>;
  sound: boolean;
  blitzBest: number;
  /** Quests claimed today (reset when the day changes). */
  quests: { day: string; claimed: string[] };
};

const INITIAL: Progress = {
  coins: 0,
  unlocked: { count: 1, add: 1, sub: 1, mul: 1, div: 1, missing: 1, compare: 1, mix: 1 },
  best: {},
  hats: ['none'],
  hat: 'none',
  streak: 0,
  bestStreak: 0,
  lastDay: null,
  days: {},
  sound: true,
  blitzBest: 0,
  quests: { day: '', claimed: [] },
};

const EMPTY_DAY: DayStats = { answered: 0, correct: 0, seconds: 0, rounds: 0 };

export type RoundResult = {
  stars: number;
  coinsEarned: number;
  comboBonus: number;
  unlockedNext: boolean;
  streak: number;
  streakGrew: boolean;
};

export type BlitzResult = {
  score: number;
  coinsEarned: number;
  best: number;
  newRecord: boolean;
  streak: number;
  streakGrew: boolean;
};

type Ctx = {
  progress: Progress;
  finishRound: (
    topic: Topic,
    level: number,
    correct: number,
    total: number,
    seconds: number,
    combo: { bonus: number; best: number },
  ) => RoundResult;
  finishBlitz: (score: number, answered: number, seconds: number, bestCombo: number) => BlitzResult;
  /** Returns the coins received (quest reward + chest bonus) or null if it can't be claimed. */
  claimQuest: (id: string) => { reward: number; chest: number } | null;
  buyHat: (id: HatId) => boolean;
  wearHat: (id: HatId) => void;
  reset: () => void;
  toggleSound: () => void;
  totalStars: number;
  /** Streak that is still alive today (0 if the child missed a day). */
  liveStreak: number;
  today: DayStats;
  claimedToday: string[];
};

const ProgressContext = createContext<Ctx | null>(null);

export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Streak after playing today. */
function nextStreak(p: Progress) {
  if (p.lastDay === dayKey()) return { streak: p.streak, streakGrew: false, bestStreak: p.bestStreak };
  const streak = p.lastDay === yesterdayKey() ? p.streak + 1 : 1;
  return { streak, streakGrew: true, bestStreak: Math.max(p.bestStreak, streak) };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(INITIAL);
  const [loaded, setLoaded] = useState(false);
  // Synchronous mirror so actions can compute a result without waiting for a render.
  const ref = useRef(progress);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as Partial<Progress>;
          const merged: Progress = {
            ...INITIAL,
            ...saved,
            unlocked: { ...INITIAL.unlocked, ...saved.unlocked },
            quests: saved.quests ?? INITIAL.quests,
            bestStreak: Math.max(saved.bestStreak ?? 0, saved.streak ?? 0),
          };
          ref.current = merged;
          setProgress(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const commit = useCallback((next: Progress) => {
    ref.current = next;
    setProgress(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const finishRound = useCallback<Ctx['finishRound']>(
    (topic, level, correct, total, seconds, combo) => {
      const p = ref.current;
      const stars = starsFor(correct, total);
      const key = `${topic}-${level}`;
      const today = dayKey();
      const s = nextStreak(p);

      const unlockedNext = stars >= 2 && level === p.unlocked[topic] && level < MAX_LEVEL;
      const coinsEarned = correct + stars * 2 + combo.bonus + (s.streakGrew ? 5 : 0);
      const day = p.days[today] ?? EMPTY_DAY;

      commit({
        ...p,
        ...s,
        coins: p.coins + coinsEarned,
        best: { ...p.best, [key]: Math.max(p.best[key] ?? 0, stars) },
        unlocked: unlockedNext ? { ...p.unlocked, [topic]: level + 1 } : p.unlocked,
        lastDay: today,
        days: {
          ...p.days,
          [today]: {
            ...day,
            answered: day.answered + total,
            correct: day.correct + correct,
            seconds: day.seconds + Math.round(seconds),
            rounds: day.rounds + 1,
            perfect: (day.perfect ?? 0) + (stars === 3 ? 1 : 0),
            combo: Math.max(day.combo ?? 0, combo.best),
          },
        },
      });

      return { stars, coinsEarned, comboBonus: combo.bonus, unlockedNext, streak: s.streak, streakGrew: s.streakGrew };
    },
    [commit],
  );

  const finishBlitz = useCallback<Ctx['finishBlitz']>(
    (score, answered, seconds, bestCombo) => {
      const p = ref.current;
      const today = dayKey();
      const s = nextStreak(p);
      const newRecord = score > p.blitzBest;
      const coinsEarned = score + (newRecord ? 5 : 0) + (s.streakGrew ? 5 : 0);
      const day = p.days[today] ?? EMPTY_DAY;

      commit({
        ...p,
        ...s,
        coins: p.coins + coinsEarned,
        blitzBest: Math.max(p.blitzBest, score),
        lastDay: today,
        days: {
          ...p.days,
          [today]: {
            ...day,
            answered: day.answered + answered,
            correct: day.correct + score,
            seconds: day.seconds + Math.round(seconds),
            combo: Math.max(day.combo ?? 0, bestCombo),
            blitz: (day.blitz ?? 0) + 1,
            blitzBest: Math.max(day.blitzBest ?? 0, score),
          },
        },
      });

      return { score, coinsEarned, best: Math.max(p.blitzBest, score), newRecord, streak: s.streak, streakGrew: s.streakGrew };
    },
    [commit],
  );

  const claimQuest = useCallback<Ctx['claimQuest']>(
    (id) => {
      const p = ref.current;
      const today = dayKey();
      const quests = questsFor(today);
      const q = quests.find((x) => x.id === id);
      const claimed = p.quests.day === today ? p.quests.claimed : [];
      if (!q || claimed.includes(id) || q.value(p.days[today] ?? EMPTY_DAY) < q.target) return null;
      const nextClaimed = [...claimed, id];
      const chest = nextClaimed.length === quests.length ? CHEST_BONUS : 0;
      commit({ ...p, coins: p.coins + q.reward + chest, quests: { day: today, claimed: nextClaimed } });
      return { reward: q.reward, chest };
    },
    [commit],
  );

  const buyHat = useCallback(
    (id: HatId) => {
      const p = ref.current;
      const hat = HATS.find((h) => h.id === id);
      if (!hat || p.hats.includes(id) || p.coins < hat.price) return false;
      commit({ ...p, coins: p.coins - hat.price, hats: [...p.hats, id], hat: id });
      return true;
    },
    [commit],
  );

  const wearHat = useCallback(
    (id: HatId) => {
      const p = ref.current;
      if (p.hats.includes(id)) commit({ ...p, hat: id });
    },
    [commit],
  );

  // Reset keeps the sound setting: it's a device preference, not progress.
  const reset = useCallback(() => commit({ ...INITIAL, sound: ref.current.sound }), [commit]);

  const toggleSound = useCallback(() => {
    const p = ref.current;
    commit({ ...p, sound: !p.sound });
  }, [commit]);

  useEffect(() => setSoundEnabled(progress.sound), [progress.sound]);

  const value = useMemo<Ctx>(() => {
    const todayKey = dayKey();
    const totalStars = Object.values(progress.best).reduce((s, n) => s + n, 0);
    const alive = progress.lastDay === todayKey || progress.lastDay === yesterdayKey();
    return {
      progress,
      finishRound,
      finishBlitz,
      claimQuest,
      buyHat,
      wearHat,
      reset,
      toggleSound,
      totalStars,
      liveStreak: alive ? progress.streak : 0,
      today: progress.days[todayKey] ?? EMPTY_DAY,
      claimedToday: progress.quests.day === todayKey ? progress.quests.claimed : [],
    };
  }, [progress, finishRound, finishBlitz, claimQuest, buyHat, wearHat, reset, toggleSound]);

  if (!loaded) return null;
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): Ctx {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
