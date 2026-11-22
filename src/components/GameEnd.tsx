import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti, Hopping, PopIn } from '@/components/Anim';
import { Mascot } from '@/components/Mascot';
import { Btn, C } from '@/components/ui';
import type { HatId } from '@/lib/hats';
import { plural } from '@/lib/math';
import { playSfx } from '@/lib/sound';
import { say } from '@/lib/speech';

/** Shared result screen for the mini-games. */
export function GameEnd({
  title,
  big,
  lines,
  coins,
  newRecord,
  color,
  hat,
  onAgain,
}: {
  title: string;
  big: string;
  lines: string[];
  coins: number;
  newRecord: boolean;
  color: string;
  hat: HatId;
  onAgain: () => void;
}) {
  useEffect(() => {
    playSfx(newRecord ? 'levelup' : 'win');
    const t = setTimeout(() => say(newRecord ? `${title} Новый рекорд!` : title), 600);
    return () => clearTimeout(t);
  }, [newRecord, title]);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.body}>
        <Hopping height={9} duration={480}>
          <Mascot size={150} mood="cheer" hat={hat} />
        </Hopping>
        <PopIn>
          <Text style={s.title}>{newRecord ? '🏆 Новый рекорд!' : title}</Text>
        </PopIn>
        <PopIn delay={200}>
          <Text style={[s.big, { color }]}>{big}</Text>
        </PopIn>
        {lines.map((l, i) => (
          <PopIn key={l} delay={350 + i * 120}>
            <Text style={s.line}>{l}</Text>
          </PopIn>
        ))}
        <PopIn delay={400 + lines.length * 120}>
          <Text style={[s.line, { color: '#E69500' }]}>
            +{coins} {plural(coins, ['монетка', 'монетки', 'монеток'])} 🪙
          </Text>
        </PopIn>
        <View style={{ gap: 12, marginTop: 20, alignSelf: 'stretch' }}>
          <Btn big title="Ещё раз" color={color} onPress={onAgain} />
          <Btn title="К мини-играм" color={C.card} textColor={C.ink} onPress={() => router.back()} />
        </View>
      </View>
      <Confetti burst={1} count={newRecord ? 48 : 30} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: 24, gap: 8, alignItems: 'center', justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 30, fontWeight: '900', color: C.ink, textAlign: 'center' },
  big: { fontSize: 64, fontWeight: '900' },
  line: { fontSize: 19, fontWeight: '800', color: C.ink, textAlign: 'center' },
});
