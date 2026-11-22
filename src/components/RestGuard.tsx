import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hopping } from '@/components/Anim';
import { BackBar } from '@/components/BackBar';
import { Mascot } from '@/components/Mascot';
import { ParentGate } from '@/components/ParentGate';
import { Btn, C } from '@/components/ui';
import { useProgress } from '@/lib/progress';

/** Shows a friendly "time to rest" screen instead of the game once the parent's daily limit is reached. */
export function RestGuard({ children }: { children: ReactNode }) {
  const { overLimit, allowMoreToday, progress } = useProgress();
  const [gate, setGate] = useState(false);
  if (!overLimit) return <>{children}</>;
  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Перерыв" />
      {gate ? (
        <ParentGate title="Разрешить ещё сегодня?" onPass={allowMoreToday} />
      ) : (
        <View style={s.body}>
          <Hopping height={3} duration={1600}>
            <Mascot size={170} mood="sleep" hat={progress.hat} />
          </Hopping>
          <Text style={s.title}>Пора отдохнуть!</Text>
          <Text style={s.text}>
            Сегодня ты занимаешься уже целых {progress.limitMin} минут — это отлично! Счётик тоже устал. Поиграем завтра!
          </Text>
          <Btn big title="На главную" onPress={() => router.dismissTo('/')} style={{ alignSelf: 'stretch' }} />
          <Btn title="Для взрослых" color={C.card} textColor={C.muted} onPress={() => setGate(true)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: 24, gap: 14, alignItems: 'center', justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 30, fontWeight: '900', color: C.ink, textAlign: 'center' },
  text: { fontSize: 18, fontWeight: '700', color: C.muted, textAlign: 'center', lineHeight: 25 },
});
