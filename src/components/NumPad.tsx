import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, tap } from '@/components/ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];

/** On-screen number keypad for typing an answer (higher levels — no guessing from options). */
export function NumPad({
  value,
  onChange,
  onSubmit,
  color,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  color: string;
  disabled?: boolean;
}) {
  const press = (k: string) => {
    if (disabled) return;
    if (k === '✓') {
      if (value) onSubmit();
      return;
    }
    tap();
    if (k === '⌫') onChange(value.slice(0, -1));
    else if (value.length < 5) onChange(value === '0' ? k : value + k);
  };
  return (
    <View style={s.grid}>
      {KEYS.map((k) => {
        const ok = k === '✓';
        return (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={ok ? 'Проверить' : k === '⌫' ? 'Стереть' : k}
            disabled={disabled || (ok && !value)}
            onPress={() => press(k)}
            style={({ pressed }) => [
              s.key,
              ok && { backgroundColor: color, borderColor: color, opacity: value ? 1 : 0.4 },
              { transform: [{ scale: pressed ? 0.93 : 1 }] },
            ]}
          >
            <Text style={[s.keyText, ok && { color: '#fff' }]}>{k}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: {
    width: '31%',
    flexGrow: 1,
    height: 58,
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 28, fontWeight: '900', color: C.ink },
});
