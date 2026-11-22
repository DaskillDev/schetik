import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti, Hopping, PopIn } from '@/components/Anim';
import { BackBar } from '@/components/BackBar';
import { Mascot } from '@/components/Mascot';
import { Quiz, type QuizDone } from '@/components/Quiz';
import { RestGuard } from '@/components/RestGuard';
import { Btn, C, Stars } from '@/components/ui';
import type { HatId } from '@/lib/hats';
import { MAX_LEVEL, makeRound, plural, topicById, type Topic } from '@/lib/math';
import { useProgress, type RoundResult } from '@/lib/progress';
import { playSfx } from '@/lib/sound';
import { say } from '@/lib/speech';

/** From this level answers are typed on a keypad instead of picked from four options. */
const KEYPAD_FROM = 4;

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
    <RestGuard>
      <Round
        key={roundId}
        topicId={topic.id}
        title={topic.title}
        color={topic.color}
        level={level}
        hat={progress.hat}
        onAgain={() => setRoundId((n) => n + 1)}
      />
    </RestGuard>
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
  hat: HatId;
  onAgain: () => void;
}) {
  const { finishRound } = useProgress();
  const questions = useMemo(() => makeRound(topicId, level), [topicId, level]);
  const [done, setDone] = useState<{ result: RoundResult; quiz: QuizDone } | null>(null);

  if (done) {
    return <ResultView {...done} color={color} hat={hat} level={level} topicId={topicId} onAgain={onAgain} />;
  }

  return (
    <Quiz
      questions={questions}
      title={`${title} · ур. ${level}`}
      color={color}
      hat={hat}
      keypad={level >= KEYPAD_FROM}
      onDone={(quiz) => {
        const result = finishRound(topicId, level, quiz.answers, quiz.seconds, {
          bonus: quiz.comboBonus,
          best: quiz.bestCombo,
        });
        if (result.unlockedNext) playSfx('levelup');
        else if (result.stars > 0) playSfx('win');
        setDone({ result, quiz });
      }}
    />
  );
}

function ResultView({
  result,
  quiz,
  color,
  hat,
  level,
  topicId,
  onAgain,
}: {
  result: RoundResult;
  quiz: QuizDone;
  color: string;
  hat: HatId;
  level: number;
  topicId: Topic;
  onAgain: () => void;
}) {
  const correct = quiz.answers.filter((a) => a.right).length;
  const total = quiz.answers.length;
  const title =
    result.stars === 3 ? 'Идеально!' : result.stars === 2 ? 'Отличный результат!' : result.stars === 1 ? 'Хорошо!' : 'Попробуем ещё раз?';

  useEffect(() => {
    const t = setTimeout(() => say(result.unlockedNext ? `${title} Открыт новый уровень!` : title), 600);
    return () => clearTimeout(t);
  }, [result.unlockedNext, title]);

  return (
    <SafeAreaView style={s.root}>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Hopping height={result.stars > 0 ? 10 : 4} duration={result.stars > 0 ? 450 : 1200}>
            <Mascot size={150} mood={result.stars > 0 ? 'cheer' : 'happy'} hat={hat} />
          </Hopping>
          <PopIn delay={100}>
            <Text style={s.resultTitle}>{title}</Text>
          </PopIn>
          <PopIn delay={300}>
            <Stars n={result.stars} size={44} />
          </PopIn>
          <PopIn delay={500}>
            <Text style={s.resultLine}>
              Правильно: {correct} из {total}
            </Text>
          </PopIn>
          <PopIn delay={650}>
            <Text style={[s.resultLine, s.coins]}>
              +{result.coinsEarned} {plural(result.coinsEarned, ['монетка', 'монетки', 'монеток'])} 🪙
            </Text>
          </PopIn>
          {result.comboBonus > 0 && (
            <PopIn delay={800}>
              <Text style={s.resultSmall}>
                🔥 Лучшая серия: {quiz.bestCombo} подряд (+{result.comboBonus} 🪙)
              </Text>
            </PopIn>
          )}
          {result.streakGrew && (
            <PopIn delay={900}>
              <Text style={s.resultLine}>
                📅 {result.streak} {plural(result.streak, ['день', 'дня', 'дней'])} подряд!
              </Text>
            </PopIn>
          )}
          {result.unlockedNext && (
            <PopIn delay={1000}>
              <Text style={[s.unlock, { color }]}>🔓 Открыт уровень {level + 1}!</Text>
            </PopIn>
          )}
          {result.stars < 2 && level === 1 && (
            <Text style={s.tip}>Получи 2 звезды (8 из 10), чтобы открыть следующий уровень</Text>
          )}
          {level + 1 === KEYPAD_FROM && result.unlockedNext && (
            <Text style={s.tip}>На следующих уровнях ответ нужно набрать цифрами!</Text>
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
      <Confetti burst={result.stars >= 2 ? 1 : 0} count={result.unlockedNext || result.stars === 3 ? 48 : 30} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: 20, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  resultTitle: { fontSize: 32, fontWeight: '900', color: C.ink, textAlign: 'center' },
  resultLine: { fontSize: 20, fontWeight: '800', color: C.ink, textAlign: 'center' },
  coins: { color: '#E69500' },
  resultSmall: { fontSize: 16, fontWeight: '800', color: C.muted, textAlign: 'center' },
  unlock: { fontSize: 22, fontWeight: '900' },
  tip: { fontSize: 16, fontWeight: '700', color: C.muted, textAlign: 'center' },
});
