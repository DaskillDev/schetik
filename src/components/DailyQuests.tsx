import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, tap } from '@/components/ui';
import { dayKey, useProgress } from '@/lib/progress';
import { CHEST_BONUS, questsFor } from '@/lib/quests';

export function DailyQuests() {
  const { today, claimedToday, claimQuest } = useProgress();
  const quests = useMemo(() => questsFor(dayKey()), []);
  const [note, setNote] = useState<string | null>(null);
  const allClaimed = quests.every((q) => claimedToday.includes(q.id));

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.title}>Задания дня</Text>
        <Text style={s.chest}>{allClaimed ? '🎉 Сундук открыт' : `🎁 Все три: +${CHEST_BONUS} 🪙`}</Text>
      </View>
      {quests.map((q) => {
        const value = Math.min(q.value(today), q.target);
        const claimed = claimedToday.includes(q.id);
        const ready = value >= q.target && !claimed;
        return (
          <View key={q.id} style={s.row}>
            <Text style={s.icon}>{q.icon}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[s.qTitle, claimed && { color: C.muted }]}>{q.title}</Text>
              <View style={s.track}>
                <View style={[s.fill, { width: `${(value / q.target) * 100}%` }, claimed && { backgroundColor: C.good }]} />
              </View>
            </View>
            {ready ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Забрать награду: ${q.title}`}
                onPress={() => {
                  const res = claimQuest(q.id);
                  if (!res) return;
                  tap('success', res.chest ? 'chest' : 'coin');
                  setNote(res.chest ? `Сундук открыт! +${res.reward + res.chest} 🪙` : `+${res.reward} 🪙`);
                }}
                style={({ pressed }) => [s.claim, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
              >
                <Text style={s.claimText}>+{q.reward} 🪙</Text>
              </Pressable>
            ) : (
              <Text style={s.count}>{claimed ? '✅' : `${value}/${q.target}`}</Text>
            )}
          </View>
        );
      })}
      {note && <Text style={s.note}>{note}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 22, padding: 14, borderWidth: 2, borderColor: C.line, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 19, fontWeight: '900', color: C.ink },
  chest: { fontSize: 14, fontWeight: '800', color: C.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 24, width: 30, textAlign: 'center' },
  qTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  track: { height: 8, backgroundColor: C.line, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.primary, borderRadius: 4 },
  count: { fontSize: 14, fontWeight: '800', color: C.muted, minWidth: 44, textAlign: 'right' },
  claim: { backgroundColor: C.good, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
  claimText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  note: { fontSize: 15, fontWeight: '900', color: C.good, textAlign: 'center' },
});
