import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

const NATIVE = true;

/** Gently hops up and down forever — makes Счётик feel alive. */
export function Hopping({ children, height = 6, duration = 900 }: { children: ReactNode; height?: number; duration?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -height] });
  const scaleY = v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.02] });
  return <Animated.View style={{ transform: [{ translateY }, { scaleY }] }}>{children}</Animated.View>;
}

/** Pops in with a springy scale after `delay` ms. */
export function PopIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: NATIVE }),
    ]).start();
  }, [v, delay]);
  return <Animated.View style={[style, { opacity: v, transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** Left-right wiggle; bump `trigger` to play it again (e.g. on a wrong answer). */
export function Shake({ trigger, children }: { trigger: number; children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 400, easing: Easing.linear, useNativeDriver: NATIVE }).start();
  }, [trigger, v]);
  const translateX = v.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -8, 8, -6, 4, 0] });
  return <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>;
}

const COLORS = ['#FF5252', '#FFC107', '#4CAF50', '#2196F3', '#9C27B0', '#FF8A3D', '#E91E63'];

/** Confetti burst over the whole screen. Change `burst` to fire again; 0 = nothing. */
export function Confetti({ burst, count = 36 }: { burst: number; count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 120,
        size: 7 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 300,
        duration: 1400 + Math.random() * 900,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
        round: Math.random() < 0.3,
        v: new Animated.Value(0),
      })),
    // New pieces for every burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst, count, width],
  );

  useEffect(() => {
    if (!burst) return;
    Animated.parallel(
      pieces.map((p) =>
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.v, { toValue: 1, duration: p.duration, easing: Easing.in(Easing.quad), useNativeDriver: NATIVE }),
        ]),
      ),
    ).start();
  }, [burst, pieces]);

  if (!burst) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            borderRadius: p.round ? p.size / 2 : 2,
            backgroundColor: p.color,
            opacity: p.v.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
