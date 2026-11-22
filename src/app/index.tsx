import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DailyQuests } from '@/components/DailyQuests';
import { Mascot } from '@/components/Mascot';
import { C, Pill, tap } from '@/components/ui';
import { MAX_LEVEL, plural, TOPICS } from '@/lib/math';
import { dayKey, useProgress } from '@/lib/progress';

function greeting(streak: number, playedToday: boolean) {
  if (playedToday) return 'Отлично позанимались сегодня! Ещё разок?';
  if (streak > 0) return `Ты занимаешься ${streak} ${plural(streak, ['день', 'дня', 'дней'])} подряд. Не прерывай серию!`;
  return 'Привет! Я Счётик. Давай считать вместе!';
}

export default function Home() {
  const { progress, totalStars, liveStreak, toggleSound } = useProgress();
  const playedToday = progress.lastDay === dayKey();

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.topRow}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Звук"
            accessibilityState={{ checked: progress.sound }}
            onPress={toggleSound}
            style={s.soundBtn}
            hitSlop={8}
          >
            <Text style={s.soundIcon}>{progress.sound ? '🔊' : '🔇'}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pill>🔥 {liveStreak}</Pill>
          <Pill>⭐ {totalStars}</Pill>
          <Pill>🪙 {progress.coins}</Pill>
        </View>

        <View style={s.hero}>
          <Mascot size={150} hat={progress.hat} mood={playedToday ? 'cheer' : 'happy'} />
          <View style={s.bubble}>
            <Text style={s.bubbleText}>{greeting(liveStreak, playedToday)}</Text>
          </View>
        </View>

        <DailyQuests />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Молния: 60 секунд"
          onPress={() => {
            tap();
            router.push('/blitz');
          }}
          style={({ pressed }) => [s.blitz, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <Text style={s.blitzIcon}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.blitzTitle}>Молния</Text>
            <Text style={s.blitzHint}>Успей за 60 секунд!</Text>
          </View>
          <Text style={s.blitzBest}>🏆 {progress.blitzBest}</Text>
        </Pressable>

        <Text style={s.h2}>Что будем считать?</Text>
        {TOPICS.map((t) => {
          const lvl = progress.unlocked[t.id];
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => {
                tap();
                router.push({ pathname: '/topic/[id]', params: { id: t.id } });
              }}
              style={({ pressed }) => [s.topic, { borderColor: t.color, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <View style={[s.sign, { backgroundColor: t.color }]}>
                <Text style={s.signText}>{t.sign}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.topicTitle}>{t.title}</Text>
                <Text style={s.topicHint}>{t.hint}</Text>
              </View>
              <Text style={[s.level, { color: t.color }]}>
                {lvl}/{MAX_LEVEL}
              </Text>
            </Pressable>
          );
        })}

        <View style={s.bottomRow}>
          <Pressable style={s.bottomBtn} onPress={() => router.push('/rewards')} accessibilityRole="button">
            <Text style={s.bottomIcon}>🎁</Text>
            <Text style={s.bottomText}>Награды</Text>
          </Pressable>
          <Pressable style={s.bottomBtn} onPress={() => router.push('/parents')} accessibilityRole="button">
            <Text style={s.bottomIcon}>👨‍👩‍👧</Text>
            <Text style={s.bottomText}>Родителям</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 40, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  soundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIcon: { fontSize: 18 },
  hero: { alignItems: 'center', gap: 8, marginBottom: 4 },
  bubble: { backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: 2, borderColor: C.line },
  bubbleText: { fontSize: 18, fontWeight: '700', color: C.ink, textAlign: 'center' },
  h2: { fontSize: 24, fontWeight: '900', color: C.ink, marginTop: 4 },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 3,
  },
  sign: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  signText: { color: '#fff', fontSize: 30, fontWeight: '900' },
  blitz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFA000',
    borderRadius: 22,
    padding: 14,
  },
  blitzIcon: { fontSize: 36 },
  blitzTitle: { fontSize: 21, fontWeight: '900', color: '#fff' },
  blitzHint: { fontSize: 15, fontWeight: '700', color: '#FFF3D6' },
  blitzBest: { fontSize: 18, fontWeight: '900', color: '#fff' },
  topicTitle: { fontSize: 21, fontWeight: '900', color: C.ink },
  topicHint: { fontSize: 15, color: C.muted, fontWeight: '600' },
  level: { fontSize: 18, fontWeight: '900' },
  bottomRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  bottomBtn: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.line,
  },
  bottomIcon: { fontSize: 30 },
  bottomText: { fontSize: 17, fontWeight: '800', color: C.ink, marginTop: 4 },
});
