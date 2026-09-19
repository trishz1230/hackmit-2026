import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../lib/theme';

const NODE = 64;
const STEP = 108;
const AMPLITUDE = 92;
const MILESTONE_EVERY = 5;
const TRAIL_DOTS = 4;
/** Room under the last level for the reward card. */
const FOOT = 132;

/** Placeholder art — swap each entry for the designer's illustration. */
const MILESTONE_ICONS = ['🫖', '🍄', '🐇', '🧁', '🗝️', '🌹', '🎩', '🐛', '⏰', '👑'];

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

const isMilestone = (n: number) => n % MILESTONE_EVERY === 0;
const iconFor = (n: number) => MILESTONE_ICONS[(n / MILESTONE_EVERY - 1) % MILESTONE_ICONS.length];

/** Level 1 sits at the bottom; the path winds upward toward the goal. */
function position(n: number, goal: number) {
  const index = n - 1;
  return {
    x: AMPLITUDE * Math.sin(index * 0.85),
    y: (goal - n) * STEP + FOOT,
  };
}

function PulsingRing() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.35, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return <Animated.View style={[styles.ring, { transform: [{ scale }] }]} pointerEvents="none" />;
}

function Trail({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  return (
    <>
      {Array.from({ length: TRAIL_DOTS }, (_, i) => {
        const t = (i + 1) / (TRAIL_DOTS + 1);
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                marginLeft: from.x + (to.x - from.x) * t - 4,
                bottom: from.y + (to.y - from.y) * t + NODE / 2 - 4,
              },
            ]}
          />
        );
      })}
    </>
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
  const contentHeight = goal * STEP + FOOT + spacing.lg;

  useEffect(() => {
    if (!viewportHeight) return;
    const y = Math.max(0, contentHeight - position(current, goal).y - viewportHeight * 0.6);
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(timer);
  }, [contentHeight, current, goal, viewportHeight]);

  const levels = Array.from({ length: goal }, (_, i) => i + 1);

  return (
    <LinearGradient colors={[colors.night, colors.nightSoft, colors.accent]} style={styles.fill}>
      <ScrollView
        ref={scrollRef}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        contentContainerStyle={{ height: contentHeight }}
      >
        <View style={styles.board}>
          {levels.slice(0, -1).map((n) => (
            <Trail key={`trail-${n}`} from={position(n, goal)} to={position(n + 1, goal)} />
          ))}

          {levels.map((n) => {
            const done = n < level || (cleared && n === current);
            const isCurrent = n === current && !cleared;
            // Once the current level is done the glow moves on to the locked one.
            const isNext = cleared && n === current + 1;
            const live = isCurrent || isNext;
            const { x, y } = position(n, goal);
            const milestone = isMilestone(n);

            return (
              <Pressable
                key={n}
                onPress={() => onSelectLevel?.(n)}
                disabled={!onSelectLevel}
                style={[styles.nodeWrap, { marginLeft: x - NODE / 2, bottom: y }]}
              >
                {live && <PulsingRing />}
                <View
                  style={[
                    styles.node,
                    done && styles.nodeDone,
                    live && styles.nodeCurrent,
                    !done && !live && styles.nodeLocked,
                    milestone && styles.nodeMilestone,
                  ]}
                >
                  <Text style={[styles.nodeLabel, !done && !live && styles.nodeLabelLocked]}>
                    {(isCurrent && locked) || isNext
                      ? '🔒'
                      : milestone
                        ? iconFor(n)
                        : done
                          ? '✓'
                          : n}
                  </Text>
                </View>
                {milestone && <Text style={styles.milestoneCaption}>Level {n}</Text>}
              </Pressable>
            );
          })}

          <View style={[styles.goalFlag, { bottom: position(goal, goal).y - FOOT + spacing.md }]}>
            <Text style={styles.goalIcon}>👑</Text>
            <Text style={styles.goalText}>{reward}</Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  board: { flex: 1, alignItems: 'center' },
  nodeWrap: { position: 'absolute', left: '50%', alignItems: 'center', width: NODE },
  ring: {
    position: 'absolute',
    top: 0,
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  nodeDone: { backgroundColor: colors.success, borderColor: '#9BF0E4' },
  nodeCurrent: { backgroundColor: colors.gold, borderColor: '#FFF3D4' },
  nodeLocked: { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.22)' },
  nodeMilestone: { width: NODE + 12, height: NODE + 12, borderRadius: (NODE + 12) / 2 },
  nodeLabel: { fontSize: 22, fontWeight: '800', color: '#fff' },
  nodeLabelLocked: { color: 'rgba(255,255,255,0.45)' },
  milestoneCaption: { color: '#E8DCFF', fontSize: 11, marginTop: 4 },
  dot: {
    position: 'absolute',
    left: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  goalFlag: {
    position: 'absolute',
    left: '50%',
    width: 200,
    marginLeft: -100,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goalIcon: { fontSize: 30 },
  goalText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
});
