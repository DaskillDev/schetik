import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti, Hopping, PopIn } from '@/components/Anim';
import { BackBar } from '@/components/BackBar';
import { Mascot } from '@/components/Mascot';
import { Quiz } from '@/components/Quiz';
import { RestGuard } from '@/components/RestGuard';
import { Btn, C } from '@/components/ui';
import { plural } from '@/lib/math';
import { useProgress } from '@/lib/progress';
import { playSfx } from '@/lib/sound';

const COLOR = '#00897B';
const MAX = 10;

/** «Работа над ошибками»: questions the child missed earlier come back a day later. */
export default function Review() {
  const { dueMistakes, finishReview, progress } = useProgress();
  // Freeze the list for this session, so answering doesn't reshuffle it.
  const [questions] = useState(() => [...dueMistakes].sort(() => Math.random() - 0.5).slice(0, MAX).map((m) => m.q));
  const [result, setResult] = useState<{ coins: number; cleared: number; correct: number } | null>(null);

  if (!questions.length && !result) {
    return (
      <SafeAreaView style={s.root}>
        <BackBar title="Работа над ошибками" />
        <View style={s.center}>
          <Hopping>
            <Mascot size={150} mood="cheer" hat={progress.hat} />
          </Hopping>
          <Text style={s.title}>Ошибок нет!</Text>
          <Text style={s.text}>Здесь появятся примеры с ошибками. Повторим их на следующий день.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Hopping height={8} duration={500}>
            <Mascot size={150} mood="cheer" hat={progress.hat} />
          </Hopping>
          <PopIn>
            <Text style={s.title}>Ошибки исправлены!</Text>
          </PopIn>
          <PopIn delay={250}>
            <Text style={s.line}>
              Правильно: {result.correct} из {questions.length}
            </Text>
          </PopIn>
          {result.cleared > 0 && (
            <PopIn delay={400}>
              <Text style={s.line}>
                ✨ Выучено насовсем: {result.cleared} {plural(result.cleared, ['пример', 'примера', 'примеров'])}
              </Text>
            </PopIn>
          )}
          <PopIn delay={550}>
            <Text style={[s.line, { color: '#E69500' }]}>+{result.coins} 🪙</Text>
          </PopIn>
          <Btn big title="На главную" color={COLOR} onPress={() => router.dismissTo('/')} style={{ alignSelf: 'stretch', marginTop: 16 }} />
        </View>
        <Confetti burst={result.correct > 0 ? 1 : 0} />
      </SafeAreaView>
    );
  }

  return (
    <RestGuard>
      <Quiz
        questions={questions}
        title="Работа над ошибками"
        color={COLOR}
        hat={progress.hat}
        keypad={false}
        onDone={(quiz) => {
          const r = finishReview(quiz.answers, quiz.seconds);
          const correct = quiz.answers.filter((a) => a.right).length;
          if (correct > 0) playSfx('win');
          setResult({ coins: r.coinsEarned, cleared: r.cleared, correct });
        }}
      />
    </RestGuard>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, padding: 24, gap: 12, alignItems: 'center', justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 30, fontWeight: '900', color: C.ink, textAlign: 'center' },
  text: { fontSize: 18, fontWeight: '700', color: C.muted, textAlign: 'center', lineHeight: 25 },
  line: { fontSize: 20, fontWeight: '800', color: C.ink, textAlign: 'center' },
});
