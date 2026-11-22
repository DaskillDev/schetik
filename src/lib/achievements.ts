import { MAX_LEVEL, TOPICS } from './math';
import type { Progress } from './progress';

export type Achievement = { id: string; icon: string; title: string; desc: string; value: number; target: number };

export function achievements(p: Progress): Achievement[] {
  const days = Object.values(p.days);
  const rounds = days.reduce((s, d) => s + d.rounds, 0);
  const correct = days.reduce((s, d) => s + d.correct, 0);
  const perfect = days.reduce((s, d) => s + (d.perfect ?? 0), 0);
  const combo = days.reduce((m, d) => Math.max(m, d.combo ?? 0), 0);
  const maxed = TOPICS.filter((t) => p.unlocked[t.id] >= MAX_LEVEL).length;
  const hats = p.hats.length - 1; // «Без шапки» is free

  return [
    { id: 'first', icon: '👣', title: 'Первый шаг', desc: 'Пройди первый раунд', value: rounds, target: 1 },
    { id: 'rounds25', icon: '🎯', title: 'Упорный', desc: 'Пройди 25 раундов', value: rounds, target: 25 },
    { id: 'correct100', icon: '💪', title: 'Сотня', desc: '100 верных ответов', value: correct, target: 100 },
    { id: 'correct1000', icon: '🏔️', title: 'Тысяча', desc: '1000 верных ответов', value: correct, target: 1000 },
    { id: 'perfect10', icon: '💯', title: 'Без ошибок', desc: '10 раундов на 3 звезды', value: perfect, target: 10 },
    { id: 'combo10', icon: '🔥', title: 'Огонь!', desc: '10 верных ответов подряд', value: combo, target: 10 },
    { id: 'streak3', icon: '📅', title: 'Три дня', desc: 'Занимайся 3 дня подряд', value: p.bestStreak, target: 3 },
    { id: 'streak7', icon: '🗓️', title: 'Неделя', desc: 'Занимайся 7 дней подряд', value: p.bestStreak, target: 7 },
    { id: 'blitz20', icon: '⚡', title: 'Молния', desc: 'Набери 20 очков в «Молнии»', value: p.blitzBest, target: 20 },
    { id: 'master', icon: '🎓', title: 'Мастер', desc: 'Открой 5-й уровень в любой теме', value: maxed, target: 1 },
    { id: 'all', icon: '🏆', title: 'Отличник', desc: 'Открой 5-й уровень во всех темах', value: maxed, target: TOPICS.length },
    { id: 'fashion', icon: '🎩', title: 'Модник', desc: 'Собери 5 шапок', value: hats, target: 5 },
    { id: 'home', icon: '🏠', title: 'Уютный дом', desc: 'Купи 6 вещей в комнату', value: p.decor.length, target: 6 },
    { id: 'games', icon: '🎈', title: 'Игрок', desc: 'Сыграй во все мини-игры', value: Object.keys(p.gamesBest).length, target: 3 },
  ];
}
