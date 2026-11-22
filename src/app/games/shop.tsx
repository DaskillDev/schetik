import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PopIn, Shake } from '@/components/Anim';
import { BackBar } from '@/components/BackBar';
import { GameEnd } from '@/components/GameEnd';
import { Mascot, type Mood } from '@/components/Mascot';
import { RestGuard } from '@/components/RestGuard';
import { Btn, C, Pill, tap } from '@/components/ui';
import { plural } from '@/lib/math';
import { useProgress, type GameResult } from '@/lib/progress';
import { say } from '@/lib/speech';

const TASKS = 8;
const COLOR = '#00897B';
const COINS = [1, 2, 5, 10, 50];
const GOODS = [
  { emoji: '🍦', name: 'Мороженое' },
  { emoji: '🍎', name: 'Яблоко' },
  { emoji: '🧃', name: 'Сок' },
  { emoji: '🎈', name: 'Шарик' },
  { emoji: '🍪', name: 'Печенье' },
  { emoji: '✏️', name: 'Карандаш' },
  { emoji: '🧸', name: 'Мишка' },
  { emoji: '⚽', name: 'Мяч' },
  { emoji: '🍌', name: 'Бананы' },
  { emoji: '📒', name: 'Тетрадка' },
  { emoji: '🎨', name: 'Краски' },
  { emoji: '🍫', name: 'Шоколадка' },
];

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

function makeTasks() {
  const goods = [...GOODS].sort(() => Math.random() - 0.5);
  return Array.from({ length: TASKS }, (_, i) => ({
    ...goods[i],
    // Prices grow: up to 20 ₽, then up to 60 ₽, then up to 99 ₽.
    price: i < 3 ? rnd(3, 20) : i < 6 ? rnd(15, 60) : rnd(30, 99),
  }));
}

export default function Shop() {
  const { progress } = useProgress();
  const [run, setRun] = useState(0);
  const [end, setEnd] = useState<{ score: number; res: GameResult } | null>(null);
  if (end) {
    return (
      <GameEnd
        title="Все покупки сделаны!"
        big={`${end.score} из ${TASKS}`}
        lines={['оплачено с первой попытки']}
        coins={end.res.coinsEarned}
        newRecord={end.res.newRecord && end.score > 0}
        color={COLOR}
        hat={progress.hat}
        onAgain={() => {
          setEnd(null);
          setRun((n) => n + 1);
        }}
      />
    );
  }
  return (
    <RestGuard>
      <Game key={run} onEnd={(score, res) => setEnd({ score, res })} />
    </RestGuard>
  );
}

function CoinView({ value, size = 58 }: { value: number; size?: number }) {
  const gold = value >= 10;
  return (
    <View
      style={[
        s.coin,
        { width: size, height: size, borderRadius: size / 2 },
        gold ? { backgroundColor: '#FFCA28', borderColor: '#E0A000' } : { backgroundColor: '#E0E0E0', borderColor: '#A8A8A8' },
      ]}
    >
      <Text style={[s.coinText, { fontSize: size * 0.32 }]}>{value}</Text>
      <Text style={[s.coinRub, { fontSize: size * 0.2 }]}>₽</Text>
    </View>
  );
}

