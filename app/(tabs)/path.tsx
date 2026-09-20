import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Handwriting';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompletedAnnouncement } from '../../components/CompletedAnnouncement';
import { LevelMap } from '../../components/LevelMap';
import { ProgressBar } from '../../components/ProgressBar';
import { VoiceNote } from '../../components/VoiceNote';
import { streakCount } from '../../lib/levels';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';
import type { Post } from '../../lib/types';

/** What you posted on a level, shown under its prompt. */
function MyPost({ post }: { post: Post }) {
  if (post.kind === 'text') return <Text style={styles.postText}>{post.content}</Text>;
  return (
    <>
      {post.kind === 'photo' ? (
        <Image source={{ uri: post.content }} style={styles.photo} resizeMode="cover" />
      ) : (
        <VoiceNote uri={post.content} />
      )}
      {post.caption ? <Text style={styles.postText}>{post.caption}</Text> : null}
    </>
  );
}

export default function Path() {
  const router = useRouter();
  const {
    group,
    task,
    hasPostedThisCycle,
    everyonePostedThisCycle,
    pending,
    remindToPost,
    missedReset,
    dismissMissedReset,
    waitingForPeriod,
    taskLocked,
    taskForLevel,
    myPostForLevel,
    me,
    loading,
  } = useApp();
  const insets = useSafeAreaInsets();
  // Only levels that can't be opened use the sheet; the rest have their own page.
  const [selected, setSelected] = useState<number | null>(null);
  // The sheet keeps its content while it fades out, so it doesn't blank first.
  const [shown, setShown] = useState<number | null>(null);

  const openLevel = (n: number) => {
    if (!group) return;
    const currentLevel = Math.min(group.level, group.goal);
    const reachable = n < group.level || (n === currentLevel && !taskLocked);
    if (!reachable) {
      setShown(n);
      setSelected(n);
      return;
    }
    // Nothing left to do on the level you've answered, so go to the feed.
    if (n === currentLevel && hasPostedThisCycle) {
      router.push('/(tabs)/feed');
      return;
    }
    router.push(`/level/${n}`);
  };

  if (loading) return <View style={styles.fill} />;
  if (!group) return <Redirect href="/onboarding" />;

  const current = Math.min(group.level, group.goal);
  const streak = streakCount(group, everyonePostedThisCycle);
  const isCurrent = shown === current && !group.awaitingNextGoal;
  const isCleared = shown !== null && (shown < group.level || group.awaitingNextGoal);
  const isLocked = shown !== null && shown > current;
  const remembered = shown !== null ? taskForLevel(shown) : undefined;
  const myPost = shown !== null ? myPostForLevel(shown) : undefined;
  const prompt = isCurrent ? task.prompt : remembered?.prompt;

  return (
    <View style={styles.fill}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.card }}>
        <ProgressBar
          level={current}
          cleared={streak}
          goal={group.goal}
          reward={group.rewardText}
          streak={streak}
          myAvatar={me.avatar}
          onPressAvatar={() => router.push('/(tabs)/settings')}
        />
      </View>

      {waitingForPeriod ? (
        <View style={styles.waitBanner}>
          <Text style={styles.waitTitle}>Everyone posted</Text>
          <Text style={styles.waitBody}>
            {group.level < group.goal
              ? `Level ${group.level + 1} will open soon. What will the next conversation be?`
              : `${group.rewardText || 'Your reward'} unlocks soon.`}
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
        cleared={waitingForPeriod || group.awaitingNextGoal}
        onSelectLevel={openLevel}
      />

      <Modal visible={selected !== null} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <ScrollView bounces={false}>
              <Text style={styles.sheetTitle}>Level {shown}</Text>
              {isCurrent && taskLocked ? (
                <>
                  <Text style={styles.taskLabel}>🔒 Locked</Text>
                  <Text style={styles.sheetBody}>
                    Wait till the next notification for a new conversation :)
                  </Text>
                </>
              ) : isCurrent ? (
                <>
                  <Text style={styles.taskLabel}>Today&apos;s task</Text>
                  <Text style={styles.sheetBody}>{prompt}</Text>
                  {myPost ? <MyPost post={myPost} /> : null}
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
                    <MyPost post={myPost} />
                  ) : (
                    <Text style={styles.sheetBody}>Your post from this level is gone.</Text>
                  )}
                </>
              ) : isLocked && shown === current + 1 && waitingForPeriod ? (
                <>
                  <Text style={styles.taskLabel}>🔒 Locked</Text>
                  <Text style={styles.sheetBody}>
                    Wait till the next notification for a new conversation :)
                  </Text>
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
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ctaText: { color: colors.text, fontWeight: '700' },
  close: { alignItems: 'center', paddingVertical: spacing.xs },
  closeText: { color: colors.muted, fontWeight: '600' },
});
