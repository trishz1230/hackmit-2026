import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

const COLORS = ['#FDD98B', '#E9B0B5', '#A9DB9B', '#BFD9E8', '#F3A5BF', '#F6C86A'];
const PIECES = 40;

type Piece = {
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  spins: number;
  round: boolean;
};

/** Fixed per mount, so the fall doesn't reshuffle on every re-render. */
const makePieces = (width: number): Piece[] =>
  Array.from({ length: PIECES }, () => ({
    left: Math.random() * width,
    size: 8 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 1400,
    duration: 2600 + Math.random() * 2200,
    drift: (Math.random() - 0.5) * 140,
    spins: 1 + Math.random() * 3,
    round: Math.random() > 0.6,
  }));

function Flake({ piece, height }: { piece: Piece; height: number }) {
  const fall = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(piece.delay),
        Animated.timing(fall, {
          toValue: 1,
          duration: piece.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fall, piece.delay, piece.duration]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.left,
        top: -20,
        width: piece.size,
        height: piece.round ? piece.size : piece.size * 0.5,
        borderRadius: piece.round ? piece.size / 2 : 2,
        backgroundColor: piece.color,
        opacity: fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
          { translateX: fall.interpolate({ inputRange: [0, 1], outputRange: [0, piece.drift] }) },
          {
            rotate: fall.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${piece.spins * 360}deg`],
            }),
          },
        ],
      }}
    />
  );
}

const styles = StyleSheet.create({
  sky: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
});

/** Paper falling across the whole screen; purely decorative. */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useRef(makePieces(width)).current;

  return (
    <View style={styles.sky} pointerEvents="none">
      {pieces.map((piece, i) => (
        <Flake key={i} piece={piece} height={height} />
      ))}
    </View>
  );
}
