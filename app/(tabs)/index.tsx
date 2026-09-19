import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Handwriting';
import { Redirect, useRouter } from 'expo-router';
import { CompletedAnnouncement } from '../../components/CompletedAnnouncement';
import { LevelMap } from '../../components/LevelMap';
import { ProgressBar } from '../../components/ProgressBar';
import { describeWait } from '../../lib/levels';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

export default function Home() {
  const router = useRouter();
  const {
    group,
    task,
    hasPostedThisCycle,
    pending,
    remindToPost,
    missedReset,
    dismissMissedReset,
    waitingForPeriod,
    unlocksAt,
    taskLocked,
    opensAt,
    taskForLevel,
    myPostForLevel,
    me,
    loading,
  } = useApp();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (group?.awaitingNextGoal) router.replace('/next-goal');
  }, [group?.awaitingNextGoal, router]);

  if (loading) return <View style={styles.fill} />;
  if (!group) return <Redirect href="/onboarding" />;

  const current = Math.min(group.level, group.goal);
  const isCurrent = selected === current && !group.awaitingNextGoal;
  const isCleared = selected !== null && (selected < group.level || group.awaitingNextGoal);
  const isLocked = selected !== null && selected > current;
  const remembered = selected !== null ? taskForLevel(selected) : undefined;
  const myPost = selected !== null ? myPostForLevel(selected) : undefined;
  const prompt = isCurrent ? task.prompt : remembered?.prompt;

  return (
    <View style={styles.fill}>
      <ProgressBar
        level={group.level}
        goal={group.goal}
        reward={group.rewardText}
        streak={group.currentStreak}
        myAvatar={me.avatar}
        onPressAvatar={() => router.push('/family')}
      />

      {waitingForPeriod ? (
        <View style={styles.waitBanner}>
          <Text style={styles.waitTitle}>Everyone posted</Text>
          <Text style={styles.waitBody}>
            Level {group.level + 1} will open {describeWait(unlocksAt)}.
          </Text>
        </View>
      ) : hasPostedThisCycle ? (
        <View style={styles.waitBanner}>
          <CompletedAnnouncement pending={pending} onRemind={remindToPost} />
        </View>
      ) : null}

      {missedReset ? (
        <View style={styles.resetBanner}>
          <Text style={styles.resetTitle}>Demo: family streak reset</Text>
          <Text style={styles.resetBody}>
            This is how a missed period looks — the streak goes to 0 and the family restarts at
            level 1.
          </Text>
          <Pressable onPress={dismissMissedReset} hitSlop={8}>
            <Text style={styles.dismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <LevelMap
        level={group.level}
        goal={group.goal}
        reward={group.rewardText}
        locked={taskLocked}
        cleared={waitingForPeriod}
        onSelectLevel={setSelected}
      />

      <Modal visible={selected !== null} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <ScrollView bounces={false}>
              <Text style={styles.sheetTitle}>Level {selected}</Text>
              {isCurrent && taskLocked ? (
                <>
                  <Text style={styles.taskLabel}>🔒 Locked</Text>
                  <Text style={styles.sheetBody}>
                    Wait till the next notification for a new conversation :)
                  </Text>
                  <Text style={styles.sheetMeta}>Opens {describeWait(opensAt)}.</Text>
                </>
              ) : isCurrent ? (
                <>
                  <Text style={styles.taskLabel}>Today&apos;s task</Text>
                  <Text style={styles.sheetBody}>{prompt}</Text>
                  {myPost ? (
                    myPost.kind === 'photo' ? (
                      <>
                        <Image source={{ uri: myPost.content }} style={styles.photo} resizeMode="cover" />
                        {myPost.caption ? (
                          <Text style={styles.postText}>{myPost.caption}</Text>
                        ) : null}
                      </>
                    ) : (
                      <Text style={styles.postText}>{myPost.content}</Text>
                    )
                  ) : null}
                  {hasPostedThisCycle ? (
                    <CompletedAnnouncement pending={pending} onRemind={remindToPost} />
                  ) : (
                    <Pressable
                      style={styles.cta}
                      onPress={() => {
                        setSelected(null);
                        router.push('/capture');
                      }}
                    >
                      <Text style={styles.ctaText}>Complete task</Text>
                    </Pressable>
                  )}
                </>
              ) : isCleared ? (
                <>
                  <Text style={styles.taskLabel}>That day&apos;s task</Text>
                  <Text style={styles.sheetBody}>{prompt ?? 'Cleared — your family posted that day.'}</Text>
                  {myPost ? (
                    myPost.kind === 'photo' ? (
                      <>
                        <Image source={{ uri: myPost.content }} style={styles.photo} resizeMode="cover" />
                        {myPost.caption ? (
                          <Text style={styles.postText}>{myPost.caption}</Text>
                        ) : null}
                      </>
                    ) : (
                      <Text style={styles.postText}>{myPost.content}</Text>
                    )
                  ) : (
                    <Text style={styles.sheetBody}>Your post from this level is gone.</Text>
                  )}
                </>
              ) : isLocked && selected === current + 1 && waitingForPeriod ? (
                <>
                  <Text style={styles.taskLabel}>🔒 Locked</Text>
                  <Text style={styles.sheetBody}>
                    Wait till the next notification for a new conversation :)
                  </Text>
                  <Text style={styles.sheetMeta}>Opens {describeWait(unlocksAt)}.</Text>
                </>
              ) : (
                <Text style={styles.sheetBody}>
                  {isLocked ? 'Locked. Clear the levels before it first.' : ''}
                </Text>
              )}
              <Pressable style={styles.close} onPress={() => setSelected(null)}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
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
  dismiss: { marginTop: spacing.xs, color: colors.accent, fontWeight: '700' },
  sheetMeta: { color: colors.muted, marginTop: spacing.xs },
  complete: {
    marginTop: spacing.md,
    color: colors.success,
    fontWeight: '800',
    fontSize: 16,
  },
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
    maxHeight: '80%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  taskLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  sheetBody: { color: colors.muted, lineHeight: 22, fontSize: 16, marginBottom: spacing.sm },
  postText: { color: colors.text, fontSize: 16, lineHeight: 22, marginBottom: spacing.sm },
  photo: { width: '100%', height: 180, borderRadius: radius.md, marginBottom: spacing.sm },
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
