import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';
import { colors, spacing } from '../lib/theme';

/** Painted markers, one per level, repeating once the path outgrows them. */
const ART = [
  { src: require('../assets/levels/star.png'), w: 368, h: 376, size: 128 },
  { src: require('../assets/levels/tulip.png'), w: 224, h: 393, size: 92 },
  { src: require('../assets/levels/umbrella.png'), w: 339, h: 365, size: 124 },
  { src: require('../assets/levels/tree.png'), w: 251, h: 330, size: 122 },
  { src: require('../assets/levels/fish.png'), w: 268, h: 120, size: 132 },
];
const REWARD_ART = { src: require('../assets/levels/envelope.png'), w: 262, h: 190, size: 132 };

/** How far apart two levels sit, and how far they lean off centre. */
const STEP = 210;
const AMPLITUDE = 82;
/** Room under level 1, and the climb from the last level up to the reward. */
const FOOT = 48;
const REWARD_GAP = 56;

const artFor = (n: number) => ART[(n - 1) % ART.length];
const sizeOf = (a: (typeof ART)[number]) => ({ width: a.size, height: (a.size * a.h) / a.w });

/** The marker a level wears, for screens that show one level on its own. */
export const levelArt = (n: number) => artFor(n);

export type LevelMapProps = {
  level: number;
  goal: number;
  reward: string;
  /** The level you're on hasn't opened yet, so it wears a padlock. */
  locked?: boolean;
  /** Everyone posted, so the current level is done but hasn't cleared yet. */
  cleared?: boolean;
  onSelectLevel?: (level: number) => void;
};

/** Level 1 sits at the bottom; the path wanders upward toward the reward. */
function position(n: number) {
  const index = n - 1;
  return {
    x: AMPLITUDE * Math.sin(index * 1.15 + 0.6),
    y: index * STEP + FOOT,
  };
}

/** The level you're on swells and glows, so you can't miss where you are. */
function useBeat(active: boolean) {
  const beat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      beat.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(beat, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, beat]);
  return beat;
}

function Marker({
  n,
  done,
  live,
  padlocked,
  onPress,
}: {
  n: number;
  done: boolean;
  live: boolean;
  padlocked: boolean;
  onPress?: () => void;
}) {
  const art = artFor(n);
  const { x, y } = position(n);
  const beat = useBeat(live);
  const size = sizeOf(art);
  // The number tucks into whichever side the marker leans away from.
  const numberOnLeft = x > 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.marker, { marginLeft: x - size.width / 2, bottom: y }]}
    >
      {live && (
        // The glow is the marker's own silhouette, swelling behind it.
        <Animated.Image
          source={art.src}
          resizeMode="contain"
          style={[
            styles.glow,
            size,
            {
              tintColor: colors.gold,
              opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }),
              transform: [
                { scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1.45] }) },
              ],
            },
          ]}
        />
      )}
      <Animated.View
        style={{
          transform: [
            { scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) },
          ],
        }}
      >
        <Image
          source={art.src}
          style={[size, !done && !live && styles.faded]}
          resizeMode="contain"
        />
        <Text style={[styles.number, numberOnLeft ? styles.numberLeft : styles.numberRight]}>
          {n}.
        </Text>
        {padlocked && <Text style={styles.badge}>🔒</Text>}
        {done && <Text style={styles.badge}>✓</Text>}
      </Animated.View>
    </Pressable>
  );
}

export function LevelMap({
  level,
  goal,
  reward,
  locked = false,
  cleared = false,
  onSelectLevel,
}: LevelMapProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const current = Math.min(level, goal);
  const rewardSize = {
    width: REWARD_ART.size,
    height: (REWARD_ART.size * REWARD_ART.h) / REWARD_ART.w,
  };
  // The reward crowns the path, clear of the last level's artwork — which is
  // taller than the step between levels, so the gap is measured from its top.
  const rewardY = position(goal).y + sizeOf(artFor(goal)).height + REWARD_GAP;
  const contentHeight = rewardY + rewardSize.height + 72;

  useEffect(() => {
    if (!viewportHeight) return;
    const y = Math.max(0, contentHeight - position(current).y - viewportHeight * 0.7);
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(timer);
  }, [contentHeight, current, viewportHeight]);

  const levels = Array.from({ length: goal }, (_, i) => i + 1);
  // The envelope only colours in once the last level is behind the family.
  const earned = level > goal || (cleared && current === goal);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.fill}
      onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
      contentContainerStyle={{ height: contentHeight }}
    >
      <View style={styles.board}>
        {levels.map((n) => {
          const done = n < level || (cleared && n === current);
          const isCurrent = n === current && !cleared;
          // Once the current level is done the glow moves on to the locked one.
          const isNext = cleared && n === current + 1;
          return (
            <Marker
              key={n}
              n={n}
              done={done}
              live={isCurrent || isNext}
              padlocked={(isCurrent && locked) || isNext}
              onPress={onSelectLevel ? () => onSelectLevel(n) : undefined}
            />
          );
        })}

        <View style={[styles.reward, { bottom: rewardY }]}>
          <Image
            source={REWARD_ART.src}
            style={[rewardSize, !earned && styles.faded]}
            resizeMode="contain"
          />
          <Text style={[styles.rewardText, !earned && styles.fadedText]}>{reward}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  board: { flex: 1, alignItems: 'center' },
  marker: { position: 'absolute', left: '50%', alignItems: 'center' },
  faded: { opacity: 0.4 },
  glow: { position: 'absolute' },
  number: { position: 'absolute', bottom: 4, fontSize: 26, color: colors.text },
  numberLeft: { left: -24 },
  numberRight: { right: -24 },
  badge: { position: 'absolute', top: -2, right: -2, fontSize: 18 },
  reward: {
    position: 'absolute',
    left: '50%',
    width: 220,
    marginLeft: -110,
    alignItems: 'center',
  },
  rewardText: {
    marginTop: spacing.xs,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  fadedText: { color: colors.muted, opacity: 0.55 },
});
