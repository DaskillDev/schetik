import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/components/ui';
import { fitFont, type Question } from '@/lib/math';

/** The question: an expression, or pictures to count. */
export function QuestionCard({
  q,
  revealed,
  counter,
  verdict,
  onRepeat,
}: {
  q: Question;
  revealed: boolean;
  counter?: string;
  /** Colours the card after answering. */
  verdict?: 'good' | 'bad';
  /** Shows a 🔈 button that reads the question again. */
  onRepeat?: () => void;
}) {
  const text = revealed ? q.reveal : q.text;
  const total = q.groups?.reduce((s, g) => s + g.n, 0) ?? 0;
  const emojiSize = total <= 10 ? 34 : 26;
  return (
    <View style={[s.card, verdict && { borderColor: verdict === 'good' ? C.good : C.bad }]}>
      {onRepeat ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Прочитать вслух" onPress={onRepeat} hitSlop={10} style={s.repeat}>
          <Text style={{ fontSize: 18 }}>🔈</Text>
        </Pressable>
      ) : null}
      {counter ? <Text style={s.counter}>{counter}</Text> : null}
      {q.groups ? (
        <View style={s.groups} accessibilityLabel={q.groups.map((g) => `${g.n} ${g.emoji}`).join(' и ')}>
          {q.groups.map((g, gi) => (
            <Text key={gi} style={[s.emoji, { fontSize: emojiSize, lineHeight: emojiSize * 1.25 }]}>
              {/* rows of five are easier to count */}
              {Array.from({ length: Math.ceil(g.n / 5) }, (_, r) =>
                Array.from({ length: Math.min(5, g.n - r * 5) }, () => g.emoji).join(' '),
              ).join('\n')}
            </Text>
          ))}
        </View>
      ) : null}
      <Text
        style={[s.expr, { fontSize: fitFont(text, q.groups ? 34 : 52) }]}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

export function Options({
  q,
  picked,
  color,
  onPick,
}: {
  q: Question;
  picked: string | null;
  color: string;
  onPick: (value: string) => void;
}) {
  const three = q.options.length === 3;
  return (
    <View style={s.grid}>
      {q.options.map((opt) => {
        const isAnswer = opt === q.answer;
        const isPicked = opt === picked;
        let bg = C.card;
        let fg = C.ink;
        if (picked !== null && isAnswer) {
          bg = C.good;
          fg = '#fff';
        } else if (isPicked) {
          bg = C.bad;
          fg = '#fff';
        }
        return (
          <Pressable
            key={opt}
            accessibilityRole="button"
            accessibilityLabel={`Ответ ${opt}`}
            onPress={() => onPick(opt)}
            style={({ pressed }) => [
              s.option,
              three && s.optionThree,
              { backgroundColor: bg, borderColor: picked === null ? color : bg },
              { transform: [{ scale: pressed && picked === null ? 0.95 : 1 }] },
            ]}
          >
            <Text style={[s.optionText, three && { fontSize: 48 }, { color: fg }]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: C.line,
    gap: 6,
  },
  counter: { fontSize: 15, fontWeight: '800', color: C.muted },
  repeat: { position: 'absolute', top: 10, right: 12, zIndex: 1 },
  groups: { alignItems: 'center', gap: 6 },
  emoji: { textAlign: 'center' },
  expr: { fontWeight: '900', color: C.ink, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  option: {
    width: '47%',
    flexGrow: 1,
    aspectRatio: 1.6,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionThree: { width: '30%', aspectRatio: 1 },
  optionText: { fontSize: 40, fontWeight: '900' },
});
