import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hopping } from '@/components/Anim';
import { DailyQuests } from '@/components/DailyQuests';
import { Mascot } from '@/components/Mascot';
import { C, Pill, tap } from '@/components/ui';
import { LANDS } from '@/lib/lands';
import { MAX_LEVEL, plural, TOPICS } from '@/lib/math';
import { useProfiles } from '@/lib/profiles';
import { dayKey, useProgress } from '@/lib/progress';
import { say } from '@/lib/speech';

function greeting(name: string, streak: number, playedToday: boolean) {
  const hi = name && name !== 'Игрок' ? `Привет, ${name}!` : 'Привет!';
  if (playedToday) return 'Отлично позанимались сегодня! Ещё разок?';
  if (streak > 0) return `${hi} Ты занимаешься ${streak} ${plural(streak, ['день', 'дня', 'дней'])} подряд. Не прерывай серию!`;
  return `${hi} Я Счётик. Давай считать вместе!`;
}

export default function Home() {
  const { progress, totalStars, liveStreak, toggleSound, setSettings, today, dueMistakes } = useProgress();
  const { active } = useProfiles();
  const playedToday = progress.lastDay === dayKey();
  const text = greeting(active.name, liveStreak, playedToday);
  const minutes = Math.floor(today.seconds / 60);
  const goalDone = minutes >= progress.goalMin;

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Игрок ${active.name}. Сменить игрока`}
            onPress={() => {
              tap();
              router.push('/profiles');
            }}
            style={s.profile}
          >
            <Text style={{ fontSize: 24 }}>{active.avatar}</Text>
            <Text style={s.profileName} numberOfLines={1}>
              {active.name}
            </Text>
            <Text style={s.chevron}>▾</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Озвучка"
            accessibilityState={{ checked: progress.voice }}
            onPress={() => setSettings({ voice: !progress.voice })}
            style={[s.iconBtn, !progress.voice && { opacity: 0.5 }]}
            hitSlop={6}
          >
            <Text style={s.icon}>{progress.voice ? '🗣️' : '🤐'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Звук"
            accessibilityState={{ checked: progress.sound }}
            onPress={toggleSound}
            style={s.iconBtn}
            hitSlop={6}
          >
            <Text style={s.icon}>{progress.sound ? '🔊' : '🔇'}</Text>
          </Pressable>
        </View>
        <View style={s.pills}>
          <Pill>🔥 {liveStreak}</Pill>
          <Pill>⭐ {totalStars}</Pill>
          <Pill>🪙 {progress.coins}</Pill>
        </View>

        <View style={s.hero}>
          <Pressable accessibilityRole="button" accessibilityLabel="Счётик" onPress={() => say(text)}>
            <Hopping>
              <Mascot size={140} hat={progress.hat} mood={playedToday ? 'cheer' : 'happy'} />
            </Hopping>
          </Pressable>
          <View style={s.bubble}>
            <Text style={s.bubbleText}>{text}</Text>
          </View>
        </View>

        <View style={s.goal} accessibilityLabel={`Цель дня: ${minutes} из ${progress.goalMin} минут`}>
          <Text style={s.goalText}>
            {goalDone ? '✅ Цель дня выполнена!' : `🎯 Цель дня: ${minutes} из ${progress.goalMin} мин`}
          </Text>
          <View style={s.goalTrack}>
            <View
              style={[
                s.goalFill,
                { width: `${Math.min(100, (minutes / progress.goalMin) * 100)}%` },
                goalDone && { backgroundColor: C.good },
              ]}
            />
          </View>
        </View>

        {dueMistakes.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tap();
              router.push('/review');
            }}
            style={({ pressed }) => [s.review, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <Text style={s.bigIcon}>🔁</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Работа над ошибками</Text>
              <Text style={s.cardHint}>
                {dueMistakes.length} {plural(dueMistakes.length, ['пример ждёт', 'примера ждут', 'примеров ждут'])} — по 2 🪙 за каждый!
              </Text>
            </View>
          </Pressable>
        )}

        <DailyQuests />

        <View style={s.twoCol}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Молния: 60 секунд"
            onPress={() => {
              tap();
              router.push('/blitz');
            }}
            style={({ pressed }) => [s.half, { backgroundColor: '#FFA000', transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          >
            <Text style={s.bigIcon}>⚡</Text>
            <Text style={s.cardTitle}>Молния</Text>
            <Text style={s.cardHint}>🏆 {progress.blitzBest}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Мини-игры"
            onPress={() => {
              tap();
              router.push('/games');
            }}
            style={({ pressed }) => [s.half, { backgroundColor: '#5E35B1', transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          >
            <Text style={s.bigIcon}>🎈</Text>
            <Text style={s.cardTitle}>Мини-игры</Text>
            <Text style={s.cardHint}>Шарики · Пары · Магазин</Text>
          </Pressable>
        </View>

        <Text style={s.h2}>Карта приключений</Text>
        {TOPICS.map((t) => {
          const lvl = progress.unlocked[t.id];
          const land = LANDS[t.id];
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`${t.title}, ${land.name}, уровень ${lvl} из ${MAX_LEVEL}`}
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
                <Text style={s.topicHint}>
                  {land.deco[0]} {land.name}
                </Text>
                <View style={s.dots}>
                  {Array.from({ length: MAX_LEVEL }, (_, i) => (
                    <View key={i} style={[s.dot, { backgroundColor: i < lvl ? t.color : C.line }]} />
                  ))}
                </View>
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
          <Pressable style={s.bottomBtn} onPress={() => router.push('/room')} accessibilityRole="button">
            <Text style={s.bottomIcon}>🏠</Text>
            <Text style={s.bottomText}>Комната</Text>
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
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 12,
    borderWidth: 2,
    borderColor: C.line,
    maxWidth: 190,
  },
  profileName: { fontSize: 17, fontWeight: '900', color: C.ink, flexShrink: 1 },
  chevron: { fontSize: 14, color: C.muted, fontWeight: '900' },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 19 },
  pills: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  hero: { alignItems: 'center', gap: 6 },
  bubble: { backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: 2, borderColor: C.line },
  bubbleText: { fontSize: 18, fontWeight: '700', color: C.ink, textAlign: 'center' },
  goal: { backgroundColor: C.card, borderRadius: 18, padding: 12, gap: 8, borderWidth: 2, borderColor: C.line },
  goalText: { fontSize: 16, fontWeight: '900', color: C.ink },
  goalTrack: { height: 10, backgroundColor: C.line, borderRadius: 5, overflow: 'hidden' },
  goalFill: { height: '100%', backgroundColor: C.primary, borderRadius: 5 },
  review: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#00897B', borderRadius: 22, padding: 14 },
  twoCol: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, borderRadius: 22, padding: 14, gap: 2 },
  bigIcon: { fontSize: 34 },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  cardHint: { fontSize: 14, fontWeight: '700', color: '#FFFFFFD9' },
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
  topicTitle: { fontSize: 21, fontWeight: '900', color: C.ink },
  topicHint: { fontSize: 14, color: C.muted, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 4, marginTop: 5 },
  dot: { width: 18, height: 6, borderRadius: 3 },
  level: { fontSize: 18, fontWeight: '900' },
  bottomRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  bottomBtn: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.line,
  },
  bottomIcon: { fontSize: 30 },
  bottomText: { fontSize: 15, fontWeight: '800', color: C.ink, marginTop: 4 },
});
