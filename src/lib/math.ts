export type Topic = 'count' | 'add' | 'sub' | 'mul' | 'div' | 'missing' | 'compare' | 'mix';
export type Op = '+' | '−' | '×' | '÷';

export const MAX_LEVEL = 5;
export const QUESTIONS_PER_ROUND = 10;

export const TOPICS: { id: Topic; title: string; sign: string; color: string; hint: string }[] = [
  { id: 'count', title: 'Посчитай', sign: '🍎', color: '#0097A7', hint: 'Для самых маленьких' },
  { id: 'add', title: 'Сложение', sign: '+', color: '#4CAF50', hint: 'Складываем числа' },
  { id: 'sub', title: 'Вычитание', sign: '−', color: '#2196F3', hint: 'Отнимаем числа' },
  { id: 'mul', title: 'Умножение', sign: '×', color: '#9C27B0', hint: 'Таблица умножения' },
  { id: 'div', title: 'Деление', sign: '÷', color: '#FF5722', hint: 'Делим без остатка' },
  { id: 'missing', title: 'Окошко', sign: '?', color: '#6D4C41', hint: 'Какое число спряталось?' },
  { id: 'compare', title: 'Сравни', sign: '>', color: '#3F51B5', hint: 'Больше, меньше или равно' },
  { id: 'mix', title: 'Всё вместе', sign: '★', color: '#E91E63', hint: 'Все задания сразу' },
];

export const LEVEL_NAMES: Record<Topic, string[]> = {
  count: ['до 5', 'до 10', 'до 15', 'до 20', 'две группы'],
  add: ['до 10', 'до 20', 'до 50', 'до 100', 'до 1000'],
  sub: ['до 10', 'до 20', 'до 50', 'до 100', 'до 1000'],
  mul: ['на 1–5', 'на 2–5', 'до 10 × 10', 'до 12 × 12', 'двузначные'],
  div: ['на 1–5', 'на 2–5', 'до 100 ÷ 10', 'до 144 ÷ 12', 'двузначные'],
  missing: ['+ до 10', '+ и − до 20', '+ и − до 50', 'с умножением', 'все действия'],
  compare: ['числа до 20', 'пример и число', 'до 100', 'два примера', 'с умножением'],
  mix: ['лёгкий', 'простой', 'средний', 'сложный', 'мастер'],
};

export type Question = {
  /** Used to avoid repeats inside one round. */
  key: string;
  /** Shown while the child thinks, e.g. "7 + ? = 12". */
  text: string;
  /** Shown after answering, e.g. "7 + 5 = 12". */
  reveal: string;
  answer: string;
  options: string[];
  /** Objects to count (the «Посчитай» topic). */
  groups?: { emoji: string; n: number }[];
};

export function topicById(id: string) {
  return TOPICS.find((t) => t.id === id);
}

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[rnd(0, arr.length - 1)];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clampLevel = (level: number) => Math.min(Math.max(level, 1), MAX_LEVEL);

const ADD_MAX = [10, 20, 50, 100, 1000];

/** Factor ranges for multiplication / division by level: [aMin, aMax, bMin, bMax]. */
const MUL_RANGES: [number, number, number, number][] = [
  [1, 5, 1, 5],
  [1, 10, 2, 5],
  [1, 10, 1, 10],
  [2, 12, 2, 12],
  [11, 20, 2, 9],
];

function makeOptions(answer: number, op: Op, b: number, level: number, min = 0): string[] {
  const near = level <= 2 ? [1, -1, 2, -2, 3, -3] : [1, -1, 2, -2, 10, -10, 3, -3];
  if (op === '×' && b > 0) near.push(b, -b);
  const set = new Set<number>([answer]);
  for (const d of shuffle(near)) {
    if (set.size >= 4) break;
    const v = answer + d;
    if (v >= min) set.add(v);
  }
  while (set.size < 4) set.add(answer + rnd(4, level <= 2 ? 6 : 15));
  return shuffle([...set]).map(String);
}

