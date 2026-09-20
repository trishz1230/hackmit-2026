import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';
import { AvatarFace } from './AvatarFace';
import { AVATAR_SIZE } from './AvatarButton';
import { colors, radius, spacing } from '../lib/theme';

export function ProgressBar({
  level,
  cleared,
  goal,
  reward,
  streak,
  onPress,
  myAvatar,
  onPressAvatar,
}: {
  level: number;
  /** Levels fully done — counts the current one once everybody posted. */
  cleared: number;
  goal: number;
  reward: string;
  streak: number;
  onPress?: () => void;
  myAvatar?: string;
  onPressAvatar?: () => void;
}) {
  const done = Math.max(0, Math.min(goal, cleared));
  const pct = goal === 0 ? 0 : done / goal;
  return (
    <Pressable style={styles.wrap} onPress={onPress} disabled={!onPress}>
      <View style={styles.row}>
        <Text style={styles.level}>Level {level}</Text>
        <View style={styles.right}>
          <Text style={styles.streak}>🔥 {streak} day streak</Text>
          {myAvatar ? (
            <Pressable onPress={onPressAvatar} hitSlop={8}>
              <AvatarFace value={myAvatar} size={AVATAR_SIZE} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.reward}>
        {goal <= done ? `You earned ${reward}` : `${Math.max(0, goal - done)} levels to go → ${reward || 'your reward'}`}
      </Text>
      {onPress && <Text style={styles.link}>See the level map →</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  level: { fontSize: 17, fontWeight: '700', color: colors.text },
  streak: { fontSize: 14, color: colors.muted },
  track: {
    height: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.accent },
  reward: { marginTop: spacing.xs, fontSize: 13, color: colors.muted },
  link: { marginTop: spacing.xs, fontSize: 13, color: colors.accent, fontWeight: '600' },
});
