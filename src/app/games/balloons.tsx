import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackBar } from '@/components/BackBar';
import { GameEnd } from '@/components/GameEnd';
import { Mascot, type Mood } from '@/components/Mascot';
import { QuestionCard } from '@/components/QuestionView';
import { RestGuard } from '@/components/RestGuard';
import { C, Pill, tap } from '@/components/ui';
import { makeQuestion, type Question, type Topic } from '@/lib/math';
import { useProgress, type GameResult } from '@/lib/progress';
import { sayQuestion } from '@/lib/speech';

const TASKS = 10;
const COLOR = '#E53935';
const BALLOON_COLORS = ['#EF5350', '#42A5F5', '#66BB6A', '#FFCA28', '#AB47BC', '#FF7043'];

function makeTasks(): Question[] {
  const topics: Topic[] = ['add', 'sub', 'mul', 'div'];
  return Array.from({ length: TASKS }, (_, i) => makeQuestion(topics[i % 4], i < 5 ? 1 : 2));
}

export default function Balloons() {
  const { progress } = useProgress();
  const [run, setRun] = useState(0);
  const [end, setEnd] = useState<{ score: number; res: GameResult } | null>(null);
  if (end) {
    return (
      <GameEnd
        title="Все шарики лопнули!"
        big={`${end.score} из ${TASKS}`}
        lines={['с первой попытки']}
        coins={end.res.coinsEarned}
        newRecord={end.res.newRecord && end.score > 0}
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
      <Game key={run} onEnd={(score, res) => setEnd({ score, res })} />
    </RestGuard>
  );
}

function Game({ onEnd }: { onEnd: (score: number, res: GameResult) => void }) {
  const { progress, finishGame } = useProgress();
  const tasks = useMemo(makeTasks, []);
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [popped, setPopped] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>('think');
  const score = useRef(0);
  const firstTry = useRef(true);
  const started = useRef(Date.now());
  const q = tasks[index];

  useEffect(() => {
    const t = setTimeout(() => sayQuestion(tasks[index]), 250);
    return () => clearTimeout(t);
  }, [index, tasks]);

  const pick = (opt: string) => {
    if (popped || wrong.includes(opt)) return;
    if (opt === q.answer) {
      if (firstTry.current) score.current += 1;
      setPopped(opt);
      setMood('cheer');
      tap('success');
      setTimeout(() => {
        if (index + 1 >= TASKS) {
          const res = finishGame('balloons', {
            answered: TASKS,
            correct: score.current,
            seconds: (Date.now() - started.current) / 1000,
            coins: score.current + 3,
            record: score.current,
          });
          onEnd(score.current, res);
          return;
        }
        setIndex(index + 1);
        setWrong([]);
        setPopped(null);
        setMood('think');
        firstTry.current = true;
      }, 750);
    } else {
      firstTry.current = false;
      setWrong((w) => [...w, opt]);
      setMood('oops');
      tap('error');
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Шарики" right={<Pill>🎈 {index + 1}/{TASKS}</Pill>} />
      <View style={s.body}>
        <View style={s.top}>
          <Mascot size={80} mood={mood} hat={progress.hat} />
          <View style={{ flex: 1 }}>
            <QuestionCard q={q} revealed={popped !== null} onRepeat={() => sayQuestion(q)} />
          </View>
        </View>
        <Text style={s.hint}>Лопни шарик с правильным ответом!</Text>
        <View style={s.sky}>
          {q.options.map((opt, i) => (
            <Balloon
              key={`${index}-${opt}`}
              label={opt}
              color={BALLOON_COLORS[(index + i) % BALLOON_COLORS.length]}
              faded={wrong.includes(opt)}
              popped={popped === opt}
              delay={i * 250}
              onPress={() => pick(opt)}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Balloon({
  label,
  color,
  faded,
  popped,
  delay,
  onPress,
}: {
  label: string;
  color: string;
  faded: boolean;
  popped: boolean;
  delay: number;
  onPress: () => void;
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Float in from below, then bob gently.
    Animated.timing(rise, { toValue: 0, duration: 600, delay, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1100 + delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1100 + delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, rise, delay]);

  useEffect(() => {
    if (popped) Animated.timing(pop, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [popped, pop]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Шарик ${label}`} onPress={onPress} style={s.slot}>
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: Animated.multiply(
            pop.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            faded ? 0.3 : 1,
          ),
          transform: [
            { translateY: Animated.add(bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }), rise.interpolate({ inputRange: [0, 1], outputRange: [0, 300] })) },
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) },
          ],
        }}
      >
        <View style={[s.balloon, { backgroundColor: color }]}>
          <View style={s.shine} />
          <Text style={s.label} adjustsFontSizeToFit numberOfLines={1}>
            {label}
          </Text>
        </View>
        <View style={[s.knot, { borderBottomColor: color }]} />
        <View style={s.string} />
      </Animated.View>
      {popped && <Text style={s.boom}>💥</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E3F2FD' },
  body: { flex: 1, padding: 16, gap: 10, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { fontSize: 16, fontWeight: '800', color: C.muted, textAlign: 'center' },
  sky: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', alignContent: 'space-around' },
  slot: { width: '45%', alignItems: 'center', paddingVertical: 6 },
  balloon: {
    width: 104,
    height: 124,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  shine: { position: 'absolute', top: 16, left: 20, width: 18, height: 30, borderRadius: 10, backgroundColor: '#FFFFFF66' },
  label: { fontSize: 36, fontWeight: '900', color: '#fff' },
  knot: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '180deg' }],
    marginTop: -2,
  },
  string: { width: 2, height: 34, backgroundColor: '#90A4AE' },
  boom: { position: 'absolute', top: 30, fontSize: 60 },
});
