import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { MAX_LEVEL, starsFor, type Question, type Topic } from './math';
import { HATS, type HatId } from './hats';
import { useProfiles } from './profiles';
import { CHEST_BONUS, questsFor } from './quests';
import { DECOR, WALLPAPERS, type DecorId, type WallpaperId } from './room';
import { setSoundEnabled } from './sound';
import { setVoiceEnabled } from './speech';

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
  /** [answered, correct] per question kind — for the parent report. */
  kinds?: Record<string, [number, number]>;
};

/** A question the child got wrong; it comes back in «Работа над ошибками» when `due`. */
export type Mistake = { q: Question; due: string; box: number; misses: number };

export type Answer = { q: Question; right: boolean };

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
  voice: boolean;
  blitzBest: number;
  /** Quests claimed today (reset when the day changes). */
  quests: { day: string; claimed: string[] };
  mistakes: Mistake[];
  decor: DecorId[];
  wallpapers: WallpaperId[];
  wallpaper: WallpaperId;
  gamesBest: Record<string, number>;
  /** Daily goal and optional daily limit, in minutes (0 = no limit). */
  goalMin: number;
  limitMin: number;
  /** Day on which a parent allowed playing past the limit. */
  restOverride: string;
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
  voice: true,
  blitzBest: 0,
  quests: { day: '', claimed: [] },
  mistakes: [],
  decor: [],
  wallpapers: ['peach'],
  wallpaper: 'peach',
  gamesBest: {},
  goalMin: 10,
  limitMin: 0,
  restOverride: '',
};

const EMPTY_DAY: DayStats = { answered: 0, correct: 0, seconds: 0, rounds: 0 };
const MAX_MISTAKES = 60;

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

export type GameResult = { coinsEarned: number; best: number; newRecord: boolean; streak: number; streakGrew: boolean };

type Settings = Pick<Progress, 'voice' | 'goalMin' | 'limitMin'>;

type Ctx = {
  progress: Progress;
  finishRound: (
    topic: Topic,
    level: number,
    answers: Answer[],
    seconds: number,
    combo: { bonus: number; best: number },
  ) => RoundResult;
  finishBlitz: (answers: Answer[], seconds: number, bestCombo: number) => BlitzResult;
  finishReview: (answers: Answer[], seconds: number) => { coinsEarned: number; cleared: number };
  /** `record` is the game's score; `lowerIsBetter` for times. */
  finishGame: (
    id: string,
    r: { answered: number; correct: number; seconds: number; coins: number; record: number; lowerIsBetter?: boolean },
  ) => GameResult;
  /** Returns the coins received (quest reward + chest bonus) or null if it can't be claimed. */
  claimQuest: (id: string) => { reward: number; chest: number } | null;
  buyHat: (id: HatId) => boolean;
  wearHat: (id: HatId) => void;
  buyDecor: (id: DecorId) => boolean;
  buyWallpaper: (id: WallpaperId) => boolean;
  setWallpaper: (id: WallpaperId) => void;
  setSettings: (patch: Partial<Settings>) => void;
  /** A parent lets the child keep playing today despite the limit. */
  allowMoreToday: () => void;
  reset: () => void;
  toggleSound: () => void;
  totalStars: number;
  /** Streak that is still alive today (0 if the child missed a day). */
  liveStreak: number;
  today: DayStats;
  claimedToday: string[];
  dueMistakes: Mistake[];
  /** The daily limit is reached and no parent override for today. */
  overLimit: boolean;
};

const ProgressContext = createContext<Ctx | null>(null);

export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Streak after playing today. */
function nextStreak(p: Progress) {
  if (p.lastDay === dayKey()) return { streak: p.streak, streakGrew: false, bestStreak: p.bestStreak };
  const streak = p.lastDay === daysFromNow(-1) ? p.streak + 1 : 1;
  return { streak, streakGrew: true, bestStreak: Math.max(p.bestStreak, streak) };
}

/** Today's stats with these answers added. */
function addAnswers(day: DayStats, answers: Answer[], seconds: number): DayStats {
  const kinds = { ...day.kinds };
  for (const a of answers) {
    const [n, c] = kinds[a.q.kind] ?? [0, 0];
    kinds[a.q.kind] = [n + 1, c + (a.right ? 1 : 0)];
  }
  return {
    ...day,
    answered: day.answered + answers.length,
    correct: day.correct + answers.filter((a) => a.right).length,
    seconds: day.seconds + Math.round(seconds),
    kinds,
  };
}

