import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hopping } from '@/components/Anim';
import { BackBar } from '@/components/BackBar';
import { Mascot } from '@/components/Mascot';
import { C, Pill, tap } from '@/components/ui';
import { useProgress } from '@/lib/progress';
import { DECOR, WALLPAPERS } from '@/lib/room';

/** Счётик's room: buy furniture and wallpaper with coins. */
export default function Room() {
  const { progress, buyDecor, buyWallpaper, setWallpaper } = useProgress();
  const paper = WALLPAPERS.find((w) => w.id === progress.wallpaper) ?? WALLPAPERS[0];
  const night = paper.id === 'night';

  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Комната Счётика" right={<Pill>🪙 {progress.coins}</Pill>} />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.room, { backgroundColor: paper.wall }]}>
          <View style={[s.floor, { backgroundColor: paper.floor }]} />
          {night &&
            ['8%,8%', '30%,30%', '70%,6%', '90%,40%', '55%,44%'].map((p) => {
              const [left, top] = p.split(',');
              return (
                <Text key={p} style={[s.star, { left: left as `${number}%`, top: top as `${number}%` }]}>
                  ✨
                </Text>
              );
            })}
          <View style={[s.window, night && { backgroundColor: '#18204A' }]}>
            <View style={s.windowBarV} />
            <View style={s.windowBarH} />
            {night && <Text style={s.moon}>🌙</Text>}
          </View>
          {DECOR.filter((d) => progress.decor.includes(d.id)).map((d) => (
            <Text key={d.id} style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, fontSize: d.size }}>
              {d.emoji}
            </Text>
          ))}
          <View style={s.mascot}>
            <Hopping height={5} duration={1100}>
              <Mascot size={120} mood="happy" hat={progress.hat} />
            </Hopping>
          </View>
        </View>
        {progress.decor.length === 0 && <Text style={s.hint}>Комната пока пустая. Купи Счётику первые вещи!</Text>}

        <Text style={s.h2}>Вещи</Text>
        <View style={s.grid}>
          {DECOR.map((d) => {
            const owned = progress.decor.includes(d.id);
            const canBuy = !owned && progress.coins >= d.price;
            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityLabel={`${d.name}: ${owned ? 'уже в комнате' : `${d.price} монеток`}`}
                disabled={owned || !canBuy}
                onPress={() => {
                  if (buyDecor(d.id)) tap('success', 'coin');
                }}
                style={({ pressed }) => [
                  s.item,
                  owned && s.owned,
                  !owned && !canBuy && { opacity: 0.5 },
                  { transform: [{ scale: pressed ? 0.94 : 1 }] },
                ]}
              >
                <Text style={{ fontSize: 34 }}>{d.emoji}</Text>
                <Text style={s.name}>{d.name}</Text>
                <Text style={[s.price, owned && { color: C.good }]}>{owned ? '✓ есть' : `🪙 ${d.price}`}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.h2}>Обои</Text>
        <View style={s.grid}>
          {WALLPAPERS.map((w) => {
            const owned = progress.wallpapers.includes(w.id);
            const on = progress.wallpaper === w.id;
            const canBuy = !owned && progress.coins >= w.price;
            return (
              <Pressable
                key={w.id}
                accessibilityRole="button"
                accessibilityLabel={`Обои ${w.name}: ${on ? 'выбраны' : owned ? 'выбрать' : `${w.price} монеток`}`}
                disabled={on || (!owned && !canBuy)}
                onPress={() => {
                  if (owned) {
                    tap();
                    setWallpaper(w.id);
                  } else if (buyWallpaper(w.id)) tap('success', 'coin');
                }}
                style={({ pressed }) => [
                  s.item,
                  on && s.owned,
                  !owned && !canBuy && { opacity: 0.5 },
                  { transform: [{ scale: pressed ? 0.94 : 1 }] },
                ]}
              >
                <View style={[s.swatch, { backgroundColor: w.wall }]}>
                  <View style={[s.swatchFloor, { backgroundColor: w.floor }]} />
                </View>
                <Text style={s.name}>{w.name}</Text>
                <Text style={[s.price, on && { color: C.primary }]}>
                  {on ? 'Выбраны' : owned ? 'Выбрать' : `🪙 ${w.price}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, gap: 12, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  room: { aspectRatio: 1.1, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: C.line },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '36%' },
  window: {
    position: 'absolute',
    left: '36%',
    top: '9%',
    width: '28%',
    height: '30%',
    backgroundColor: '#BFE6FF',
    borderRadius: 8,
    borderWidth: 5,
    borderColor: '#fff',
  },
  windowBarV: { position: 'absolute', left: '48%', top: 0, bottom: 0, width: 4, backgroundColor: '#fff' },
  windowBarH: { position: 'absolute', top: '48%', left: 0, right: 0, height: 4, backgroundColor: '#fff' },
  moon: { position: 'absolute', right: 4, top: 2, fontSize: 18 },
  star: { position: 'absolute', fontSize: 16 },
  mascot: { position: 'absolute', left: '50%', bottom: '4%', marginLeft: -60 },
  hint: { fontSize: 16, fontWeight: '700', color: C.muted, textAlign: 'center' },
  h2: { fontSize: 22, fontWeight: '900', color: C.ink, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: {
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
  owned: { borderColor: C.primary, backgroundColor: '#FFF0E2' },
  name: { fontSize: 14, fontWeight: '800', color: C.ink, textAlign: 'center' },
  price: { fontSize: 14, fontWeight: '800', color: C.muted },
  swatch: { width: 44, height: 40, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: C.line },
  swatchFloor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%' },
});
