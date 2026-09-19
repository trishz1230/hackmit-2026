import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { NagBanner } from '../components/NagBanner';
import { PostCard } from '../components/PostCard';
import { ProgressBar } from '../components/ProgressBar';
import { startNagging, stopNagging } from '../lib/nag';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

export default function Feed() {
  const router = useRouter();
  const { group, task, posts, me, hasPostedThisCycle, reactionsFor, memberById, addReaction } = useApp();

  useEffect(() => {
    if (!group) return;
    if (hasPostedThisCycle) {
      void stopNagging();
    } else {
      void startNagging(task.prompt);
    }
  }, [group, hasPostedThisCycle, task.prompt]);

  if (!group) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.wrap}>
      {!hasPostedThisCycle && (
        <NagBanner prompt={task.prompt} onPress={() => router.push('/capture')} />
      )}

      <ProgressBar
        level={group.level}
        goal={group.goal}
        reward={group.rewardText}
        streak={group.currentStreak}
        onPress={() => router.push('/levels')}
      />

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View style={styles.taskCard}>
            <Text style={styles.taskLabel}>Today&apos;s task · {group.name}</Text>
            <Text style={styles.taskPrompt}>{task.prompt}</Text>
            <Pressable style={styles.taskCta} onPress={() => router.push('/capture')}>
              <Text style={styles.taskCtaText}>
                {hasPostedThisCycle ? 'Post again' : 'Complete task'}
              </Text>
            </Pressable>
            <Text style={styles.joinCode}>Invite code: {group.joinCode}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            author={memberById(item.userId)}
            reactions={reactionsFor(item.id)}
            onPress={() => router.push(`/post/${item.id}`)}
            onLike={() => addReaction(item.id, 'like', me.id)}
          />
        )}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  taskCard: {
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
  },
  taskLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: colors.muted },
  taskPrompt: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  taskCta: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  taskCtaText: { color: '#fff', fontWeight: '700' },
  joinCode: { marginTop: spacing.sm, fontSize: 12, color: colors.muted },
});