function Game({ onEnd }: { onEnd: (score: number, res: GameResult) => void }) {
  const { progress, finishGame } = useProgress();
  const tasks = useMemo(makeTasks, []);
  const [index, setIndex] = useState(0);
  const [tray, setTray] = useState<number[]>([]);
  const [mood, setMood] = useState<Mood>('happy');
  const [msg, setMsg] = useState('');
  const [shake, setShake] = useState(0);
  const [paid, setPaid] = useState(false);
  const score = useRef(0);
  const firstTry = useRef(true);
  const started = useRef(Date.now());
  const item = tasks[index];
  const sum = tray.reduce((a, b) => a + b, 0);

  useEffect(() => {
    const it = tasks[index];
    setMsg(`${it.name} стоит ${it.price} ₽. Заплати ровно столько!`);
    const t = setTimeout(() => say(`${it.name} стоит ${it.price} ${plural(it.price, ['рубль', 'рубля', 'рублей'])}. Заплати ровно столько!`), 250);
    return () => clearTimeout(t);
  }, [index, tasks]);

  const pay = () => {
    if (paid || !tray.length) return;
    if (sum === item.price) {
      if (firstTry.current) score.current += 1;
      setPaid(true);
      setMood('cheer');
      setMsg('Спасибо за покупку! 🛍️');
      say('Спасибо за покупку!');
      tap('success', 'coin');
      setTimeout(() => {
        if (index + 1 >= TASKS) {
          const res = finishGame('shop', {
            answered: TASKS,
            correct: score.current,
            seconds: (Date.now() - started.current) / 1000,
            coins: score.current + 3,
            record: score.current,
          });
          onEnd(score.current, res);
          return;
        }
        setIndex(index + 1);
        setTray([]);
        setPaid(false);
        setMood('happy');
        firstTry.current = true;
      }, 1100);
    } else {
      firstTry.current = false;
      setMood('oops');
      setShake((n) => n + 1);
      const diff = sum > item.price ? `Это на ${sum - item.price} ₽ больше.` : `Не хватает ${item.price - sum} ₽.`;
      setMsg(`У тебя ${sum} ₽, а нужно ${item.price} ₽. ${diff}`);
      say(sum > item.price ? 'Многовато! Убери лишние монетки.' : 'Маловато! Добавь ещё монеток.');
      tap('error');
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <BackBar title="Магазин" right={<Pill>🛒 {index + 1}/{TASKS}</Pill>} />
      <View style={s.body}>
        <View style={s.top}>
          <Mascot size={78} mood={mood} hat={progress.hat} />
          <View style={s.bubble}>
            <Text style={s.bubbleText}>{msg}</Text>
          </View>
        </View>

        <Shake trigger={shake}>
          <PopIn key={index} style={s.counter}>
            <Text style={{ fontSize: 64 }}>{item.emoji}</Text>
            <View>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.price}>{item.price} ₽</Text>
            </View>
          </PopIn>
        </Shake>

        <View style={s.trayBox}>
          <Text style={s.trayLabel}>
            Ты платишь: <Text style={{ color: sum === item.price ? C.good : C.ink }}>{sum} ₽</Text>
          </Text>
          <View style={s.tray}>
            {tray.length === 0 ? (
              <Text style={s.trayEmpty}>Нажимай на монетки внизу 👇</Text>
            ) : (
              tray.map((v, i) => (
                <Pressable
                  key={`${i}-${v}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Убрать ${v} рублей`}
                  disabled={paid}
                  onPress={() => {
                    tap();
                    setTray((t) => t.filter((_, j) => j !== i));
                  }}
                >
                  <CoinView value={v} size={42} />
                </Pressable>
              ))
            )}
          </View>
          {tray.length > 0 && <Text style={s.trayHint}>Нажми на монетку, чтобы убрать</Text>}
        </View>

        <View style={s.wallet}>
          {COINS.map((v) => (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityLabel={`Добавить ${v} рублей`}
              disabled={paid}
              onPress={() => {
                tap();
                setTray((t) => [...t, v].sort((a, b) => b - a));
              }}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}
            >
              <CoinView value={v} />
            </Pressable>
          ))}
        </View>
        <Btn big title="Оплатить" color={COLOR} onPress={pay} disabled={paid || !tray.length} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: 16, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubble: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 12, borderWidth: 2, borderColor: C.line },
  bubbleText: { fontSize: 17, fontWeight: '800', color: C.ink },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 3,
    borderColor: C.line,
  },
  itemName: { fontSize: 20, fontWeight: '800', color: C.muted },
  price: { fontSize: 40, fontWeight: '900', color: COLOR },
  trayBox: { backgroundColor: '#E0F2F1', borderRadius: 20, padding: 12, gap: 8, minHeight: 120 },
  trayLabel: { fontSize: 20, fontWeight: '900', color: C.ink },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  trayEmpty: { fontSize: 15, fontWeight: '700', color: C.muted },
  trayHint: { fontSize: 12, fontWeight: '700', color: C.muted },
  wallet: { flexDirection: 'row', justifyContent: 'space-between' },
  coin: { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  coinText: { fontWeight: '900', color: '#4E3B1F', lineHeight: undefined },
  coinRub: { fontWeight: '900', color: '#4E3B1F', marginTop: -4 },
});
