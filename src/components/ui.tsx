import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { playSfx, type Sfx } from '@/lib/sound';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export const C = {
  bg: '#FFF7EC',
  card: '#FFFFFF',
  ink: '#3B2A20',
  muted: '#8A7666',
  primary: '#FF8A3D',
  good: '#43A047',
  bad: '#E53935',
  gold: '#FFB300',
  line: '#F1E2D0',
};

const DEFAULT_SFX: Record<'light' | 'success' | 'error', Sfx> = { light: 'tap', success: 'correct', error: 'wrong' };

/** Feedback for a touch: a sound (unless muted) plus a vibration on phones. */
export function tap(kind: 'light' | 'success' | 'error' = 'light', sfx: Sfx = DEFAULT_SFX[kind]) {
  playSfx(sfx);
  if (Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
}

export function Btn({
  title,
  onPress,
  color = C.primary,
  textColor = '#fff',
  disabled,
  style,
  big,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        s.btn,
        big && s.btnBig,
        { backgroundColor: color, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
        style,
      ]}
    >
      <Text style={[s.btnText, big && s.btnTextBig, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <View style={s.pill}>
      <Text style={s.pillText}>{children}</Text>
    </View>
  );
}

export function Stars({ n, size = 22 }: { n: number; size?: number }) {
  return (
    <Text style={{ fontSize: size }}>
      {[0, 1, 2].map((i) => (i < n ? '⭐' : '☆')).join('')}
    </Text>
  );
}

const s = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  btnBig: { paddingVertical: 18, borderRadius: 22 },
  btnText: { fontSize: 18, fontWeight: '800' },
  btnTextBig: { fontSize: 22 },
  pill: {
    backgroundColor: C.card,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: C.line,
  },
  pillText: { fontSize: 16, fontWeight: '800', color: C.ink },
});
