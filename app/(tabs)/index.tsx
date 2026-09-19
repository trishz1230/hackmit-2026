import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { LevelMap } from '../../components/LevelMap';
import { ProgressBar } from '../../components/ProgressBar';
import { describeWait } from '../../lib/levels';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

export default function Home() {
  const router = useRouter();
  const { group, task, hasPostedThisCycle, missedReset, waitingForPeriod, unlocksAt } = useApp();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (group?.awaitingNextGoal) router.replace('/next-goal');
  }, [group?.awaitingNextGoal, router]);

  if (!group) return <Redirect href="/onboarding" />;

  const current = Math.min(group.level, group.goal);
  const isCurrent = selected === current;
  const isCleared = selected !== null && selected < group.level;
  const isLocked = selected !== null && selected > current;

  return (
    <View style={styles.fill}>
      <ProgressBar
        level={group.level}
        goal={group.goal}
        reward={group.rewardText}
        streak={group.currentStreak}
      />

      {waitingForPeriod ? (
        <View style={styles.waitBanner}>
          <Text style={styles.waitTitle}>Everyone&apos;s posted</Text>
          <Text style={styles.waitBody}>
            Level {group.level} clears when the period ends — {describeWait(unlocksAt)}.
          </Text>
        </View>
      ) : null}

      {missedReset ? (
        <View style={styles.resetBanner}>
          <Text style={styles.resetTitle}>Family streak reset</Text>
          <Text style={styles.resetBody}>Someone missed a day, so everyone is back at level 1.</Text>
        </View>
      ) : null}

      <LevelMap
        level={group.level}
        goal={group.goal}
        reward={group.rewardText}
        onSelectLevel={setSelected}
      />

      <Modal visible={selected !== null} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Level {selected}</Text>
            {isCurrent ? (
              <>
                <Text style={styles.taskLabel}>Today&apos;s task</Text>
                <Text style={styles.sheetBody}>{task.prompt}</Text>
                <Pressable
                  style={styles.cta}
                  onPress={() => {
                    setSelected(null);
                    router.push('/capture');
                  }}
                >
                  <Text style={styles.ctaText}>
                    {hasPostedThisCycle ? 'Post again' : 'Complete task'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.sheetBody}>
                {isCleared
                  ? 'Cleared — your family posted that day.'
                  : isLocked
                    ? 'Locked. Clear the levels before it first.'
                    : ''}
              </Text>
            )}
            <Pressable style={styles.close} onPress={() => setSelected(null)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.night },
  resetBanner: {
    backgroundColor: '#FDE8E8',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  waitBanner: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  waitTitle: { fontWeight: '800', color: colors.text },
  waitBody: { color: colors.muted, marginTop: 2 },
  resetTitle: { fontWeight: '800', color: colors.text },
  resetBody: { color: colors.muted, marginTop: 2 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,10,35,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: 300,
    gap: spacing.sm,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  taskLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.muted,
  },
  sheetBody: { color: colors.muted, lineHeight: 22, fontSize: 16 },
  cta: {
    marginTop: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  close: { alignItems: 'center', paddingVertical: spacing.xs },
  closeText: { color: colors.muted, fontWeight: '600' },
});
