import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../components/Handwriting';
import { EYES, HAIR, HEAD, MOUTHS, encodeFace, parseFace } from '../components/AvatarFace';
import { savePendingAvatar } from '../lib/api';
import { useApp } from '../lib/store';

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

/**
 * Where each feature sits on the head, as a fraction of the face, and how tall
 * a row of its reel is. The reel rolls inside `window`, so only that slice of
 * the face moves while the rest of the drawing stays put.
 */
const SLOT = {
  eyes: { top: 0.3, height: 0.26, art: { top: 0.06, width: 0.46, height: 0.14 } },
  mouth: { top: 0.5, height: 0.3, art: { top: 0.06, width: 0.34, height: 0.18 } },
  hair: { top: 0, height: 0.42, art: { top: 0, width: 1, height: 1 } },
} as const;
/** Gap between the head and the option peeking above or below it. */
const PEEK_GAP = 22;
const DOUBLE_TAP_MS = 450;
/** A tap this soon after the reel moved is the end of a scroll, not a tap. */
const SETTLE_MS = 300;
/** The title sits alone on the paper before the face appears. */
const INTRO_MS = 2000;

export default function MakeAYou() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = edit === '1';
  const { me, updateAvatar } = useApp();
  const existing = editing ? parseFace(me.avatar) : null;
  const [step, setStep] = useState(0);
  const [eyes, setEyes] = useState(existing?.eyes ?? 0);
  const [mouth, setMouth] = useState(existing?.mouth ?? 0);
  const [hair, setHair] = useState(existing?.hair ?? 0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;

  const finish = useRef(new Animated.Value(1)).current;
  const lastTap = useRef(0);
  const leaving = useRef(false);

  const current: Step | undefined = STEPS[step];

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

  useEffect(() => {
    if (!started || step < STEPS.length || leaving.current) return;
    leaving.current = true;
    setDone(true);
    const face = encodeFace({ eyes, mouth, hair });
    if (editing) updateAvatar(face);
    else savePendingAvatar(face).catch(() => {});
    Animated.sequence([
      Animated.spring(finish, { toValue: 1.12, friction: 4, useNativeDriver: true }),
      Animated.spring(finish, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      if (editing) router.back();
      else router.replace('/onboarding');
    }, 1600);
    return () => clearTimeout(t);
  }, [editing, eyes, finish, hair, mouth, router, started, step, updateAvatar]);

  return (
    <ImageBackground source={paper} resizeMode="cover" style={styles.screen}>
      <Text style={styles.title}>{editing ? 'redo you...' : 'make a you...'}</Text>

      <Animated.View
        style={[styles.stage, { opacity: reveal }, done && { transform: [{ scale: finish }] }]}
        pointerEvents={started ? 'auto' : 'none'}
      >
        <Pressable onPress={onTap} style={styles.face}>
          {/* Hair carries its own head outline, so a locked one replaces the head. */}
          <Image
            source={(current ? null : HAIR[hair]) ?? HEAD}
            resizeMode="contain"
            style={[styles.layer, { width: FACE, height: FACE }]}
          />
          {current === 'eyes' ? null : (
            <Image source={EYES[eyes]} resizeMode="contain" style={artStyle('eyes')} />
          )}
          {step >= 1 && current !== 'mouth' ? (
            <Image source={MOUTHS[mouth]} resizeMode="contain" style={artStyle('mouth')} />
          ) : null}
        </Pressable>

        {current ? (
          <FaceReel
            key={current}
            slot={SLOT[current]}
            options={current === 'eyes' ? EYES : current === 'mouth' ? MOUTHS : HAIR}
            selected={current === 'eyes' ? eyes : current === 'mouth' ? mouth : hair}
            onSelect={current === 'eyes' ? setEyes : current === 'mouth' ? setMouth : setHair}
            onTap={onTap}
          />
        ) : null}

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
          <Text style={styles.hint}>scroll the {LABEL[current]} on the face</Text>
          <Text style={styles.hint}>double tap the face to lock it in.</Text>
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

type Slot = (typeof SLOT)[Step];

const artStyle = (step: Step) => {
  const { top, art } = SLOT[step];
  return [
    styles.layer,
    {
      top: (top + art.top) * FACE,
      width: art.width * FACE,
      height: art.height * FACE,
    },
  ];
};

/**
 * The feature being chosen, rolling in place on the face, with the option
 * before it and the one after it faded in above and below so the whole reel
 * can be read at a glance. Its options are laid out three times over so the
 * reel never ends: once a scroll settles outside the middle copy it jumps back
 * by one copy's height, which can't be seen because the drawing at that offset
 * is the same one.
 */
function FaceReel({
  slot,
  options,
  selected,
  onSelect,
  onTap,
}: {
  slot: Slot;
  options: (number | null)[];
  selected: number;
  onSelect: (i: number) => void;
  onTap: () => void;
}) {
  const scroller = useRef<ScrollView>(null);
  const offset = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const resting = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrolledAt = useRef(0);
  const row = slot.height * FACE;
  // Shove each neighbour clear of the head rather than a fixed distance, so it
  // lands above the hair or below the chin whichever feature is being chosen.
  const middle = (slot.top + slot.height / 2) * FACE;
  const pushUp = Math.max(0, middle + PEEK_GAP - row);
  const pushDown = Math.max(0, FACE - middle + PEEK_GAP - row);
  const len = options.length;
  const loop = len * row;
  const reel = [...options, ...options, ...options];
  const indexAt = (y: number) => ((Math.round(y / row) % len) + len) % len;

  /**
   * Land on whichever option the reel stopped over. Driven by a pause in the
   * scroll rather than the end of a drag, because a mouse wheel never reports
   * one — it just stops.
   */
  const settle = (y: number) => {
    const index = indexAt(y);
    onSelect(index);
    const middle = loop + index * row;
    const jump = y < loop / 2 || y > loop * 2.5;
    scroller.current?.scrollTo({ y: jump ? middle : Math.round(y / row) * row, animated: !jump });
  };

  const onMove = (y: number) => {
    scrolledAt.current = Date.now();
    const index = indexAt(y);
    if (index !== selected) onSelect(index);
    clearTimeout(resting.current);
    resting.current = setTimeout(() => settle(y), 140);
  };

  useEffect(() => () => clearTimeout(resting.current), []);

  return (
    <View
      style={[
        styles.reelWindow,
        { top: slot.top * FACE - row - pushUp, height: row * 3 + pushUp + pushDown },
      ]}
      // The reel covers the face, so the lock tap has to be counted here as
      // well. Capturing the touch before the scroll view claims it — and
      // handing it straight back — is the only reading of it that survives the
      // reel settling underneath the finger.
      onStartShouldSetResponderCapture={() => {
        if (Date.now() - scrolledAt.current > SETTLE_MS) onTap();
        return false;
      }}
    >
      <Animated.ScrollView
        ref={scroller as never}
        showsVerticalScrollIndicator={false}
        snapToInterval={row}
        decelerationRate="fast"
        // A row of padding each side keeps the chosen option in the middle band.
        contentContainerStyle={{ paddingTop: row + pushUp, paddingBottom: row + pushDown }}
        onContentSizeChange={() => {
          // Start on the middle copy; contentOffset isn't honoured everywhere.
          if (placed.current) return;
          placed.current = true;
          scroller.current?.scrollTo({ y: loop + selected * row, animated: false });
        }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: offset } } }], {
          useNativeDriver: false,
          listener: (e: { nativeEvent: { contentOffset: { y: number } } }) =>
            onMove(e.nativeEvent.contentOffset.y),
        })}
      >
        {reel.map((option, i) => (
          <Animated.View
            key={i}
            style={{
              width: FACE,
              height: row,
              overflow: 'hidden',
              // Faded while it's a neighbour, solid once it's the chosen one.
              opacity: offset.interpolate({
                inputRange: [(i - 1) * row, i * row, (i + 1) * row],
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              }),
              // Neighbours drift away from the middle so they clear the face.
              transform: [
                {
                  translateY: offset.interpolate({
                    inputRange: [(i - 1) * row, i * row, (i + 1) * row],
                    outputRange: [pushDown, 0, -pushUp],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}
          >
            <Image
              source={option ?? HEAD}
              resizeMode="contain"
              style={[
                styles.layer,
                {
                  top: slot.art.top * FACE,
                  width: slot.art.width * FACE,
                  height: slot.art.height * FACE,
                },
              ]}
            />
          </Animated.View>
        ))}
      </Animated.ScrollView>
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
    marginBottom: 56,
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
    marginTop: 64,
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    paddingLeft: 36,
  },
  layer: { position: 'absolute', alignSelf: 'center' },
  reelWindow: {
    position: 'absolute',
    width: FACE,
    overflow: 'hidden',
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
