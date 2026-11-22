import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Hopping } from '@/components/Anim';
import { BackBar } from '@/components/BackBar';
import { Mascot } from '@/components/Mascot';
import { C, Stars, tap } from '@/components/ui';
import { LANDS } from '@/lib/lands';
import { LEVEL_NAMES, MAX_LEVEL, topicById } from '@/lib/math';
import { useProgress } from '@/lib/progress';


const ROW = 118;
const NODE = 74;
/** Horizontal position of each level (fraction of width) — makes a winding path. */
const XS = [0.5, 0.25, 0.5, 0.75, 0.5];

export default function TopicMap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = topicById(id);
  const { progress } = useProgress();
  const [width, setWidth] = useState(0);

  if (!topic) {
    return (
      <SafeAreaView style={s.root}>
        <BackBar title="Не найдено" />
      </SafeAreaView>
    );
  }

  const land = LANDS[topic.id];
  const unlocked = progress.unlocked[topic.id];
  const height = (MAX_LEVEL + 1) * ROW + 20;
  // Level 1 at the bottom, the trophy at the top.
  const pos = (level: number) => ({ x: XS[(level - 1) % XS.length] * width, y: (MAX_LEVEL - level + 1) * ROW + ROW / 2 });
  const trophy = { x: width / 2, y: ROW / 2 };
  const points = [...Array.from({ length: MAX_LEVEL }, (_, i) => pos(i + 1)), trophy];
  const path = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      return `Q ${prev.x} ${(prev.y + p.y) / 2} ${(prev.x + p.x) / 2} ${(prev.y + p.y) / 2} T ${p.x} ${p.y}`;
    })
    .join(' ');
  const allDone = Array.from({ length: MAX_LEVEL }, (_, i) => progress.best[`${topic.id}-${i + 1}`] ?? 0).every((n) => n >= 2);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: topic.color + '14' }]}>
      <BackBar title={topic.title} />
      <Text style={[s.land, { color: topic.color }]}>{land.name}</Text>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <>
              <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
                <Path d={path} stroke={topic.color + '55'} strokeWidth={14} fill="none" strokeLinecap="round" />
                <Path d={path} stroke="#fff" strokeWidth={4} strokeDasharray="2 14" fill="none" strokeLinecap="round" />
              </Svg>

              {/* scenery on the side away from the path */}
              {points.map((p, i) => (
                <Text
                  key={`d${i}`}
                  style={[s.deco, { left: p.x < width / 2 ? width - 70 : 16, top: p.y - 26 }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {land.deco[i % land.deco.length]}
                </Text>
              ))}

              <View style={[s.trophy, { left: trophy.x - 34, top: trophy.y - 34, opacity: allDone ? 1 : 0.45 }]}>
                <Text style={{ fontSize: 44 }}>{allDone ? '🏆' : '🏁'}</Text>
              </View>

              {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level) => {
                const p = pos(level);
                const open = level <= unlocked;
                const best = progress.best[`${topic.id}-${level}`] ?? 0;
                return (
                  <View key={level} style={[s.nodeWrap, { left: p.x - 70, top: p.y - NODE / 2 }]}>
                    <Pressable
                      disabled={!open}
                      accessibilityRole="button"
                      accessibilityLabel={`Уровень ${level}, ${LEVEL_NAMES[topic.id][level - 1]}${open ? '' : ', закрыт'}`}
                      onPress={() => {
                        tap();
                        router.push({ pathname: '/play/[topic]', params: { topic: topic.id, level: String(level) } });
                      }}
                      style={({ pressed }) => [
                        s.node,
                        { backgroundColor: open ? topic.color : '#CDBFB2', transform: [{ scale: pressed ? 0.92 : 1 }] },
                        level === unlocked && s.current,
                      ]}
                    >
                      <Text style={s.nodeText}>{open ? level : '🔒'}</Text>
                    </Pressable>
                    {open ? <Stars n={best} size={16} /> : null}
                    <Text style={s.nodeLabel}>{LEVEL_NAMES[topic.id][level - 1]}</Text>
                  </View>
                );
              })}

              {/* Счётик waits next to the newest open level */}
              {(() => {
                const p = pos(unlocked);
                const left = p.x < width / 2 ? p.x + 34 : p.x - 34 - 70;
                return (
                  <View style={{ position: 'absolute', left, top: p.y - 58 }} pointerEvents="none">
                    <Hopping height={8} duration={600}>
                      <Mascot size={70} mood="happy" hat={progress.hat} />
                    </Hopping>
                  </View>
                );
              })()}
            </>
          )}
        </View>
        <Text style={s.hint}>Пройди уровень на 2 звезды, чтобы открыть следующий</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  land: { fontSize: 17, fontWeight: '900', textAlign: 'center', marginTop: -4 },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 480, width: '100%', alignSelf: 'center' },
  deco: { position: 'absolute', fontSize: 40 },
  trophy: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: C.gold,
  },
  nodeWrap: { position: 'absolute', width: 140, alignItems: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  current: { borderColor: C.gold },
  nodeText: { color: '#fff', fontSize: 30, fontWeight: '900' },
  nodeLabel: { fontSize: 13, fontWeight: '800', color: C.muted, textAlign: 'center' },
  hint: { fontSize: 15, color: C.muted, fontWeight: '700', textAlign: 'center', marginTop: 8 },
});
