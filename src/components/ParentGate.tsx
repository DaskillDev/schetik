import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Btn, C } from '@/components/ui';

/** A two-digit multiplication, typed in — hard for young kids, trivial for adults. */
function makeGate() {
  const a = 12 + Math.floor(Math.random() * 18);
  const b = 3 + Math.floor(Math.random() * 6);
  return { a, b, answer: a * b };
}

export function ParentGate({ onPass, title = 'Этот раздел для взрослых' }: { onPass: () => void; title?: string }) {
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
      <Text style={s.title}>{title}</Text>
      <Text style={s.text}>Чтобы продолжить, решите пример:</Text>
      <Text style={s.expr}>
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

const s = StyleSheet.create({
  gate: { padding: 24, gap: 14, alignItems: 'stretch', maxWidth: 420, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: C.ink, textAlign: 'center' },
  text: { fontSize: 17, color: C.muted, fontWeight: '600', textAlign: 'center' },
  expr: { fontSize: 40, fontWeight: '900', color: C.ink, textAlign: 'center' },
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
});