type Expr = { a: number; b: number; op: Op; answer: number };
const fmt = (e: Expr) => `${e.a} ${e.op} ${e.b}`;

function makeExpr(op: Op, level: number): Expr {
  const l = clampLevel(level) - 1;
  let a = 0;
  let b = 0;
  let answer = 0;
  switch (op) {
    case '+': {
      const max = ADD_MAX[l];
      a = rnd(l === 0 ? 0 : 1, max - 1);
      b = rnd(l === 0 ? 0 : 1, max - a);
      answer = a + b;
      break;
    }
    case '−': {
      const max = ADD_MAX[l];
      a = rnd(l === 0 ? 1 : 5, max);
      b = rnd(0, a);
      answer = a - b;
      break;
    }
    case '×': {
      const [aMin, aMax, bMin, bMax] = MUL_RANGES[l];
      a = rnd(aMin, aMax);
      b = rnd(bMin, bMax);
      if (Math.random() < 0.5 && l < 4) [a, b] = [b, a];
      answer = a * b;
      break;
    }
    case '÷': {
      const [aMin, aMax, bMin, bMax] = MUL_RANGES[l];
      const quotient = rnd(aMin, aMax);
      b = Math.max(1, rnd(bMin, bMax));
      a = quotient * b;
      answer = quotient;
      break;
    }
  }
  return { a, b, op, answer };
}

function exprQuestion(op: Op, level: number): Question {
  const e = makeExpr(op, level);
  const text = `${fmt(e)} = ?`;
  return { key: text, text, reveal: `${fmt(e)} = ${e.answer}`, answer: String(e.answer), options: makeOptions(e.answer, op, e.b, level) };
}

// «Окошко»: one of the numbers is hidden.
const MISSING_OPS: Op[][] = [['+'], ['+', '−'], ['+', '−'], ['+', '−', '×'], ['+', '−', '×', '÷']];
const MISSING_BASE = [1, 2, 3, 3, 3];

function missingQuestion(level: number): Question {
  const l = clampLevel(level) - 1;
  const e = makeExpr(pick(MISSING_OPS[l]), MISSING_BASE[l]);
  const hideA = Math.random() < 0.5;
  const hidden = hideA ? e.a : e.b;
  const text = `${hideA ? '?' : e.a} ${e.op} ${hideA ? e.b : '?'} = ${e.answer}`;
  return { key: text, text, reveal: `${fmt(e)} = ${e.answer}`, answer: String(hidden), options: makeOptions(hidden, e.op, 0, level) };
}

// «Сравни»: <, = or >.
/** A number close to v: equal in ~25% of cases so «=» shows up too. */
function near(v: number, spread: number): number {
  if (Math.random() < 0.25) return v;
  const d = rnd(1, spread) * (Math.random() < 0.5 ? -1 : 1);
  return Math.max(0, v + d);
}

/** Another expression with the same answer, written differently. */
function sameValueExpr(v: number): Expr {
  if (Math.random() < 0.5 || v === 0) {
    const a = rnd(0, v);
    return { a, b: v - a, op: '+', answer: v };
  }
  const b = rnd(1, 20);
  return { a: v + b, b, op: '−', answer: v };
}

