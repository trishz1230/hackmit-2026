import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../components/Handwriting';
import { EYES, FaceLayers, HAIR, HEAD, MOUTHS, encodeFace } from '../components/AvatarFace';
import { savePendingAvatar } from '../lib/api';

const paper = require('../assets/welcome/paper.png');
const sparkleBig = require('../assets/welcome/sparkle-big.png');
const sparklePair = require('../assets/welcome/sparkle-pair.png');
const starArt = require('../assets/welcome/star.png');

const FACE = 230;
const STEPS = ['eyes', 'mouth', 'hair'] as const;
type Step = (typeof STEPS)[number];

const LABEL: Record<Step, string> = {
  eyes: 'eyes',
  mouth: 'mouth',
  hair: 'hair',
};

const SWIPE = 24;
const DOUBLE_TAP_MS = 320;
/** The title sits alone on the paper before the face appears. */
const INTRO_MS = 2000;

export default function MakeAYou() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [eyes, setEyes] = useState(0);
  const [mouth, setMouth] = useState(0);
  const [hair, setHair] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;

  const finish = useRef(new Animated.Value(1)).current;
  const lastTap = useRef(0);
  const leaving = useRef(false);

  const current: Step | undefined = STEPS[step];
  // Only the features already chosen (plus the one being chosen) are drawn.
  const upTo = STEPS[Math.min(step, STEPS.length - 1)];

  useEffect(() => {
    const t = setTimeout(() => {
      setStarted(true);
      Animated.timing(reveal, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, INTRO_MS);
    return () => clearTimeout(t);
  }, [reveal]);

  const counts = useMemo(() => ({ eyes: EYES.length, mouth: MOUTHS.length, hair: HAIR.length }), []);

  const cycle = useCallback(
    (dir: 1 | -1) => {
      if (!current) return;
      const next = (v: number, len: number) => (v + dir + len) % len;
      if (current === 'eyes') setEyes((v) => next(v, counts.eyes));
      if (current === 'mouth') setMouth((v) => next(v, counts.mouth));
      if (current === 'hair') setHair((v) => next(v, counts.hair));
    },
    [counts, current],
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
    if (!started || step < STEPS.length || leaving.current) return;
    leaving.current = true;
    setDone(true);
    savePendingAvatar(encodeFace({ eyes, mouth, hair })).catch(() => {});
    Animated.sequence([
      Animated.spring(finish, { toValue: 1.12, friction: 4, useNativeDriver: true }),
      Animated.spring(finish, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => router.replace('/onboarding'), 1600);
    return () => clearTimeout(t);
  }, [eyes, finish, hair, mouth, router, started, step]);

  return (
    <ImageBackground source={paper} resizeMode="cover" style={styles.screen}>
      <Text style={styles.title}>make a you...</Text>

      <Animated.View
        style={[styles.stage, { opacity: reveal }, done && { transform: [{ scale: finish }] }]}
        pointerEvents={started ? 'auto' : 'none'}
        {...pan.panHandlers}
      >
        <Pressable onPress={onTap} style={styles.face}>
          <FaceLayers face={{ eyes, mouth, hair }} size={FACE} upTo={upTo} />
        </Pressable>

        {done ? (
          <>
            <Spark source={sparkleBig} at={{ top: -30, left: -26 }} width={70} height={48} delay={0} />
            <Spark source={sparklePair} at={{ top: 140, left: 216 }} width={64} height={62} delay={110} />
            <Spark source={starArt} at={{ top: 150, left: -72 }} width={94} height={66} delay={200} />
          </>
        ) : null}
      </Animated.View>

      {!started ? null : current ? (
        <View style={styles.footer}>
          <OptionStrip
            options={current === 'eyes' ? EYES : current === 'mouth' ? MOUTHS : HAIR}
            selected={current === 'eyes' ? eyes : current === 'mouth' ? mouth : hair}
            onSelect={current === 'eyes' ? setEyes : current === 'mouth' ? setMouth : setHair}
          />
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

/** Every choice for the feature being picked, so nothing is a surprise. */
function OptionStrip({
  options,
  selected,
  onSelect,
}: {
  options: (number | null)[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <View style={styles.stripWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {options.map((option, i) => (
          <Pressable
            key={i}
            onPress={() => onSelect(i)}
            style={[styles.option, i === selected && styles.optionOn]}
          >
            <Image source={option ?? HEAD} resizeMode="contain" style={styles.optionArt} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
  spark: {
    position: 'absolute',
  },
  footer: {
    marginTop: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  stripWrap: {
    width: '100%',
    maxHeight: 76,
  },
  strip: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 8,
  },
  option: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionOn: {
    borderColor: '#2F2A26',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  optionArt: {
    width: 40,
    height: 40,
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
