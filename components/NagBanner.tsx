import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

/** Deliberately has no dismiss control — it only disappears once you post. */
export function NagBanner({ prompt, onPress }: { prompt: string; onPress: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <Text style={styles.title}>Today&apos;s task isn&apos;t done 👀</Text>
        <Text style={styles.prompt}>{prompt}</Text>
      </View>
      <Pressable style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>Do it</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  textCol: { flex: 1 },
  title: { color: '#fff', fontWeight: '700', fontSize: 15 },
  prompt: { color: '#FFE9E2', fontSize: 13, marginTop: 2 },
  cta: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  ctaText: { color: colors.accent, fontWeight: '700' },
});
