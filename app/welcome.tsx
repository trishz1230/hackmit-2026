import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../components/Handwriting';
import { colors } from '../lib/theme';

/** The drawn animation, frame by frame: the face fills in, then it sparkles. */
const frames = [
  require('../assets/welcome/frames/f01.png'),
  require('../assets/welcome/frames/f02.png'),
  require('../assets/welcome/frames/f03.png'),
  require('../assets/welcome/frames/f04.png'),
  require('../assets/welcome/frames/f05.png'),
  require('../assets/welcome/frames/f06.png'),
  require('../assets/welcome/frames/f07.png'),
  require('../assets/welcome/frames/f08.png'),
  require('../assets/welcome/frames/f09.png'),
  require('../assets/welcome/frames/f10.png'),
  require('../assets/welcome/frames/f11.png'),
  require('../assets/welcome/frames/f12.png'),
];

const FACE_W = 250;
const FACE_H = FACE_W * (570 / 645);
const FRAME_MS = 130;
/** Beat on the last drawn frame before the app opens. */
const SETTLE_MS = 700;
/** The page colour the animation was drawn on. */
const PAGE = '#FAF8F0';

export default function Welcome() {
  const router = useRouter();
  const [frame, setFrame] = useState(0);
  const [holding, setHolding] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;

    if (!holding) {
      if (frame === 0) return;
      const back = setTimeout(() => setFrame((f) => f - 1), FRAME_MS);
      return () => clearTimeout(back);
    }

    if (frame < frames.length - 1) {
      const next = setTimeout(() => setFrame((f) => f + 1), FRAME_MS);
      return () => clearTimeout(next);
    }

    done.current = true;
    const open = setTimeout(() => router.replace('/start'), SETTLE_MS);
    return () => clearTimeout(open);
  }, [frame, holding, router]);

  const hold = useCallback(() => setHolding(true), []);
  const release = useCallback(() => setHolding(false), []);

  return (
    <View style={styles.screen}>
      <Pressable onPressIn={hold} onPressOut={release} style={styles.stage}>
        {/* Every frame stays mounted so stepping through them never waits on a load. */}
        {frames.map((source, i) => (
          <Image
            key={i}
            source={source}
            resizeMode="contain"
            style={[styles.face, { opacity: i === frame ? 1 : 0 }]}
          />
        ))}
      </Pressable>

      {frame === 0 ? <Text style={styles.hint}>press to get started...</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 72,
  },
  stage: {
    width: FACE_W,
    height: FACE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    position: 'absolute',
    width: FACE_W,
    height: FACE_H,
  },
  hint: {
    position: 'absolute',
    bottom: 96,
    fontSize: 20,
    color: colors.text,
  },
});
