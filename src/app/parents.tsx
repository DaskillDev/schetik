import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackBar } from '@/components/BackBar';
import { ParentGate } from '@/components/ParentGate';
import { Btn, C, tap } from '@/components/ui';
import { KIND_NAMES, LEVEL_NAMES, MAX_LEVEL, TOPICS, type Kind } from '@/lib/math';
import { useProfiles } from '@/lib/profiles';
import { dayKey, useProgress } from '@/lib/progress';
import { REMINDERS_SUPPORTED } from '@/lib/reminders';

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const REPORT_DAYS = 14;

export default function Parents() {
  const [open, setOpen] = useState(false);
  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Для родителей" />
      {open ? <Dashboard /> : <ParentGate onPass={() => setOpen(true)} />}
    </SafeAreaView>
  );
}

/** Row of choice chips. */
function Choice<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { v: T; t: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View style={s.chips} accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Pressable
            key={String(o.v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              tap();
              onChange(o.v);
            }}
            style={[s.chip, on && s.chipOn]}
          >
            <Text style={[s.chipText, on && { color: '#fff' }]}>{o.t}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Dashboard() {
  const { progress, totalStars, liveStreak, reset, setSettings } = useProgress();
  const { profiles, active, updateProfile, removeProfile, reminder, setReminder } = useProfiles();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editName, setEditName] = useState(active.name);
  const [reminderNote, setReminderNote] = useState('');

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

  // Accuracy per kind of task over the last two weeks.
  const report = useMemo(() => {
    const sum: Partial<Record<Kind, [number, number]>> = {};
    for (let i = 0; i < REPORT_DAYS; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const kinds = progress.days[dayKey(d)]?.kinds ?? {};
      for (const [k, [n, c]] of Object.entries(kinds)) {
        const prev = sum[k as Kind] ?? [0, 0];
        sum[k as Kind] = [prev[0] + n, prev[1] + c];
      }
    }
    return (Object.entries(sum) as [Kind, [number, number]][])
      .map(([kind, [n, c]]) => ({ kind, n, pct: Math.round((c / n) * 100) }))
      .sort((a, b) => b.n - a.n);
  }, [progress.days]);
  const strong = report.filter((r) => r.n >= 10 && r.pct >= 90);
  const weak = report.filter((r) => r.n >= 10 && r.pct < 75);
  const hard = [...progress.mistakes].sort((a, b) => b.misses - a.misses).slice(0, 8);

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Text style={s.who}>
        {active.avatar} {active.name}
      </Text>
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
        <Text style={s.h3}>Отчёт за 2 недели</Text>
        {report.length === 0 ? (
          <Text style={s.note}>Пока мало данных. Отчёт появится, когда ребёнок порешает примеры.</Text>
        ) : (
          <>
            {report.map((r) => (
              <View key={r.kind} style={s.reportRow}>
                <Text style={s.reportName}>{KIND_NAMES[r.kind]}</Text>
                <View style={s.reportTrack}>
                  <View
                    style={[
                      s.reportFill,
                      { width: `${r.pct}%`, backgroundColor: r.pct >= 90 ? C.good : r.pct >= 75 ? C.gold : C.bad },
                    ]}
                  />
                </View>
                <Text style={s.reportPct}>{r.pct}%</Text>
              </View>
            ))}
            <Text style={s.small}>Процент верных ответов. Выводы — по темам, где решено 10+ примеров.</Text>
            {strong.length > 0 && (
              <Text style={s.note}>💪 Хорошо получается: {strong.map((r) => KIND_NAMES[r.kind].toLowerCase()).join(', ')}.</Text>
            )}
            {weak.length > 0 && (
              <Text style={s.note}>🎯 Стоит потренировать: {weak.map((r) => KIND_NAMES[r.kind].toLowerCase()).join(', ')}.</Text>
            )}
          </>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Трудные примеры</Text>
        {hard.length === 0 ? (
          <Text style={s.note}>Ошибок пока нет 🎉</Text>
        ) : (
          <>
            <View style={s.hardList}>
              {hard.map((m) => (
                <View key={m.q.key} style={s.hardItem}>
                  <Text style={s.hardText}>{m.q.kind === 'count' ? `${m.q.reveal} (счёт)` : m.q.reveal}</Text>
                  {m.misses > 1 && <Text style={s.hardMiss}>×{m.misses}</Text>}
                </View>
              ))}
            </View>
            <Text style={s.small}>
              Эти примеры вернутся в «Работе над ошибками». Пример уходит из списка, когда его решат верно два раза в разные дни.
            </Text>
          </>
        )}
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
        <Text style={s.h3}>Время занятий</Text>
        <Text style={s.label}>Цель на день</Text>
        <Choice
          label="Цель на день"
          value={progress.goalMin}
          onChange={(v) => setSettings({ goalMin: v })}
          options={[5, 10, 15, 20, 30].map((v) => ({ v, t: `${v} мин` }))}
        />
        <Text style={s.label}>Перерыв после</Text>
        <Choice
          label="Перерыв после"
          value={progress.limitMin}
          onChange={(v) => setSettings({ limitMin: v })}
          options={[{ v: 0, t: 'Без лимита' }, ...[15, 20, 30, 45, 60].map((v) => ({ v, t: `${v} мин` }))]}
        />
        <Text style={s.small}>
          Когда время выйдет, Счётик предложит отдохнуть до завтра. Продолжить можно только через «Для взрослых».
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Озвучка и напоминания</Text>
        <Text style={s.label}>Счётик читает примеры вслух и хвалит</Text>
        <Choice
          label="Озвучка"
          value={progress.voice ? 1 : 0}
          onChange={(v) => setSettings({ voice: v === 1 })}
          options={[
            { v: 1, t: 'Включена' },
            { v: 0, t: 'Выключена' },
          ]}
        />
        <Text style={s.label}>Ежедневное напоминание</Text>
        {REMINDERS_SUPPORTED ? (
          <>
            <Choice
              label="Напоминание"
              value={reminder.on ? reminder.hour : -1}
              onChange={async (v) => {
                const ok = await setReminder({ on: v >= 0, hour: v >= 0 ? v : reminder.hour });
                setReminderNote(
                  ok ? (v >= 0 ? `Напомним каждый день в ${v}:00` : 'Напоминания выключены') : 'Разрешите уведомления в настройках телефона',
                );
              }}
              options={[{ v: -1, t: 'Выкл' }, ...[16, 17, 18, 19, 20].map((v) => ({ v, t: `${v}:00` }))]}
            />
            {reminderNote ? <Text style={s.small}>{reminderNote}</Text> : null}
          </>
        ) : (
          <Text style={s.small}>Напоминания работают в приложении на телефоне, в браузере их нет.</Text>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Дети</Text>
        <Text style={s.label}>Имя текущего игрока</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={editName} onChangeText={setEditName} maxLength={16} style={[s.input, { flex: 1 }]} accessibilityLabel="Имя игрока" />
          <Btn
            title="Сохранить"
            disabled={!editName.trim() || editName === active.name}
            onPress={() => updateProfile(active.id, { name: editName.trim() })}
          />
        </View>
        {profiles.length > 1 &&
          profiles.map((p) => (
            <View key={p.id} style={s.kidRow}>
              <Text style={s.kidName}>
                {p.avatar} {p.name}
              </Text>
              {confirmDelete === p.id ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Btn title="Нет" color={C.card} textColor={C.ink} onPress={() => setConfirmDelete(null)} style={s.smallBtn} />
                  <Btn
                    title="Удалить"
                    color={C.bad}
                    style={s.smallBtn}
                    onPress={() => {
                      removeProfile(p.id);
                      setConfirmDelete(null);
                    }}
                  />
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={`Удалить ${p.name}`} onPress={() => setConfirmDelete(p.id)}>
                  <Text style={s.delete}>Удалить</Text>
                </Pressable>
              )}
            </View>
          ))}
        {confirmDelete && <Text style={s.small}>Весь прогресс этого ребёнка будет удалён без возможности восстановления.</Text>}
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
          <Text style={s.note}>Удалить весь прогресс, монетки и награды игрока «{active.name}»? Это нельзя отменить.</Text>
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
  who: { fontSize: 22, fontWeight: '900', color: C.ink },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 12, borderWidth: 2, borderColor: C.line },
  statValue: { fontSize: 22, fontWeight: '900', color: C.ink },
  statLabel: { fontSize: 12, fontWeight: '700', color: C.muted },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 2, borderColor: C.line, gap: 8 },
  h3: { fontSize: 18, fontWeight: '900', color: C.ink },
  label: { fontSize: 14, fontWeight: '800', color: C.muted, marginTop: 4 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150 },
  barCol: { alignItems: 'center', flex: 1, gap: 4 },
  bar: { width: 22, borderRadius: 6, backgroundColor: C.primary },
  barValue: { fontSize: 12, fontWeight: '800', color: C.muted },
  barLabel: { fontSize: 13, fontWeight: '800', color: C.muted },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportName: { width: 118, fontSize: 14, fontWeight: '800', color: C.ink },
  reportTrack: { flex: 1, height: 10, backgroundColor: C.line, borderRadius: 5, overflow: 'hidden' },
  reportFill: { height: '100%', borderRadius: 5 },
  reportPct: { width: 42, textAlign: 'right', fontSize: 14, fontWeight: '900', color: C.ink },
  hardList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hardItem: { flexDirection: 'row', gap: 4, backgroundColor: '#FFF0E2', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  hardText: { fontSize: 15, fontWeight: '800', color: C.ink },
  hardMiss: { fontSize: 13, fontWeight: '900', color: C.bad },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicName: { fontSize: 16, fontWeight: '900', width: 110 },
  topicLvl: { flex: 1, fontSize: 14, fontWeight: '700', color: C.muted },
  topicStars: { fontSize: 14, fontWeight: '800', color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, borderColor: C.line, backgroundColor: C.bg },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 14, fontWeight: '800', color: C.ink },
  input: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.line,
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: C.ink,
  },
  kidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  kidName: { fontSize: 17, fontWeight: '800', color: C.ink },
  delete: { fontSize: 15, fontWeight: '800', color: C.bad },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  note: { fontSize: 15, color: C.ink, lineHeight: 21 },
  small: { fontSize: 13, color: C.muted, fontWeight: '600', lineHeight: 18 },
});
