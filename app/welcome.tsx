import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Text } from '../components/Handwriting';

const FACE = 230;
const HOLD_MS = 1200;
/** Beat between the face filling up and the app opening. */
const SETTLE_MS = 900;

const ink = '#2F2A26';
const paper = '#EFE9DE';
const crayon = '#F5DE3F';

/** Open circle: wobbly, drawn in one stroke with the gap at the top left. */
const RING =
  'M67.9 31.1 Q82.8 22.5 100 21 Q132.3 22 154.4 45.6 Q178.5 67.5 180 100 ' +
  'Q178 132.3 153.7 153.7 Q132.1 177.5 100 179 Q67.7 178 45.6 154.4 ' +
  'Q22 132.3 21 100 Q23 86.4 29.5 74.3';

/** Back-and-forth crayon passes, the way the sketch is coloured in. */
const SCRIBBLE = [
  'M30 34 Q100 25 170 30 Q100 44 38 43',
  'M36 51 Q101 56 166 47 Q101 61 44 60',
  'M30 68 Q100 59 170 64 Q100 78 38 77',
  'M36 85 Q101 90 166 81 Q101 95 44 94',
  'M30 102 Q100 93 170 98 Q100 112 38 111',
  'M36 119 Q101 124 166 115 Q101 129 44 128',
  'M30 136 Q100 127 170 132 Q100 146 38 145',
  'M36 153 Q101 158 166 149 Q101 163 44 162',
  'M30 170 Q100 161 170 166 Q100 180 38 179',
];

const SPARKLE = 'M12 0 Q14 10 24 12 Q14 14 12 24 Q10 14 0 12 Q10 10 12 0 Z';
const STAR = 'M15 1 L19.5 11 L30 12 L22 19 L24.5 30 L15 24 L5.5 30 L8 19 L0 12 L10.5 11 Z';

type SparkProps = {
  at: { top?: number; bottom?: number; left?: number; right?: number };
  size: number;
  delay: number;
  tilt: string;
  on: boolean;
  children: React.ReactNode;
};

