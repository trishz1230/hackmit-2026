import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text, TextInput } from './Handwriting';
import { Confetti } from './Confetti';
import { clampLevelCount, MAX_LEVELS, MIN_LEVELS } from '../lib/levels';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

const PARTY = require('../assets/levels/star.png');

/**
 * Centered over whatever tab is open once the family finishes its map: the
 * reward they just won, then the form for the next one. There's no dismissing
 * it — the next map can't start until a reward and level count are picked.
 */
export function NextGoalPopup() {
  const router = useRouter();
  const { group, startNextGoal } = useApp();
  const [reward, setReward] = useState('');
  const [levelCount, setLevelCount] = useState('7');
  const [error, setError] = useState('');
  const [celebrating, setCelebrating] = useState(true);
  const visible = Boolean(group?.awaitingNextGoal);

  // Fresh fields each time a map is finished.
  useEffect(() => {
    if (visible) {
      setReward('');
      setLevelCount(String(group?.goal ?? 7));
      setError('');
      setCelebrating(true);
    }
  }, [visible]);

  if (!group) return null;

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
    router.navigate('/(tabs)/path');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {celebrating ? (
          <View style={styles.card}>
            <Image source={PARTY} style={styles.party} resizeMode="contain" />
            <Text style={[styles.title, styles.centered]}>Congrats!</Text>
            <Text style={[styles.sub, styles.centered]}>
              You guys earned {group.rewardText || 'your reward'}. Go enjoy it — then pick what the
              family is playing for next.
            </Text>
            <Pressable style={styles.cta} onPress={() => setCelebrating(false)}>
              <Text style={styles.ctaText}>Start a new goal</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.kicker}>You earned it</Text>
            <Text style={styles.title}>Next goal</Text>
            <Text style={styles.sub}>
              {group.rewardText} is done. Pick a new reward and how many levels it takes. Miss a day
              and the whole family still resets to level 1.
            </Text>

            <Text style={styles.label}>New reward</Text>
            <TextInput
              style={styles.input}
              value={reward}
              onChangeText={(t) => {
                setReward(t);
                setError('');
              }}
              placeholder="Pizza Night"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>
              New number of levels ({MIN_LEVELS}–{MAX_LEVELS})
            </Text>
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
        )}
        {celebrating && <Confetti />}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  kicker: { color: colors.accent, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  party: { width: 96, height: 98, alignSelf: 'center' },
  centered: { textAlign: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, lineHeight: 21, marginBottom: spacing.sm },
  label: { fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: '#C62828', fontWeight: '700' },
  cta: {
    marginTop: spacing.md,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
