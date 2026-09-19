import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { clampLevelCount, MAX_LEVELS, MIN_LEVELS } from '../lib/levels';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

export default function NextGoal() {
  const router = useRouter();
  const { group, startNextGoal } = useApp();
  const [reward, setReward] = useState('');
  const [levelCount, setLevelCount] = useState('7');
  const [error, setError] = useState('');

  if (!group) return <Redirect href="/onboarding" />;
  if (!group.awaitingNextGoal) return <Redirect href="/(tabs)" />;

  const submit = () => {
    if (!reward.trim()) {
      setError('Add a reward.');
      return;
    }
    const n = Number(levelCount);
    if (!Number.isFinite(n)) {
      setError(`Levels must be ${MIN_LEVELS}–${MAX_LEVELS}.`);
      return;
    }
    startNextGoal(reward, clampLevelCount(n));
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>You earned it</Text>
      <Text style={styles.title}>Next goal</Text>
      <Text style={styles.sub}>
        {group.rewardText} is done. Pick a new reward and how many levels it takes. Miss a day and
        the whole family still resets to level 1.
      </Text>

      <Text style={styles.label}>New reward</Text>
      <TextInput
        style={styles.input}
        value={reward}
        onChangeText={(t) => {
          setReward(t);
          setError('');
        }}
        placeholder="Sunday dumplings"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>New number of levels ({MIN_LEVELS}–{MAX_LEVELS})</Text>
      <TextInput
        style={styles.input}
        value={levelCount}
        onChangeText={(t) => {
          setLevelCount(t);
          setError('');
        }}
        keyboardType="number-pad"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.cta} onPress={submit}>
        <Text style={styles.ctaText}>Start new map</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.bg },
  kicker: { color: colors.accent, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, lineHeight: 21, marginBottom: spacing.md },
  label: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: '#C62828', fontWeight: '700' },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
