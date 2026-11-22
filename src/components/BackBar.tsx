import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, tap } from './ui';

export function BackBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={s.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Назад"
        hitSlop={12}
        onPress={() => {
          tap();
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
        style={s.back}
      >
        <Text style={s.backText}>‹</Text>
      </Pressable>
      <Text style={s.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={s.right}>{right}</View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.line,
  },
  backText: { fontSize: 32, lineHeight: 34, fontWeight: '900', color: C.ink, marginTop: -3 },
  title: { flex: 1, fontSize: 22, fontWeight: '900', color: C.ink },
  right: { minWidth: 44, alignItems: 'flex-end' },
});
