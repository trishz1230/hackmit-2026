import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { CompletedAnnouncement } from '../../components/CompletedAnnouncement';
import { PostCard } from '../../components/PostCard';
import { Tabs } from '../../components/Tabs';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

export default function Feed() {
  const router = useRouter();
  const {
    group,
    posts,
    task,
    hasPostedThisCycle,
    pending,
    remindToPost,
    taskLocked,
    reactionsFor,
    memberById,
    toggleLike,
    likedByMe,
    promptFor,
    loading,
  } = useApp();

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.wrap}>
      <Tabs active="family" />
      <View style={styles.header}>
        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.sub}>Invite code: {group.joinCode}</Text>
      </View>
      <View style={styles.task}>
        <Text style={styles.taskLabel}>Level {group.level} task</Text>
        {taskLocked ? (
          <Text style={styles.taskPrompt}>
            🔒 Locked! Wait till the next notification for a new conversation :)
          </Text>
        ) : (
          <>
            <Text style={styles.taskPrompt}>{task.prompt}</Text>
            {hasPostedThisCycle ? (
              <CompletedAnnouncement pending={pending} onRemind={remindToPost} />
            ) : (
              <Pressable style={styles.cta} onPress={() => router.push('/capture')}>
                <Text style={styles.ctaText}>Complete task</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No posts yet. Complete a level to share with family.</Text>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            author={memberById(item.userId)}
            reactions={reactionsFor(item.id)}
            prompt={promptFor(item.taskId)}
            onPress={() => router.push(`/post/${item.id}`)}
            onLike={() => toggleLike(item.id)}
            liked={likedByMe(item.id)}
          />
        )}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { marginTop: 2, fontSize: 13, color: colors.muted },
  task: {
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
  },
  taskLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  taskPrompt: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22 },
  complete: { marginTop: spacing.sm, color: colors.success, fontWeight: '800' },
  cta: {
    marginTop: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  empty: { margin: spacing.lg, color: colors.muted, textAlign: 'center' },
});
