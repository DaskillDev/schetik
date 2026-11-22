import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackBar } from '@/components/BackBar';
import { Btn, C } from '@/components/ui';
import { LEVEL_NAMES, MAX_LEVEL, TOPICS } from '@/lib/math';
import { dayKey, useProgress } from '@/lib/progress';

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** Parental gate: a two-digit multiplication, typed in — hard for young kids, trivial for adults. */
function makeGate() {
  const a = 12 + Math.floor(Math.random() * 18);
  const b = 3 + Math.floor(Math.random() * 6);
  return { a, b, answer: a * b };
}

export default function Parents() {
  const [open, setOpen] = useState(false);
  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Для родителей" />
      {open ? <Dashboard /> : <Gate onPass={() => setOpen(true)} />}
    </SafeAreaView>
  );
}

function Gate({ onPass }: { onPass: () => void }) {
  const [gate, setGate] = useState(makeGate);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const check = () => {
    if (Number(value) === gate.answer) onPass();
    else {
      setError(true);
      setValue('');
      setGate(makeGate());
    }
  };

  return (
    <View style={s.gate}>
      <Text style={s.gateTitle}>Этот раздел для взрослых</Text>
      <Text style={s.gateText}>Чтобы продолжить, решите пример:</Text>
      <Text style={s.gateExpr}>
        {gate.a} × {gate.b} = ?
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => {
          setValue(t.replace(/[^0-9]/g, ''));
          setError(false);
        }}
        keyboardType="number-pad"
        maxLength={4}
        style={s.input}
        placeholder="Ответ"
        placeholderTextColor={C.muted}
        onSubmitEditing={check}
        accessibilityLabel="Ответ на пример"
      />
      {error && <Text style={s.error}>Неверно, попробуйте ещё раз</Text>}
      <Btn title="Продолжить" onPress={check} disabled={!value} />
    </View>
  );
}

function Dashboard() {
  const { progress, totalStars, liveStreak, reset } = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);

  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = dayKey(d);
      return { key, label: WEEKDAYS[d.getDay()], stats: progress.days[key] };
    });
  }, [progress.days]);

  const weekTotals = week.reduce(
    (acc, d) => ({
      answered: acc.answered + (d.stats?.answered ?? 0),
      correct: acc.correct + (d.stats?.correct ?? 0),
      seconds: acc.seconds + (d.stats?.seconds ?? 0),
    }),
    { answered: 0, correct: 0, seconds: 0 },
  );
  const maxAnswered = Math.max(10, ...week.map((d) => d.stats?.answered ?? 0));
  const accuracy = weekTotals.answered ? Math.round((weekTotals.correct / weekTotals.answered) * 100) : 0;

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={s.statsRow}>
        <Stat value={String(weekTotals.answered)} label="примеров за неделю" />
        <Stat value={`${accuracy}%`} label="верных ответов" />
        <Stat value={String(Math.ceil(weekTotals.seconds / 60))} label="минут занятий" />
      </View>
      <View style={s.statsRow}>
        <Stat value={`🔥 ${liveStreak}`} label="дней подряд" />
        <Stat value={`⭐ ${totalStars}`} label="звёзд всего" />
        <Stat value={`⚡ ${progress.blitzBest}`} label="рекорд «Молнии»" />
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Активность за 7 дней</Text>
        <View style={s.chart}>
          {week.map((d) => {
            const n = d.stats?.answered ?? 0;
            return (
              <View key={d.key} style={s.barCol}>
                <Text style={s.barValue}>{n || ''}</Text>
                <View style={[s.bar, { height: Math.max(4, (n / maxAnswered) * 110) }, !n && { backgroundColor: C.line }]} />
                <Text style={s.barLabel}>{d.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Уровни по темам</Text>
        {TOPICS.map((t) => {
          const lvl = progress.unlocked[t.id];
          const stars = Array.from({ length: MAX_LEVEL }, (_, i) => progress.best[`${t.id}-${i + 1}`] ?? 0).reduce((a, b) => a + b, 0);
          return (
            <View key={t.id} style={s.topicRow}>
              <Text style={[s.topicName, { color: t.color }]}>{t.title}</Text>
              <Text style={s.topicLvl}>
                {lvl}/{MAX_LEVEL} · {LEVEL_NAMES[t.id][lvl - 1]}
              </Text>
              <Text style={s.topicStars}>⭐ {stars}</Text>
            </View>
          );
        })}
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Конфиденциальность</Text>
        <Text style={s.note}>
          Приложение не показывает рекламу, не собирает личные данные и работает без интернета. Весь прогресс хранится
          только на этом устройстве.
        </Text>
      </View>

      {confirmReset ? (
        <View style={s.card}>
          <Text style={s.note}>Удалить весь прогресс, монетки и награды? Это нельзя отменить.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Btn style={{ flex: 1 }} title="Отмена" color={C.card} textColor={C.ink} onPress={() => setConfirmReset(false)} />
            <Btn
              style={{ flex: 1 }}
              title="Удалить"
              color={C.bad}
              onPress={() => {
                reset();
                setConfirmReset(false);
              }}
            />
          </View>
        </View>
      ) : (
        <Btn title="Сбросить прогресс" color={C.card} textColor={C.bad} onPress={() => setConfirmReset(true)} />
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, gap: 12, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  gate: { padding: 24, gap: 14, alignItems: 'stretch', maxWidth: 420, width: '100%', alignSelf: 'center' },
  gateTitle: { fontSize: 24, fontWeight: '900', color: C.ink, textAlign: 'center' },
  gateText: { fontSize: 17, color: C.muted, fontWeight: '600', textAlign: 'center' },
  gateExpr: { fontSize: 40, fontWeight: '900', color: C.ink, textAlign: 'center' },
  input: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.line,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 12,
    color: C.ink,
  },
  error: { color: C.bad, fontWeight: '700', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 12, borderWidth: 2, borderColor: C.line },
  statValue: { fontSize: 24, fontWeight: '900', color: C.ink },
  statLabel: { fontSize: 12, fontWeight: '700', color: C.muted },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 2, borderColor: C.line, gap: 8 },
  h3: { fontSize: 18, fontWeight: '900', color: C.ink },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150 },
  barCol: { alignItems: 'center', flex: 1, gap: 4 },
  bar: { width: 22, borderRadius: 6, backgroundColor: C.primary },
  barValue: { fontSize: 12, fontWeight: '800', color: C.muted },
  barLabel: { fontSize: 13, fontWeight: '800', color: C.muted },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicName: { fontSize: 16, fontWeight: '900', width: 110 },
  topicLvl: { flex: 1, fontSize: 14, fontWeight: '700', color: C.muted },
  topicStars: { fontSize: 14, fontWeight: '800', color: C.ink },
  note: { fontSize: 15, color: C.ink, lineHeight: 21 },
});