/**
 * Spaced repetition, kept simple: a wrong answer comes back tomorrow;
 * answering it right twice (on different days) clears it.
 */
function updateMistakes(list: Mistake[], answers: Answer[]): { list: Mistake[]; cleared: number } {
  const map = new Map(list.map((m) => [m.q.key, m]));
  let cleared = 0;
  for (const a of answers) {
    const m = map.get(a.q.key);
    if (!a.right) {
      map.set(a.q.key, { q: a.q, due: daysFromNow(1), box: 0, misses: (m?.misses ?? 0) + 1 });
    } else if (m && m.due <= dayKey()) {
      if (m.box + 1 >= 2) {
        map.delete(a.q.key);
        cleared++;
      } else {
        map.set(a.q.key, { ...m, box: m.box + 1, due: daysFromNow(3) });
      }
    }
  }
  return { list: [...map.values()].slice(-MAX_MISTAKES), cleared };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { storageKey } = useProfiles();
  const [progress, setProgress] = useState<Progress>(INITIAL);
  const [loaded, setLoaded] = useState(false);
  // Synchronous mirror so actions can compute a result without waiting for a render.
  const ref = useRef(progress);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        // Another child may have been active before: always replace the whole state.
        let next = INITIAL;
        if (raw) {
          const saved = JSON.parse(raw) as Partial<Progress>;
          next = {
            ...INITIAL,
            ...saved,
            unlocked: { ...INITIAL.unlocked, ...saved.unlocked },
            quests: saved.quests ?? INITIAL.quests,
            bestStreak: Math.max(saved.bestStreak ?? 0, saved.streak ?? 0),
          };
        }
        ref.current = next;
        setProgress(next);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [storageKey]);

  const commit = useCallback(
    (next: Progress) => {
      ref.current = next;
      setProgress(next);
      AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
    },
    [storageKey],
  );

  const finishRound = useCallback<Ctx['finishRound']>(
    (topic, level, answers, seconds, combo) => {
      const p = ref.current;
      const correct = answers.filter((a) => a.right).length;
      const total = answers.length;
      const stars = starsFor(correct, total);
      const key = `${topic}-${level}`;
      const today = dayKey();
      const s = nextStreak(p);

      const unlockedNext = stars >= 2 && level === p.unlocked[topic] && level < MAX_LEVEL;
      const coinsEarned = correct + stars * 2 + combo.bonus + (s.streakGrew ? 5 : 0);
      const day = addAnswers(p.days[today] ?? EMPTY_DAY, answers, seconds);

      commit({
        ...p,
        ...s,
        coins: p.coins + coinsEarned,
        best: { ...p.best, [key]: Math.max(p.best[key] ?? 0, stars) },
        unlocked: unlockedNext ? { ...p.unlocked, [topic]: level + 1 } : p.unlocked,
        lastDay: today,
        mistakes: updateMistakes(p.mistakes, answers).list,
        days: {
          ...p.days,
          [today]: {
            ...day,
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
    (answers, seconds, bestCombo) => {
      const p = ref.current;
      const today = dayKey();
      const s = nextStreak(p);
      const score = answers.filter((a) => a.right).length;
      const newRecord = score > p.blitzBest;
      const coinsEarned = score + (newRecord ? 5 : 0) + (s.streakGrew ? 5 : 0);
      const day = addAnswers(p.days[today] ?? EMPTY_DAY, answers, seconds);

      commit({
        ...p,
        ...s,
        coins: p.coins + coinsEarned,
        blitzBest: Math.max(p.blitzBest, score),
        lastDay: today,
        mistakes: updateMistakes(p.mistakes, answers).list,
        days: {
          ...p.days,
          [today]: {
            ...day,
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

  const finishReview = useCallback<Ctx['finishReview']>(
    (answers, seconds) => {
      const p = ref.current;
      const today = dayKey();
      const s = nextStreak(p);
      const { list, cleared } = updateMistakes(p.mistakes, answers);
      const coinsEarned = answers.filter((a) => a.right).length * 2 + (s.streakGrew ? 5 : 0);
      const day = addAnswers(p.days[today] ?? EMPTY_DAY, answers, seconds);
      commit({
        ...p,
        ...s,
        coins: p.coins + coinsEarned,
        lastDay: today,
        mistakes: list,
        days: { ...p.days, [today]: { ...day, rounds: day.rounds + 1 } },
      });
      return { coinsEarned, cleared };
    },
    [commit],
  );

  const finishGame = useCallback<Ctx['finishGame']>(
    (id, r) => {
      const p = ref.current;
      const today = dayKey();
      const s = nextStreak(p);
      const prev = p.gamesBest[id];
      const newRecord = prev === undefined || (r.lowerIsBetter ? r.record < prev : r.record > prev);
      const best = newRecord ? r.record : prev;
      const coinsEarned = r.coins + (s.streakGrew ? 5 : 0);
      const day = p.days[today] ?? EMPTY_DAY;
      commit({
        ...p,
        ...s,
        coins: p.coins + coinsEarned,
        lastDay: today,
        gamesBest: { ...p.gamesBest, [id]: best },
        days: {
          ...p.days,
          [today]: {
            ...day,
            answered: day.answered + r.answered,
            correct: day.correct + r.correct,
            seconds: day.seconds + Math.round(r.seconds),
          },
        },
      });
      return { coinsEarned, best, newRecord, streak: s.streak, streakGrew: s.streakGrew };
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

  const buyDecor = useCallback(
    (id: DecorId) => {
      const p = ref.current;
      const item = DECOR.find((d) => d.id === id);
      if (!item || p.decor.includes(id) || p.coins < item.price) return false;
      commit({ ...p, coins: p.coins - item.price, decor: [...p.decor, id] });
      return true;
    },
    [commit],
  );

  const buyWallpaper = useCallback(
    (id: WallpaperId) => {
      const p = ref.current;
      const w = WALLPAPERS.find((x) => x.id === id);
      if (!w || p.wallpapers.includes(id) || p.coins < w.price) return false;
      commit({ ...p, coins: p.coins - w.price, wallpapers: [...p.wallpapers, id], wallpaper: id });
      return true;
    },
    [commit],
  );

  const setWallpaper = useCallback(
    (id: WallpaperId) => {
      const p = ref.current;
      if (p.wallpapers.includes(id)) commit({ ...p, wallpaper: id });
    },
    [commit],
  );

  const setSettings = useCallback((patch: Partial<Settings>) => commit({ ...ref.current, ...patch }), [commit]);
  const allowMoreToday = useCallback(() => commit({ ...ref.current, restOverride: dayKey() }), [commit]);

  // Reset keeps device-like preferences (sound, voice, limits): it's progress that goes.
  const reset = useCallback(() => {
    const p = ref.current;
    commit({ ...INITIAL, sound: p.sound, voice: p.voice, goalMin: p.goalMin, limitMin: p.limitMin });
  }, [commit]);

  const toggleSound = useCallback(() => {
    const p = ref.current;
    commit({ ...p, sound: !p.sound });
  }, [commit]);

  useEffect(() => setSoundEnabled(progress.sound), [progress.sound]);
  useEffect(() => setVoiceEnabled(progress.voice), [progress.voice]);

  const value = useMemo<Ctx>(() => {
    const todayKey = dayKey();
    const today = progress.days[todayKey] ?? EMPTY_DAY;
    const totalStars = Object.values(progress.best).reduce((s, n) => s + n, 0);
    const alive = progress.lastDay === todayKey || progress.lastDay === daysFromNow(-1);
    return {
      progress,
      finishRound,
      finishBlitz,
      finishReview,
      finishGame,
      claimQuest,
      buyHat,
      wearHat,
      buyDecor,
      buyWallpaper,
      setWallpaper,
      setSettings,
      allowMoreToday,
      reset,
      toggleSound,
      totalStars,
      liveStreak: alive ? progress.streak : 0,
      today,
      claimedToday: progress.quests.day === todayKey ? progress.quests.claimed : [],
      dueMistakes: progress.mistakes.filter((m) => m.due <= todayKey),
      overLimit:
        progress.limitMin > 0 && today.seconds >= progress.limitMin * 60 && progress.restOverride !== todayKey,
    };
  }, [
    progress,
    finishRound,
    finishBlitz,
    finishReview,
    finishGame,
    claimQuest,
    buyHat,
    wearHat,
    buyDecor,
    buyWallpaper,
    setWallpaper,
    setSettings,
    allowMoreToday,
    reset,
    toggleSound,
  ]);

  if (!loaded) return null;
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): Ctx {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
