import * as Speech from 'expo-speech';

import type { Question } from './math';

let enabled = true;

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  if (!on) Speech.stop();
}

/** Счётик says something out loud (Russian voice, a bit higher and slower — friendlier for kids). */
export function say(text: string) {
  if (!enabled) return;
  try {
    Speech.stop();
    Speech.speak(text, { language: 'ru-RU', pitch: 1.2, rate: 0.95 });
  } catch {
    // Voice is a nice-to-have.
  }
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
  say(questionText(q));
}
