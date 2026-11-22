import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Shake } from '@/components/Anim';
import { BackBar } from '@/components/BackBar';
import { Mascot, type Mood } from '@/components/Mascot';
import { NumPad } from '@/components/NumPad';
import { Options, QuestionCard } from '@/components/QuestionView';
import { C, Pill, tap } from '@/components/ui';
import type { HatId } from '@/lib/hats';
import type { Question } from '@/lib/math';
import type { Answer } from '@/lib/progress';
import { streakSfx } from '@/lib/sound';
import { say, sayQuestion } from '@/lib/speech';

const PRAISE = ['Молодец!', 'Верно!', 'Супер!', 'Так держать!', 'Отлично!', 'Умница!'];
/** From this many correct answers in a row, each next one gives +1 coin. */
export const COMBO_FROM = 3;

const ASK: Record<string, string> = {
  count: 'Посчитай!',
  missing: 'Какое число в окошке?',
  compare: 'Что поставим: <, = или >?',
};
const SIGN_WORDS: Record<string, string> = { '<': 'меньше', '>': 'больше', '=': 'равно' };

export type QuizDone = { answers: Answer[]; seconds: number; bestCombo: number; comboBonus: number };

/** One run through a list of questions: options or a keypad, streaks, voice, feedback. */
export function Quiz({
  questions,
  title,
  color,
  hat,
  keypad,
  onDone,
}: {
  questions: Question[];
  title: string;
  color: string;
  hat: HatId;
  /** Type answers on a keypad instead of choosing (not for «Сравни» and «Посчитай»). */
  keypad: boolean;
  onDone: (r: QuizDone) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mood, setMood] = useState<Mood>('think');
  const [message, setMessage] = useState(ASK[questions[0].kind] ?? 'Сколько будет?');
  const [shake, setShake] = useState(0);
  const startedAt = useRef(Date.now());
  const answers = useRef<Answer[]>([]);
  const bestCombo = useRef(0);
  const comboBonus = useRef(0);
  const bounce = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[index];
  const total = questions.length;
  const useKeys = keypad && q.kind !== 'compare' && q.kind !== 'count';

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Read every new question aloud (if the voice is on).
  useEffect(() => {
    const t = setTimeout(() => sayQuestion(questions[index]), 250);
    return () => clearTimeout(t);
  }, [index, questions]);

  const choose = (value: string) => {
    if (picked !== null) return;
    setPicked(value);
    const right = value === q.answer;
    answers.current.push({ q, right });
    if (right) {
      const c = combo + 1;
      setCombo(c);
      bestCombo.current = Math.max(bestCombo.current, c);
      setCorrect((n) => n + 1);
      setMood('cheer');
      const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      if (c >= COMBO_FROM) {
        comboBonus.current += 1;
        setMessage(`🔥 ${c} подряд! +1 🪙`);
        say(`${c} подряд!`);
      } else {
        setMessage(praise);
        say(praise);
      }
      tap('success', c >= COMBO_FROM ? streakSfx(c) : 'correct');
      Animated.sequence([
        Animated.spring(bounce, { toValue: 1.18, useNativeDriver: true, speed: 40 }),
        Animated.spring(bounce, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    } else {
      setCombo(0);
      setMood('oops');
      setShake((n) => n + 1);
      setMessage(combo >= COMBO_FROM ? `Серия прервалась… Правильно: ${q.answer}` : `Почти! Правильно: ${q.answer}`);
      say(`Почти! Правильно: ${SIGN_WORDS[q.answer] ?? q.answer}`);
      tap('error');
    }

    timer.current = setTimeout(
      () => {
        if (index + 1 >= total) {
          onDone({
            answers: answers.current,
            seconds: (Date.now() - startedAt.current) / 1000,
            bestCombo: bestCombo.current,
            comboBonus: comboBonus.current,
          });
          return;
        }
        setIndex(index + 1);
        setPicked(null);
        setTyped('');
        setMood('think');
        setMessage(ASK[questions[index + 1].kind] ?? 'Сколько будет?');
      },
      right ? 1000 : 2000,
    );
  };

  // While typing, the number appears right in the question instead of «?».
  const shown = useKeys && picked === null ? { ...q, text: q.text.replace('?', typed || '?') } : q;
  const verdict = picked === null ? undefined : picked === q.answer ? 'good' : 'bad';

  return (
    <SafeAreaView style={s.root}>
      <BackBar
        title={title}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {combo >= 2 && <Pill>🔥 {combo}</Pill>}
            <Pill>✅ {correct}</Pill>
          </View>
        }
      />
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${(index / total) * 100}%`, backgroundColor: color }]} />
      </View>

      <View style={s.body}>
        <View style={s.mascotRow}>
          <Animated.View style={{ transform: [{ scale: bounce }] }}>
            <Mascot size={q.groups || useKeys ? 84 : 104} mood={mood} hat={hat} />
          </Animated.View>
          <View style={[s.bubble, combo >= COMBO_FROM && picked !== null && { borderColor: C.primary }]}>
            <Text style={s.bubbleText}>{message}</Text>
          </View>
        </View>

        <Shake trigger={shake}>
          <QuestionCard
            q={shown}
            revealed={picked !== null}
            counter={`${index + 1} из ${total}`}
            verdict={verdict}
            onRepeat={() => sayQuestion(q)}
          />
        </Shake>
        {useKeys ? (
          <NumPad value={typed} onChange={setTyped} onSubmit={() => choose(typed)} color={color} disabled={picked !== null} />
        ) : (
          <Options q={q} picked={picked} color={color} onPick={choose} />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: 20, paddingTop: 14, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  progressTrack: { height: 10, backgroundColor: C.line, marginHorizontal: 20, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bubble: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 12, borderWidth: 2, borderColor: C.line },
  bubbleText: { fontSize: 19, fontWeight: '800', color: C.ink },
});
