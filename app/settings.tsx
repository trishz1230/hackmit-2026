import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';
import { CADENCE_LABELS, type Cadence } from '../lib/types';

const MIN_LEVELS = 3;
const MAX_LEVELS = 20;

/** The family can retune cadence, reward and goal at any point. */
export default function Settings() {
  const router = useRouter();
  const { group, updateSettings, loading } = useApp();
  const [cadence, setCadence] = useState<Cadence>(group?.cadence ?? 'daily');
  const [reward, setReward] = useState(group?.rewardText ?? '');
  const [levels, setLevels] = useState(String(group?.goal ?? 10));

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  const save = () => {
    const floor = Math.max(MIN_LEVELS, group.level);
    updateSettings({
      cadence,
      rewardText: reward.trim() || group.rewardText,
      goal: Math.min(MAX_LEVELS, Math.max(floor, Number(levels) || floor)),
    });
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.label}>Reminders</Text>
      <Text style={styles.hint}>
        How often the family gets nudged. It never blocks posting — you can always clear the level
        early.
      </Text>
      <View style={styles.picker}>
        {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => (
          <Pressable
            key={c}
            onPress={() => setCadence(c)}
            style={[styles.pickerBtn, cadence === c && styles.pickerBtnActive]}
          >
            <Text style={[styles.pickerText, cadence === c && styles.pickerTextActive]}>
              {CADENCE_LABELS[c]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Reward</Text>
      <TextInput
        style={styles.input}
        value={reward}
        onChangeText={setReward}
        placeholder="Sunday dumplings"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>
        Levels to the reward ({Math.max(MIN_LEVELS, group.level)}–{MAX_LEVELS})
      </Text>
      <TextInput
        style={styles.input}
        value={levels}
        onChangeText={setLevels}
        keyboardType="number-pad"
        placeholder="10"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.hint}>Invite code: {group.joinCode}</Text>

      <Pressable style={styles.cta} onPress={save}>
        <Text style={styles.ctaText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.bg, flexGrow: 1 },
  label: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  picker: { flexDirection: 'row', gap: spacing.xs },
  pickerBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  pickerBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pickerText: { color: colors.muted, fontWeight: '600' },
  pickerTextActive: { color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