function compareQuestion(level: number): Question {
  const l = clampLevel(level) - 1;
  let left: string;
  let right: string;
  let lv: number;
  let rv: number;
  if (l === 0) {
    lv = rnd(0, 20);
    rv = Math.random() < 0.2 ? lv : rnd(0, 20);
    left = String(lv);
    right = String(rv);
  } else if (l === 1 || l === 2) {
    const e = makeExpr(pick<Op>(['+', '−']), l === 1 ? 2 : 4);
    lv = e.answer;
    rv = near(lv, l === 1 ? 3 : 10);
    left = fmt(e);
    right = String(rv);
  } else if (l === 3) {
    const e1 = makeExpr(pick<Op>(['+', '−']), 3);
    const e2 = Math.random() < 0.3 ? sameValueExpr(e1.answer) : makeExpr(pick<Op>(['+', '−']), 3);
    lv = e1.answer;
    rv = e2.answer;
    left = fmt(e1);
    right = fmt(e2);
  } else {
    const e1 = makeExpr('×', 3);
    lv = e1.answer;
    left = fmt(e1);
    if (Math.random() < 0.5) {
      rv = near(lv, 6);
      right = String(rv);
    } else {
      // Swapped factors give an «=» — a nice hint at commutativity.
      const e2 = Math.random() < 0.3 ? { ...e1, a: e1.b, b: e1.a } : makeExpr('×', 3);
      rv = e2.answer;
      right = fmt(e2);
    }
  }
  const sign = lv < rv ? '<' : lv > rv ? '>' : '=';
  const text = `${left} ◯ ${right}`;
  return { key: text, text, reveal: `${left} ${sign} ${right}`, answer: sign, options: ['<', '=', '>'] };
}

// «Посчитай»: count the pictures.
const EMOJI = ['🍎', '🍐', '🍓', '⭐', '🐟', '🌸', '🎈', '🐞', '🍪', '🚗', '🐥', '⚽'];
const COUNT_RANGES: [number, number][] = [
  [1, 5],
  [1, 10],
  [5, 15],
  [10, 20],
];

function countQuestion(level: number): Question {
  const l = clampLevel(level) - 1;
  const [e1, e2] = shuffle(EMOJI);
  if (l < 4) {
    const n = rnd(...COUNT_RANGES[l]);
    return {
      key: `${e1}${n}`,
      text: 'Сколько?',
      reveal: `${n}`,
      answer: String(n),
      options: makeOptions(n, '+', 0, 1, 1),
      groups: [{ emoji: e1, n }],
    };
  }
  const a = rnd(2, 9);
  const b = rnd(2, 9);
  return {
    key: `${e1}${a}${e2}${b}`,
    text: 'Сколько всего?',
    reveal: `${a} + ${b} = ${a + b}`,
    answer: String(a + b),
    options: makeOptions(a + b, '+', 0, 2, 1),
    groups: [
      { emoji: e1, n: a },
      { emoji: e2, n: b },
    ],
  };
}

const OPS_BY_TOPIC: Partial<Record<Topic, Op>> = { add: '+', sub: '−', mul: '×', div: '÷' };

export function makeQuestion(topic: Topic, level: number): Question {
  const op = OPS_BY_TOPIC[topic];
  if (op) return exprQuestion(op, level);
  switch (topic) {
    case 'count':
      return countQuestion(level);
    case 'missing':
      return missingQuestion(level);
    case 'compare':
      return compareQuestion(level);
    default: {
      // «Всё вместе»: from level 3 also «Окошко» and «Сравни».
      if (level >= 3 && Math.random() < 0.3) {
        return Math.random() < 0.5 ? missingQuestion(level - 1) : compareQuestion(level - 1);
      }
      return exprQuestion(pick<Op>(['+', '−', '×', '÷']), level);
    }
  }
}

export function makeRound(topic: Topic, level: number, count = QUESTIONS_PER_ROUND): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  let guard = 0;
  while (out.length < count && guard < 500) {
    guard++;
    const q = makeQuestion(topic, level);
    if (seen.has(q.key) && guard < 400) continue;
    seen.add(q.key);
    out.push(q);
  }
  return out;
}

/** 3 stars for a perfect round, 2 for 8+, 1 for 6+. */
export function starsFor(correct: number, total: number): number {
  if (correct >= total) return 3;
  if (correct >= total * 0.8) return 2;
  if (correct >= total * 0.6) return 1;
  return 0;
}

/** Font size so a line of `text` fits the question card (web has no adjustsFontSizeToFit). */
export function fitFont(text: string, max = 52, width = 300): number {
  return Math.min(max, Math.floor(width / (text.length * 0.6)));
}

/** Russian plural: plural(5, ['звезда', 'звезды', 'звёзд']) → 'звёзд'. */
export function plural(n: number, forms: [string, string, string]): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}
