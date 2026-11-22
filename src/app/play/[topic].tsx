import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackBar } from '@/components/BackBar';
import { Mascot, type Mood } from '@/components/Mascot';
import { Options, QuestionCard } from '@/components/QuestionView';
import { Btn, C, Pill, Stars, tap } from '@/components/ui';
import { playSfx } from '@/lib/sound';
import { MAX_LEVEL, makeRound, plural, topicById, type Topic } from '@/lib/math';
import { useProgress, type RoundResult } from '@/lib/progress';

const PRAISE = ['Молодец!', 'Верно!', 'Супер!', 'Так держать!', 'Отлично!', 'Умница!'];
/** From this many correct answers in a row, each next one gives +1 coin. */
const COMBO_FROM = 3;
const ASK: Partial<Record<Topic, string>> = {
  count: 'Посчитай!',
  missing: 'Какое число в окошке?',
  compare: 'Что поставим: <, = или >?',
};

export default function Play() {
  const params = useLocalSearchParams<{ topic: string; level: string }>();
  const topic = topicById(params.topic);
  const level = Math.min(Math.max(Number(params.level) || 1, 1), MAX_LEVEL);
  const { progress } = useProgress();

  // Bumping roundId regenerates the questions for "play again".
  const [roundId, setRoundId] = useState(0);

  if (!topic) {
    return (
      <SafeAreaView style={s.root}>
        <BackBar title="Не найдено" />
      </SafeAreaView>
    );
  }

  return (
    <Round
      key={roundId}
      topicId={topic.id}
      title={topic.title}
      color={topic.color}
      level={level}
      hat={progress.hat}
      onAgain={() => setRoundId((n) => n + 1)}
    />
  );
}

