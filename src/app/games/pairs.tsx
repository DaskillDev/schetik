import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PopIn } from '@/components/Anim';
import { BackBar } from '@/components/BackBar';
import { GameEnd } from '@/components/GameEnd';
import { RestGuard } from '@/components/RestGuard';
import { C, Pill, tap } from '@/components/ui';
import { makeQuestion, plural, type Question, type Topic } from '@/lib/math';
import { useProgress, type GameResult } from '@/lib/progress';

const PAIRS = 6;
const COLOR = '#5E35B1';

/** Six examples with six different answers. */
function makePairs(): Question[] {
  const topics: Topic[] = ['add', 'sub', 'mul', 'add', 'sub', 'mul'];
  const out: Question[] = [];
  const answers = new Set<string>();
  let guard = 0;
  while (out.length < PAIRS && guard++ < 300) {
    const q = makeQuestion(topics[out.length], 2);
    if (answers.has(q.answer)) continue;
    answers.add(q.answer);
    out.push(q);
  }
  return out;
}

export default function Pairs() {
  const { progress } = useProgress();
  const [run, setRun] = useState(0);
  const [end, setEnd] = useState<{ seconds: number; mistakes: number; res: GameResult } | null>(null);
  if (end) {
    return (
      <GameEnd
        title="Все пары найдены!"
        big={`${end.seconds} сек`}
        lines={[end.mistakes ? `${end.mistakes} ${plural(end.mistakes, ['ошибка', 'ошибки', 'ошибок'])}` : 'Без единой ошибки! 🌟']}
        coins={end.res.coinsEarned}
        newRecord={end.res.newRecord}
        color={COLOR}
        hat={progress.hat}
        onAgain={() => {
          setEnd(null);
          setRun((n) => n + 1);
        }}
      />
    );
  }
  return (
    <RestGuard>
      <Game key={run} onEnd={(seconds, mistakes, res) => setEnd({ seconds, mistakes, res })} />
    </RestGuard>
  );
}

function Game({ onEnd }: { onEnd: (seconds: number, mistakes: number, res: GameResult) => void }) {
  const { finishGame } = useProgress();
  const pairs = useMemo(makePairs, []);
  const answers = useMemo(() => [...pairs].sort(() => Math.random() - 0.5).map((q) => q.answer), [pairs]);
  const [selected, setSelected] = useState<string | null>(null); // key of the chosen example
  const [matched, setMatched] = useState<string[]>([]); // matched answers
  const [flash, setFlash] = useState<string | null>(null); // wrongly chosen answer
  const [hint, setHint] = useState('Выбери пример слева, потом ответ справа');
  const [elapsed, setElapsed] = useState(0);
  const mistakes = useRef(0);
  const started = useRef(Date.now());
  const finished = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  const pickAnswer = (ans: string) => {
    if (matched.includes(ans) || finished.current) return;
    const q = pairs.find((p) => p.key === selected);
    if (!q) {
      tap();
      setHint('Сначала выбери пример слева 👈');
      return;
    }
    if (q.answer === ans) {
      const next = [...matched, ans];
      setMatched(next);
      setSelected(null);
      setHint('Верно! Ищи следующую пару');
      tap('success');
      if (next.length === PAIRS) {
        finished.current = true;
        const seconds = Math.max(1, Math.round((Date.now() - started.current) / 1000));
        const res = finishGame('pairs', {
          answered: PAIRS + mistakes.current,
          correct: PAIRS,
          seconds,
          coins: Math.max(3, 12 - mistakes.current),
          record: seconds,
          lowerIsBetter: true,
        });
        setTimeout(() => onEnd(seconds, mistakes.current, res), 600);
      }
    } else {
      mistakes.current += 1;
      setFlash(ans);
      setHint('Не та пара, попробуй ещё');
      tap('error');
      setTimeout(() => setFlash(null), 450);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <BackBar
        title="Пары"
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pill>⏱ {elapsed}</Pill>
            <Pill>
              {matched.length}/{PAIRS}
            </Pill>
          </View>
        }
      />
      <View style={s.body}>
        <Text style={s.hint}>{hint}</Text>
        <View style={s.cols}>
          <View style={s.col}>
            {pairs.map((q) => {
              const done = matched.includes(q.answer);
              const on = selected === q.key;
              return (
                <Pressable
                  key={q.key}
                  disabled={done}
                  accessibilityRole="button"
                  accessibilityLabel={`Пример ${q.text.replace(' = ?', '')}`}
                  onPress={() => {
                    tap();
                    setSelected(q.key);
                  }}
                  style={({ pressed }) => [
                    s.card,
                    on && { borderColor: COLOR, backgroundColor: '#EDE7F6' },
                    done && s.done,
                    { transform: [{ scale: pressed ? 0.95 : on ? 1.04 : 1 }] },
                  ]}
                >
                  <Text style={[s.text, done && s.doneText]} adjustsFontSizeToFit numberOfLines={1}>
                    {q.text.replace(' = ?', '')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.col}>
            {answers.map((a) => {
              const done = matched.includes(a);
              return (
                <PopIn key={a}>
                  <Pressable
                    disabled={done}
                    accessibilityRole="button"
                    accessibilityLabel={`Ответ ${a}`}
                    onPress={() => pickAnswer(a)}
                    style={({ pressed }) => [
                      s.card,
                      s.answer,
                      flash === a && { borderColor: C.bad, backgroundColor: '#FFEBEE' },
                      done && s.done,
                      { transform: [{ scale: pressed ? 0.95 : 1 }] },
                    ]}
                  >
                    <Text style={[s.text, done && s.doneText]}>{a}</Text>
                  </Pressable>
                </PopIn>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: 16, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  hint: { fontSize: 17, fontWeight: '800', color: C.muted, textAlign: 'center' },
  cols: { flexDirection: 'row', gap: 14, flex: 1 },
  col: { flex: 1, gap: 10 },
  card: {
    height: 64,
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 3,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  answer: { borderColor: '#D1C4E9' },
  done: { backgroundColor: '#E8F5E9', borderColor: C.good, opacity: 0.6 },
  text: { fontSize: 26, fontWeight: '900', color: C.ink },
  doneText: { color: C.good },
});
