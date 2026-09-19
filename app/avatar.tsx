import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Text } from '../components/Handwriting';

const paper = require('../assets/welcome/paper.png');
const sparkleBig = require('../assets/welcome/sparkle-big.png');
const sparklePair = require('../assets/welcome/sparkle-pair.png');
const starArt = require('../assets/welcome/star.png');
const head = require('../assets/avatar/head.png');

/** Each layer is drawn on the face at a fixed spot, so options stay swappable. */
const EYES = [
  require('../assets/avatar/eyes-dots.png'),
  require('../assets/avatar/eyes-hearts.png'),
  require('../assets/avatar/eyes-squiggle.png'),
  require('../assets/avatar/eyes-diamonds.png'),
  require('../assets/avatar/eyes-tears.png'),
];

const MOUTHS = [
  require('../assets/avatar/mouth-smile.png'),
  require('../assets/avatar/mouth-grin.png'),
  require('../assets/avatar/mouth-oh.png'),
  require('../assets/avatar/mouth-squiggle.png'),
  require('../assets/avatar/mouth-blob.png'),
  require('../assets/avatar/mouth-teeth.png'),
];

/** Hair is drawn with its own head outline, so it replaces the bare circle. */
const HAIR = [
  null,
  require('../assets/avatar/hair-curls.png'),
  require('../assets/avatar/hair-short.png'),
  require('../assets/avatar/hair-bob.png'),
  require('../assets/avatar/hair-buzz.png'),
  require('../assets/avatar/hair-braids.png'),
  require('../assets/avatar/hair-afro.png'),
];

const FACE = 230;
const STEPS = ['eyes', 'mouth', 'hair'] as const;
type Step = (typeof STEPS)[number];

const LABEL: Record<Step, string> = {
  eyes: 'eyes',
  mouth: 'mouth',
  hair: 'hair',
};

const AVATAR_KEY = 'famstreak.avatar';
const SWIPE = 24;
const DOUBLE_TAP_MS = 320;

export default function MakeAYou() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [eyes, setEyes] = useState(0);
  const [mouth, setMouth] = useState(0);
  const [hair, setHair] = useState(0);
  const [done, setDone] = useState(false);

  const pop = useRef(new Animated.Value(0)).current;
  const finish = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const leaving = useRef(false);

  const current: Step | undefined = STEPS[step];

  const counts = useMemo(() => ({ eyes: EYES.length, mouth: MOUTHS.length, hair: HAIR.length }), []);

  const cycle = useCallback(
    (dir: 1 | -1) => {
      if (!current) return;
      pop.setValue(0);
      Animated.timing(pop, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      const next = (v: number, len: number) => (v + dir + len) % len;
      if (current === 'eyes') setEyes((v) => next(v, counts.eyes));
      if (current === 'mouth') setMouth((v) => next(v, counts.mouth));
      if (current === 'hair') setHair((v) => next(v, counts.hair));
    },
    [counts, current, pop],
  );

  const lockIn = useCallback(() => {
    if (leaving.current) return;
    setStep((s) => s + 1);
  }, []);

  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      lockIn();
      return;
    }
    lastTap.current = now;
  }, [lockIn]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_e, g) => {
        if (g.dy <= -SWIPE) cycleRef.current(1);
        else if (g.dy >= SWIPE) cycleRef.current(-1);
      },
    }),
  ).current;
  const cycleRef = useRef(cycle);
  cycleRef.current = cycle;

  useEffect(() => {
    if (step < STEPS.length || leaving.current) return;
    leaving.current = true;
    setDone(true);
    AsyncStorage.setItem(AVATAR_KEY, JSON.stringify({ eyes, mouth, hair })).catch(() => {});
    Animated.sequence([
      Animated.spring(finish, { toValue: 1.12, friction: 4, useNativeDriver: true }),
      Animated.spring(finish, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => router.replace('/onboarding'), 1600);
    return () => clearTimeout(t);
  }, [eyes, finish, hair, mouth, router, step]);

  const hairSource = HAIR[hair];

  return (
    <ImageBackground source={paper} resizeMode="cover" style={styles.screen}>
      <Text style={styles.title}>make a you...</Text>

      <Animated.View
        style={[styles.stage, done && { transform: [{ scale: finish }] }]}
        {...pan.panHandlers}
      >
        <Pressable onPress={onTap} style={styles.face}>
          {hairSource ? (
            <Animated.Image source={hairSource} resizeMode="contain" style={styles.head} />
          ) : (
            <Animated.Image source={head} resizeMode="contain" style={styles.head} />
          )}
          <Animated.Image source={EYES[eyes]} resizeMode="contain" style={styles.eyes} />
          <Animated.Image source={MOUTHS[mouth]} resizeMode="contain" style={styles.mouth} />
        </Pressable>

        {done ? (
          <>
            <Spark source={sparkleBig} at={{ top: -30, left: -26 }} width={70} height={48} delay={0} />
            <Spark source={sparklePair} at={{ top: 140, left: 216 }} width={64} height={62} delay={110} />
            <Spark source={starArt} at={{ top: 150, left: -72 }} width={94} height={66} delay={200} />
          </>
        ) : null}
      </Animated.View>

      {current ? (
        <View style={styles.footer}>
          <Text style={styles.hint}>swipe up or down to switch {LABEL[current]}</Text>
          <Text style={styles.hint}>double tap to lock it in.</Text>
          <Text style={styles.steps}>
            {STEPS.map((s, i) => (i <= step ? `• ${s}  ` : `◦ ${s}  `)).join('')}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>that's you!</Text>
      )}
    </ImageBackground>
  );
}

type SparkProps = {
  source: number;
  at: { top: number; left: number };
  width: number;
  height: number;
  delay: number;
};

function Spark({ source, at, width, height, delay }: SparkProps) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pop, {
      toValue: 1,
      delay,
      duration: 300,
      easing: Easing.out(Easing.back(2.4)),
      useNativeDriver: true,
    }).start();
  }, [delay, pop]);

  return (
    <Animated.Image
      source={source}
      resizeMode="contain"
      style={[styles.spark, at, { width, height, opacity: pop, transform: [{ scale: pop }] }]}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    color: '#2F2A26',
    marginBottom: 24,
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
  head: {
    position: 'absolute',
    width: FACE,
    height: FACE,
  },
  eyes: {
    position: 'absolute',
    top: FACE * 0.36,
    width: FACE * 0.46,
    height: FACE * 0.14,
  },
  mouth: {
    position: 'absolute',
    top: FACE * 0.56,
    width: FACE * 0.34,
    height: FACE * 0.18,
  },
  spark: {
    position: 'absolute',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  hint: {
    fontSize: 16,
    color: '#2F2A26',
  },
  steps: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B5F52',
  },
});