function Round({
  topicId,
  title,
  color,
  level,
  hat,
  onAgain,
}: {
  topicId: Topic;
  title: string;
  color: string;
  level: number;
  hat: ReturnType<typeof useProgress>['progress']['hat'];
  onAgain: () => void;
}) {
  const { finishRound } = useProgress();
  const questions = useMemo(() => makeRound(topicId, level), [topicId, level]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mood, setMood] = useState<Mood>('think');
  const [message, setMessage] = useState(ASK[topicId] ?? 'Сколько будет?');
  const [result, setResult] = useState<RoundResult | null>(null);
  const startedAt = useRef(Date.now());
  const bestCombo = useRef(0);
  const comboBonus = useRef(0);
  const bounce = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const q = questions[index];
  const total = questions.length;
  const idleMessage = ASK[topicId] ?? 'Сколько будет?';

  const choose = (value: string) => {
    if (picked !== null) return;
    setPicked(value);
    const right = value === q.answer;
    const nextCorrect = correct + (right ? 1 : 0);
    if (right) {
      const c = combo + 1;
      setCombo(c);
      bestCombo.current = Math.max(bestCombo.current, c);
      setCorrect(nextCorrect);
      setMood('cheer');
      if (c >= COMBO_FROM) {
        comboBonus.current += 1;
        setMessage(`🔥 ${c} подряд! +1 🪙`);
      } else {
        setMessage(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
      }
      tap('success', c === 5 || c === 10 ? 'coin' : 'correct');
      Animated.sequence([
        Animated.spring(bounce, { toValue: 1.15, useNativeDriver: true, speed: 40 }),
        Animated.spring(bounce, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    } else {
      setCombo(0);
      setMood('oops');
      setMessage(combo >= COMBO_FROM ? `Серия прервалась… Правильно: ${q.answer}` : `Почти! Правильно: ${q.answer}`);
      tap('error');
    }

    timer.current = setTimeout(
      () => {
        if (index + 1 >= total) {
          const seconds = (Date.now() - startedAt.current) / 1000;
          const res = finishRound(topicId, level, nextCorrect, total, seconds, {
            bonus: comboBonus.current,
            best: bestCombo.current,
          });
          if (res.stars > 0) playSfx('win');
          setResult(res);
          return;
        }
        setIndex(index + 1);
        setPicked(null);
        setMood('think');
        setMessage(idleMessage);
      },
      right ? 800 : 1700,
    );
  };

  if (result) {
    return (
      <ResultView
        result={result}
        correct={correct}
        total={total}
        bestCombo={bestCombo.current}
        color={color}
        hat={hat}
        level={level}
        topicId={topicId}
        onAgain={onAgain}
      />
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <BackBar
        title={`${title} · ур. ${level}`}
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
            <Mascot size={q.groups ? 90 : 110} mood={mood} hat={hat} />
          </Animated.View>
          <View style={[s.bubble, combo >= COMBO_FROM && picked !== null && { borderColor: C.primary }]}>
            <Text style={s.bubbleText}>{message}</Text>
          </View>
        </View>

        <QuestionCard q={q} revealed={picked !== null} counter={`${index + 1} из ${total}`} />
        <Options q={q} picked={picked} color={color} onPick={choose} />
      </View>
    </SafeAreaView>
  );
}

function ResultView({
  result,
  correct,
  total,
  bestCombo,
  color,
  hat,
  level,
  topicId,
  onAgain,
}: {
  result: RoundResult;
  correct: number;
  total: number;
  bestCombo: number;
  color: string;
  hat: ReturnType<typeof useProgress>['progress']['hat'];
  level: number;
  topicId: Topic;
  onAgain: () => void;
}) {
  const title =
    result.stars === 3 ? 'Идеально!' : result.stars === 2 ? 'Отличный результат!' : result.stars === 1 ? 'Хорошо!' : 'Попробуем ещё раз?';
  return (
    <SafeAreaView style={s.root}>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Mascot size={150} mood={result.stars > 0 ? 'cheer' : 'happy'} hat={hat} />
          <Text style={s.resultTitle}>{title}</Text>
          <Stars n={result.stars} size={44} />
          <Text style={s.resultLine}>
            Правильно: {correct} из {total}
          </Text>
          <Text style={s.resultLine}>
            +{result.coinsEarned} {plural(result.coinsEarned, ['монетка', 'монетки', 'монеток'])} 🪙
          </Text>
          {result.comboBonus > 0 && (
            <Text style={s.resultSmall}>
              🔥 Лучшая серия: {bestCombo} подряд (+{result.comboBonus} 🪙)
            </Text>
          )}
          {result.streakGrew && (
            <Text style={s.resultLine}>
              📅 {result.streak} {plural(result.streak, ['день', 'дня', 'дней'])} подряд!
            </Text>
          )}
          {result.unlockedNext && <Text style={[s.unlock, { color }]}>🔓 Открыт уровень {level + 1}!</Text>}
          {result.stars < 2 && level === 1 && (
            <Text style={s.tip}>Получи 2 звезды (8 из 10), чтобы открыть следующий уровень</Text>
          )}
        </View>
        <View style={{ gap: 12, marginTop: 24 }}>
          {result.unlockedNext ? (
            <Btn
              big
              title={`Уровень ${level + 1} →`}
              color={color}
              onPress={() => router.replace({ pathname: '/play/[topic]', params: { topic: topicId, level: String(level + 1) } })}
            />
          ) : (
            <Btn big title="Ещё раз" color={color} onPress={onAgain} />
          )}
          <Btn title="На главную" color={C.card} textColor={C.ink} onPress={() => router.dismissTo('/')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: 20, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  progressTrack: { height: 10, backgroundColor: C.line, marginHorizontal: 20, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bubble: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 12, borderWidth: 2, borderColor: C.line },
  bubbleText: { fontSize: 19, fontWeight: '800', color: C.ink },
  resultTitle: { fontSize: 32, fontWeight: '900', color: C.ink, textAlign: 'center' },
  resultLine: { fontSize: 20, fontWeight: '800', color: C.ink },
  resultSmall: { fontSize: 16, fontWeight: '800', color: C.muted },
  unlock: { fontSize: 22, fontWeight: '900' },
  tip: { fontSize: 16, fontWeight: '700', color: C.muted, textAlign: 'center' },
});
