import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti, Hopping, PopIn } from '@/components/Anim';
import { BackBar } from '@/components/BackBar';
import { RestGuard } from '@/components/RestGuard';
import { Mascot, type Mood } from '@/components/Mascot';
import { Options, QuestionCard } from '@/components/QuestionView';
import { Btn, C, Pill, tap } from '@/components/ui';
import { makeQuestion, plural, type Question } from '@/lib/math';
import { useProgress, type Answer, type BlitzResult } from '@/lib/progress';
import { playSfx, streakSfx } from '@/lib/sound';

const DURATION = 60;
const COLOR = '#FFA000';
/** Every 5 correct answers the questions get one level harder. */
const levelFor = (score: number) => Math.min(5, 1 + Math.floor(score / 5));

export default function Blitz() {
  const { progress, finishBlitz } = useProgress();
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<BlitzResult | null>(null);

  const start = () => {
    playSfx('start');
    setRunId((n) => n + 1);
    setPhase('play');
  };

  if (phase === 'play') {
    return (
      <RestGuard>
      <Game
        key={runId}
        hat={progress.hat}
        onDone={(answers, bestCombo) => {
          const res = finishBlitz(answers, DURATION, bestCombo);
          if (res.newRecord) playSfx('levelup');
          else if (res.score > 0) playSfx('win');
          setResult(res);
          setPhase('done');
        }}
      />
      </RestGuard>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Молния" right={<Pill>🏆 {progress.blitzBest}</Pill>} />
      <View style={[s.body, { justifyContent: 'center' }]}>
        {phase === 'done' && result ? (
          <View style={s.center}>
            <Hopping height={8} duration={500}>
              <Mascot size={150} mood={result.score > 0 ? 'cheer' : 'happy'} hat={progress.hat} />
            </Hopping>
            <PopIn>
              <Text style={s.title}>{result.newRecord ? '🏆 Новый рекорд!' : 'Время вышло!'}</Text>
            </PopIn>
            <PopIn delay={250}>
              <Text style={s.score}>{result.score}</Text>
            </PopIn>
            <Text style={s.line}>
              {plural(result.score, ['верный ответ', 'верных ответа', 'верных ответов'])} за {DURATION} секунд
            </Text>
            <Text style={s.line}>Рекорд: {result.best}</Text>
            <Text style={s.line}>
              +{result.coinsEarned} {plural(result.coinsEarned, ['монетка', 'монетки', 'монеток'])} 🪙
            </Text>
            {result.streakGrew && (
              <Text style={s.line}>
                📅 {result.streak} {plural(result.streak, ['день', 'дня', 'дней'])} подряд!
              </Text>
            )}
          </View>
        ) : (
          <View style={s.center}>
            <Hopping>
              <Mascot size={160} mood="happy" hat={progress.hat} />
            </Hopping>
            <Text style={s.title}>⚡ Молния</Text>
            <Text style={s.rules}>
              За {DURATION} секунд реши как можно больше примеров. Каждые 5 верных ответов — задания сложнее!
            </Text>
            {progress.blitzBest > 0 && <Text style={s.line}>Твой рекорд: {progress.blitzBest}</Text>}
          </View>
        )}
        <View style={{ gap: 12, marginTop: 24 }}>
          <Btn big title={phase === 'done' ? 'Ещё раз' : 'Старт!'} color={COLOR} onPress={start} />
          {phase === 'done' && (
            <Btn title="На главную" color={C.card} textColor={C.ink} onPress={() => router.dismissTo('/')} />
          )}
        </View>
      </View>
      <Confetti burst={phase === 'done' && result?.newRecord ? runId : 0} />
    </SafeAreaView>
  );
}

function Game({
  hat,
  onDone,
}: {
  hat: ReturnType<typeof useProgress>['progress']['hat'];
  onDone: (answers: Answer[], bestCombo: number) => void;
}) {
  const [q, setQ] = useState<Question>(() => makeQuestion('mix', 1));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [mood, setMood] = useState<Mood>('think');
  const [left, setLeft] = useState(DURATION);
  const startedAt = useRef(Date.now());
  const stats = useRef({ score: 0, combo: 0, best: 0, answers: [] as Answer[] });
  const done = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, DURATION - (Date.now() - startedAt.current) / 1000);
      setLeft(remaining);
      if (remaining <= 0 && !done.current) {
        done.current = true;
        clearInterval(id);
        if (timer.current) clearTimeout(timer.current);
        const st = stats.current;
        onDoneRef.current(st.answers, st.best);
      }
    }, 200);
    return () => {
      clearInterval(id);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const choose = (value: string) => {
    if (picked !== null || done.current) return;
    setPicked(value);
    const st = stats.current;
    const right = value === q.answer;
    st.answers.push({ q, right });
    if (right) {
      st.score += 1;
      st.combo += 1;
      st.best = Math.max(st.best, st.combo);
      setScore(st.score);
      setMood('cheer');
      tap('success', st.combo >= 3 ? streakSfx(st.combo) : 'correct');
    } else {
      st.combo = 0;
      setMood('oops');
      tap('error');
    }
    timer.current = setTimeout(
      () => {
        if (done.current) return;
        setQ(makeQuestion('mix', levelFor(stats.current.score)));
        setPicked(null);
        setMood('think');
      },
      right ? 350 : 1000,
    );
  };

  const secs = Math.ceil(left);
  const hurry = secs <= 10;

  // Clock ticks during the last five seconds.
  useEffect(() => {
    if (secs > 0 && secs <= 5) playSfx('tick');
  }, [secs]);

  return (
    <SafeAreaView style={s.root}>
      <BackBar
        title={`⚡ 0:${String(secs).padStart(2, '0')}`}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pill>ур. {levelFor(score)}</Pill>
            <Pill>✅ {score}</Pill>
          </View>
        }
      />
      <View style={s.track}>
        <View style={[s.fill, { width: `${(left / DURATION) * 100}%`, backgroundColor: hurry ? C.bad : COLOR }]} />
      </View>
      <View style={s.body}>
        <View style={{ alignItems: 'center' }}>
          <Mascot size={90} mood={mood} hat={hat} />
        </View>
        <QuestionCard q={q} revealed={picked !== null} />
        <Options q={q} picked={picked} color={COLOR} onPick={choose} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: 20, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', gap: 10 },
  title: { fontSize: 32, fontWeight: '900', color: C.ink, textAlign: 'center' },
  score: { fontSize: 72, fontWeight: '900', color: COLOR },
  rules: { fontSize: 18, fontWeight: '700', color: C.muted, textAlign: 'center', lineHeight: 25 },
  line: { fontSize: 19, fontWeight: '800', color: C.ink, textAlign: 'center' },
  track: { height: 10, backgroundColor: C.line, marginHorizontal: 20, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
