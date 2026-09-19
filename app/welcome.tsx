import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const paper = require('../assets/welcome/paper.png');
const faceOutline = require('../assets/welcome/face-outline.png');
const faceFilled = require('../assets/welcome/face-filled.png');
const sparkleBig = require('../assets/welcome/sparkle-big.png');
const sparklePair = require('../assets/welcome/sparkle-pair.png');
const star = require('../assets/welcome/star.png');
const hint = require('../assets/welcome/hint.png');

const FACE = 250;
const HOLD_MS = 1200;
/** Beat between the face filling up and the app opening. */
const SETTLE_MS = 900;

type SparkProps = {
  source: number;
  at: { top: number; left: number };
  width: number;
  height: number;
  delay: number;
  on: boolean;
};

function Spark({ source, at, width, height, delay, on }: SparkProps) {
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
    <Animated.Image
      source={source}
      resizeMode="contain"
      style={[
        styles.spark,
        at,
        { width, height, opacity: pop, transform: [{ scale: pop }] },
      ]}
    />
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
      setTimeout(() => router.replace('/avatar'), SETTLE_MS);
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
  const hintFade = fill.interpolate({
    inputRange: [0, 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <ImageBackground source={paper} resizeMode="cover" style={styles.screen}>
      <Animated.View style={[styles.stage, { transform: [{ scale: squish }] }]}>
        <Pressable onPressIn={hold} onPressOut={release} style={styles.face}>
          <Animated.Image source={faceOutline} resizeMode="contain" style={styles.outline} />

          <Animated.View style={[styles.reveal, { height: fillHeight }]} pointerEvents="none">
            <Animated.Image source={faceFilled} resizeMode="contain" style={styles.filled} />
          </Animated.View>
        </Pressable>

        <Spark source={sparkleBig} at={{ top: -42, left: -30 }} width={78} height={54} delay={0} on={full} />
        <Spark source={sparklePair} at={{ top: 156, left: 238 }} width={70} height={68} delay={110} on={full} />
        <Spark source={star} at={{ top: 208, left: -34 }} width={104} height={74} delay={200} on={full} />
      </Animated.View>

      <Animated.Image source={hint} resizeMode="contain" style={[styles.hint, { opacity: hintFade }]} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: FACE,
    height: FACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    width: FACE,
    height: FACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    position: 'absolute',
    width: FACE,
    height: FACE * (444 / 504),
  },
  reveal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: FACE,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  filled: {
    width: FACE,
    height: FACE * (465 / 480),
    marginBottom: (FACE - FACE * (465 / 480)) / 2,
  },
  spark: {
    position: 'absolute',
  },
  hint: {
    width: 228,
    height: 39,
    marginTop: 28,
  },
});
