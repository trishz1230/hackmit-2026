import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';

/** The drawn face with its yellow filled in, before the sparkles are added. */
const FACE = require('../assets/welcome/frames/f07.png');

const FACE_W = 250;
const FACE_H = FACE_W * (570 / 645);
/** How long the face is held before the app shows through. */
const HOLD_MS = 1000;
const FADE_MS = 450;
/** The page colour the animation was drawn on. */
const PAGE = '#FAF8F0';

/** Opens every launch on the drawn smiley, then dissolves into the app. */
export function OpeningSmiley() {
  const fade = useRef(new Animated.Value(1)).current;
  const [gone, setGone] = useState(false);
  // The welcome screen draws this face itself, starting from an empty outline.
  const onWelcome = usePathname() === '/welcome';

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => setGone(true));
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [fade]);

  if (gone || onWelcome) return null;

  return (
    <Animated.View style={[styles.cover, { opacity: fade }]} pointerEvents="none">
      <Image source={FACE} resizeMode="contain" style={styles.face} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: PAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: { width: FACE_W, height: FACE_H },
});
