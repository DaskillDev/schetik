import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackBar } from '@/components/BackBar';
import { C, Pill, tap } from '@/components/ui';
import { useProgress } from '@/lib/progress';

export const GAMES = [
  {
    id: 'balloons',
    href: '/games/balloons',
    icon: '🎈',
    title: 'Шарики',
    hint: 'Лопни шарик с правильным ответом',
    color: '#E53935',
    record: (n: number) => `${n} из 10`,
  },
  {
    id: 'pairs',
    href: '/games/pairs',
    icon: '🧩',
    title: 'Пары',
    hint: 'Соедини пример и ответ — на время',
    color: '#5E35B1',
    record: (n: number) => `${n} сек`,
  },
  {
    id: 'shop',
    href: '/games/shop',
    icon: '🛒',
    title: 'Магазин',
    hint: 'Заплати за покупку точно монетками',
    color: '#00897B',
    record: (n: number) => `${n} из 8`,
  },
] as const;

export default function Games() {
  const { progress } = useProgress();
  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Мини-игры" right={<Pill>🪙 {progress.coins}</Pill>} />
      <ScrollView contentContainerStyle={s.scroll}>
        {GAMES.map((g) => {
          const best = progress.gamesBest[g.id];
          return (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={`${g.title}: ${g.hint}`}
              onPress={() => {
                tap();
                router.push(g.href);
              }}
              style={({ pressed }) => [s.card, { backgroundColor: g.color, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <Text style={s.icon}>{g.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{g.title}</Text>
                <Text style={s.hint}>{g.hint}</Text>
                {best !== undefined && <Text style={s.best}>🏆 Рекорд: {g.record(best)}</Text>}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 24, padding: 18 },
  icon: { fontSize: 52 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff' },
  hint: { fontSize: 15, fontWeight: '700', color: '#FFFFFFCC' },
  best: { fontSize: 15, fontWeight: '900', color: '#fff', marginTop: 4 },
});
