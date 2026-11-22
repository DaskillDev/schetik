import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackBar } from '@/components/BackBar';
import { C, Stars, tap } from '@/components/ui';
import { LEVEL_NAMES, MAX_LEVEL, topicById } from '@/lib/math';
import { useProgress } from '@/lib/progress';

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = topicById(id);
  const { progress } = useProgress();

  if (!topic) {
    return (
      <SafeAreaView style={s.root}>
        <BackBar title="Не найдено" />
      </SafeAreaView>
    );
  }

  const unlocked = progress.unlocked[topic.id];

  return (
    <SafeAreaView style={s.root}>
      <BackBar title={topic.title} />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.hint}>Пройди уровень на 2 звезды, чтобы открыть следующий</Text>
        {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level) => {
          const open = level <= unlocked;
          const best = progress.best[`${topic.id}-${level}`] ?? 0;
          return (
            <Pressable
              key={level}
              disabled={!open}
              accessibilityRole="button"
              accessibilityState={{ disabled: !open }}
              onPress={() => {
                tap();
                router.push({ pathname: '/play/[topic]', params: { topic: topic.id, level: String(level) } });
              }}
              style={({ pressed }) => [
                s.level,
                { borderColor: open ? topic.color : C.line, opacity: open ? 1 : 0.55 },
                { transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <View style={[s.num, { backgroundColor: open ? topic.color : '#C9B8A8' }]}>
                <Text style={s.numText}>{open ? level : '🔒'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>Уровень {level}</Text>
                <Text style={s.sub}>{LEVEL_NAMES[topic.id][level - 1]}</Text>
              </View>
              {open && <Stars n={best} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  hint: { fontSize: 16, color: C.muted, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 3,
  },
  num: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  title: { fontSize: 20, fontWeight: '900', color: C.ink },
  sub: { fontSize: 15, color: C.muted, fontWeight: '600' },
});