function Spark({ at, size, delay, tilt, on, children }: SparkProps) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pop, {
      toValue: on ? 1 : 0,
      delay: on ? delay : 0,
      duration: on ? 300 : 150,
      easing: on ? Easing.out(Easing.back(2.4)) : Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [on, delay, pop]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.spark,
        at,
        { width: size, height: size, opacity: pop, transform: [{ scale: pop }, { rotate: tilt }] },
      ]}
    >
      {children}
    </Animated.View>
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
        Animated.spring(squish, { toValue: 1.07, friction: 4, useNativeDriver: true }),
        Animated.spring(squish, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
      setTimeout(() => router.replace('/onboarding'), SETTLE_MS);
    });
  }, [fill, router, squish]);

  const release = useCallback(() => {
    if (done.current) return;
    Animated.timing(fill, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fill]);

  const fillHeight = fill.interpolate({ inputRange: [0, 1], outputRange: [0, FACE] });
  const smile = fill.interpolate({ inputRange: [0.5, 0.95], outputRange: [0, 1], extrapolate: 'clamp' });
  const flat = fill.interpolate({ inputRange: [0.3, 0.65], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.stage, { transform: [{ scale: squish }] }]}>
        <Pressable
          onPressIn={hold}
          onPressOut={release}
          accessibilityRole="button"
          accessibilityLabel="Hold to get started"
          style={styles.face}
        >
          {/* Crayon rises from the bottom of the face as the hold goes on. */}
          <Animated.View style={[styles.fill, { height: fillHeight }]} pointerEvents="none">
            <Svg width={FACE} height={FACE} viewBox="0 0 200 200" style={styles.fillArt}>
              <Defs>
                <ClipPath id="face">
                  <Circle cx="100" cy="100" r="76" />
                </ClipPath>
              </Defs>
              {/* Overlapping half-opaque passes: where they cross reads darker,
                  the way a crayon does, instead of one flat disc of colour. */}
              <G clipPath="url(#face)" opacity={0.95}>
                {SCRIBBLE.map((d) => (
                  <Path
                    key={d}
                    d={d}
                    stroke={crayon}
                    strokeWidth={15}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.5}
                  />
                ))}
                <G transform="rotate(-24 100 100)">
                  {SCRIBBLE.map((d) => (
                    <Path
                      key={d}
                      d={d}
                      stroke={crayon}
                      strokeWidth={15}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={0.45}
                    />
                  ))}
                </G>
              </G>
            </Svg>
          </Animated.View>

          <Svg width={FACE} height={FACE} viewBox="0 0 200 200" style={styles.ink} pointerEvents="none">
            <Path d={RING} stroke={ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />
            <Ellipse cx="78" cy="94" rx="4.6" ry="5.2" fill={ink} />
            <Ellipse cx="124" cy="94" rx="4.6" ry="5.2" fill={ink} />
          </Svg>

          <Animated.View style={[styles.mouth, { opacity: flat }]} pointerEvents="none">
            <Svg width={FACE} height={FACE} viewBox="0 0 200 200">
              <Path d="M84 126 Q100 124 116 126" stroke={ink} strokeWidth={3.2} strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>

          <Animated.View style={[styles.mouth, { opacity: smile }]} pointerEvents="none">
            <Svg width={FACE} height={FACE} viewBox="0 0 200 200">
              <Path d="M82 122 Q100 142 118 121" stroke={ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>
        </Pressable>

        <Spark at={{ top: -4, left: -14 }} size={38} delay={0} tilt="-6deg" on={full}>
          <Svg width="100%" height="100%" viewBox="0 0 24 24">
            <Path d={SPARKLE} stroke={ink} strokeWidth={1.6} fill="none" />
          </Svg>
        </Spark>
        <Spark at={{ top: 16, left: 30 }} size={12} delay={120} tilt="10deg" on={full}>
          <Svg width="100%" height="100%" viewBox="0 0 24 24">
            <Path d={SPARKLE} stroke={ink} strokeWidth={2.4} fill="none" />
          </Svg>
        </Spark>
        <Spark at={{ bottom: 44, right: -18 }} size={34} delay={80} tilt="8deg" on={full}>
          <Svg width="100%" height="100%" viewBox="0 0 24 24">
            <Path d={SPARKLE} stroke={ink} strokeWidth={1.6} fill="none" />
          </Svg>
        </Spark>
        <Spark at={{ bottom: 74, right: -34 }} size={16} delay={200} tilt="-12deg" on={full}>
          <Svg width="100%" height="100%" viewBox="0 0 24 24">
            <Path d={SPARKLE} stroke={ink} strokeWidth={2.2} fill="none" />
          </Svg>
        </Spark>
        <Spark at={{ bottom: 6, left: -28 }} size={42} delay={150} tilt="-14deg" on={full}>
          <Svg width="100%" height="100%" viewBox="0 0 30 31">
            <Path d={STAR} stroke={ink} strokeWidth={1.7} strokeLinejoin="round" fill="none" />
          </Svg>
        </Spark>
        <Spark at={{ bottom: -4, left: 8 }} size={22} delay={230} tilt="16deg" on={full}>
          <Svg width="100%" height="100%" viewBox="0 0 30 31">
            <Path d={STAR} fill={ink} />
          </Svg>
        </Spark>
      </Animated.View>

      <Text style={styles.hint}>{full ? '' : 'hold to get started...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: paper,
    gap: 40,
  },
  stage: {
    width: FACE,
    height: FACE,
  },
  face: {
    width: FACE,
    height: FACE,
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  fillArt: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  ink: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  mouth: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  spark: {
    position: 'absolute',
  },
  hint: {
    fontSize: 15,
    letterSpacing: 0.6,
    color: ink,
    // Sits under the face and a little to the right, as in the sketch.
    marginLeft: 70,
    height: 20,
  },
});
