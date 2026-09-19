import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Handwriting';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '../lib/theme';

const FACE = 210;
const HOLD_MS = 1100;
/** Beat between the face filling up and the app opening. */
const SETTLE_MS = 850;

const ink = '#2A1B3D';

type StarProps = { at: { top?: number; bottom?: number; left?: number; right?: number }; glyph: string; size: number; delay: number; on: boolean };

function Star({ at, glyph, size, delay, on }: StarProps) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pop, {
      toValue: on ? 1 : 0,
      delay: on ? delay : 0,
      duration: on ? 320 : 160,
      easing: on ? Easing.out(Easing.back(2.2)) : Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [on, delay, pop]);

  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.star,
        at,
        { fontSize: size, opacity: pop, transform: [{ scale: pop }, { rotate: '-8deg' }] },
      ]}
    >
      {glyph}
    </Animated.Text>
  );
}

export default function Welcome() {
  const router = useRouter();
  const fill = useRef(new Animated.Value(0)).current;
  const squish = useRef(new Animated.Value(1)).current;
  const [full, setFull] = useState(false);
  const done = useRef(false);

  const hold = useCallback(() => {
    if (done.current) return;
    Animated.timing(fill, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished || done.current) return;
      done.current = true;
      setFull(true);
      Animated.sequence([
        Animated.spring(squish, { toValue: 1.08, friction: 4, useNativeDriver: true }),
        Animated.spring(squish, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
      setTimeout(() => router.replace('/onboarding'), SETTLE_MS);
    });
  }, [fill, router, squish]);

  const release = useCallback(() => {
    if (done.current) return;
    Animated.timing(fill, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fill]);

  const fillHeight = fill.interpolate({ inputRange: [0, 1], outputRange: [0, FACE] });
  const smile = fill.interpolate({ inputRange: [0.55, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const flat = fill.interpolate({ inputRange: [0.35, 0.7], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.screen}>
      <Animated.View style={{ transform: [{ scale: squish }] }}>
        <Pressable
          onPressIn={hold}
          onPressOut={release}
          accessibilityRole="button"
          accessibilityLabel="Hold to get started"
          style={styles.face}
        >
          <Animated.View style={[styles.fill, { height: fillHeight }]} pointerEvents="none">
            {/* Two washes of yellow, so the fill reads as watercolour rather than flat paint. */}
            <LinearGradient
              colors={['#FFE98A', '#F6D330']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.wash}
            />
          </Animated.View>

          <View style={styles.eyes}>
            <View style={styles.eye} />
            <View style={styles.eye} />
          </View>

          <Animated.View style={[styles.mouthFlat, { opacity: flat }]} />
          <Animated.View style={[styles.mouthSmile, { opacity: smile }]} />
        </Pressable>

        <Star at={{ top: -6, left: -26 }} glyph="✦" size={30} delay={0} on={full} />
        <Star at={{ top: 26, left: 6 }} glyph="✧" size={16} delay={90} on={full} />
        <Star at={{ bottom: 18, right: -22 }} glyph="✦" size={26} delay={60} on={full} />
        <Star at={{ bottom: -12, left: -18 }} glyph="✧" size={34} delay={150} on={full} />
      </Animated.View>

      <Text style={styles.hint}>{full ? 'here we go...' : 'hold to get started...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 56,
  },
  face: {
    width: FACE,
    height: FACE,
    borderRadius: FACE / 2,
    borderWidth: 2.5,
    borderColor: ink,
    backgroundColor: colors.card,
    overflow: 'hidden',
    alignItems: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  wash: {
    flex: 1,
    opacity: 0.92,
  },
  eyes: {
    flexDirection: 'row',
    gap: 54,
    marginTop: FACE * 0.34,
  },
  eye: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: ink,
  },
  mouthFlat: {
    position: 'absolute',
    top: FACE * 0.62,
    width: 52,
    height: 0,
    borderBottomWidth: 2.5,
    borderColor: ink,
  },
  mouthSmile: {
    position: 'absolute',
    top: FACE * 0.54,
    width: 74,
    height: 40,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: ink,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    borderTopColor: 'transparent',
    // The side strokes only exist to curve into the smile, so they fade out.
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  star: {
    position: 'absolute',
    color: ink,
  },
  hint: {
    fontSize: 17,
    color: colors.muted,
  },
});
