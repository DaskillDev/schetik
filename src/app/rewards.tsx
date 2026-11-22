import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackBar } from '@/components/BackBar';
import { Mascot } from '@/components/Mascot';
import { C, Pill, tap } from '@/components/ui';
import { achievements } from '@/lib/achievements';
import { HATS } from '@/lib/hats';
import { useProgress } from '@/lib/progress';

export default function Rewards() {
  const { progress, buyHat, wearHat } = useProgress();
  const list = achievements(progress);

  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Награды" right={<Pill>🪙 {progress.coins}</Pill>} />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={{ alignItems: 'center' }}>
          <Mascot size={170} mood="cheer" hat={progress.hat} />
          <Text style={s.hint}>Решай примеры, собирай монетки и наряжай Счётика!</Text>
        </View>
        <View style={s.grid}>
          {HATS.map((h) => {
            const owned = progress.hats.includes(h.id);
            const worn = progress.hat === h.id;
            const canBuy = !owned && progress.coins >= h.price;
            const label = worn ? 'Надето' : owned ? 'Надеть' : `🪙 ${h.price}`;
            return (
              <Pressable
                key={h.id}
                accessibilityRole="button"
                accessibilityLabel={`${h.name}: ${label}`}
                disabled={worn || (!owned && !canBuy)}
                onPress={() => {
                  if (owned) {
                    tap();
                    wearHat(h.id);
                  } else if (buyHat(h.id)) {
                    tap('success', 'coin');
                  }
                }}
                style={({ pressed }) => [
                  s.item,
                  worn && { borderColor: C.primary, backgroundColor: '#FFF0E2' },
                  !owned && !canBuy && { opacity: 0.55 },
                  { transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
              >
                <Mascot size={80} hat={h.id} />
                <Text style={s.name}>{h.name}</Text>
                <Text style={[s.price, worn && { color: C.primary }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.h2}>
          Достижения · {list.filter((a) => a.value >= a.target).length}/{list.length}
        </Text>
        <View style={s.grid}>
          {list.map((a) => {
            const done = a.value >= a.target;
            return (
              <View
                key={a.id}
                style={[s.badge, done && { borderColor: C.gold, backgroundColor: '#FFF8E1' }]}
                accessibilityLabel={`${a.title}: ${a.desc}. ${done ? 'Получено' : `${Math.min(a.value, a.target)} из ${a.target}`}`}
              >
                <Text style={[s.badgeIcon, !done && { opacity: 0.3 }]}>{a.icon}</Text>
                <Text style={s.name}>{a.title}</Text>
                <Text style={s.desc}>{a.desc}</Text>
                {!done && (
                  <View style={s.track}>
                    <View style={[s.fill, { width: `${(Math.min(a.value, a.target) / a.target) * 100}%` }]} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  hint: { fontSize: 17, fontWeight: '700', color: C.muted, textAlign: 'center', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: C.line,
  },
  name: { fontSize: 15, fontWeight: '800', color: C.ink, marginTop: 4, textAlign: 'center' },
  price: { fontSize: 15, fontWeight: '800', color: C.muted, marginTop: 2 },
  h2: { fontSize: 22, fontWeight: '900', color: C.ink, marginTop: 8 },
  badge: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 10,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: C.line,
    gap: 2,
  },
  badgeIcon: { fontSize: 34 },
  desc: { fontSize: 12, fontWeight: '700', color: C.muted, textAlign: 'center' },
  track: { alignSelf: 'stretch', height: 6, backgroundColor: C.line, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', backgroundColor: C.primary },
});
